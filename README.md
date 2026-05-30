# 🎬 YouTube Watch Party - Real-time Collaborative Viewing

A beautiful, romantic watch party website where two people can watch YouTube videos together in real time with live chat. Built with Node.js, Express, Socket.IO, and vanilla JavaScript.

## 📋 Features

✨ **Real-time Video Synchronization**
- Play/Pause sync across users
- Seek synchronization
- Automatic video loading for both users
- Minimal desync handling

💬 **Live Chat System**
- Instant message delivery
- Sender names and timestamps
- Auto-scrolling messages
- System notifications

🎪 **Room System**
- Create or join rooms with simple codes
- Share room links
- Support for 2 users per room
- User count indicator

🎨 **Beautiful Romantic Design**
- Soft pink gradient backgrounds
- Floating hearts animation
- Responsive layout (Mobile, Tablet, Desktop)
- Modern card-based UI
- Smooth transitions and animations

📱 **Responsive & Lightweight**
- Works perfectly on all devices
- Mobile-first design approach
- No heavy dependencies
- Optimized performance

🔔 **Extra Features**
- Connection status indicator
- Loading states
- User join/leave notifications
- Copy room link button
- Error handling
- Keyboard shortcuts (Enter to send messages)

## 🚀 Quick Start

### Prerequisites
- Node.js (v12 or higher)
- npm (comes with Node.js)

### Installation

1. **Clone or extract the project**
```bash
cd YTMOVIEROOM
```

2. **Install dependencies**
```bash
npm install
```

This will install:
- `express` - Web server
- `socket.io` - Real-time communication

3. **Start the server**
```bash
npm start
```

The server will start on `http://localhost:3000`

4. **Open in browser**
- Open your browser and go to `http://localhost:3000`
- Or access from another device on your network: `http://YOUR_IP:3000`

## 📖 How to Use

### Creating a Watch Party
1. Enter your name
2. Click "Create Room"
3. A room code and link will be generated
4. Share the link or room code with your friend

### Joining a Watch Party
1. Enter your name
2. Click "Join Room"
3. Enter the room code your friend shared
4. Click "Join"

### Watching Videos
1. Paste a YouTube URL in the input field
2. Click "Load Video"
3. Both users will see the same video
4. Press play - both videos will sync automatically
5. Seek positions will sync in real-time

### Chatting
1. Type a message in the chat input
2. Press Enter or click Send
3. Messages appear instantly for both users
4. Shows timestamp and sender name

## 🏗️ Project Structure

```
YTMOVIEROOM/
├── package.json           # Dependencies and scripts
├── server.js             # Express + Socket.IO server
├── public/
│   ├── index.html        # Main HTML file
│   ├── css/
│   │   └── style.css     # All styling (romantic theme)
│   └── js/
│       └── script.js     # Frontend logic and Socket.IO client
└── README.md            # This file
```

## 🔧 Configuration

### Port Configuration
By default, the app runs on port 3000. To use a different port:

```bash
PORT=8000 npm start
```

### Environment Variables
- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: localhost)
- `NODE_ENV` - Environment (development/production)

## 📚 Technical Details

### Backend (server.js)
- **Express**: HTTP server and static file serving
- **Socket.IO**: Real-time bidirectional communication
- **Room Management**: Stores active rooms and user sessions
- **Message Broadcasting**: Syncs video state and chat messages

### Frontend (script.js)
- **Socket.IO Client**: Connects to server and listens for events
- **YouTube IFrame API**: Embeds and controls YouTube player
- **Video Sync**: Monitors player state and emits synchronization events
- **Chat System**: Sends and receives messages in real-time

### Styling (style.css)
- **CSS Grid/Flexbox**: Responsive layout
- **Media Queries**: Mobile, tablet, desktop support
- **CSS Animations**: Floating hearts, button hover effects
- **Gradients**: Romantic pink theme

## 🎥 Supported YouTube URL Formats

The app supports multiple YouTube URL formats:
- `https://youtube.com/watch?v=dQw4w9WgXcQ`
- `https://youtu.be/dQw4w9WgXcQ`
- `https://youtube.com/embed/dQw4w9WgXcQ`
- `dQw4w9WgXcQ` (just the video ID)

## 🌐 Deployment

### Local Network
Users on the same WiFi can access the app:
1. Find your computer's IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Share the URL: `http://YOUR_IP:3000`

### Production Deployment
To deploy to production (Heroku, AWS, etc.):
1. Set `NODE_ENV=production`
2. Set appropriate `PORT` variable
3. Update `getBaseUrl()` in `server.js` to match your domain

## 🐛 Troubleshooting

### Videos aren't syncing
- Check if both users' videos loaded successfully
- Refresh the page and rejoin the room
- Ensure you're using the correct YouTube URL format

### Messages not appearing
- Check browser console for errors (F12 → Console)
- Ensure Socket.IO connection shows "Connected"
- Try refreshing the page

### Can't join room
- Verify the room code is correct (4 characters)
- Check if room is full (max 2 users)
- Ensure both users have internet connection

### Server won't start
- Check if port 3000 is already in use
- Try: `PORT=3001 npm start`
- Ensure Node.js is installed: `node --version`

## 🛠️ Recent Fixes

- Fixed room join flow so the joining user now switches to the watch screen correctly.
- Made YouTube player initialization wait for the API to be ready, which prevents blank screens on slower devices.
- Improved chat and URL input styling so typed text is easier to read and the layout stays usable on mobile.
- Updated responsive chat layout so the message area, input, and send button stay aligned on small screens.

## 📝 Code Comments

The code includes detailed comments explaining:
- Socket.IO event handlers
- YouTube API integration
- Video synchronization logic
- UI state management
- Security measures (HTML escaping)

## 🎨 Customization

### Change Color Theme
Edit variables in `style.css`:
```css
:root {
  --primary-color: #ff6b9d;        /* Main pink */
  --secondary-color: #c06c84;      /* Secondary pink */
  --dark-bg: #2d1b2e;             /* Dark background */
  /* ... more colors */
}
```

### Modify Animations
Update animation durations and styles in `style.css`

### Add Features
- Implement user profiles
- Add video quality selection
- Create watch history
- Add emoji reactions
- Implement timestamp sharing

## 🔐 Security Notes

- HTML is escaped to prevent XSS attacks
- Room codes are random and secure
- No user data is stored permanently
- All communication uses WebSocket (encrypted if HTTPS)

## 📦 Dependencies

- **express** (4.18.2): Web server framework
- **socket.io** (4.5.4): Real-time communication library

Both are production-ready and well-maintained.

## 📄 License

MIT License - Feel free to use and modify

## 💡 Tips for Best Experience

1. **Internet Connection**: Use stable WiFi/broadband
2. **Browser**: Works on Chrome, Firefox, Safari, Edge (modern versions)
3. **Device Compatibility**: Optimized for mobile, tablet, and desktop
4. **Room Sharing**: Copy the link for easiest sharing
5. **Video Sync**: Allow a moment for initial synchronization

## 🎯 Future Enhancements

Potential features for future versions:
- Video playlist support
- Custom usernames with colors
- Message reactions
- Watch history
- Subtitle support
- Quality selection
- Screen sharing
- More than 2 users

---

Built with ❤️ for watch party enthusiasts! Enjoy watching together! 🎬💕
