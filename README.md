# LoveStream 🎬

A real-time YouTube watch party app for two people.
Create a room, share the link, watch together in sync, and chat live.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js)
![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--time-010101?style=for-the-badge&logo=socket.io)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

## ✨ Features

- Real-time video synchronization (play/pause/seek/video change)
- Live in-room chat
- 4-character room code + shareable room link
- Designed for private 2-user watch sessions
- Responsive UI for mobile and desktop

## 🛠️ Tech Stack

- **Backend:** Node.js, Express, Socket.IO
- **Frontend:** HTML, CSS, Vanilla JavaScript
- **Video:** YouTube IFrame API

## 🚀 Run Locally

### Prerequisites

- Node.js 16+
- npm

### Setup

```bash
git clone https://github.com/ankitkhatrik6/LoveStream.git
cd LoveStream
npm install
npm start
```

Open:

- http://localhost:3000

## ⚙️ Environment Variables

- `PORT` (default: `3000`)
- `NODE_ENV` (use `production` in production)
- `CLIENT_URL` (frontend URL used for share link generation in backend)
- `SOCKET_URL` (frontend runtime socket server URL when deploying frontend separately)

## 🌐 Deployment (Vercel + Render)

### Backend (Render)

- Start command: `npm start`
- Set env vars:
  - `NODE_ENV=production`
  - `CLIENT_URL=https://your-vercel-app.vercel.app`

### Frontend (Vercel)

- Build command: `npm run build`
- Output directory: `dist`
- Set env var:
  - `SOCKET_URL=https://your-render-service.onrender.com`

After frontend is live, make sure Render `CLIENT_URL` matches the Vercel URL.

## 📁 Project Structure

```text
LoveStream/
├── server.js
├── build.js
├── package.json
├── vercel.json
├── render.yaml
├── LICENSE
└── public/
    ├── index.html
    ├── config.js
    ├── css/style.css
    └── js/script.js
```

## 🤝 Contributing

Pull requests are welcome. For major changes, open an issue first.

## 📄 License

This project is licensed under the MIT License.
See [LICENSE](LICENSE).

## 👨‍💻 Author

**Ankit Khatri KC**

---

If this project helped you, give it a ⭐ on GitHub.
