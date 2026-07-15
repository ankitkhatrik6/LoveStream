import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { 
  Camera, 
  CameraOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  RefreshCw, 
  AlertCircle, 
  User, 
  Sparkles,
  Video,
  Check,
  X
} from "lucide-react";

class CallSoundManager {
  private audioCtx: AudioContext | null = null;
  private intervalId: any = null;
  
  private initAudio() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  playOutgoing() {
    this.stop();
    this.initAudio();
    if (!this.audioCtx) return;
    
    const playPulse = () => {
      if (!this.audioCtx) return;
      const t = this.audioCtx.currentTime;
      
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();
      
      osc1.frequency.value = 440;
      osc2.frequency.value = 480;
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);
      
      gainNode.gain.setValueAtTime(0, t);
      gainNode.gain.linearRampToValueAtTime(0.08, t + 0.05);
      gainNode.gain.setValueAtTime(0.08, t + 1.5);
      gainNode.gain.linearRampToValueAtTime(0, t + 1.6);
      
      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 1.6);
      osc2.stop(t + 1.6);
    };
    
    playPulse();
    this.intervalId = setInterval(playPulse, 4000);
  }

  playIncoming() {
    this.stop();
    this.initAudio();
    if (!this.audioCtx) return;
    
    const playRing = () => {
      if (!this.audioCtx) return;
      const t = this.audioCtx.currentTime;
      
      const osc = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, t);
      
      for (let i = 0; i < 12; i++) {
        osc.frequency.setValueAtTime(600, t + i * 0.1);
        osc.frequency.setValueAtTime(800, t + i * 0.1 + 0.05);
      }
      
      osc.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);
      
      gainNode.gain.setValueAtTime(0, t);
      gainNode.gain.linearRampToValueAtTime(0.12, t + 0.05);
      gainNode.gain.setValueAtTime(0.12, t + 1.2);
      gainNode.gain.linearRampToValueAtTime(0, t + 1.3);
      
      osc.start(t);
      osc.stop(t + 1.3);
    };
    
    playRing();
    this.intervalId = setInterval(playRing, 2500);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

interface User {
  id: string;
  username: string;
}

interface VideoCallProps {
  socket: WebSocket | null;
  roomId: string;
  myId: string;
  users: User[];
  onMessageSubscribe: (callback: (message: any) => void) => () => void;
}

