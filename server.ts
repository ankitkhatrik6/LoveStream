import express from "express";
import path from "path";
import { createServer } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

interface User {
  id: string; // Connection ID
  username: string;
}

interface PlaybackState {
  playing: boolean;
  currentTime: number;
  lastUpdated: number;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  reactions?: Record<string, string>; // username -> emoji
}

interface Room {
  roomId: string;
  users: User[];
  currentVideoId: string;
  playbackState: PlaybackState;
  chatHistory: ChatMessage[];
  loveScore?: number;
}

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

const PORT = 3000;

// State management
const rooms = new Map<string, Room>();
const connectedSockets = new Map<string, WebSocket>();
const socketToRoom = new Map<string, string>();
const socketToUser = new Map<string, User>();
const disconnectTimeouts = new Map<string, any>();

// Helper to generate a unique 4-character room code (avoiding confusing chars)
function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = "";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms.has(code));
  return code;
}

// Helper to broadcast a message to a room
function broadcastToRoom(roomId: string, message: any, excludeSocketId?: string) {
  const room = rooms.get(roomId);
  if (!room) return;
  const payload = JSON.stringify(message);
  
  room.users.forEach((user) => {
    if (user.id === excludeSocketId) return;
    const client = connectedSockets.get(user.id);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// HTTP endpoints for API and health check
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", roomsActive: rooms.size, connections: connectedSockets.size });
});

// Create a room via HTTP POST (optional shortcut, but websocket is fine too)
app.post("/api/rooms", (req, res) => {
  const code = generateRoomCode();
  const defaultVideoId = "Aj-nPW-VEuo"; // Rewrite the Stars
  
  const room: Room = {
    roomId: code,
    users: [],
    currentVideoId: defaultVideoId,
    playbackState: {
      playing: false,
      currentTime: 0,
      lastUpdated: Date.now(),
    },
    chatHistory: [
      {
        id: "system-welcome",
        sender: "LoveBot",
        text: "💖 Welcome to your LoveStream room! Invite your partner or friend and start watching together.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
    ],
    loveScore: 0,
  };
  
  rooms.set(code, room);
  res.status(201).json({ roomId: code });
});

// Set up WebSocket upgrade on the same port (3000)
server.on("upgrade", (request, socket, head) => {
  try {
    const url = request.url || "";
    const pathname = url.split("?")[0];
    
    if (pathname === "/ws" || pathname === "/ws/") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  } catch (err) {
    console.error("[WS Upgrade Error]", err);
    socket.destroy();
  }
});

wss.on("error", (err) => {
  console.error("[WS Server Error]", err);
});

// WebSocket Connection Handler
wss.on("connection", (ws) => {
  const socketId = Math.random().toString(36).substring(2, 11);
  connectedSockets.set(socketId, ws);
  
  console.log(`[WS] Client connected: ${socketId}`);

  ws.on("error", (err) => {
    console.error(`[WS Client Error] Socket ${socketId} error:`, err);
  });

  ws.on("message", (rawMessage) => {
    try {
      const data = JSON.parse(rawMessage.toString());
      const { type, payload } = data;
      
      switch (type) {
        case "create_room": {
          const { username, videoId } = payload;
          const code = generateRoomCode();
          const defaultVideoId = videoId || "Aj-nPW-VEuo"; // Rewrite the Stars
          
          const room: Room = {
            roomId: code,
            users: [{ id: socketId, username }],
            currentVideoId: defaultVideoId,
            playbackState: {
              playing: false,
              currentTime: 0,
              lastUpdated: Date.now(),
            },
            chatHistory: [
              {
                id: "system-welcome",
                sender: "System 💖",
                text: `Welcome, ${username}! Send the code ${code} to your special someone.`,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              }
            ],
            loveScore: 0,
          };
          
          rooms.set(code, room);
          socketToRoom.set(socketId, code);
          socketToUser.set(socketId, { id: socketId, username });
          
          ws.send(JSON.stringify({
            type: "room_created",
            payload: {
              roomId: code,
              myId: socketId,
              users: room.users,
              currentVideoId: room.currentVideoId,
              playbackState: room.playbackState,
              chatHistory: room.chatHistory,
              loveScore: room.loveScore,
            }
          }));
          break;
        }

        case "join_room": {
          const { roomId, username } = payload;
          const code = roomId.toUpperCase().trim();
          const room = rooms.get(code);
          
          if (!room) {
            ws.send(JSON.stringify({
              type: "error",
              payload: { message: "Room not found! Check your code and try again." }
            }));
            return;
          }

          // Check if this is a reconnect of an existing user
          const existingUserIndex = room.users.findIndex(u => u.username === username);
          if (existingUserIndex !== -1) {
            const oldSocketId = room.users[existingUserIndex].id;
            
            // Clear any pending disconnect timeout for this user
            const timeout = disconnectTimeouts.get(oldSocketId);
            if (timeout) {
              clearTimeout(timeout);
              disconnectTimeouts.delete(oldSocketId);
            }
            
            // Clean up old socket references
            connectedSockets.delete(oldSocketId);
            socketToRoom.delete(oldSocketId);
            socketToUser.delete(oldSocketId);
            
            // Update user with new socket ID
            room.users[existingUserIndex].id = socketId;
            socketToRoom.set(socketId, code);
            socketToUser.set(socketId, room.users[existingUserIndex]);
            
            console.log(`[WS] Reconnecting user ${username} under new socket: ${socketId} (old: ${oldSocketId})`);
            
            // Send success room info to reconnector
            ws.send(JSON.stringify({
              type: "room_joined",
              payload: {
                roomId: code,
                myId: socketId,
                users: room.users,
                currentVideoId: room.currentVideoId,
                playbackState: room.playbackState,
                chatHistory: room.chatHistory,
                loveScore: room.loveScore || 0,
                isReconnect: true
              }
            }));
            
            // Broadcast reconnect to the other user
            broadcastToRoom(code, {
              type: "user_reconnected",
              payload: {
                user: room.users[existingUserIndex],
                users: room.users,
                oldSocketId,
                newSocketId: socketId
              }
            }, socketId);
            
            break;
          }
          
          if (room.users.length >= 2) {
            ws.send(JSON.stringify({
              type: "error",
              payload: { message: "This room is full! LoveStream rooms are private, limited to 2 people." }
            }));
            return;
          }
          
          const newUser = { id: socketId, username };
          room.users.push(newUser);
          socketToRoom.set(socketId, code);
          socketToUser.set(socketId, newUser);
          
          // Send success room info to joiner
          ws.send(JSON.stringify({
            type: "room_joined",
            payload: {
              roomId: code,
              myId: socketId,
              users: room.users,
              currentVideoId: room.currentVideoId,
              playbackState: room.playbackState,
              chatHistory: room.chatHistory,
              loveScore: room.loveScore || 0,
            }
          }));
          
          // Broadcast to the other user in the room
          broadcastToRoom(code, {
            type: "user_joined",
            payload: {
              user: newUser,
              users: room.users,
            }
          }, socketId);
          
          // Add system message
          const sysMsg: ChatMessage = {
            id: `sys-${Date.now()}`,
            sender: "System 💖",
            text: `${username} has joined the stream! Your watch party is now in full sync.`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
          room.chatHistory.push(sysMsg);
          broadcastToRoom(code, {
            type: "chat_received",
            payload: sysMsg,
          });
          
          break;
        }

        case "player_state": {
          const { playing, currentTime } = payload;
          const roomId = socketToRoom.get(socketId);
          if (!roomId) return;
          
          const room = rooms.get(roomId);
          if (!room) return;
          
          room.playbackState = {
            playing,
            currentTime,
            lastUpdated: Date.now(),
          };
          
          // Broadcast player action to other person
          broadcastToRoom(roomId, {
            type: "player_sync",
            payload: {
              playing,
              currentTime,
              senderId: socketId,
            }
          }, socketId);
          break;
        }

        case "change_video": {
          const { videoId } = payload;
          const roomId = socketToRoom.get(socketId);
          if (!roomId) return;
          
          const room = rooms.get(roomId);
          if (!room) return;
          
          room.currentVideoId = videoId;
          room.playbackState = {
            playing: false,
            currentTime: 0,
            lastUpdated: Date.now(),
          };
          
          const user = socketToUser.get(socketId);
          const senderName = user ? user.username : "Partner";
          
          // System message about video change
          const sysMsg: ChatMessage = {
            id: `sys-${Date.now()}`,
            sender: "System 💖",
            text: `${senderName} changed the video. Ready to sync!`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
          room.chatHistory.push(sysMsg);
          
          // Broadcast new video and update clients
          broadcastToRoom(roomId, {
            type: "video_changed",
            payload: {
              videoId,
              senderId: socketId,
            }
          }, socketId);
          
          broadcastToRoom(roomId, {
            type: "chat_received",
            payload: sysMsg,
          });
          break;
        }

        case "chat_message": {
          const { text } = payload;
          const roomId = socketToRoom.get(socketId);
          if (!roomId) return;
          
          const room = rooms.get(roomId);
          if (!room) return;
          
          const user = socketToUser.get(socketId);
          if (!user) return;
          
          const message: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            sender: user.username,
            text,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
          
          room.chatHistory.push(message);
          
          // Broadcast chat to everyone in room (including sender so we keep synced history)
          broadcastToRoom(roomId, {
            type: "chat_received",
            payload: message,
          });
          break;
        }

        case "typing": {
          const { isTyping } = payload;
          const roomId = socketToRoom.get(socketId);
          if (!roomId) return;
          const user = socketToUser.get(socketId);
          if (!user) return;
          
          broadcastToRoom(roomId, {
            type: "typing_state",
            payload: {
              username: user.username,
              isTyping,
            }
          }, socketId);
          break;
        }

        case "message_reaction": {
          const { messageId, emoji } = payload;
          const roomId = socketToRoom.get(socketId);
          if (!roomId) return;
          const room = rooms.get(roomId);
          if (!room) return;
          const user = socketToUser.get(socketId);
          if (!user) return;
          
          const msg = room.chatHistory.find(m => m.id === messageId);
          if (msg) {
            if (!msg.reactions) {
              msg.reactions = {};
            }
            
            // If the user already reacted with this emoji, toggle it off.
            if (msg.reactions[user.username] === emoji) {
              delete msg.reactions[user.username];
            } else {
              msg.reactions[user.username] = emoji;
            }
            
            // Broadcast update to everyone in the room
            broadcastToRoom(roomId, {
              type: "reaction_updated",
              payload: {
                messageId,
                reactions: msg.reactions,
              }
            });
          }
          break;
        }

        case "join_video_call": {
          const roomId = socketToRoom.get(socketId);
          if (!roomId) return;
          const user = socketToUser.get(socketId);
          if (!user) return;
          
          console.log(`[WS Video Call] User ${user.username} (${socketId}) joining call in room ${roomId}`);
          broadcastToRoom(roomId, {
            type: "peer_joined_video_call",
            payload: {
              senderId: socketId,
              senderName: user.username,
            }
          }, socketId);
          break;
        }

        case "leave_video_call": {
          const roomId = socketToRoom.get(socketId);
          if (!roomId) return;
          const user = socketToUser.get(socketId);
          if (!user) return;
          
          console.log(`[WS Video Call] User ${user.username} (${socketId}) leaving call in room ${roomId}`);
          broadcastToRoom(roomId, {
            type: "peer_left_video_call",
            payload: {
              senderId: socketId,
            }
          }, socketId);
          break;
        }

        case "peer_present_response": {
          const { targetId } = payload;
          const roomId = socketToRoom.get(socketId);
          if (!roomId) return;
          const user = socketToUser.get(socketId);
          if (!user) return;
          
          console.log(`[WS Video Call] User ${user.username} (${socketId}) responding as present to target ${targetId}`);
          const targetSocket = connectedSockets.get(targetId);
          if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
            targetSocket.send(JSON.stringify({
              type: "peer_present",
              payload: {
                senderId: socketId,
                senderName: user.username,
              }
            }));
          }
          break;
        }

        case "webrtc_signal": {
          const { targetId, signal } = payload;
          const roomId = socketToRoom.get(socketId);
          if (!roomId) return;
          const user = socketToUser.get(socketId);
          if (!user) return;
          
          const targetSocket = connectedSockets.get(targetId);
          if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
            targetSocket.send(JSON.stringify({
              type: "webrtc_signal",
              payload: {
                senderId: socketId,
                senderName: user.username,
                signal,
              }
            }));
          }
          break;
        }

        case "send_heart": {
          const roomId = socketToRoom.get(socketId);
          if (!roomId) return;
          
          const room = rooms.get(roomId);
          if (!room) return;
          
          const user = socketToUser.get(socketId);
          if (!user) return;
          
          // Increment love score by 10 points
          room.loveScore = (room.loveScore || 0) + 10;
          
          // Broadcast heart action with updated score to both users
          broadcastToRoom(roomId, {
            type: "heart_received",
            payload: {
              loveScore: room.loveScore,
              senderName: user.username,
            }
          });
          break;
        }

        case "ping": {
          ws.send(JSON.stringify({ type: "pong" }));
          break;
        }

        default:
          console.warn(`[WS] Unknown event type received: ${type}`);
      }
    } catch (err) {
      console.error("[WS] Error parsing message:", err);
    }
  });

  ws.on("close", () => {
    console.log(`[WS] Client disconnected: ${socketId}. Starting 8s grace period.`);
    
    const timeout = setTimeout(() => {
      disconnectTimeouts.delete(socketId);
      
      const roomId = socketToRoom.get(socketId);
      const user = socketToUser.get(socketId);
      
      connectedSockets.delete(socketId);
      socketToRoom.delete(socketId);
      socketToUser.delete(socketId);
      
      if (roomId && user) {
        const room = rooms.get(roomId);
        if (room) {
          // Remove user from room
          room.users = room.users.filter((u) => u.id !== socketId);
          
          if (room.users.length === 0) {
            // Room is empty, delete it
            console.log(`[WS] Grace period expired. Room ${roomId} is empty, cleaning up.`);
            rooms.delete(roomId);
          } else {
            console.log(`[WS] Grace period expired. Removing user ${user.username} (${socketId}) from room ${roomId}.`);
            // Notify the other user in the room
            broadcastToRoom(roomId, {
              type: "user_left",
              payload: {
                user,
                senderId: socketId, // VideoCall.tsx checks payload.senderId to identify disconnected peer
                users: room.users,
              }
            });
            
            // Add system message
            const sysMsg: ChatMessage = {
              id: `sys-${Date.now()}`,
              sender: "System 💔",
              text: `${user.username} has left the room.`,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };
            room.chatHistory.push(sysMsg);
            broadcastToRoom(roomId, {
              type: "chat_received",
              payload: sysMsg,
            });
          }
        }
      }
    }, 8000);
    
    disconnectTimeouts.set(socketId, timeout);
  });
});

// Configure Vite middleware in development or express.static in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("[Vite] Running in development mode with Vite middleware.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log(`[Production] Serving static files from ${distPath}`);
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] LoveStream running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start the Express + Vite server:", err);
});
