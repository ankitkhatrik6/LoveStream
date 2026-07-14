import React, { useState, useEffect, useRef } from "react";
import {
  Heart,
  Share2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Send,
  Users,
  LogOut,
  Link,
  Plus,
  Copy,
  Flame,
  Sparkles,
  Tv,
  AlertCircle,
  Clock,
  ArrowRight,
  RotateCcw,
  SkipBack,
  SkipForward,
  Maximize,
  Minimize,
  Smile
} from "lucide-react";
import MockSyncShowcase from "./components/MockSyncShowcase";
import { VideoCall } from "./components/VideoCall";

// Memoized container to prevent React from destroying the YouTube iframe during re-renders
const YouTubePlayerPlaceholder = React.memo(() => {
  return <div id="love-player" className="w-full h-full"></div>;
});



interface User {
  id: string;
  username: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  reactions?: Record<string, string>; // username -> emoji
}

// Gentle Web Audio notification chime
const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    const now = ctx.currentTime;

    // Quick soft chime: D5 then G5
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.10); // G5

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch (e) {
    console.warn("AudioContext playback blocked/unsupported", e);
  }
};

interface FlyingEmoji {
  id: string;
  emoji: string;
  left: number;
}

// YT Iframe API Loader
let apiLoaded = false;
let apiCallbacks: (() => void)[] = [];

function loadYouTubeAPI(callback: () => void) {
  if ((window as any).YT && (window as any).YT.Player) {
    callback();
    return;
  }
  apiCallbacks.push(callback);
  if (apiLoaded) return;
  apiLoaded = true;

  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName("script")[0];
  if (firstScriptTag && firstScriptTag.parentNode) {
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
  } else {
    document.head.appendChild(tag);
  }

  (window as any).onYouTubeIframeAPIReady = () => {
    apiCallbacks.forEach((cb) => cb());
    apiCallbacks = [];
  };
}

interface ReactionTrayProps {
  messageId: string;
  onClose: () => void;
  isSelf: boolean;
  onReact: (messageId: string, emoji: string) => void;
  onOpenMore: (messageId: string) => void;
  forceOpen?: boolean;
}

const ReactionTray: React.FC<ReactionTrayProps> = ({
  messageId,
  onClose,
  isSelf,
  onReact,
  onOpenMore,
  forceOpen = false
}) => {
  const emojis = ["❤️", "😂", "😮", "😢", "🔥", "👍"];

  return (
    <div
      className={`absolute bottom-full mb-1.5 z-30 bg-white border-2 border-black p-1 flex gap-1 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rounded-none transition-all duration-200 after:absolute after:top-full after:left-0 after:right-0 after:h-3 after:content-[''] ${isSelf ? "right-0" : "left-0"
        } ${forceOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto delay-150 group-hover:delay-0"
        }`}
    >
      {emojis.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReact(messageId, emoji);
            onClose();
          }}
          className="hover:scale-125 hover:rotate-6 transform transition-all duration-150 p-1 text-sm sm:text-base cursor-pointer select-none active:scale-95"
        >
          {emoji}
        </button>
      ))}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenMore(messageId);
          onClose();
        }}
        className="hover:scale-125 transform transition-all duration-150 p-1 text-xs sm:text-sm cursor-pointer select-none bg-zinc-100 hover:bg-[#FF2E63] hover:text-white border border-black flex items-center justify-center rounded-full w-6 h-6 sm:w-7 sm:h-7 shrink-0 ml-0.5 active:scale-95 font-black"
        title="More emojis"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

interface MoreEmojisPickerProps {
  messageId: string;
  onClose: () => void;
  onReact: (messageId: string, emoji: string) => void;
}