export const VideoCall: React.FC<VideoCallProps> = ({
  socket,
  roomId,
  myId,
  users,
  onMessageSubscribe
}) => {
  const [isJoined, setIsJoined] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isCamOn, setIsCamOn] = useState(false); // Muted by default
  const [isMicOn, setIsMicOn] = useState(false); // Muted by default
  const [error, setError] = useState<string>("");
  const [isInitializing, setIsInitializing] = useState(false);

  // Calling flow states
  // "idle" | "ringing" | "invited" | "connected"
  const [callState, setCallState] = useState<"idle" | "ringing" | "invited" | "connected">("idle");
  const [activeCaller, setActiveCaller] = useState<{ id: string; name: string } | null>(null);
  const [partnerEndedCall, setPartnerEndedCall] = useState<string | null>(null);

  // Map of socketId -> { stream: MediaStream; username: string }
  const [remoteStreams, setRemoteStreams] = useState<Record<string, { stream: MediaStream; username: string }>>({});
  // Map of socketId -> ICE connection state string for UI
  const [peerStatus, setPeerStatus] = useState<Record<string, string>>({});

  // Manage calling sounds via CallSoundManager
  useEffect(() => {
    const soundManager = new CallSoundManager();
    try {
      if (callState === "ringing") {
        soundManager.playOutgoing();
      } else if (callState === "invited") {
        soundManager.playIncoming();
      } else {
        soundManager.stop();
      }
    } catch (e) {
      console.warn("CallSoundManager error:", e);
    }
    return () => {
      try {
        soundManager.stop();
      } catch (e) {}
    };
  }, [callState]);

  const localStreamRef = useRef<MediaStream | null>(null);
  const isJoinedRef = useRef(false);
  // Map of socketId -> RTCPeerConnection
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
  // Map of socketId -> RTCIceCandidateInit[] for candidates received before remote description is set
  const pendingCandidates = useRef<Record<string, RTCIceCandidateInit[]>>({});
  // Track ICE restart attempts per peer to prevent infinite loops
  const iceRestartAttempts = useRef<Record<string, number>>({});
  
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  // Get active participants' usernames
  const getUsernameById = (id: string): string => {
    const found = users.find(u => u.id === id);
    return found ? found.username : "Romantic Partner";
  };

  // Get the other user in the room
  const getPartnerUser = () => {
    return users.find((u) => u.id && myId && u.id !== myId);
  };

  // Clean up a specific peer connection
  const handlePeerDisconnect = (peerId: string) => {
    console.log(`[WebRTC] Disconnecting peer: ${peerId}`);
    if (peerConnections.current[peerId]) {
      try {
        peerConnections.current[peerId].close();
      } catch (e) {
        console.warn("Error closing peer connection", e);
      }
      delete peerConnections.current[peerId];
    }

    delete pendingCandidates.current[peerId];
    delete iceRestartAttempts.current[peerId];

    setRemoteStreams((prev) => {
      const copy = { ...prev };
      delete copy[peerId];
      return copy;
    });
    setPeerStatus((prev) => {
      const copy = { ...prev };
      delete copy[peerId];
      return copy;
    });
  };

  // Clear everything
  const stopAllMedia = () => {
    console.log("[WebRTC] Stopping all local media tracks & clearing peer connections.");
    isJoinedRef.current = false;
    
    // Stop local camera/mic stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    setLocalStream(null);

    // Close and clear all peer connections
    Object.keys(peerConnections.current).forEach((peerId) => {
      try {
        peerConnections.current[peerId].close();
      } catch (e) {
        /* ignore */
      }
    });
    peerConnections.current = {};
    pendingCandidates.current = {};
    setRemoteStreams({});
  };

  // Handle incoming signaling messages from App.tsx prop
  useEffect(() => {
    const handleIncomingMessage = (message: any) => {
      const { type, payload } = message;

      if (type === "user_reconnected") {
        const { user, oldSocketId, newSocketId } = payload;
        if (newSocketId === myId || oldSocketId === myId) return;

        console.log(`[WebRTC Msg] Partner reconnected: oldSocketId=${oldSocketId}, newSocketId=${newSocketId}`);

        if (oldSocketId) {
          handlePeerDisconnect(oldSocketId);
        }

        if (isJoinedRef.current && newSocketId && user) {
          console.log(`[WebRTC Msg] Re-initiating call with reconnected partner at ${newSocketId}`);
          handlePeerDisconnect(newSocketId);

          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: "peer_present_response",
              payload: { targetId: newSocketId }
            }));
          }

          if (myId < newSocketId) {
            initiateCall(newSocketId, user.username);
          }
        }
        return;
      }

      const { senderId, signal } = payload || {};

      // Skip self-messages or invalid sender/receiver state
      if (!myId || !senderId || senderId === myId) return;

      const senderName = getUsernameById(senderId);

      // 1. Handle Calling Invitation Protocol
      if (type === "webrtc_signal" && signal) {
        if (signal.type === "call_invite") {
          if (isJoinedRef.current || callState === "connected") {
            console.log("[WebRTC Call] Already in call, ignoring incoming invite.");
            return;
          }
          console.log(`[WebRTC Call] Received call_invite from ${senderName} (${senderId})`);
          setCallState("invited");
          setActiveCaller({ id: senderId, name: senderName });
          setError(""); // Clear old errors
          return;
        }

        if (signal.type === "call_cancel") {
          console.log(`[WebRTC Call] Caller ${senderName} cancelled the invite.`);
          setCallState("idle");
          setActiveCaller(null);
          return;
        }

        if (signal.type === "call_decline") {
          console.log(`[WebRTC Call] Partner ${senderName} declined the invite.`);
          setCallState("idle");
          setError(`${senderName} declined the video call.`);
          return;
        }

        if (signal.type === "call_accept") {
          console.log(`[WebRTC Call] Partner ${senderName} accepted our invite! Connecting...`);
          setError("");
          // Join call first, then notify the accepter we're present
          // This fixes the timing race where accepter's peer_joined_video_call
          // may arrive before we set isJoinedRef.current = true
          handleJoinCall().then(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                type: "peer_present_response",
                payload: { targetId: senderId }
              }));
            }
          });
          return;
        }
      }

      // 2. Handle Connection Protocol (only when joined)
      if (!isJoinedRef.current) return;

      switch (type) {
        case "peer_joined_video_call": {
          console.log(`[WebRTC Msg] Peer joined call: ${senderName} (${senderId})`);
          // We respond to let them know we are also in the call
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: "peer_present_response",
              payload: { targetId: senderId }
            }));
          }

          // Check if we are the initiator (alphabetical connection ordering)
          // If our ID is "smaller", we start the offer negotiation
          if (myId < senderId) {
            initiateCall(senderId, senderName);
          }
          break;
        }

        case "peer_present": {
          console.log(`[WebRTC Msg] Received peer_present from ${senderName} (${senderId})`);
          // Existing peer is in call. If we are the initiator, create the offer
          if (myId < senderId) {
            initiateCall(senderId, senderName);
          }
          break;
        }

        case "webrtc_signal": {
          if (!signal) return;
          
          if (signal.type === "offer") {
            console.log(`[WebRTC Msg] Received SDP offer from ${senderName}`);
            handleOffer(senderId, senderName, signal.sdp);
          } else if (signal.type === "answer") {
            console.log(`[WebRTC Msg] Received SDP answer from ${senderName}`);
            handleAnswer(senderId, signal.sdp);
          } else if (signal.type === "candidate") {
            console.log(`[WebRTC Msg] Received ICE candidate from ${senderName}`);
            handleCandidate(senderId, signal.candidate);
          }
          break;
        }

        case "peer_left_video_call":
        case "user_left": {
          console.log(`[WebRTC Msg] Peer disconnected/left call: ${senderId}`);
          if (isJoinedRef.current && senderId !== myId) {
            const partnerName = getUsernameById(senderId);
            setPartnerEndedCall(partnerName);
            stopAllMedia();
            setIsJoined(false);
            setCallState("idle");
            setActiveCaller(null);
          }
          handlePeerDisconnect(senderId);
          break;
        }

        default:
          break;
      }
    };

    const unsubscribe = onMessageSubscribe(handleIncomingMessage);
    return () => {
      unsubscribe();
    };
  }, [onMessageSubscribe, myId, callState, socket, users]);

  // Handle local video element layout mapping
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch((err) => {
        console.warn("[WebRTC] Local video play blocked:", err);
      });
    }
  }, [localStream]);

  // Create peer connection with STUN + TURN relay servers for cross-network support
  const createPeerConnection = (peerId: string, peerName: string, isInitiator: boolean) => {
    // Double safeguard to never connect to ourselves
    if (!peerId || !myId || peerId === myId) {
      throw new Error("Cannot create peer connection to self or invalid peer IDs");
    }

    if (peerConnections.current[peerId]) {
      return peerConnections.current[peerId];
    }

    console.log(`[WebRTC] Creating RTCPeerConnection for peer ${peerId}, isInitiator: ${isInitiator}`);
    const pc = new RTCPeerConnection({
      iceServers: [
        // Google STUN — works for direct/same-network connections
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        // Open Relay TURN servers — required for different-network (mobile vs WiFi) connections
        // These relay media when direct P2P is blocked by NAT/firewall
        {
          urls: "turn:openrelay.metered.ca:80",
          username: "openrelayproject",
          credential: "openrelayproject"
        },
        {
          urls: "turn:openrelay.metered.ca:443",
          username: "openrelayproject",
          credential: "openrelayproject"
        },
        {
          urls: "turn:openrelay.metered.ca:443?transport=tcp",
          username: "openrelayproject",
          credential: "openrelayproject"
        },
        {
          urls: "turns:openrelay.metered.ca:443",
          username: "openrelayproject",
          credential: "openrelayproject"
        }
      ],
      iceCandidatePoolSize: 10,
      bundlePolicy: "max-bundle"
    });

    iceRestartAttempts.current[peerId] = 0;

    // Handle ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: "webrtc_signal",
          payload: {
            targetId: peerId,
            signal: {
              type: "candidate",
              candidate: {
                candidate: event.candidate.candidate,
                sdpMid: event.candidate.sdpMid,
                sdpMLineIndex: event.candidate.sdpMLineIndex,
                usernameFragment: event.candidate.usernameFragment
              }
            }
          }
        }));
      } else if (!event.candidate) {
        console.log(`[WebRTC] ICE gathering complete for peer ${peerName}`);
      }
    };

    // Connection changes
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`[WebRTC] Connection state for ${peerName}: ${state}`);
      setPeerStatus(prev => ({ ...prev, [peerId]: state }));
      if (state === "failed") {
        // Try ICE restart before giving up
        const attempts = iceRestartAttempts.current[peerId] || 0;
        if (attempts < 2 && isInitiator) {
          iceRestartAttempts.current[peerId] = attempts + 1;
          console.log(`[WebRTC] Connection failed, attempting ICE restart #${attempts + 1} for ${peerName}`);
          restartIce(peerId, peerName);
        } else {
          console.log(`[WebRTC] Connection permanently failed for ${peerName}, disconnecting.`);
          handlePeerDisconnect(peerId);
        }
      } else if (state === "disconnected") {
        // Disconnected is recoverable — wait briefly before acting
        console.log(`[WebRTC] Connection temporarily disconnected for ${peerName}, waiting...`);
        setTimeout(() => {
          if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
            const attempts = iceRestartAttempts.current[peerId] || 0;
            if (attempts < 2 && isInitiator) {
              iceRestartAttempts.current[peerId] = attempts + 1;
              console.log(`[WebRTC] Still disconnected after wait, ICE restart #${attempts + 1} for ${peerName}`);
              restartIce(peerId, peerName);
            } else {
              handlePeerDisconnect(peerId);
            }
          }
        }, 4000);
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log(`[WebRTC] ICE Connection state for ${peerName}: ${state}`);
      setPeerStatus(prev => ({ ...prev, [peerId]: state }));
      if (state === "failed") {
        const attempts = iceRestartAttempts.current[peerId] || 0;
        if (attempts < 2 && isInitiator) {
          iceRestartAttempts.current[peerId] = attempts + 1;
          console.log(`[WebRTC] ICE failed, restarting #${attempts + 1} for ${peerName}`);
          restartIce(peerId, peerName);
        } else {
          handlePeerDisconnect(peerId);
        }
      }
    };

    // Track remote stream insertion
    pc.ontrack = (event) => {
      console.log(`[WebRTC] ontrack event fired for ${peerName}, track kind: ${event.track.kind}`);
      
      setRemoteStreams((prev) => {
        const existing = prev[peerId];
        let stream: MediaStream;
        
        if (existing && existing.stream) {
          // Construct a brand-new MediaStream from existing tracks to force a new reference
          stream = new MediaStream(existing.stream.getTracks());
          // Add track if it's not already in the stream
          if (!stream.getTracks().find(t => t.id === event.track.id)) {
            stream.addTrack(event.track);
          }
        } else {
          // If the event provides a stream, construct a new one from its tracks
          if (event.streams && event.streams[0]) {
            stream = new MediaStream(event.streams[0].getTracks());
          } else {
            stream = new MediaStream([event.track]);
          }
        }
        
        return {
          ...prev,
          [peerId]: {
            stream,
            username: peerName
          }
        };
      });
    };

    // Add local tracks to peer connection
    const currentLocal = localStreamRef.current;
    if (currentLocal) {
      currentLocal.getTracks().forEach((track) => {
        pc.addTrack(track, currentLocal);
      });
    }

    peerConnections.current[peerId] = pc;
    return pc;
  };

  // ICE Restart — re-negotiate the connection without full teardown
  const restartIce = async (peerId: string, peerName: string) => {
    try {
      const pc = peerConnections.current[peerId];
      if (!pc) return;
      if (pc.signalingState !== "stable") {
        console.warn(`[WebRTC] Cannot ICE restart, signaling state is ${pc.signalingState}`);
        return;
      }
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: "webrtc_signal",
          payload: {
            targetId: peerId,
            signal: { type: "offer", sdp: offer.sdp }
          }
        }));
      }
      console.log(`[WebRTC] ICE restart offer sent to ${peerName}`);
    } catch (err) {
      console.error(`[WebRTC] ICE restart failed for ${peerName}:`, err);
      handlePeerDisconnect(peerId);
    }
  };

  // SDP Negotiation - Offer creation
  const initiateCall = async (peerId: string, peerName: string) => {
    if (!peerId || !myId || peerId === myId) return;
    try {
      const pc = createPeerConnection(peerId, peerName, true);
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);

      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: "webrtc_signal",
          payload: {
            targetId: peerId,
            signal: {
              type: "offer",
              sdp: offer.sdp
            }
          }
        }));
      }
    } catch (err: any) {
      console.error(`[WebRTC] Failed to create or send offer to ${peerName}:`, err);
    }
  };

  // SDP Negotiation - Answer creation
  const handleOffer = async (peerId: string, peerName: string, sdp: string) => {
    if (!peerId || !myId || peerId === myId) return;
    try {
      let pc = peerConnections.current[peerId];
      if (pc && pc.signalingState !== "stable") {
        console.warn(`[WebRTC] Peer connection for ${peerId} is in unstable state "${pc.signalingState}". Recreating...`);
        try {
          pc.close();
        } catch (e) {}
        delete peerConnections.current[peerId];
        pc = createPeerConnection(peerId, peerName, false);
      } else if (!pc) {
        pc = createPeerConnection(peerId, peerName, false);
      }

      await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp }));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Process any pending candidates for this peer
      await processPendingCandidates(peerId);

      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: "webrtc_signal",
          payload: {
            targetId: peerId,
            signal: {
              type: "answer",
              sdp: answer.sdp
            }
          }
        }));
      }
    } catch (err: any) {
      console.error(`[WebRTC] Failed to handle offer and create answer:`, err);
    }
  };

  const handleAnswer = async (peerId: string, sdp: string) => {
    if (!peerId || !myId || peerId === myId) return;
    try {
      const pc = peerConnections.current[peerId];
      if (pc) {
        if (pc.signalingState !== "have-local-offer") {
          console.warn(`[WebRTC] Received answer for ${peerId} but connection is in state "${pc.signalingState}". Ignoring.`);
          return;
        }
        await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp }));
        // Process any pending candidates for this peer
        await processPendingCandidates(peerId);
      }
    } catch (err: any) {
      console.error(`[WebRTC] Failed to set remote description answer:`, err);
    }
  };

  const processPendingCandidates = async (peerId: string) => {
    try {
      const pc = peerConnections.current[peerId];
      if (!pc || !pc.remoteDescription) return;

      const candidates = pendingCandidates.current[peerId] || [];
      pendingCandidates.current[peerId] = [];

      for (const cand of candidates) {
        console.log(`[WebRTC] Applying queued ICE candidate for peer ${peerId}`);
        await pc.addIceCandidate(cand);
      }
    } catch (err: any) {
      console.warn(`[WebRTC] Failed to apply queued ICE candidates for peer ${peerId}:`, err);
    }
  };

  const handleCandidate = async (peerId: string, candidate: any) => {
    if (!peerId || !myId || peerId === myId) return;
    try {
      const pc = peerConnections.current[peerId];
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(candidate);
      } else {
        console.log(`[WebRTC] Queueing ICE candidate for peer ${peerId} (remote description not set yet)`);
        if (!pendingCandidates.current[peerId]) {
          pendingCandidates.current[peerId] = [];
        }
        pendingCandidates.current[peerId].push(candidate);
      }
    } catch (err: any) {
      console.error(`[WebRTC] Failed to add remote ICE candidate:`, err);
    }
  };

  // Acquire local media streams
  const startLocalMedia = async (): Promise<MediaStream> => {
    setError("");
    setIsInitializing(true);
    try {
      console.log("[WebRTC] Requesting local camera and mic stream...");
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera/mic access is blocked on insecure connections. Please use localhost or an HTTPS link.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        },
        audio: true
      });
      
      // Mute both camera and mic tracks by default, as requested
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = false;
      }
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = false;
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsCamOn(false); // UI state off by default
      setIsMicOn(false); // UI state off by default
      setIsInitializing(false);
      return stream;
    } catch (err: any) {
      setIsInitializing(false);
      console.error("[WebRTC] Media access error:", err);
      let errMsg = "Unable to access camera or microphone.";
      
      if (err.message && err.message.includes("insecure")) {
        errMsg = err.message;
      } else if (err.name === "NotAllowedError") {
        errMsg = "Permission to use camera and mic was denied. Please allow them in your browser settings.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        errMsg = "No camera or microphone found on this device.";
      }
      
      setError(errMsg);
      throw err;
    }
  };

  // Send a call invite
  const handleStartCallInvite = () => {
    setError("");
    setPartnerEndedCall(null);
    const partner = getPartnerUser();
    if (!partner) {
      setError("Waiting for your partner to join the watch room before you can start a video call!");
      return;
    }

    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log(`[WebRTC Call] Sending invite to partner: ${partner.username} (${partner.id})`);
      socket.send(JSON.stringify({
        type: "webrtc_signal",
        payload: {
          targetId: partner.id,
          signal: {
            type: "call_invite"
          }
        }
      }));
      setCallState("ringing");
    } else {
      setError("Connection lost. Please try rejoining the room.");
    }
  };

  // Cancel the sent invite
  const handleCancelCall = () => {
    const partner = getPartnerUser();
    if (partner && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: "webrtc_signal",
        payload: {
          targetId: partner.id,
          signal: {
            type: "call_cancel"
          }
        }
      }));
    }
    setCallState("idle");
  };

  // Decline incoming invite
  const handleDeclineCall = () => {
    if (activeCaller && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: "webrtc_signal",
        payload: {
          targetId: activeCaller.id,
          signal: {
            type: "call_decline"
          }
        }
      }));
    }
    setCallState("idle");
    setActiveCaller(null);
  };

  // Accept incoming invite
  const handleAcceptCall = async () => {
    setPartnerEndedCall(null);
    if (!activeCaller) return;

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: "webrtc_signal",
        payload: {
          targetId: activeCaller.id,
          signal: {
            type: "call_accept"
          }
        }
      }));
    }

    await handleJoinCall();
  };

  // Click join call action (acquires stream and starts connection protocol)
  const handleJoinCall = async () => {
    try {
      const stream = await startLocalMedia();
      isJoinedRef.current = true;
      setIsJoined(true);
      setCallState("connected");

      // Signal to room that we are online in the video call
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: "join_video_call",
          payload: {}
        }));
      }
    } catch (err) {
      // Handled in startLocalMedia
      isJoinedRef.current = false;
      setCallState("idle");
      throw err; // Re-throw so callers (e.g. call_accept handler) can chain .then()
    }
  };

  // Click leave call action
  const handleLeaveCall = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: "leave_video_call",
        payload: {}
      }));
    }
    stopAllMedia();
    isJoinedRef.current = false;
    setIsJoined(false);
    setCallState("idle");
    setActiveCaller(null);
  };

  // Toggle video track
  const toggleCam = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCamOn(videoTrack.enabled);
      }
    }
  };

  // Toggle mic track
  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopAllMedia();
    };
  }, []);

  // If socket reconnects and we are already in a call, re-announce our presence
  useEffect(() => {
    if (isJoined && socket && socket.readyState === WebSocket.OPEN) {
      console.log("[WebRTC] Socket reconnected while in call, re-sending join_video_call");
      socket.send(JSON.stringify({
        type: "join_video_call",
        payload: {}
      }));
    }
  }, [socket, isJoined]);

  const partner = getPartnerUser();

  return (
    <div className="w-full border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden animate-fade-in">
      {/* Neobrutalist Call Header */}
      <div className="bg-[#FF2E63] text-white border-b-4 border-black p-4 flex justify-between items-center select-none">
        <div className="flex items-center gap-2">
          <div className="bg-black text-[#FF2E63] p-1.5 border-2 border-black rotate-[-2deg] shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
            <Video className="w-4 h-4 text-[#FF2E63] fill-current" />
          </div>
          <div>
            <h3 className="font-display font-black text-sm uppercase tracking-tight text-white italic">
              LOVESTREAM VIDEO DIALS 💖
            </h3>
            <p className="text-[9px] font-mono text-pink-100 uppercase font-black tracking-widest">
              {isJoined ? "Secure Peer-To-Peer Line Active" : "Private Face-to-Face Calling"}
            </p>
          </div>
        </div>

        {isJoined && (
          <div className="flex items-center gap-1.5 bg-black border-2 border-black text-[#00FF66] font-mono text-[9px] font-bold px-2 py-0.5 shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
            </span>
            ON-AIR
          </div>
        )}
      </div>

      {/* Main Call Viewport */}
      <div className="p-2.5 sm:p-4 bg-zinc-50 flex flex-col gap-3 sm:gap-4 min-h-[220px]">
        {partnerEndedCall && !isJoined && (
          <div className="border-4 border-black bg-[#FFEFEF] p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black mb-1 relative animate-fade-in">
            <button
              onClick={() => setPartnerEndedCall(null)}
              className="absolute top-2 right-2 border-2 border-black bg-white hover:bg-black hover:text-white font-mono font-bold text-xs p-1 cursor-pointer transition-all"
              title="Dismiss"
            >
              <X className="w-3 h-3" />
            </button>
            <div className="flex items-start gap-3">
              <div className="bg-[#FF2E63] text-white p-2 border-2 border-black rotate-[-3deg] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0">
                <PhoneOff className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h4 className="font-display font-black text-xs uppercase tracking-tight text-[#FF2E63]">
                  CALL ENDED
                </h4>
                <p className="text-[11px] font-sans text-zinc-800 mt-1 font-bold">
                  {partnerEndedCall} has left the video call.
                </p>
                <button
                  onClick={() => setPartnerEndedCall(null)}
                  className="mt-2.5 border-2 border-black bg-white hover:bg-black hover:text-white font-mono font-bold text-[9px] uppercase px-2.5 py-1.5 shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-y-0.5 active:shadow-none cursor-pointer transition-all"
                >
                  Return to Dialer
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="border-4 border-black bg-[#FFEFEF] text-black p-3.5 font-mono text-xs flex items-start gap-2.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <AlertCircle className="w-5 h-5 text-[#FF2E63] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold uppercase text-[#FF2E63]">DIAL ERROR</p>
              <p className="mt-1 text-black/80 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* 1. IDLE STATE: JOIN CALL CTA */}
        {callState === "idle" && !isJoined && (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <div className="w-16 h-16 rounded-full border-4 border-black bg-[#facc15] flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4 rotate-[4deg]">
              <Video className="w-8 h-8 text-black fill-current" />
            </div>
            
            <h4 className="font-display font-black text-lg text-black uppercase">
              See each other while watching!
            </h4>
            <p className="text-zinc-600 font-sans text-xs max-w-sm mt-1.5 leading-relaxed font-medium">
              Start a private, secure peer-to-peer video connection with your partner. Keep camera and mic muted by default for safe watching.
            </p>

            <button
              onClick={handleStartCallInvite}
              disabled={isInitializing}
              className={`mt-6 border-4 border-black font-display font-black text-xs uppercase px-6 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer flex items-center gap-2 ${
                partner 
                  ? "bg-[#00FF66] hover:bg-black hover:text-white text-black active:translate-y-0.5 active:shadow-none" 
                  : "bg-zinc-300 text-zinc-500 cursor-not-allowed shadow-none"
              }`}
            >
              {isInitializing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  INITIALIZING DIALER...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-current" />
                  START PRIVATE VIDEO CALL 💖
                </>
              )}
            </button>

            {!partner && (
              <p className="text-[10px] font-mono text-zinc-500 uppercase mt-3 font-bold">
                🔒 Waiting for your partner to join the room code first
              </p>
            )}
          </div>
        )}

        {/* 2. RINGING STATE: CALLING PARTNER */}
        {callState === "ringing" && (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <div className="w-16 h-16 rounded-full border-4 border-black bg-[#facc15] flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4 animate-pulse">
              <Video className="w-8 h-8 text-black fill-current" />
            </div>
            <h4 className="font-display font-black text-lg text-black uppercase tracking-tight animate-pulse">
              RINGING YOUR PARTNER... 💖
            </h4>
            <p className="text-zinc-600 font-sans text-xs max-w-sm mt-1.5 leading-relaxed font-medium">
              Sending a secure invite to <span className="font-bold text-black">{partner?.username || "your partner"}</span>. Waiting for them to accept!
            </p>
            <button
              onClick={handleCancelCall}
              className="mt-6 border-4 border-black bg-[#FF2E63] hover:bg-black hover:text-white text-white font-display font-black text-xs uppercase px-6 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            >
              CANCEL CALL
            </button>
          </div>
        )}

        {/* 3. INVITED STATE: INCOMING CALL OVERLAY — full-screen modal on all devices */}
        {callState === "invited" && createPortal(
          <div className="call-overlay-modal">
            <div className="w-full max-w-sm bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-fade-in flex flex-col items-center text-center p-5 sm:p-6 gap-3 sm:gap-4 relative mx-4">
              {/* Pulsing ring icon */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-black bg-[#00FF66] flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-ring-pulse shrink-0">
                <Video className="w-8 h-8 sm:w-10 sm:h-10 text-black fill-current" />
              </div>

              <div>
                <h4 className="font-display font-black text-lg sm:text-xl text-black uppercase tracking-tight">
                  INCOMING CALL! 💖
                </h4>
                <p className="text-zinc-700 font-sans text-xs sm:text-sm mt-1.5 leading-relaxed font-semibold">
                  <span className="font-black text-black">{activeCaller?.name || "Your partner"}</span> wants to video call you!
                </p>
              </div>

              {/* Side-by-side compact buttons for better responsiveness */}
              <div className="flex gap-3 w-full mt-2">
                <button
                  onClick={handleAcceptCall}
                  className="flex-1 border-4 border-black bg-[#00FF66] hover:bg-black hover:text-[#00FF66] text-black font-display font-black text-xs sm:text-sm uppercase py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3px]" />
                  ACCEPT
                </button>
                <button
                  onClick={handleDeclineCall}
                  className="flex-1 border-4 border-black bg-[#FF2E63] hover:bg-black hover:text-white text-white font-display font-black text-xs sm:text-sm uppercase py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <X className="w-4 h-4 stroke-[3px]" />
                  DECLINE
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* 4. ACTIVE VIDEO CALL SCREEN */}
        {isJoined && (
          <div className="flex flex-col gap-3 w-full">
            {/* Grid of stream views — 2 cols on all screens, square on mobile */}
            <div className="grid grid-cols-2 gap-1.5 sm:gap-3 w-full">
              
              {/* Local Feed preview */}
              <div className="relative border-4 border-black bg-black aspect-square overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />

                {/* Cam disabled overlay */}
                {!isCamOn && (
                  <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center text-white gap-1">
                    <CameraOff className="w-6 h-6 sm:w-8 sm:h-8 text-zinc-500" />
                    <span className="font-mono text-[9px] text-zinc-400 font-bold uppercase">Cam Off</span>
                  </div>
                )}
              </div>

              {/* Remote Feed preview(s) */}
              {Object.keys(remoteStreams).filter(id => id !== myId).length === 0 ? (
                /* No partner stream connected yet — show detailed status */
                <div className="border-4 border-black bg-zinc-200 aspect-square flex flex-col items-center justify-center p-2 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative select-none">
                  <div className="animate-bounce mb-1">
                    <User className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-400 border-2 border-black p-1 bg-white rounded-none" />
                  </div>
                  <h5 className="font-display font-black text-[9px] sm:text-[10px] text-black uppercase tracking-tight">
                    CONNECTING...
                  </h5>
                  {(() => {
                    const statuses = Object.values(peerStatus);
                    const status = statuses[0];
                    const isRelaying = status === "connected" || status === "completed";
                    const isFailed = status === "failed";
                    return (
                      <p className="text-[7px] sm:text-[8px] font-mono uppercase mt-0.5 font-bold" style={{ color: isFailed ? '#FF2E63' : isRelaying ? '#00FF66' : '#a1a1aa' }}>
                        {isFailed ? 'ICE FAILED — RETRYING' : status ? status.toUpperCase() : 'Establishing Tunnel'}
                      </p>
                    );
                  })()}
                </div>
              ) : (
                /* Map active remote participant streams, strictly excluding self */
                Object.keys(remoteStreams)
                  .filter((peerId) => peerId !== myId)
                  .map((peerId) => {
                    const { stream } = remoteStreams[peerId];
                    const connStatus = peerStatus[peerId];
                    return (
                      <RemoteVideoFeed
                        key={peerId}
                        stream={stream}
                        connStatus={connStatus}
                      />
                    );
                  })
              )}
            </div>

            {/* Calling control deck — larger touch targets on mobile */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 border-t-2 border-black pt-3">
              {/* Camera Toggle Button */}
              <button
                onClick={toggleCam}
                className={`w-14 h-14 sm:w-12 sm:h-12 border-[3px] border-black flex flex-col items-center justify-center transition-all cursor-pointer shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none gap-0.5 ${
                  isCamOn ? "bg-[#00FF66] text-black" : "bg-zinc-800 text-white"
                }`}
                title={isCamOn ? "Mute camera" : "Unmute camera"}
              >
                {isCamOn ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
                <span className="text-[7px] font-mono font-black uppercase hidden sm:block">{isCamOn ? "CAM" : "OFF"}</span>
              </button>

              {/* Microphone Toggle Button */}
              <button
                onClick={toggleMic}
                className={`w-14 h-14 sm:w-12 sm:h-12 border-[3px] border-black flex flex-col items-center justify-center transition-all cursor-pointer shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none gap-0.5 ${
                  isMicOn ? "bg-[#00FF66] text-black" : "bg-zinc-800 text-white"
                }`}
                title={isMicOn ? "Mute microphone" : "Unmute microphone"}
              >
                {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                <span className="text-[7px] font-mono font-black uppercase hidden sm:block">{isMicOn ? "MIC" : "OFF"}</span>
              </button>

              {/* RED End Call / Leave call Button */}
              <button
                onClick={handleLeaveCall}
                className="w-14 h-14 sm:w-12 sm:h-12 border-[3px] border-black bg-[#FF2E63] hover:bg-black text-white hover:text-[#FF2E63] flex flex-col items-center justify-center cursor-pointer transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none gap-0.5"
                title="End video call"
              >
                <PhoneOff className="w-5 h-5" />
                <span className="text-[7px] font-mono font-black uppercase hidden sm:block">END</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* Remote feed helper component for mounting video streams dynamically */
interface RemoteVideoFeedProps {
  stream: MediaStream;
  connStatus?: string;
}

const RemoteVideoFeed: React.FC<RemoteVideoFeedProps> = ({ stream, connStatus }) => {
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (remoteVideoRef.current && stream) {
      // Always assign a fresh srcObject reference to force re-render
      remoteVideoRef.current.srcObject = null;
      remoteVideoRef.current.srcObject = stream;
      remoteVideoRef.current.play().catch((err) => {
        console.warn(`[WebRTC] Failed to autoplay remote video stream, attempting muted playback:`, err);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.muted = true;
          remoteVideoRef.current.play().catch(e => console.error("Muted play failed:", e));
        }
      });
    }
  }, [stream]);

  const isRelaying = connStatus === "connected" || connStatus === "completed";

  return (
    <div className="relative border-4 border-black bg-black aspect-square overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-scale-up">
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      {/* Connection quality indicator */}
      {connStatus && (
        <div
          className="absolute top-1 right-1 font-mono font-black text-[7px] uppercase px-1.5 py-0.5 border border-black"
          style={{
            background: isRelaying ? '#00FF66' : '#facc15',
            color: '#000'
          }}
        >
          {isRelaying ? 'LIVE' : connStatus.toUpperCase()}
        </div>
      )}
    </div>
  );
};
