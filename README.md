# LoveStream

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![WebSockets](https://img.shields.io/badge/WebSockets-000000?style=for-the-badge&logo=socket.io&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)

A lightweight, self-hosted web application for synchronized YouTube playback and real-time chat. Designed for couples and friends to watch videos together in private, duplex-synced rooms.

## Core Features

* **Duplex Playback Sync:** Direct synchronization of play, pause, and seek actions across all connected peers.
* **Instant Private Rooms:** Lightweight room creation utilizing 4-character alphabetic codes, limited to two participants per room for privacy.
* **Real-Time Duplex Chat:** Low-latency chat panel with typing indicators and custom reactive emoji fly-outs.
* **Cross-Device Performance:** Optimized for mobile and tablet touch browsers with active connection state handshakes.

## Technical Architecture

* **Frontend:** React, TypeScript, Vite, Tailwind CSS. Focuses on minimal, high-performance UI components.
* **Backend:** Node.js, Express, WebSockets (`ws`). Maintains live room states and broadcasts synchronization events between clients with latency compensation.
* **Video Integration:** YouTube IFrame Player API with customized mobile touch configurations.

## Quickstart

### Prerequisites
* Node.js (v18+)
* npm

### Installation
Clone the repository and install the dependencies:
```bash
npm install
```

### Running in Development
Start the signaling server and frontend server:
```bash
npm run dev
```
The application will be accessible at `http://localhost:3000`.

### Production Build
Build both the frontend bundle and signaling bundle:
```bash
npm run build
npm start
```

## How It Works

1. **Host Setup:** Input your nickname and click **Create Room** to initialize a new session.
2. **Invitation:** Share the generated 4-character code with your partner.
3. **Connection:** Once they enter the code and click **Join Room**, both clients establish a persistent duplex connection over WebSockets.
4. **Playback:** Paste any YouTube video URL into the control bar and press load. Play, pause, and scrubbing actions sync in real-time.