const MoreEmojisPicker: React.FC<MoreEmojisPickerProps> = ({ messageId, onClose, onReact }) => {
  const allEmojis = [
    "❤️", "😂", "😮", "😢", "🔥", "👍",
    "👏", "🎉", "💩", "👀", "🙌", "💔",
    "✨", "💯", "🎂", "🎈", "🌟", "🐱",
    "🍕", "🍺", "🚀", "💡", "🎮", "🦄"
  ];

  return (
    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="bg-white border-4 border-black p-4 w-full max-w-[280px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative z-50 flex flex-col gap-3">
        <div className="flex justify-between items-center border-b-2 border-black pb-1.5">
          <span className="font-display font-black text-xs uppercase text-black tracking-tight">Select Reaction</span>
          <button
            type="button"
            onClick={onClose}
            className="text-[10px] font-mono font-bold bg-zinc-100 hover:bg-[#FF2E63] hover:text-white border-2 border-black px-2 py-0.5 cursor-pointer transition-colors"
          >
            CLOSE
          </button>
        </div>

        <div className="grid grid-cols-6 gap-2">
          {allEmojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onReact(messageId, emoji);
                onClose();
              }}
              className="hover:scale-125 hover:rotate-6 transform transition-all duration-150 p-1.5 text-base sm:text-lg cursor-pointer select-none text-center hover:bg-zinc-100 active:scale-95"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const getInitials = (name: string) => {
  if (!name) return "?";
  const trimmed = name.trim();
  if (trimmed.length <= 2) return trimmed.toUpperCase();
  const parts = trimmed.split(/\s+/);
  if (parts.length > 1) {
    return (parts[0][0] + (parts[1][0] || "")).toUpperCase();
  }
  return trimmed.substring(0, 2).toUpperCase();
};

const getAvatarColor = (name: string) => {
  const colors = [
    "bg-[#facc15] text-black",
    "bg-[#FF2E63] text-white",
    "bg-[#38bdf8] text-black",
    "bg-[#4ade80] text-black",
    "bg-[#a855f7] text-white",
    "bg-[#fb923c] text-black"
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export default function App() {
  // App navigation state
  const [inRoom, setInRoom] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const usernameRef = useRef("");

  // Room stream state
  const [users, setUsers] = useState<User[]>([]);
  const [currentVideoId, setCurrentVideoId] = useState("");
  // Ref always tracks the latest video ID — player closures read this, not stale state
  const currentVideoIdRef = useRef("");
  const _setCurrentVideoId = (id: string) => {
    currentVideoIdRef.current = id;
    setCurrentVideoId(id);
  };
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [videoInput, setVideoInput] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isAutoMuted, setIsAutoMuted] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  // WebRTC Video Call states
  const [myId, setMyId] = useState("");
  const [incomingCallMessage, setIncomingCallMessage] = useState<{ type: string; payload: any } | null>(null);
  const webrtcListenerRef = useRef<((msg: any) => void) | null>(null);

  // UI States
  const [copied, setCopied] = useState(false);
  const [flyingEmojis, setFlyingEmojis] = useState<FlyingEmoji[]>([]);
  const [loveScore, setLoveScore] = useState(0);
  const [lastHeartSender, setLastHeartSender] = useState<string | null>(null);
  const [showHeartPopup, setShowHeartPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasInteracted, setHasInteractedState] = useState(false);
  const hasInteractedRef = useRef(false);
  const setHasInteracted = (val: boolean) => {
    hasInteractedRef.current = val;
    setHasInteractedState(val);
  };
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // References
  const socketRef = useRef<WebSocket | null>(null);
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isUpdatingPlayerRef = useRef<boolean>(false);
  const reconnectTimeoutRef = useRef<any>(null);
  // Stable refs for reconnect (avoid stale closure)
  const roomIdRef = useRef("");
  const inRoomRef = useRef(false);
  const pongTimeoutRef = useRef<any>(null);

  const isMutedRef = useRef(isMuted);
  const volumeRef = useRef(volume);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    if (loveScore > 0) {
      setShowHeartPopup(true);
      const timer = setTimeout(() => {
        setShowHeartPopup(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [loveScore]);

  // Real-time typing indicators & message reaction states
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [activeReactionMenu, setActiveReactionMenu] = useState<string | null>(null);
  const [expandedEmojiMsgId, setExpandedEmojiMsgId] = useState<string | null>(null);
  const typingTimeoutRef = useRef<any>(null);
  const isTypingSentRef = useRef<boolean>(false);

  // Custom high-performance touch/long-press helpers for mobile
  const longPressTimeoutRef = useRef<Record<string, any>>({});

  const handleTouchStart = (msgId: string) => {
    if (longPressTimeoutRef.current[msgId]) {
      clearTimeout(longPressTimeoutRef.current[msgId]);
    }
    longPressTimeoutRef.current[msgId] = setTimeout(() => {
      setActiveReactionMenu(msgId);
      if (navigator.vibrate) {
        try { navigator.vibrate(40); } catch (_) { }
      }
    }, 500);
  };

  const handleTouchEnd = (msgId: string) => {
    if (longPressTimeoutRef.current[msgId]) {
      clearTimeout(longPressTimeoutRef.current[msgId]);
      delete longPressTimeoutRef.current[msgId];
    }
  };

  const handleTouchMove = (msgId: string) => {
    if (longPressTimeoutRef.current[msgId]) {
      clearTimeout(longPressTimeoutRef.current[msgId]);
      delete longPressTimeoutRef.current[msgId];
    }
  };

  // Listen for fullscreen changes globally
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  // Click-away listener for reaction trays
  useEffect(() => {
    const handleDocumentClick = () => {
      setActiveReactionMenu(null);
    };
    document.addEventListener("click", handleDocumentClick);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  const playWithAutoplayFallback = () => {
    if (!playerRef.current) return;

    try {
      // 1. Try to play unmuted first if we aren't explicitly muted
      if (!isMutedRef.current) {
        if (typeof playerRef.current.unMute === "function") {
          playerRef.current.unMute();
        }
        if (typeof playerRef.current.setVolume === "function") {
          playerRef.current.setVolume(volumeRef.current);
        }
      } else {
        if (typeof playerRef.current.mute === "function") {
          playerRef.current.mute();
        }
      }

      if (typeof playerRef.current.playVideo === "function") {
        playerRef.current.playVideo();
      }

      // 2. Schedule a check after 450ms to verify if the video successfully started playing
      setTimeout(() => {
        if (!playerRef.current) return;

        const state = typeof playerRef.current.getPlayerState === "function"
          ? playerRef.current.getPlayerState()
          : -1;

        // If it's not playing (1) and not buffering (3), it was blocked!
        if (state !== 1 && state !== 3) {
          console.log("[Autoplay] Playback was blocked by browser. Falling back to muted playback.");
          try {
            if (typeof playerRef.current.mute === "function") {
              playerRef.current.mute();
            }
            if (typeof playerRef.current.playVideo === "function") {
              playerRef.current.playVideo();
            }
            setIsAutoMuted(true);
          } catch (err) {
            console.error("Failed to execute muted autoplay fallback", err);
          }
        }
      }, 450);
    } catch (e) {
      console.warn("Error during playWithAutoplayFallback", e);
    }
  };

  useEffect(() => {
    if (!isAutoMuted) return;

    const handleGlobalClick = () => {
      if (playerRef.current) {
        try {
          if (typeof playerRef.current.unMute === "function") {
            playerRef.current.unMute();
          }
          if (typeof playerRef.current.setVolume === "function") {
            playerRef.current.setVolume(volumeRef.current);
          }
          setIsMuted(false);
        } catch (e) {
          console.warn("Failed to unmute on global click", e);
        }
      }
      setIsAutoMuted(false);
    };

    // Add listeners on capture phase to fire before normal events
    window.addEventListener("click", handleGlobalClick, { capture: true });
    window.addEventListener("touchstart", handleGlobalClick, { capture: true });

    return () => {
      window.removeEventListener("click", handleGlobalClick, { capture: true });
      window.removeEventListener("touchstart", handleGlobalClick, { capture: true });
    };
  }, [isAutoMuted]);

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;

    if (!document.fullscreenElement) {
      const enterFs =
        playerContainerRef.current.requestFullscreen ||
        (playerContainerRef.current as any).webkitRequestFullscreen ||
        (playerContainerRef.current as any).mozRequestFullScreen ||
        (playerContainerRef.current as any).msRequestFullscreen;
      if (enterFs) {
        enterFs.call(playerContainerRef.current).catch((err: any) => {
          console.error("Error entering fullscreen:", err);
        });
      }
    } else {
      const exitFs =
        document.exitFullscreen ||
        (document as any).webkitExitFullscreen ||
        (document as any).mozCancelFullScreen ||
        (document as any).msExitFullscreen;
      if (exitFs) {
        exitFs.call(document);
      }
    }
  };

  // Detect room code from URL params (for easy sharing)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get("room");
    if (roomParam) {
      setJoinCode(roomParam.toUpperCase());
    }
  }, []);

  // Scroll chat to bottom on new message locally (avoids pushing/scrolling the main page/viewport)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Keep roomId/inRoom in refs so reconnect closure always sees fresh values
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);
  useEffect(() => { inRoomRef.current = inRoom; }, [inRoom]);
  useEffect(() => { usernameRef.current = username; }, [username]);

  // Connect to WS and send setup actions
  const connectToWebSocket = (actionType: "create_room" | "join_room", targetRoomId?: string) => {
    setLoading(true);
    setError("");

    // Clear any previous reconnect attempt
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Determine WS protocol
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;

    console.log(`[WebSocket] Connecting to ${wsUrl}`);
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("[WebSocket] Connection established");

      if (actionType === "create_room") {
        socket.send(JSON.stringify({
          type: "create_room",
          payload: { username: usernameRef.current, videoId: selectedPresetId }
        }));
      } else {
        socket.send(JSON.stringify({
          type: "join_room",
          payload: { roomId: targetRoomId || roomIdRef.current, username: usernameRef.current }
        }));
      }
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const { type, payload } = msg;

        switch (type) {
          case "room_created":
          case "room_joined":
          case "room_rejoined": {
            const { roomId: rId, myId: mId, users: rUsers, currentVideoId: rVideoId, playbackState, chatHistory: rHistory, isReconnect, loveScore: rLoveScore } = payload;
            setRoomId(rId);
            roomIdRef.current = rId;
            setUsers(rUsers);
            if (rLoveScore !== undefined) {
              setLoveScore(rLoveScore);
            }
            if (mId) setMyId(mId);
            setLoading(false);
            setHasInteracted(true);
            setInRoom(true);
            inRoomRef.current = true;

            // On a silent reconnect, preserve chat history and don't re-push URL
            if (!isReconnect) {
              _setCurrentVideoId(rVideoId);
              setChatHistory(rHistory || []);
              setIsPlaying(playbackState.playing);

              // Push room code to URL query without fully reloading page
              const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${rId}`;
              window.history.pushState({ path: newUrl }, "", newUrl);
            } else {
              // Reconnect: only update video/state if they've changed (partner may have changed video while we were offline)
              if (rVideoId && rVideoId !== currentVideoIdRef.current) {
                _setCurrentVideoId(rVideoId);
                if (playerRef.current && typeof playerRef.current.loadVideoById === "function") {
                  isUpdatingPlayerRef.current = true;
                  playerRef.current.loadVideoById({ videoId: rVideoId, startSeconds: playbackState.currentTime || 0 });
                  setTimeout(() => { isUpdatingPlayerRef.current = false; }, 1500);
                }
              }
              setIsPlaying(playbackState.playing);
            }

            // Sync player position after short delay to let iframe load
            if (!isReconnect) {
              setTimeout(() => {
                if (playerRef.current && playerRef.current.seekTo) {
                  isUpdatingPlayerRef.current = true;
                  playerRef.current.seekTo(playbackState.currentTime, true);
                  if (playbackState.playing) {
                    playWithAutoplayFallback();
                  } else {
                    playerRef.current.pauseVideo();
                  }
                  setTimeout(() => { isUpdatingPlayerRef.current = false; }, 800);
                }
              }, 1000);
            }
            break;
          }

          case "user_joined": {
            const { users: rUsers } = payload;
            setUsers(rUsers);
            break;
          }

          case "user_left": {
            const { users: rUsers, user } = payload;
            setUsers(rUsers);
            if (user && user.id) {
              setIncomingCallMessage({ type: "user_left", payload: { senderId: user.id } });
              if (webrtcListenerRef.current) {
                webrtcListenerRef.current({ type: "user_left", payload: { senderId: user.id } });
              }
            }
            break;
          }

          case "user_reconnected": {
            const { users: rUsers, user, oldSocketId, newSocketId } = payload;
            setUsers(rUsers);
            if (user && user.id) {
              setIncomingCallMessage({ type: "user_reconnected", payload: { user, users: rUsers, oldSocketId, newSocketId } });
              if (webrtcListenerRef.current) {
                webrtcListenerRef.current({ type: "user_reconnected", payload: { user, users: rUsers, oldSocketId, newSocketId } });
              }
            }
            break;
          }

          case "peer_joined_video_call":
          case "peer_left_video_call":
          case "peer_present":
          case "webrtc_signal": {
            setIncomingCallMessage({ type, payload, _id: Date.now() + Math.random() });
            if (webrtcListenerRef.current) {
              webrtcListenerRef.current({ type, payload });
            }
            break;
          }

          case "player_sync": {
            const { playing, currentTime: remoteTime } = payload;
            if (!playerRef.current) return;

            console.log(`[Sync] Received remote state: playing=${playing}, time=${remoteTime}`);
            isUpdatingPlayerRef.current = true;
            setIsPlaying(playing);

            if (playing) {
              playWithAutoplayFallback();
            } else {
              if (typeof playerRef.current.pauseVideo === "function") {
                playerRef.current.pauseVideo();
              }
            }

            if (typeof playerRef.current.getCurrentTime === "function") {
              const localTime = playerRef.current.getCurrentTime() || 0;
              if (Math.abs(localTime - remoteTime) > 1.5 && typeof playerRef.current.seekTo === "function") {
                playerRef.current.seekTo(remoteTime, true);
                setCurrentTime(remoteTime);
              }
            }

            setTimeout(() => { isUpdatingPlayerRef.current = false; }, 1200);
            break;
          }

          case "video_changed": {
            const { videoId } = payload;
            console.log(`[Video] Video changed by partner: ${videoId}`);
            _setCurrentVideoId(videoId);
            setIsPlaying(false);
            setCurrentTime(0);
            // Imperatively load the video right away if player is ready
            if (playerRef.current && typeof playerRef.current.loadVideoById === "function") {
              isUpdatingPlayerRef.current = true;
              playerRef.current.loadVideoById({ videoId, startSeconds: 0 });
              setTimeout(() => { isUpdatingPlayerRef.current = false; }, 1500);
            }
            break;
          }

          case "chat_received": {
            const message: ChatMessage = payload;
            setChatHistory((prev) => [...prev, message]);
            if (message.sender !== usernameRef.current) {
              playNotificationSound();
            }
            if (message.text.startsWith("sent reaction: ")) {
              const emoji = message.text.replace("sent reaction: ", "").trim();
              triggerFlyingEmoji(emoji);
            }
            break;
          }

          case "heart_received": {
            const { loveScore: newScore, senderName } = payload;
            setLoveScore(newScore);
            setLastHeartSender(senderName);
            // Spawn 6 beautifully animated flying heart emojis!
            for (let i = 0; i < 6; i++) {
              setTimeout(() => {
                triggerFlyingEmoji("❤️");
              }, i * 150 + Math.random() * 100);
            }
            break;
          }

          case "reaction_updated": {
            const { messageId, reactions } = payload;
            setChatHistory((prev) =>
              prev.map((msg) =>
                msg.id === messageId ? { ...msg, reactions } : msg
              )
            );
            break;
          }

          case "typing_state": {
            const { username: typingUser, isTyping } = payload;
            setTypingUsers((prev) => ({
              ...prev,
              [typingUser]: isTyping
            }));
            break;
          }

          case "error": {
            setError(payload.message);
            setLoading(false);
            socket.close();
            break;
          }

          case "pong": {
            // Pong received — clear the dead-connection timeout
            if (pongTimeoutRef.current) {
              clearTimeout(pongTimeoutRef.current);
              pongTimeoutRef.current = null;
            }
            break;
          }

          default:
            console.warn(`[WebSocket] Unknown type received: ${type}`);
        }
      } catch (err) {
        console.error("[WebSocket] Failed parsing message", err);
      }
    };

    socket.onclose = (event) => {
      console.log("[WebSocket] Connection closed", event.code, event.reason);
      // Clear any pending pong timeout
      if (pongTimeoutRef.current) {
        clearTimeout(pongTimeoutRef.current);
        pongTimeoutRef.current = null;
      }
      // Auto-reconnect only if we are still supposed to be in a room
      if (inRoomRef.current && roomIdRef.current) {
        console.log("[WebSocket] Lost connection. Reconnecting in 3s...");
        reconnectTimeoutRef.current = setTimeout(() => {
          // Always join (not create) since room already exists on server
          connectToWebSocket("join_room", roomIdRef.current);
        }, 3000);
      }
    };

    socket.onerror = (err) => {
      console.error("[WebSocket] Error occurred", err);
      setLoading(false);
    };
  };

  // Keep-alive ping with pong timeout — detects silent socket drops
  useEffect(() => {
    const PING_INTERVAL = 15000; // every 15s — keeps connection alive through idle periods
    const PONG_TIMEOUT = 8000;   // expect pong within 8s

    const pingInterval = setInterval(() => {
      const socket = socketRef.current;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "ping" }));

        // If no pong in 8s, the connection is dead — close to trigger onclose/reconnect
        pongTimeoutRef.current = setTimeout(() => {
          console.warn("[WebSocket] Pong timeout — connection appears dead. Closing to reconnect.");
          if (socketRef.current) {
            socketRef.current.close();
          }
        }, PONG_TIMEOUT);
      } else if (socket && socket.readyState === WebSocket.CLOSED && inRoomRef.current && roomIdRef.current) {
        // Socket is fully closed but we're still in a room — reconnect immediately
        console.warn("[WebSocket] Socket found CLOSED during ping check — reconnecting now.");
        if (!reconnectTimeoutRef.current) {
          connectToWebSocket("join_room", roomIdRef.current);
        }
      }
    }, PING_INTERVAL);

    return () => {
      clearInterval(pingInterval);
      if (pongTimeoutRef.current) clearTimeout(pongTimeoutRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  // Clean socket on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  // Initialize YT Player API when we first get a video to play
  // This runs whenever inRoom or currentVideoId changes, but only creates the player once.
  const playerInitializedRef = useRef(false);

  useEffect(() => {
    // Only run inside a room and only when we actually have a video to load
    if (!inRoom || !currentVideoId) return;
    // Only initialize once — after that, loadVideoById handles video changes
    if (playerInitializedRef.current) return;

    let destroyed = false;
    let safetyTimeout: any = null;

    loadYouTubeAPI(() => {
      if (destroyed) return;

      // Mark as initialized immediately to prevent double-init
      playerInitializedRef.current = true;

      const videoIdToLoad = currentVideoIdRef.current || currentVideoId;
      console.log(`[Player] Initializing YouTube player with video ID: ${videoIdToLoad}`);
      isUpdatingPlayerRef.current = true;
      setIsPlayerReady(false);

      // Safety fallback: if YT doesn't fire ready event in 6s, unblock the UI
      safetyTimeout = setTimeout(() => {
        if (!destroyed) {
          console.warn("[Player] YouTube Player did not fire onReady within timeout.");
          setIsPlayerReady(true);
          isUpdatingPlayerRef.current = false;
        }
      }, 6000);

      // Destroy any lingering player instance
      if (playerRef.current && playerRef.current.destroy) {
        try { playerRef.current.destroy(); } catch (e) { /* ignore */ }
        playerRef.current = null;
      }

      playerRef.current = new (window as any).YT.Player("love-player", {
        height: "100%",
        width: "100%",
        videoId: videoIdToLoad,   // ALWAYS provide a real video ID at init time
        host: "https://www.youtube.com",
        playerVars: {
          origin: window.location.origin,
          enablejsapi: 1,
          controls: 1,
          disablekb: 0,
          fs: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          iv_load_policy: 3,
          autoplay: 0,   // We control play manually after ready
          mute: 1,
        },
        events: {
          onReady: (event: any) => {
            if (safetyTimeout) clearTimeout(safetyTimeout);
            console.log("[Player] YouTube Player Ready");
            setIsPlayerReady(true);

            event.target.setVolume(volume);
            // Start muted to satisfy browser autoplay policy; user can unmute
            event.target.mute();

            // Check if a newer video was queued while the player was initializing
            const latestVideoId = currentVideoIdRef.current;
            if (latestVideoId && latestVideoId !== videoIdToLoad) {
              console.log(`[Player] onReady: a newer video was queued (${latestVideoId}), loading it now.`);
              event.target.loadVideoById({ videoId: latestVideoId, startSeconds: 0 });
            }
            // else: the videoId provided at init time is already loaded by the iframe

            setDuration(event.target.getDuration() || 0);

            setTimeout(() => {
              if (!destroyed) isUpdatingPlayerRef.current = false;
            }, 1200);
          },
          onError: (event: any) => {
            if (safetyTimeout) clearTimeout(safetyTimeout);
            console.error("[Player] YouTube Player Error:", event.data);
            setIsPlayerReady(true);
            isUpdatingPlayerRef.current = false;
          },
          onStateChange: (event: any) => {
            const playerState = event.data;
            console.log(`[Player] YouTube State Changed: ${playerState}`);

            if (playerState === 1 || playerState === 3) {
              setIsPlaying(true);
            } else if (playerState === 2 || playerState === 0 || playerState === 5 || playerState === -1) {
              setIsPlaying(false);
            }

            if (isUpdatingPlayerRef.current) return;
            if (!hasInteractedRef.current) return;
            if (playerState === 3 || playerState === -1) return;

            if (playerState === 1) {
              sendPlayerSync(true, playerRef.current.getCurrentTime() || 0);
            } else if (playerState === 2) {
              sendPlayerSync(false, playerRef.current.getCurrentTime() || 0);
            } else if (playerState === 0) {
              sendPlayerSync(false, 0);
            }
          }
        }
      });
    });

    return () => {
      destroyed = true;
      if (safetyTimeout) clearTimeout(safetyTimeout);
    };
  }, [inRoom, currentVideoId]);

  // Cleanup player on room exit
  useEffect(() => {
    if (inRoom) return;
    setIsPlayerReady(false);
    playerInitializedRef.current = false;
    if (playerRef.current && playerRef.current.destroy) {
      try { playerRef.current.destroy(); } catch (e) { /* ignore */ }
      playerRef.current = null;
    }
  }, [inRoom]);

  // No separate video-change effect needed — video loading is now done
  // imperatively in handleVideoChange and the video_changed WS handler,
  // so the player always responds immediately without effect race conditions.

  // Track and update the custom slider position when video is playing
  useEffect(() => {
    let timer: any;
    if (inRoom && isPlaying && playerRef.current && playerRef.current.getCurrentTime) {
      timer = setInterval(() => {
        const time = playerRef.current.getCurrentTime();
        setCurrentTime(time);

        const dur = playerRef.current.getDuration();
        if (dur && dur !== duration) {
          setDuration(dur);
        }
      }, 500);
    }
    return () => clearInterval(timer);
  }, [inRoom, isPlaying, duration]);

  // WebSocket emission helpers
  const sendPlayerSync = (playing: boolean, time: number) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      console.log(`[Sync] Emitting playback sync: playing=${playing}, time=${time}`);
      socketRef.current.send(JSON.stringify({
        type: "player_state",
        payload: { playing, currentTime: time }
      }));
    }
  };

  const handleVideoChange = (videoId: string) => {
    if (!videoId) return;

    // Update state and ref
    _setCurrentVideoId(videoId);
    setIsPlaying(false);
    setCurrentTime(0);

    // Imperatively load video in player right now — no effect chain needed
    if (playerRef.current && typeof playerRef.current.loadVideoById === "function") {
      console.log(`[Player] handleVideoChange: loading ${videoId}`);
      isUpdatingPlayerRef.current = true;
      playerRef.current.loadVideoById({ videoId, startSeconds: 0 });
      setTimeout(() => { isUpdatingPlayerRef.current = false; }, 1500);
    } else {
      console.warn("[Player] handleVideoChange: player not ready, video will load on player init");
    }

    // Broadcast the change to the partner
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "change_video",
        payload: { videoId }
      }));
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const videoId = extractYouTubeId(videoInput);
    if (!videoId) {
      alert("Oops! That doesn't look like a valid YouTube URL. Try pasting a watch link or sharing link!");
      return;
    }
    handleVideoChange(videoId);
    setVideoInput("");
  };

  const extractYouTubeId = (url: string): string | null => {
    const trimmed = url.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = trimmed.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Play/Pause Action
  const togglePlay = () => {
    if (!playerRef.current) return;

    setHasInteracted(true); // Any interaction with play/pause button counts as a user gesture

    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);

    isUpdatingPlayerRef.current = true;
    if (nextPlaying) {
      playWithAutoplayFallback();
    } else {
      if (typeof playerRef.current.pauseVideo === "function") {
        playerRef.current.pauseVideo();
      }
    }

    const time = (typeof playerRef.current.getCurrentTime === "function")
      ? playerRef.current.getCurrentTime()
      : currentTime;
    sendPlayerSync(nextPlaying, time);

    setTimeout(() => {
      isUpdatingPlayerRef.current = false;
    }, 1200);
  };

  const unlockAndSync = () => {
    setHasInteracted(true);
    if (playerRef.current) {
      try {
        isUpdatingPlayerRef.current = true;
        playWithAutoplayFallback();
        setIsPlaying(true);
        const time = (typeof playerRef.current.getCurrentTime === "function")
          ? playerRef.current.getCurrentTime()
          : currentTime;
        sendPlayerSync(true, time);
        setTimeout(() => {
          isUpdatingPlayerRef.current = false;
        }, 1200);
      } catch (e) {
        console.warn("Error unlocking video player", e);
        isUpdatingPlayerRef.current = false;
      }
    }
  };

  // Seek Actions
  const handleSeekSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
  };

  const handleSeekRelease = () => {
    if (playerRef.current && typeof playerRef.current.seekTo === "function") {
      isUpdatingPlayerRef.current = true;
      playerRef.current.seekTo(currentTime, true);
      sendPlayerSync(isPlaying, currentTime);
      setTimeout(() => { isUpdatingPlayerRef.current = false; }, 500);
    }
  };

  // Seek Backward Action (10s)
  const seekBackward = () => {
    if (!playerRef.current || typeof playerRef.current.getCurrentTime !== "function") return;
    const curTime = playerRef.current.getCurrentTime() || 0;
    const newTime = Math.max(0, curTime - 10);
    setCurrentTime(newTime);

    isUpdatingPlayerRef.current = true;
    playerRef.current.seekTo(newTime, true);
    sendPlayerSync(isPlaying, newTime);
    setTimeout(() => { isUpdatingPlayerRef.current = false; }, 500);
  };

  // Seek Forward Action (10s)
  const seekForward = () => {
    if (!playerRef.current || typeof playerRef.current.getCurrentTime !== "function") return;
    const curTime = playerRef.current.getCurrentTime() || 0;
    const dur = (typeof playerRef.current.getDuration === "function")
      ? playerRef.current.getDuration()
      : duration;
    const newTime = Math.min(dur, curTime + 10);
    setCurrentTime(newTime);

    isUpdatingPlayerRef.current = true;
    playerRef.current.seekTo(newTime, true);
    sendPlayerSync(isPlaying, newTime);
    setTimeout(() => { isUpdatingPlayerRef.current = false; }, 500);
  };

  // Restart / Replay Video
  const restartVideo = () => {
    if (!playerRef.current || typeof playerRef.current.seekTo !== "function") return;
    setCurrentTime(0);

    isUpdatingPlayerRef.current = true;
    playerRef.current.seekTo(0, true);
    if (typeof playerRef.current.playVideo === "function") {
      playerRef.current.playVideo();
    }
    setIsPlaying(true);
    sendPlayerSync(true, 0);
    setTimeout(() => { isUpdatingPlayerRef.current = false; }, 500);
  };

  // Volume Action
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setVolume(val);
    if (playerRef.current && typeof playerRef.current.setVolume === "function") {
      playerRef.current.setVolume(val);
    }
    if (val > 0 && isMuted) {
      setIsMuted(false);
      if (playerRef.current && typeof playerRef.current.unMute === "function") {
        playerRef.current.unMute();
      }
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (nextMute) {
      if (typeof playerRef.current.mute === "function") {
        playerRef.current.mute();
      }
    } else {
      if (typeof playerRef.current.unMute === "function") {
        playerRef.current.unMute();
      }
      if (typeof playerRef.current.setVolume === "function") {
        playerRef.current.setVolume(volume);
      }
    }
  };

  // Chat Actions
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    // If socket is not open, attempt to reconnect then abort this send
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      console.warn("[Chat] Socket not open — triggering reconnect before sending.");
      if (inRoomRef.current && roomIdRef.current && !reconnectTimeoutRef.current) {
        connectToWebSocket("join_room", roomIdRef.current);
      }
      // Keep the message in the input so the user can re-send after reconnect
      setError("Reconnecting… please try sending again in a moment.");
      setTimeout(() => setError(""), 4000);
      return;
    }

    setError("");
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTypingSentRef.current) {
      socketRef.current.send(JSON.stringify({
        type: "typing",
        payload: { isTyping: false }
      }));
      isTypingSentRef.current = false;
    }

    socketRef.current.send(JSON.stringify({
      type: "chat_message",
      payload: { text: chatInput.trim() }
    }));
    setChatInput("");
  };

  const handleChatInputChange = (value: string) => {
    setChatInput(value);

    if (!socketRef.current) return;

    if (!isTypingSentRef.current) {
      isTypingSentRef.current = true;
      socketRef.current.send(JSON.stringify({
        type: "typing",
        payload: { isTyping: true }
      }));
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (socketRef.current && isTypingSentRef.current) {
        socketRef.current.send(JSON.stringify({
          type: "typing",
          payload: { isTyping: false }
        }));
        isTypingSentRef.current = false;
      }
    }, 2000);
  };

  const toggleMessageReaction = (messageId: string, emoji: string) => {
    if (!socketRef.current) return;
    socketRef.current.send(JSON.stringify({
      type: "message_reaction",
      payload: { messageId, emoji }
    }));
  };

  const sendReaction = (emoji: string) => {
    if (!socketRef.current) return;
    socketRef.current.send(JSON.stringify({
      type: "chat_message",
      payload: { text: `sent reaction: ${emoji}` }
    }));
  };

  const sendHeart = () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({
      type: "send_heart"
    }));
  };

  // Copy share link helper — uses Web Share API on mobile (works on HTTP too)
  const copyInviteLink = async () => {
    const shareUrl = `${window.location.origin}?room=${roomId}`;
    const shareData = {
      title: "LoveStream Watch Party 💖",
      text: `Join my LoveStream room! Room code: ${roomId}`,
      url: shareUrl,
    };

    // On mobile: use native share sheet (works on HTTP, no clipboard permission needed)
    if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      try {
        await navigator.share(shareData);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        return;
      } catch (err: any) {
        // User cancelled share — don't show error, just fall through to copy
        if (err?.name === "AbortError") return;
      }
    }

    // Desktop / HTTPS: use Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        return;
      } catch {
        // fall through to execCommand
      }
    }

    // Legacy execCommand fallback (HTTP on desktop)
    fallbackCopy(shareUrl);
  };

  const fallbackCopy = (text: string) => {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0;";
      document.body.appendChild(el);
      el.focus();
      el.select();
      el.setSelectionRange(0, el.value.length);
      const success = document.execCommand("copy");
      document.body.removeChild(el);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
      console.warn("Clipboard copy failed", err);
    }
  };

  // Floating Emoji Logic
  const triggerFlyingEmoji = (emoji: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const left = Math.floor(Math.random() * 80) + 10; // 10% to 90%
    setFlyingEmojis((prev) => [...prev, { id, emoji, left }]);

    setTimeout(() => {
      setFlyingEmojis((prev) => prev.filter((e) => e.id !== id));
    }, 2500);
  };

  // Format video time helper
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Create Room Flow
  const handleCreateRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Please choose a nickname!");
      return;
    }
    connectToWebSocket("create_room");
  };

  // Join Room Flow
  const handleJoinRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Please choose a nickname!");
      return;
    }
    if (!joinCode.trim()) {
      setError("Please enter a room code!");
      return;
    }
    connectToWebSocket("join_room", joinCode.toUpperCase().trim());
  };

  const handleLeaveRoom = () => {
    inRoomRef.current = false;
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setInRoom(false);
    setRoomId("");
    roomIdRef.current = "";
    setChatHistory([]);
    setIsPlaying(false);
    setCurrentTime(0);
    setUsers([]);
    setMyId("");
    setLoveScore(0);
    setLastHeartSender(null);
    setError("");
    playerInitializedRef.current = false;

    // Clear URL param
    const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    window.history.pushState({ path: newUrl }, "", newUrl);
  };

  return (
    <div className="min-h-screen bg-[#FF2E63] text-black flex flex-col font-sans select-none pb-8 p-2.5 xs:p-4 md:p-6 gap-4 sm:gap-6">
      {/* Absolute floating emojis rendering across whole screen */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
        {flyingEmojis.map((e) => (
          <div
            key={e.id}
            style={{ left: `${e.left}%` }}
            className="absolute bottom-10 text-5xl animate-float-emoji select-none"
          >
            {e.emoji}
          </div>
        ))}
      </div>

      <div className="max-w-7xl w-full mx-auto flex flex-col gap-4 sm:gap-6 flex-1">
        {/* HEADER BAR (Bento Grid Header Theme) */}
        {!inRoom ? (
          <header className="flex justify-center items-center w-full">
            {/* Brand Block Centered */}
            <div className="bg-black text-white px-3.5 py-2.5 xs:px-5 xs:py-3.5 sm:px-8 sm:py-5 border-4 border-black shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] sm:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] flex items-center justify-center gap-2 xs:gap-3 sm:gap-4">
              <div className="bg-[#FF2E63] p-1 xs:p-1.5 border-2 border-white rotate-[-3deg] inline-block shrink-0">
                <Heart className="w-5 h-5 sm:w-6 h-6 text-white fill-white animate-pulse" />
              </div>
              <h1 className="text-xl xs:text-2xl sm:text-4xl md:text-5xl font-display font-black italic tracking-tighter leading-none select-none">
                LOVE<span className="text-[#FF2E63] text-glow-pink">STREAM</span>
              </h1>
            </div>
          </header>
        ) : (
          <header className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 w-full">
            {/* Brand Block Left-Aligned */}
            <div className="bg-black text-white px-3.5 py-2.5 xs:px-5 xs:py-3.5 sm:px-8 sm:py-5 border-4 border-black shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] sm:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] flex items-center justify-center lg:justify-start gap-2 xs:gap-3 sm:gap-4 shrink-0">
              <div className="bg-[#FF2E63] p-1 xs:p-1.5 border-2 border-white rotate-[-3deg] inline-block shrink-0">
                <Heart className="w-5 h-5 sm:w-6 h-6 text-white fill-white animate-pulse" />
              </div>
              <h1 className="text-xl xs:text-2xl sm:text-4xl md:text-5xl font-display font-black italic tracking-tighter leading-none select-none">
                LOVE<span className="text-[#FF2E63] text-glow-pink">STREAM</span>
              </h1>
            </div>

            {/* Info Blocks Right-Aligned */}
            <div className="grid grid-cols-2 sm:flex sm:flex-row gap-4 w-full lg:w-auto">
              {/* Room Code Badge */}
              <div className="bg-white border-4 border-black p-4 flex flex-col justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] col-span-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 font-mono">Room Code</span>
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-display font-black tracking-widest text-black">{roomId}</span>
                </div>
              </div>

              {/* Connected Users Badge */}
              <div className="bg-black text-white border-4 border-black p-4 flex flex-col justify-center shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] col-span-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#FF2E63] font-mono">Connected</span>
                <span className="text-xs sm:text-sm font-bold uppercase tracking-tight flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#facc15]" />
                  <span className="truncate max-w-[120px] sm:max-w-none">
                    {users.map(u => u.username).join(" + ") || username}
                  </span>
                </span>
              </div>

              {/* Leave Button */}
              <div className="col-span-2 sm:col-span-1 flex items-stretch">
                <button
                  onClick={handleLeaveRoom}
                  className="w-full h-full border-4 border-black bg-white hover:bg-[#facc15] text-black font-mono font-bold text-xs py-3 px-6 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none"
                  id="leave-room-button"
                >
                  <LogOut className="w-4 h-4" />
                  LEAVE
                </button>
              </div>
            </div>
          </header>
        )}

        {/* LANDING SCREEN / SETUP */}
        {!inRoom ? (
          <main className="flex-1 max-w-7xl w-full mx-auto py-4 sm:py-8 flex flex-col gap-8 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
              {/* 1. BRAND BLOCK: Top on all screens (Left 7 cols on desktop) */}
              <div className="lg:col-span-7 flex flex-col gap-6 w-full order-1 lg:order-1 lg:row-start-1 lg:row-end-2">
                {/* Tagline Display */}
                <div className="text-center lg:text-left w-full bg-white border-4 border-black p-4 xs:p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                  <div className="inline-flex items-center gap-2 bg-[#FF2E63] text-white px-3.5 py-1.5 border-2 border-black text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider mb-3 sm:mb-4">
                    <Sparkles className="w-3.5 h-3.5 fill-white" /> Synced Hearts, Synced Streams
                  </div>
                  <h1 className="text-2xl xs:text-3xl sm:text-5xl md:text-6xl font-display font-extrabold tracking-tight mb-3 sm:mb-4 text-black italic uppercase leading-[0.95] sm:leading-none">
                    WATCH TOGETHER IN PERFECT SYNC.
                  </h1>
                  <p className="text-black/85 text-xs sm:text-base font-medium leading-relaxed">
                    LoveStream makes it incredibly simple to sync video playback and chat with your partner or friend in real-time. Just enter a nickname, create a room, and watch together.
                  </p>
                </div>
              </div>

              {/* 2. SYNC PLAYGROUND: Second on mobile/tablet (order-2), Right 5 cols on desktop */}
              <div className="lg:col-span-5 w-full flex flex-col gap-4 order-2 lg:order-2 lg:col-start-8 lg:row-start-1 lg:row-end-3">
                <MockSyncShowcase
                  selectedPresetId={selectedPresetId}
                  onSelectPreset={setSelectedPresetId}
                />
              </div>

              {/* 3. SETUP ROOM CARDS: Third on mobile/tablet (order-3), Left 7 cols on desktop below Brand */}
              <div className="lg:col-span-7 w-full flex flex-col gap-6 order-3 lg:order-3 lg:row-start-2 lg:row-end-3">
                {/* Setup Cards - Create or Join (Bento Layout style) */}
                <div className="grid md:grid-cols-2 gap-6 w-full">
                  {/* Create Room Panel */}
                  <div className="border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-2">
                        <h2 className="text-2xl font-display font-black text-black italic">1. CREATE ROOM</h2>
                        <span className="text-xs bg-black text-white px-2 py-1 font-mono font-bold border border-black">HOST</span>
                      </div>
                      <p className="text-black/70 text-xs mb-6 font-medium leading-relaxed">
                        Start a private watch session and invite one other person in using a unique room link.
                      </p>
                      <form onSubmit={handleCreateRoomSubmit} className="space-y-4">
                        <div>
                          <label className="block text-xs font-mono font-bold text-black mb-2 uppercase tracking-wider">
                            Your Nickname:
                          </label>
                          <input
                            type="text"
                            maxLength={15}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="e.g. Honey, Cupid, Bestie"
                            className="w-full border-4 border-black bg-zinc-50 p-3 text-black font-mono placeholder:text-gray-500 focus:outline-none focus:bg-white"
                            required
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full border-4 border-black bg-[#FF2E63] text-white font-display font-black uppercase p-4 hover:bg-black hover:text-white transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
                          id="create-room-submit"
                        >
                          {loading ? "CONNECTING..." : "GENERATE ROOM 💖"}
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Join Room Panel */}
                  <div className="border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-2">
                        <h2 className="text-2xl font-display font-black text-black italic">2. JOIN ROOM</h2>
                        <span className="text-xs bg-[#facc15] text-black px-2 py-1 font-mono font-bold border border-black">INVITEE</span>
                      </div>
                      <p className="text-black/70 text-xs mb-6 font-medium leading-relaxed">
                        Join an existing watch party with a 4-character code or link shared by your partner.
                      </p>
                      <form onSubmit={handleJoinRoomSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label className="block text-xs font-mono font-bold text-black mb-2 uppercase tracking-wider">
                              Your Nickname:
                            </label>
                            <input
                              type="text"
                              maxLength={15}
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              placeholder="e.g. Sweetheart, Mate"
                              className="w-full border-4 border-black bg-zinc-50 p-3 text-black font-mono placeholder:text-gray-500 focus:outline-none focus:bg-white"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-mono font-bold text-black mb-2 uppercase tracking-wider">
                              4-Char Room Code:
                            </label>
                            <input
                              type="text"
                              maxLength={4}
                              value={joinCode}
                              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                              placeholder="e.g. LOVE"
                              className="w-full border-4 border-black bg-zinc-50 p-3 text-black font-mono placeholder:text-gray-500 focus:outline-none focus:bg-white text-center tracking-widest font-black text-lg"
                              required
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full border-4 border-black bg-[#facc15] text-black font-display font-black uppercase p-4 hover:bg-black hover:text-white transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
                          id="join-room-submit"
                        >
                          {loading ? "CONNECTING..." : "ENTER WATCH PARTY 💞"}
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="w-full mt-6 border-4 border-black bg-black text-[#FF2E63] p-4 font-mono text-sm flex items-center gap-3 shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] animate-bounce">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span className="font-bold">{error}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tech/Theme Detail Banner */}
            <div className="text-center text-xs font-mono text-black font-bold border-t-2 border-black pt-4">
              LOVESTREAM Watch Party • Active Duplex Sync Socket
            </div>
          </main>
        ) : (
          /* WATCH PARTY BENTO GRID ROOM VIEW */
          <main className="flex-1 w-full mx-auto flex flex-col gap-6">

            {/* SYNC STATUS BAR */}
            <section className="border-4 border-black bg-white p-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full animate-fade-in">
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto text-center sm:text-left">
                <span className="bg-black text-[#FF2E63] border-2 border-black text-xs font-mono font-bold px-3 py-1.5 uppercase animate-pulse-sync shrink-0">
                  {users.length === 2 ? "💖 SYNCED STATUS" : "⏳ WAITING"}
                </span>
                <p className="font-mono text-xs sm:text-sm font-bold text-black uppercase tracking-tight leading-normal">
                  {users.length === 2 ? (
                    <span className="inline-block">
                      Double Sync Lock Active • Watching with{" "}
                      <span className="bg-[#FF2E63] text-white font-sans font-extrabold px-2 py-0.5 border border-black uppercase inline-block">
                        {users.find((u) => u.id !== myId)?.username || "Partner"}
                      </span>
                    </span>
                  ) : (
                    <span className="text-black/80 font-bold">
                      Invite your partner or friend by copying the room code above!
                    </span>
                  )}
                </p>
              </div>

              {/* Quick Share action button */}
              <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-center md:justify-end">
                <button
                  onClick={copyInviteLink}
                  className="w-full md:w-auto border-4 border-black bg-[#facc15] text-black hover:bg-black hover:text-white font-display font-black text-xs py-2 px-4 flex items-center justify-center gap-2 cursor-pointer transition-all active:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none"
                  id="copy-invite-link-bar"
                >
                  {copied ? <Heart className="w-4 h-4 fill-current animate-bounce" /> : <Share2 className="w-4 h-4" />}
                  {copied ? "COPIED TO CLIPBOARD!" : "COPY SHARABLE WATCH LINK"}
                </button>
              </div>
            </section>

            {/* REAL-TIME "WHO'S WATCHING" PARTICIPANT TRACKER */}
            <section className="border-4 border-black bg-[#fbfbfb] p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="bg-[#FF2E63] text-white p-2 border-2 border-black rotate-[-1deg] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-display font-black text-sm uppercase tracking-tight text-black">Who's Watching 🍿</h3>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase font-black tracking-wide">Real-time Connected Streamers</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {users.map((u, idx) => {
                  const isUserSelf = u.username === username;
                  return (
                    <div
                      key={u.id || idx}
                      className="flex items-center gap-2.5 bg-white border-2 border-black py-1.5 px-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all cursor-default select-none group shrink-0"
                    >
                      {/* Pulsing Status indicator */}
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>

                      {/* Initials Avatar */}
                      <div className={`w-8 h-8 rounded-none border-2 border-black flex items-center justify-center font-display font-black text-xs uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-transform group-hover:scale-105 ${getAvatarColor(u.username)}`}>
                        {getInitials(u.username)}
                      </div>

                      {/* Username detail */}
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-extrabold uppercase text-black leading-none">
                          {u.username}
                        </span>
                        {isUserSelf && (
                          <span className="text-[#FF2E63] font-sans font-black lowercase text-[9px] tracking-tight leading-none mt-0.5">
                            (you)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {users.length === 1 && (
                  <div className="text-[10px] font-mono text-zinc-400 uppercase font-bold animate-pulse py-1">
                    • waiting for partner to join...
                  </div>
                )}
              </div>
            </section>



            {/* MAIN ROOM CONTENT GRID (Bento Box Organization) */}
            <div className="grid lg:grid-cols-12 gap-6 items-stretch">

              {/* LEFT AREA: PLAYER AND CONTROLS (8/12 cols) */}
              <div className="lg:col-span-8 flex flex-col gap-6">

                {/* VIDEO PLAYER BENTO BOX */}
                <section
                  ref={playerContainerRef}
                  className={`bg-black relative flex flex-col overflow-hidden transition-all duration-300 ${isFullscreen
                    ? "w-full h-full p-2 sm:p-4 border-0 shadow-none rounded-none"
                    : "border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
                    }`}
                >
                  {/* Embedded Status Overlay */}
                  <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10 bg-[#FF2E63] text-white px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-mono font-bold uppercase border-2 border-black flex items-center gap-1.5 sm:gap-2">
                    <Tv className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                    LIVE SYNCED • {formatTime(currentTime)} / {formatTime(duration)}
                  </div>

                  {/* The actual Youtube Player placeholder (Memoized to prevent React destruction) */}
                  <div className={`w-full ${isFullscreen ? 'flex-1 min-h-0' : 'aspect-video'} bg-zinc-900 border-b-4 border-black relative`}>
                    <YouTubePlayerPlaceholder />

                    {isAutoMuted && (
                      <button
                        onClick={() => {
                          if (playerRef.current) {
                            try {
                              if (typeof playerRef.current.unMute === "function") {
                                playerRef.current.unMute();
                              }
                              if (typeof playerRef.current.setVolume === "function") {
                                playerRef.current.setVolume(volume);
                              }
                              setIsMuted(false);
                            } catch (e) {
                              console.warn("Error unmuting", e);
                            }
                          }
                          setIsAutoMuted(false);
                        }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-3 text-white z-40 cursor-pointer"
                      >
                        <div className="bg-[#FF2E63] text-white font-mono text-xs sm:text-sm font-black uppercase py-3 px-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-[#FF2E63] transition-all flex items-center gap-2 animate-pulse">
                          <span className="text-base sm:text-lg">🔊</span> CLICK TO UNMUTE SOUND
                        </div>
                        <p className="text-[10px] sm:text-xs font-mono text-gray-300">Autoplay started muted to satisfy browser policies.</p>
                      </button>
                    )}

                    {/* No video loaded yet — prompt the user */}
                    {!currentVideoId && (
                      <div className="absolute inset-0 bg-[#0f0f15] flex flex-col items-center justify-center gap-4 text-white">
                        <div className="text-5xl">🎬</div>
                        <div className="text-center">
                          <p className="font-display font-black uppercase tracking-tight text-base sm:text-lg text-white">No Video Loaded</p>
                          <p className="font-mono text-xs text-gray-400 mt-1">Paste a YouTube URL below and click <span className="text-[#FF2E63] font-bold">Change Video</span></p>
                        </div>
                      </div>
                    )}

                    {/* Video is loading — show spinner */}
                    {currentVideoId && !isPlayerReady && (
                      <div className="absolute inset-0 bg-[#0f0f15] flex flex-col items-center justify-center gap-3 text-white">
                        <div className="border-4 border-[#FF2E63] border-t-transparent rounded-full w-12 h-12 animate-spin"></div>
                        <p className="font-mono text-xs tracking-wider">LOADING VIDEO...</p>
                      </div>
                    )}
                  </div>

                  {/* Custom Neobrutalist controls directly attached inside the Player card */}
                  <div className="bg-white p-4 flex flex-col gap-4">
                    {/* Playhead Slider Track */}
                    <div className="flex items-center gap-3 font-mono text-xs text-black">
                      <span className="font-black bg-black text-white px-2 py-1 border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0 select-none">
                        {formatTime(currentTime)}
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleSeekSlider}
                        onMouseUp={handleSeekRelease}
                        onTouchEnd={handleSeekRelease}
                        className="flex-1 h-3 bg-zinc-100 border-2 border-black appearance-none cursor-pointer accent-[#FF2E63] rounded-none focus:outline-none"
                      />
                      <span className="font-bold text-black/70 bg-zinc-100 border-2 border-black px-2 py-1 shrink-0 select-none">
                        {formatTime(duration)}
                      </span>
                    </div>

                    {/* Primary control bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                      {/* Synchronized Action Group (Play, Pause, Skip Back, Skip Forward, Restart) */}
                      <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">

                        {/* Backward 10s */}
                        <button
                          onClick={seekBackward}
                          className="border-3 border-black w-11 h-11 bg-white hover:bg-[#facc15] text-black flex items-center justify-center cursor-pointer transition-all active:translate-y-0.5 active:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                          title="Rewind 10 Seconds"
                          id="btn-rewind"
                        >
                          <SkipBack className="w-5 h-5 fill-current" />
                        </button>

                        {/* Play/Pause Button */}
                        <button
                          onClick={togglePlay}
                          className="border-3 border-black w-12 h-12 bg-[#FF2E63] hover:bg-black text-white hover:text-[#FF2E63] flex items-center justify-center cursor-pointer transition-all active:scale-95 active:shadow-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                          title={isPlaying ? "Pause" : "Play"}
                          id="play-pause-toggle-bento"
                        >
                          {isPlaying ? (
                            <Pause className="w-5 h-5 fill-current" />
                          ) : (
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          )}
                        </button>

                        {/* Forward 10s */}
                        <button
                          onClick={seekForward}
                          className="border-3 border-black w-11 h-11 bg-white hover:bg-[#facc15] text-black flex items-center justify-center cursor-pointer transition-all active:translate-y-0.5 active:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                          title="Fast Forward 10 Seconds"
                          id="btn-forward"
                        >
                          <SkipForward className="w-5 h-5 fill-current" />
                        </button>

                        {/* Restart / Replay */}
                        <button
                          onClick={restartVideo}
                          className="border-3 border-black w-11 h-11 bg-zinc-100 hover:bg-[#FF2E63] hover:text-white text-black flex items-center justify-center cursor-pointer transition-all active:translate-y-0.5 active:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                          title="Restart Video"
                          id="btn-restart"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>

                        {/* Playing/Paused State badge */}
                        <div className="flex items-center gap-2 bg-[#facc15] border-2 border-black px-2.5 py-1.5 font-mono text-[10px] font-black text-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          <Clock className="w-3 h-3" />
                          <span>{isPlaying ? "PLAYING" : "PAUSED"}</span>
                        </div>
                      </div>

                      {/* Right-aligned action controls */}
                      <div className="flex items-center justify-center sm:justify-end gap-3 flex-wrap">
                        {/* Volume Slider Block */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 bg-zinc-50 border-2 border-black p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] select-none">
                          <button
                            onClick={toggleMute}
                            className="text-black hover:text-[#FF2E63] cursor-pointer shrink-0 p-1"
                            title={isMuted ? "Unmute" : "Mute"}
                          >
                            {isMuted || volume === 0 ? (
                              <VolumeX className="w-4 h-4 text-[#FF2E63] animate-pulse" />
                            ) : (
                              <Volume2 className="w-4 h-4" />
                            )}
                          </button>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="w-16 sm:w-20 h-2 bg-zinc-200 border border-black appearance-none cursor-pointer accent-black"
                          />
                          <span className="font-mono text-[10px] font-bold text-black w-8 text-right shrink-0">{isMuted ? 0 : volume}%</span>
                        </div>

                        {/* Fullscreen Toggle Button */}
                        <button
                          onClick={toggleFullscreen}
                          className="border-3 border-black w-11 h-11 bg-white hover:bg-[#FF2E63] hover:text-white text-black flex items-center justify-center cursor-pointer transition-all active:translate-y-0.5 active:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                          id="btn-fullscreen"
                        >
                          {isFullscreen ? (
                            <Minimize className="w-5 h-5" />
                          ) : (
                            <Maximize className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* VIDEO URL INPUT & SEARCH BENTO BOX (Queued Up Card) */}
                <section className="border-4 border-black bg-white p-4 sm:p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="text-lg font-display font-black uppercase whitespace-nowrap text-black tracking-tight italic">
                      Queued Up
                    </div>
                    <form onSubmit={handleUrlSubmit} className="flex-1 w-full flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={videoInput}
                        onChange={(e) => setVideoInput(e.target.value)}
                        placeholder="Paste YouTube Link (e.g. https://www.youtube.com/watch?v=...) 🍿"
                        className="flex-1 border-2 border-black bg-zinc-50 p-3 font-mono text-xs text-black placeholder:text-gray-400 focus:outline-none focus:bg-white"
                      />
                      <button
                        type="submit"
                        className="border-2 border-black bg-[#FF2E63] text-white hover:bg-black hover:text-[#FF2E63] font-display font-black uppercase py-3 px-6 text-xs tracking-tight cursor-pointer transition-colors shrink-0 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5"
                        id="load-video-button-bento"
                      >
                        Change Video
                      </button>
                    </form>
                  </div>
                </section>



              </div>

              {/* RIGHT AREA: REAL-TIME CHAT & REACTIONS & VIDEO DIALS (4/12 cols) */}
              <div className="lg:col-span-4 flex flex-col gap-6">

                <VideoCall
                  socket={socketRef.current}
                  roomId={roomId}
                  myId={myId}
                  users={users}
                  onMessageSubscribe={(callback) => {
                    webrtcListenerRef.current = callback;
                    return () => {
                      webrtcListenerRef.current = null;
                    };
                  }}
                />

                <aside className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col flex-1 h-[580px] lg:h-auto min-h-[400px] relative">
                  {/* Chat Panel Header */}
                  <div className="bg-black text-white p-4 border-b-4 border-black flex justify-between items-center">
                    <h3 className="font-display font-black uppercase tracking-tighter text-md">
                      Live Whispers 💬
                    </h3>
                    <span className="bg-[#FF2E63] text-white border border-black px-2 py-0.5 text-[10px] font-mono font-bold">
                      {users.length} ONLINE
                    </span>
                  </div>

                  {/* Messages Stream */}
                  <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50 min-h-0 relative">
                    {chatHistory.map((msg) => {
                      const isSystem = msg.sender.includes("System") || msg.sender.includes("LoveBot");
                      const isSelf = msg.sender === username;
                      const isReaction = msg.text.startsWith("sent reaction: ");

                      if (isSystem) {
                        return (
                          <div key={msg.id} className="text-center py-1">
                            <div className="inline-block bg-black text-white border-2 border-black px-3 py-1 font-mono text-[10px] tracking-tight uppercase">
                              {msg.text}
                            </div>
                          </div>
                        );
                      }

                      if (isReaction) {
                        return null;
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`relative flex items-center gap-2 w-full ${isSelf ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`flex flex-col max-w-[80%] ${isSelf ? "items-end" : "items-start"}`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold uppercase text-gray-500 font-mono">
                                {msg.sender} • {msg.timestamp}
                              </span>
                            </div>

                            <div
                              className="relative group"
                              onTouchStart={() => handleTouchStart(msg.id)}
                              onTouchEnd={() => handleTouchEnd(msg.id)}
                              onTouchMove={() => handleTouchMove(msg.id)}
                            >
                              <p className={`p-3 text-xs font-semibold border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] select-none cursor-pointer ${isSelf
                                ? "bg-[#FF2E63] text-white border-black"
                                : "bg-white text-black border-black"
                                }`}>
                                {msg.text}
                              </p>

                              {/* Instagram-style Hover & Mobile Long-Press Reaction Tray */}
                              <ReactionTray
                                messageId={msg.id}
                                onClose={() => setActiveReactionMenu(null)}
                                isSelf={isSelf}
                                onReact={toggleMessageReaction}
                                onOpenMore={(id) => setExpandedEmojiMsgId(id)}
                                forceOpen={activeReactionMenu === msg.id}
                              />
                            </div>

                            {/* Message Reactions display */}
                            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {Object.entries(msg.reactions).map(([reactor, emoji]) => (
                                  <button
                                    key={reactor}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleMessageReaction(msg.id, emoji as string);
                                    }}
                                    className="flex items-center gap-1 bg-white border border-black px-1.5 py-0.5 text-[9px] font-mono font-bold text-black rounded-full shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-zinc-100 select-none transition-all active:translate-y-0.5 active:shadow-none"
                                    title={`${reactor} reacted ${emoji} (Click to remove)`}
                                  >
                                    <span>{emoji}</span>
                                    <span className="text-[8px] text-gray-500 uppercase">{reactor === username ? "you" : reactor}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Real-time "Typing..." Indicators */}
                    {Object.entries(typingUsers).map(([typer, isTyping]) => {
                      if (!isTyping || typer === username) return null;
                      return (
                        <div
                          key={typer}
                          className="flex items-center gap-2 text-[10px] font-mono text-gray-500 italic px-2 py-1 bg-zinc-100 border border-zinc-200 rounded-none w-fit animate-pulse"
                        >
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF2E63] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF2E63]"></span>
                          </span>
                          <span>{typer} is typing...</span>
                        </div>
                      );
                    })}

                    <div ref={chatEndRef}></div>
                  </div>

                  {/* Quick Reaction Tray */}
                  <div className="border-t-2 border-black p-2 bg-zinc-100 flex justify-between items-center gap-1 shrink-0">
                    {["❤️", "😂", "😮", "😢", "🔥", "🚀", "🍿"].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => sendReaction(emoji)}
                        className="flex-1 p-1 hover:bg-[#FF2E63] hover:text-white border-2 border-transparent hover:border-black text-lg cursor-pointer transition-all text-center select-none"
                        title={`React ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  {/* Chat Input form with Beautiful Professional Enter Button */}
                  <div className="p-4 border-t-4 border-black bg-zinc-50 shrink-0">
                    <form onSubmit={handleSendChat} className="flex gap-2 items-stretch">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => handleChatInputChange(e.target.value)}
                        placeholder="Type a message... 💞"
                        className="flex-1 border-2 border-black bg-white px-3 py-2.5 text-xs font-mono text-black focus:outline-none focus:border-[#FF2E63]"
                      />
                      <button
                        type="submit"
                        className="px-5 bg-[#FF2E63] text-white hover:bg-black hover:text-[#FF2E63] border-2 border-black flex items-center justify-center gap-2 font-display font-black text-xs uppercase tracking-wider cursor-pointer transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none shrink-0"
                        id="send-chat-button-bento"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send</span>
                      </button>
                    </form>
                  </div>

                  {expandedEmojiMsgId && (
                    <MoreEmojisPicker
                      messageId={expandedEmojiMsgId}
                      onClose={() => setExpandedEmojiMsgId(null)}
                      onReact={toggleMessageReaction}
                    />
                  )}
                </aside>

              </div>

            </div>

            {/* FOOTER BAR */}
            <footer className="flex flex-col sm:flex-row justify-between items-center text-[10px] font-mono font-bold uppercase tracking-widest text-black/80 border-t-2 border-black/25 pt-4">
              <div className="flex flex-wrap gap-4 sm:gap-8 justify-center sm:justify-start">
                <span>Status: Sync Lock Active</span>
                <span>Watch Link: love-stream.onrender.com/{roomId || "xxxx"}</span>
                <span>Secure socket tunnel: 100% encrypted</span>
              </div>
              <div className="bg-black text-white px-4 py-1 border-2 border-black shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] mt-2 sm:mt-0">
                Made by Ankit Khatri KC
              </div>
            </footer>

          </main>
        )}
      </div>
    </div>
  );
}
