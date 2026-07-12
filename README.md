# LoveStream

![preview](preview.png)

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![WebSockets](https://img.shields.io/badge/WebSockets-000000?style=for-the-badge&logo=socket.io&logoColor=white)
![WebRTC](https://img.shields.io/badge/WebRTC-333333?style=for-the-badge&logo=webrtc&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)

A lightweight, self-hosted web application for synchronized YouTube playback, real-time chat, and private P2P video calls. Designed for couples and friends to watch videos together in private, duplex-synced rooms.

## Core Features

* **Duplex Playback Sync:** Direct synchronization of play, pause, and seek actions across all connected peers with latency compensation.
* **Instant Private Rooms:** Lightweight room creation using 4-character codes, limited to two participants per room for complete privacy.
* **Real-Time Chat:** Low-latency chat panel with typing indicators, emoji reactions (long-press on mobile), and flying emoji fly-outs.
* **P2P Video Calling:** Secure, browser-native peer-to-peer video calls using WebRTC — no third-party servers involved. Call invite/accept/decline flow with camera and mic controls.
* **Cross-Device Performance:** Optimized for mobile and tablet touch browsers with active connection state handshakes and auto-reconnect on network drops.
* **Autoplay Fallback:** Gracefully handles browser autoplay restrictions by falling back to muted playback and unmuting on first user interaction.

## Technical Architecture

* **Frontend:** React, TypeScript, Vite, Tailwind CSS v4. High-performance UI with a neobrutalist design aesthetic.
* **Backend:** Node.js, Express, WebSockets (`ws`). Maintains live room states and broadcasts synchronization events between clients.
* **Video Integration:** YouTube IFrame Player API with customized mobile touch configurations.
* **Video Calls:** WebRTC (RTCPeerConnection) with Google STUN servers for NAT traversal. Signaling handled over the existing WebSocket connection.

## Quickstart

### Prerequisites
* Node.js (v18+)
* npm

### Installation
Clone the repository and install the dependencies:
```bash
git clone https://github.com/ankitkhatrik6/LoveStream.git
cd LoveStream
npm install
```

### Running in Development
Start the signaling server and frontend dev server together:
```bash
npm run dev
```
The application will be accessible at `http://localhost:3000`.

### Production Build
Build the frontend bundle and run the production server:
```bash
npm run build
npm start
```

## How It Works

1. **Host Setup:** Enter your nickname and click **Create Room** to initialize a new session.
2. **Invitation:** Share the generated 4-character room code with your partner via the copy link button.
3. **Connection:** Once they enter the code and click **Join Room**, both clients establish a persistent duplex WebSocket connection.
4. **Playback:** Paste any YouTube video URL into the control bar and press **Change Video**. Play, pause, and scrubbing sync in real-time.
5. **Video Call:** Click **Start Private Video Call** to send a call invite to your partner. Accept the invite to connect via P2P video.
6. **Chat & Reactions:** Send messages, react with emojis (hover on desktop, long-press on mobile), and send quick reactions from the reaction bar.

## Deployment

LoveStream is deployed on **Render** at [love-stream.onrender.com](https://love-stream.onrender.com).

See `render.yaml` for deployment configuration.

# If You find this helful make sure to give star.
