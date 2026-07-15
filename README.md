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

---

## What is LoveStream?

I built LoveStream because I wanted a simple, private way to watch YouTube videos in sync with someone else. No accounts, no bloat, no third-party screen sharing tools. Just paste a link, share a 4-character room code, and watch together from anywhere.

Beyond video sync, I added real-time chat with emoji reactions, typing indicators, and a full P2P video calling system using WebRTC. All of it runs over a single WebSocket connection I manage on the backend. Everything stays between you and the other person, nothing goes anywhere else.

---

## What I Built Into It

- **Synchronized Playback:** When one person plays, pauses, or scrubs the video, both sides update instantly with latency compensation so nothing feels out of sync.

- **Private 2-Person Rooms:** I deliberately capped rooms at 2 participants and used short 4-character codes to keep things simple and intimate. No sign-ups, no accounts.

- **Real-Time Chat:** I built a live chat panel with typing indicators so you can see when the other person is writing. On desktop you can hover a message to react with an emoji, on mobile I implemented long-press detection for the same thing.

- **Flying Emoji Reactions:** The quick reaction bar at the bottom sends emojis that fly up across the screen. Something small I added to make the experience feel more alive.

- **P2P Video Calls:** I integrated WebRTC directly so both people can video call without any third-party server touching their video feed. The WebSocket connection I already had doubles as the signaling channel, so no extra infrastructure needed.

- **Auto-Reconnect:** Sockets drop sometimes. I wrote reconnection logic on both the client and server so if someone briefly loses connection, the session recovers without them having to rejoin manually.

- **Autoplay Handling:** Browsers block autoplay with sound by default. I handle this gracefully by starting the video muted if needed and showing a clear unmute prompt so the experience doesn't feel broken.

- **Mobile-First Responsive UI:** I designed the layout to work properly on phones and tablets too, not just desktops. Touch events, safe area insets, responsive grids, all handled.

---

## Tech Stack

| Layer | What I Used |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Backend | Node.js, Express, `ws` (WebSockets) |
| Video | YouTube IFrame Player API |
| Video Calls | WebRTC (`RTCPeerConnection` + Google STUN) |
| Deployment | Render (`render.yaml`) |

---

## Running It Locally

### Prerequisites
- Node.js v18+
- npm

### Install

```bash
git clone https://github.com/ankitkhatrik6/LoveStream.git
cd LoveStream
npm install
```

### Development

```bash
npm run dev
```

This starts both the signaling server and the Vite frontend together. Open `http://localhost:3000` in your browser.

### Production Build

```bash
npm run build
npm start
```

---

## How to Use It

1. Go to [love-stream.onrender.com](https://love-stream.onrender.com) or run it locally.
2. Enter your nickname and click **Create Room**. You'll get a 4-character room code.
3. Share that code (or the invite link) with whoever you're watching with.
4. They enter the code, hit **Join Room**, and you're both connected.
5. Paste any YouTube URL into the **Queued Up** bar and hit **Change Video**.
6. Play, pause, and seek. It stays in sync on both ends automatically.
7. Use the chat panel on the right to message in real-time.
8. Click **Start Video Call** anytime to start a P2P video call on top of everything.

---

## Deployment

I deployed LoveStream on **Render**. The `render.yaml` in the repo has the full configuration. The same Node.js server handles both the WebSocket signaling and serves the built frontend, so it's a single service deployment.

Live at: [love-stream.onrender.com](https://love-stream.onrender.com)

---

## License

MIT. Do whatever you want with it.

---

> If you find this useful or interesting, a star on the repo goes a long way. Thanks - **Ankit Khatri KC**
