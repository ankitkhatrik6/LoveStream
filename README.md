# 🎬 YouTube Watch Party - Real-time Collaborative Viewing

A beautiful, romantic watch party website where two people can watch YouTube videos together in real time with live chat. Built with Node.js, Express, Socket.IO, and vanilla JavaScript.

## 📋 Features

✨ **Real-time Video Synchronization**
- Play/Pause sync across users
- Seek synchronization
- Automatic video loading for both users
- Minimal desync handling

💬 **Live Chat System**
# LoveStream — Watch YouTube Together

![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel)
![Render](https://img.shields.io/badge/Backend-Render-4AB3F4?style=for-the-badge&logo=render)
![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?style=for-the-badge&logo=node.js)

Lightweight, private watch-party for two people to watch and chat over YouTube videos in real time. Built with Node.js, Express and Socket.IO, and a minimal vanilla JavaScript frontend.

## What is this?

LoveStream lets two people create or join a room to watch the same YouTube video together, synchronized in real time, with an integrated chat. It's focused on simplicity and privacy — no accounts required.

## Features

- Real-time play / pause / seek synchronization
- Load any YouTube URL or ID
- Simple 4-character room codes and shareable links
- Inline chat with timestamps
- Small, dependency-light codebase suitable for self-hosting

## Quick start (development)

Prerequisites: Node.js 16+ and npm

1. Clone the repository

```bash
git clone https://github.com/yourusername/LoveStream.git
cd LoveStream
```

2. Install dependencies

```bash
npm install
```

3. Run locally

```bash
PORT=3000 npm start
```

Open http://localhost:3000 in your browser.

## Environment variables

- `PORT` — server port (default 3000)
- `CLIENT_URL` — (recommended) public URL of the frontend (used to generate share links)
- `NODE_ENV` — set to `production` in production

Note: When deploying, set `CLIENT_URL` to the frontend domain (Vercel) so generated room links point to the hosted UI instead of localhost.

## Deploying

Recommended setup:

- Backend: deploy `/` (this repo) to Render or any Node host
- Frontend: build and serve static `dist` via Vercel (the included `build.js` writes a runtime `config.js` using `SOCKET_URL`)

Vercel (frontend):

1. Import the GitHub repository in Vercel
2. Build command: `npm run build`
3. Output directory: `dist`
4. Set environment variable `SOCKET_URL` to your Render backend (e.g. `https://your-backend.onrender.com`)

Render (backend):

1. Create a Web Service from the repo
2. Start command: `npm start`
3. Set `CLIENT_URL` to the Vercel URL once the frontend is live (this makes share links point to the hosted frontend)

## Project structure

```
YTMOVIEROOM/
├─ package.json       # scripts & dependencies
├─ server.js          # Express + Socket.IO server
├─ build.js           # build helper for frontend runtime config
└─ public/            # frontend assets
   ├─ index.html
   ├─ css/style.css
   └─ js/script.js
```

## Contributing

Contributions are welcome. Open issues for bugs or feature requests and submit pull requests for fixes.

## License

MIT

## Author

Ankit Khatri KC — Made with ❤️ for shared movie nights

---

If this project helped you, please give it a ⭐ on GitHub.
│   │   └── style.css     # All styling (romantic theme)
