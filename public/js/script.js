/**
 * YTMOVIEROOM Frontend Application
 * Real-time collaborative movie night with chat
 */

// ============================================
// GLOBAL STATE
// ============================================

let socket = null;
let player = null;
let roomCode = null;
let username = null;
let isLocalAction = false; // Flag to prevent syncing local actions
let syncTimeout = null;
let youtubeApiReady = false;
let pendingPlayerInit = false;
let pendingVideoState = null;
let lastPlayPauseEmit = 0; // Track last play/pause emit time for debouncing
let lastSeekEmit = 0;      // Track last seek emit time for debouncing
let autoJoinAttempted = false;
let socketServerUrl = null;

// Get room code from URL if user is joining
const urlParams = new URLSearchParams(window.location.search);
const roomFromUrl = urlParams.get('room');

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initializeSocket();
  setupEventListeners();
  checkConnectionStatus();

  // If room code in URL, auto-fill join tab
  if (roomFromUrl) {
    document.getElementById('roomCode').value = roomFromUrl.toUpperCase();
  }

  // Check if YouTube API is already loaded or wait for it
  if (window.YT && window.YT.Player) {
    youtubeApiReady = true;
  } else {
    // Set a longer timeout for YouTube API to load
    let apiCheckAttempts = 0;
    const checkYouTubeAPI = setInterval(() => {
      if (window.YT && window.YT.Player) {
        youtubeApiReady = true;
        clearInterval(checkYouTubeAPI);
        console.log('YouTube API detected and ready');
      }
      apiCheckAttempts++;
      if (apiCheckAttempts > 50) {
        // Give up after 5 seconds
        clearInterval(checkYouTubeAPI);
        console.warn('YouTube API failed to load');
      }
    }, 100);
  }
});

// Persist user session (room + username) so refresh keeps you in the room
function saveUserSession(name, code) {
  try {
    localStorage.setItem('ytmr_username', name || '');
    localStorage.setItem('ytmr_room', code || '');
  } catch (e) {
    console.warn('Could not save session', e);
  }
}

function loadUserSession() {
  try {
    const name = localStorage.getItem('ytmr_username');
    const code = localStorage.getItem('ytmr_room');
    if (name && code) return { username: name, roomCode: code };
  } catch (e) {}
  return null;
}

function clearUserSession() {
  try {
    localStorage.removeItem('ytmr_username');
    localStorage.removeItem('ytmr_room');
  } catch (e) {}
}

/**
 * Initialize Socket.IO connection
 */
function initializeSocket() {
  const appConfig = window.APP_CONFIG || {};
  socketServerUrl = (appConfig.SOCKET_URL || '').trim() || window.location.origin;

  socket = io(socketServerUrl, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
  });

  // Connection events
  socket.on('connect', () => {
    updateConnectionStatus(true);
    console.log('Connected to server');
    // If we have a saved session (from a refresh), try rejoining automatically
    const session = loadUserSession();
    if (session && session.roomCode && !roomCode) {
      username = session.username;
      roomCode = session.roomCode;
      autoJoinAttempted = true;
      // auto-fill inputs for UX
      const joinNameInput = document.getElementById('joinUsername');
      const roomCodeInput = document.getElementById('roomCode');
      if (joinNameInput) joinNameInput.value = username;
      if (roomCodeInput) roomCodeInput.value = roomCode;
      socket.emit('join-room', { username: username, roomCode: roomCode });
    }
  });

  socket.on('disconnect', () => {
    updateConnectionStatus(false);
    console.log('Disconnected from server');
    showNotification('Disconnected from server', 'error');
  });

  socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    updateConnectionStatus(false);
  });

  // Room events
  socket.on('room-created', (data) => {
    roomCode = data.roomCode;
    onRoomJoined(data);
    showRoomCreatedModal(data);
    // remember session so refresh preserves room
    if (username && roomCode) saveUserSession(username, roomCode);
    // Request explicit sync in case server state changed
    requestSyncWithRetries();
    requestPeerStateWithRetries();
  });

  // When a join succeeds the server emits 'room-joined' to the joining socket
  socket.on('room-joined', (data) => {
    roomCode = data.roomCode;
    onRoomJoined(data);
    // show a small notification with room link
    if (data.roomLink) {
      document.getElementById('roomLinkInput').value = data.roomLink;
    }
    showNotification('Joined room ' + roomCode, 'success');
    if (username && roomCode) saveUserSession(username, roomCode);
    // Request explicit sync to ensure we receive the latest video state
    requestSyncWithRetries();
    requestPeerStateWithRetries();
    // Try to apply pending sync after short delays to handle player init timing
    setTimeout(ensureSyncApplied, 300);
    setTimeout(ensureSyncApplied, 1000);
    setTimeout(ensureSyncApplied, 2500);
  });

  socket.on('host-changed', (data) => {
    // No longer restricting video load to a host; keep this event for compatibility.
    if (data && data.hostUsername) {
      showNotification(`${data.hostUsername} is now the room lead`, 'info');
    }
  });

  socket.on('user-joined', (data) => {
    showNotification(`${data.username} joined! 💕`, 'success');
    addSystemMessage(`${data.username} joined the movie night`);
  });

  socket.on('user-left', (data) => {
    showNotification(`${data.username} left`, 'error');
    addSystemMessage(`${data.username} left the movie night`);
  });

  socket.on('user-count', (count) => {
    document.getElementById('userCount').textContent = count;
  });

  socket.on('error', (message) => {
    if (message === 'Room not found' && autoJoinAttempted) {
      autoJoinAttempted = false;
      clearUserSession();
      roomCode = null;
      username = null;
      const joinNameInput = document.getElementById('joinUsername');
      const roomCodeInput = document.getElementById('roomCode');
      if (joinNameInput) joinNameInput.value = '';
      if (roomCodeInput) roomCodeInput.value = '';
      showNotification('Saved room expired. Please create or join a new room.', 'info');
      return;
    }
    showErrorModal(message);
  });

  // Chat events
  socket.on('receive-message', (data) => {
    addChatMessage(data.username, data.text, data.timestamp);
  });

  // Receive full chat history for the room
  socket.on('chat-history', (messages) => {
    setChatHistory(messages || []);
  });

  // Video sync events
  socket.on('video-play', (data) => {
    if (player && !isLocalAction) {
      isLocalAction = true;
      const diff = Math.abs(player.getCurrentTime() - data.currentTime);
      // only seek if significantly out of sync (>2 seconds)
      if (diff > 2) {
        player.seekTo(data.currentTime, true);
      }
      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        try {
          player.playVideo();
        } catch (e) {
          console.warn('Error playing video:', e);
        }
        setTimeout(() => { isLocalAction = false; }, 500);
      }, 50);
    }
  });

  socket.on('video-pause', (data) => {
    if (player && !isLocalAction) {
      isLocalAction = true;
      const diff = Math.abs(player.getCurrentTime() - data.currentTime);
      if (diff > 2) {
        player.seekTo(data.currentTime, true);
      }
      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        try {
          player.pauseVideo();
        } catch (e) {
          console.warn('Error pausing video:', e);
        }
        setTimeout(() => { isLocalAction = false; }, 500);
      }, 50);
    }
  });

  socket.on('video-seek', (data) => {
    if (player && !isLocalAction) {
      const diff = Math.abs(player.getCurrentTime() - data.currentTime);
      // only seek if >1.5 second difference
      if (diff > 1.5) {
        isLocalAction = true;
        player.seekTo(data.currentTime, true);
        setTimeout(() => { isLocalAction = false; }, 800);
      }
    }
  });

  socket.on('video-changed', (data) => {
    // Don't skip on isLocalAction for video-changed since we want to broadcast to all users
    // including confirming the load on the sender
    if (!player) {
      pendingVideoState = { videoId: data.videoId, currentTime: data.currentTime || 0 };
      console.log('Player not ready, storing pending video state:', pendingVideoState);
      return;
    }
    
    // Only load if the video ID is different from current
    if (data.videoId) {
      const currentVideoId = player.getVideoData().video_id;
      if (currentVideoId !== data.videoId) {
        console.log('Loading new video:', data.videoId);
        isLocalAction = true;
        player.loadVideoById(data.videoId);
        setTimeout(() => { isLocalAction = false; }, 500);
      }
    }
  });

  socket.on('sync-video-state', (state) => {
    // Accept sync state even if videoId is null (no-op) — store as pending if player not ready
    if (!state) return;
    
    console.log('Received sync-video-state:', state);
    
    if (player) {
      if (state.videoId) {
        console.log('Syncing video to:', state.videoId);
        isLocalAction = true;
        const currentVideoId = player.getVideoData().video_id;
        if (currentVideoId !== state.videoId) {
          player.loadVideoById(state.videoId);
        }
        
        // Set current time after brief delay to ensure video is loaded
        setTimeout(() => {
          if (state.currentTime > 0) {
            player.seekTo(state.currentTime, true);
          }
        }, 300);
        
        // if the room is currently playing, start playback after load
        setTimeout(() => {
          if (state.isPlaying) {
            console.log('Starting playback from sync state');
            player.playVideo();
          } else {
            console.log('Pausing from sync state');
            player.pauseVideo();
          }
          setTimeout(() => { isLocalAction = false; }, 200);
        }, 600);
      } else {
        // No video in room yet, just ensure paused
        if (player.getPlayerState && player.getPlayerState() !== YT.PlayerState.UNSTARTED) {
          isLocalAction = true;
          player.pauseVideo();
          setTimeout(() => { isLocalAction = false; }, 200);
        }
      }
    } else {
      // Player not ready, store state for later application
      pendingVideoState = {
        videoId: state.videoId || null,
        currentTime: state.currentTime || 0,
        isPlaying: !!state.isPlaying
      };
      console.log('Player not ready, storing pending state:', pendingVideoState);
    }
  });
}

/**
 * Ensure video-load controls are available to both users
 */
function updateHostUI() {
  const loadBtn = document.getElementById('loadVideoBtn');
  const urlInput = document.getElementById('youtubeUrl');
  const hostBadge = document.getElementById('hostBadge');
  if (loadBtn) loadBtn.removeAttribute('disabled');
  if (urlInput) urlInput.removeAttribute('disabled');
  if (hostBadge) hostBadge.classList.add('hidden');
}

/**
 * Setup all DOM event listeners
 */
function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Join room buttons
  document.getElementById('createRoomBtn').addEventListener('click', createRoom);
  document.getElementById('joinRoomBtn').addEventListener('click', joinRoom);

  // Video controls
  document.getElementById('loadVideoBtn').addEventListener('click', loadVideo);
  document.getElementById('youtubeUrl').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loadVideo();
  });

  // Chat
  document.getElementById('sendMessageBtn').addEventListener('click', sendMessage);
  document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  // Copy buttons
  document.getElementById('copyLinkBtn').addEventListener('click', copyRoomLink);
  document.getElementById('copyRoomLinkBtn').addEventListener('click', async () => {
    const ok = await copyTextToClipboard(document.getElementById('roomLinkInput').value);
    if (ok) showNotification('Room link copied! 📋', 'success');
    else showNotification('Copy failed. Please copy manually.', 'error');
  });

  // Leave room
  const leaveBtn = document.getElementById('leaveRoomBtn');
  if (leaveBtn) leaveBtn.addEventListener('click', leaveRoom);
}

/**
 * Update connection status indicator
 * @param {boolean} connected - Whether socket is connected
 */
function updateConnectionStatus(connected) {
  const indicator = document.querySelector('.status-indicator');
  const statusText = document.querySelector('.connection-status span:last-child');

  if (connected) {
    indicator.classList.add('connected');
    indicator.classList.remove('disconnected');
    statusText.textContent = 'Connected';
  } else {
    indicator.classList.add('disconnected');
    indicator.classList.remove('connected');
    statusText.textContent = 'Disconnected';
  }
}

/**
 * Check connection status periodically
 */
function checkConnectionStatus() {
  setInterval(() => {
    if (socket) {
      if (socket.connected) {
        updateConnectionStatus(true);
      } else {
        updateConnectionStatus(false);
      }
    }
  }, 1000);
}

// ============================================
// ROOM MANAGEMENT
// ============================================

/**
 * Switch between Create and Join tabs
 * @param {string} tabName - 'create' or 'join'
 */
function switchTab(tabName) {
  // Update button states
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  // Activate the button matching the tabName
  const targetBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
  if (targetBtn) targetBtn.classList.add('active');

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });

  if (tabName === 'create') {
    document.getElementById('createTab').classList.add('active');
  } else {
    document.getElementById('joinTab').classList.add('active');
  }
}

/**
 * Create a new room
 */
function createRoom() {
  const usernameInput = document.getElementById('createUsername');
  const inputUsername = usernameInput.value.trim();

  if (!inputUsername) {
    showErrorModal('Please enter your name');
    return;
  }

  username = inputUsername;
  socket.emit('join-room', {
    username: username,
    roomCode: null
  });
}

/**
 * Join an existing room
 */
function joinRoom() {
  const usernameInput = document.getElementById('joinUsername');
  const roomCodeInput = document.getElementById('roomCode');
  const inputUsername = usernameInput.value.trim();
  const inputRoomCode = roomCodeInput.value.trim().toUpperCase();

  if (!inputUsername) {
    showErrorModal('Please enter your name');
    return;
  }

  if (!inputRoomCode) {
    showErrorModal('Please enter a room code');
    return;
  }

  if (inputRoomCode.length !== 4) {
    showErrorModal('Room code must be 4 characters');
    return;
  }

  username = inputUsername;
  roomCode = inputRoomCode;
  socket.emit('join-room', {
    username: username,
    roomCode: inputRoomCode
  });
}

/**
 * Handle when user successfully joins a room
 * @param {object} data - Room data
 */
function onRoomJoined(data) {
  roomCode = data.roomCode;
  document.getElementById('roomCodeDisplay').textContent = `Room: ${roomCode}`;

  // Switch to watch screen
  document.getElementById('joinScreen').classList.remove('active');
  document.getElementById('watchScreen').classList.add('active');

  // Initialize YouTube player once the API is ready
  initializeWatchView();

  // Add welcome message
  addSystemMessage(`Welcome ${username}! Waiting for your friend... 💕`);

  // If server included chat history in join payload, populate it
  if (data.messages && Array.isArray(data.messages)) {
    setChatHistory(data.messages);
  }
}

/**
 * Prepare the watch screen and initialize the YouTube player when possible.
 */
function initializeWatchView() {
  // Don't show spinner on room join; only show when actually loading a video
  document.getElementById('videoStatus').textContent = 'Ready to play videos';
  // Make sure spinner is hidden
  document.getElementById('loadingSpinner').classList.remove('active');

  if (youtubeApiReady && typeof YT !== 'undefined' && YT.Player) {
    initializeYouTubePlayer();
    return;
  }

  pendingPlayerInit = true;
}

/**
 * Request the current room sync state with retries to handle timing races.
 * Emits `request-sync` immediately and retries up to 3 times with backoff.
 */
function requestSyncWithRetries() {
  try { socket.emit('request-sync'); } catch (e) {}
  setTimeout(() => { try { socket.emit('request-sync'); } catch (e) {} }, 500);
  setTimeout(() => { try { socket.emit('request-sync'); } catch (e) {} }, 1500);
}

/**
 * Request peer state with retries; peers will respond with their current playback state.
 */
function requestPeerStateWithRetries() {
  try { socket.emit('request-peer-state'); } catch (e) {}
  setTimeout(() => { try { socket.emit('request-peer-state'); } catch (e) {} }, 500);
  setTimeout(() => { try { socket.emit('request-peer-state'); } catch (e) {} }, 1500);
}

// When asked by a peer to report our current player state, respond back to server
socket.on('peer-state-request', (data) => {
  if (!player || !player.getVideoData) return;
  try {
    const vid = player.getVideoData().video_id || null;
    const cur = typeof player.getCurrentTime === 'function' ? player.getCurrentTime() : 0;
    const playing = player.getPlayerState && player.getPlayerState() === YT.PlayerState.PLAYING;
    socket.emit('peer-state', { target: data.requesterId, state: { videoId: vid, currentTime: cur, isPlaying: !!playing } });
  } catch (e) {}
});

// Receive a peer's state forwarded by server and apply it (higher-authority than server cache)
socket.on('peer-state', (state) => {
  if (!state || !state.videoId) return;
  if (player) {
    isLocalAction = true;
    player.loadVideoById(state.videoId);
    if (state.currentTime > 0) player.seekTo(state.currentTime, true);
    if (state.isPlaying) {
      setTimeout(() => { player.playVideo(); }, 300);
    } else {
      setTimeout(() => { player.pauseVideo(); }, 300);
    }
    setTimeout(() => { isLocalAction = false; }, 800);
  } else {
    pendingVideoState = state;
  }
});

/**
 * Ensure any pending sync state is applied once the player exists.
 * If no video is loaded locally, request sync from server.
 */
function ensureSyncApplied() {
  // If pending state exists and player ready, apply it
  if (pendingVideoState && player) {
    if (pendingVideoState.videoId) {
      isLocalAction = true;
      player.loadVideoById(pendingVideoState.videoId);
      if (pendingVideoState.currentTime > 0) player.seekTo(pendingVideoState.currentTime, true);
      if (pendingVideoState.isPlaying) {
        setTimeout(() => { player.playVideo(); }, 400);
      } else {
        setTimeout(() => { player.pauseVideo(); }, 400);
      }
      pendingVideoState = null;
      setTimeout(() => { isLocalAction = false; }, 600);
      return true;
    }
  }

  // If player exists but has no video loaded, ask server for sync again
  try {
    if (player && player.getVideoData && !player.getVideoData().video_id) {
      try { socket.emit('request-sync'); } catch (e) {}
    }
  } catch (e) {}

  return false;
}

/**
 * Copy room link to clipboard
 */
async function copyRoomLink() {
  const roomLink = `${window.location.origin}?room=${roomCode}`;
  const ok = await copyTextToClipboard(roomLink);
  if (ok) showNotification('Room link copied! 📋', 'success');
  else showNotification('Copy failed. Please copy manually.', 'error');
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 */
async function copyTextToClipboard(text) {
  // Preferred API (works on secure contexts)
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard API copy failed, falling back:', err);
  }

  // Fallback for local IP / HTTP usage
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return !!ok;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}

// ============================================
// YOUTUBE INTEGRATION
// ============================================

/**
 * Initialize YouTube player
 */
function initializeYouTubePlayer() {
  if (player) {
    return; // Already initialized
  }

  // Wait for YouTube API to be available
  if (typeof YT === 'undefined' || !YT.Player) {
    console.warn('YouTube API not ready yet, will retry...');
    pendingPlayerInit = true;
    
    // Retry in 500ms
    setTimeout(() => {
      if (!player && typeof YT !== 'undefined' && YT.Player) {
        initializeYouTubePlayer();
      }
    }, 500);
    return;
  }

  const playerElement = document.getElementById('youtubePlayer');
  if (!playerElement) {
    console.error('Player element not found');
    return;
  }

  try {
    player = new YT.Player(playerElement, {
      height: '100%',
      width: '100%',
      videoId: '',
      events: {
        'onReady': onPlayerReady,
        'onStateChange': onPlayerStateChange,
        'onError': onPlayerError
      },
      playerVars: {
        controls: 1,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        fs: 1,
        autohide: 1
      }
    });
    console.log('YouTube player initialized successfully');
  } catch (e) {
    console.error('Failed to initialize YouTube player:', e);
    player = null;
    // Retry in 1 second
    setTimeout(() => {
      if (!player) initializeYouTubePlayer();
    }, 1000);
  }
}

/**
 * Handle when YouTube player is ready
 */
function onPlayerReady(event) {
  console.log('YouTube player ready');
  // Make sure spinner is hidden when player is ready
  document.getElementById('loadingSpinner').classList.remove('active');
  document.getElementById('videoStatus').textContent = 'Ready to play videos';

  if (pendingVideoState && pendingVideoState.videoId) {
    console.log('Applying pending video state:', pendingVideoState);
    isLocalAction = true;
    player.loadVideoById(pendingVideoState.videoId);
    if (pendingVideoState.currentTime > 0) {
      setTimeout(() => {
        player.seekTo(pendingVideoState.currentTime, true);
      }, 300);
    }
    // If the room was playing, resume playback
    if (pendingVideoState.isPlaying) {
      setTimeout(() => { 
        player.playVideo();
        setTimeout(() => { isLocalAction = false; }, 500);
      }, 600);
    } else {
      setTimeout(() => { isLocalAction = false; }, 500);
    }
    pendingVideoState = null;
  }
}

/**
 * Handle YouTube player state changes
 * @param {object} event - Player state change event
 */
function onPlayerStateChange(event) {
  if (isLocalAction) {
    console.log('Ignoring state change - local action in progress');
    return;
  }

  // Ignore buffering and unstarted states to prevent re-syncing feedback loops
  if (event.data === YT.PlayerState.BUFFERING || event.data === YT.PlayerState.UNSTARTED) {
    return;
  }

  // Only emit if we have a video loaded
  if (!player || !player.getVideoData || !player.getVideoData().video_id) {
    console.log('No video loaded, ignoring state change');
    return;
  }

  const currentTime = player.getCurrentTime();
  const now = Date.now();

  if (event.data === YT.PlayerState.PLAYING) {
    // Debounce play events: only emit if 1.5 seconds have passed since last play/pause emit
    if (now - lastPlayPauseEmit > 1500) {
      console.log('Emitting video-play at time:', currentTime);
      isLocalAction = true;
      socket.emit('video-play', { currentTime: currentTime });
      lastPlayPauseEmit = now;
      setTimeout(() => { isLocalAction = false; }, 500);
    }
  } else if (event.data === YT.PlayerState.PAUSED) {
    // Debounce pause events: only emit if 1.5 seconds have passed since last play/pause emit
    if (now - lastPlayPauseEmit > 1500) {
      console.log('Emitting video-pause at time:', currentTime);
      isLocalAction = true;
      socket.emit('video-pause', { currentTime: currentTime });
      lastPlayPauseEmit = now;
      setTimeout(() => { isLocalAction = false; }, 500);
    }
  }
}

/**
 * Handle YouTube player errors
 * @param {object} event - Error event
 */
function onPlayerError(event) {
  console.error('YouTube player error:', event.data);
  let errorMessage = 'Unknown error';

  switch (event.data) {
    case 2:
      errorMessage = 'Invalid video ID';
      break;
    case 5:
      errorMessage = 'HTML5 player error';
      break;
    case 100:
      errorMessage = 'Video not found';
      break;
    case 101:
    case 150:
      errorMessage = 'Video cannot be played (embedding disabled)';
      break;
  }

  showErrorModal(`Video Error: ${errorMessage}`);
  document.getElementById('videoStatus').textContent = `Error: ${errorMessage}`;
}

/**
 * Extract YouTube video ID from URL
 * Supports multiple YouTube URL formats
 * @param {string} url - YouTube URL
 * @returns {string|null} Video ID or null if invalid
 */
function extractYouTubeVideoId(url) {
  let videoId = null;

  // Handle youtube.com/watch?v=VIDEO_ID
  if (url.includes('youtube.com/watch?v=')) {
    videoId = url.split('v=')[1].split('&')[0];
  }
  // Handle youtu.be/VIDEO_ID
  else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1].split('?')[0];
  }
  // Handle youtube.com/embed/VIDEO_ID
  else if (url.includes('youtube.com/embed/')) {
    videoId = url.split('embed/')[1].split('?')[0];
  }
  // Handle just the video ID
  else if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    videoId = url;
  }

  return videoId;
}

/**
 * Load a YouTube video
 */
function loadVideo() {
  const urlInput = document.getElementById('youtubeUrl');
  const url = urlInput.value.trim();

  if (!url) {
    showErrorModal('Please enter a YouTube URL');
    return;
  }

  const videoId = extractYouTubeVideoId(url);

  if (!videoId) {
    showErrorModal('Invalid YouTube URL. Please check and try again.');
    return;
  }

  if (!player) {
    // Try to initialize player if it hasn't been yet
    if (typeof YT !== 'undefined' && YT.Player) {
      initializeYouTubePlayer();
      // Wait a moment for initialization
      setTimeout(() => {
        if (player) {
          loadVideo(); // Retry
        } else {
          showErrorModal('Video player is still initializing. Please wait a moment and try again.');
        }
      }, 500);
    } else {
      showErrorModal('YouTube player is loading. Please wait a moment and try again.');
    }
    return;
  }

  // Show loading spinner
  document.getElementById('loadingSpinner').classList.add('active');

  // Load video
  player.loadVideoById(videoId);

  // Emit event to sync with other user - set isLocalAction for longer to prevent re-sync
  isLocalAction = true;
  console.log('Emitting video-changed for videoId:', videoId);
  socket.emit('video-changed', { videoId: videoId, currentTime: 0 });
  setTimeout(() => { isLocalAction = false; }, 800);

  // Update status
  document.getElementById('videoStatus').textContent = 'Video loaded. Press play to start! ▶️';

  // Clear input
  urlInput.value = '';

  // Hide loading spinner after a delay
  setTimeout(() => {
    document.getElementById('loadingSpinner').classList.remove('active');
  }, 2000);
}

/**
 * Monitor video time to sync seek position
 * This helps maintain sync when users manually seek
 */
let lastSeekTime = 0;
setInterval(() => {
  if (player && player.getPlayerState() !== undefined) {
    const currentTime = player.getCurrentTime();
    const now = Date.now();

    // Only emit seek if difference is significant (more than 1.5 second)
    // and not from a local action, and not emitting too frequently
    if (Math.abs(currentTime - lastSeekTime) > 1.5 && !isLocalAction && (now - lastSeekEmit > 2000)) {
      lastSeekTime = currentTime;
      lastSeekEmit = now;
      socket.emit('video-seek', { currentTime: currentTime });
    }
    lastSeekTime = currentTime;
  }
}, 3000);

// ============================================
// CHAT SYSTEM
// ============================================

/**
 * Send a chat message
 */
function sendMessage() {
  const chatInput = document.getElementById('chatInput');
  const message = chatInput.value.trim();

  if (!message) return;

  socket.emit('send-message', message);
  chatInput.value = '';
  chatInput.focus();
}

/**
 * Replace chat area with provided history (array of {username,text,timestamp})
 */
function setChatHistory(messages) {
  const chatMessages = document.getElementById('chatMessages');
  chatMessages.innerHTML = '';

  if (!messages || messages.length === 0) {
    const el = document.createElement('div');
    el.className = 'system-message';
    el.textContent = 'Connected! Say hi to your movie buddy 💕';
    chatMessages.appendChild(el);
    return;
  }

  messages.forEach(m => {
    addChatMessage(m.username, m.text, m.timestamp);
  });

  // scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Leave the current room: inform server, clear session and return to join screen
 */
function leaveRoom() {
  if (!roomCode) return;
  try { socket.emit('leave-room'); } catch (e) {}
  clearUserSession();
  autoJoinAttempted = false;

  // destroy player if present
  try {
    if (player && typeof player.destroy === 'function') {
      player.destroy();
    }
  } catch (e) {}
  player = null;

  // switch back to join screen
  document.getElementById('watchScreen').classList.remove('active');
  document.getElementById('joinScreen').classList.add('active');
  roomCode = null;
  username = null;

  // clear chat
  const chatMessages = document.getElementById('chatMessages');
  if (chatMessages) chatMessages.innerHTML = '<div class="system-message">Connected! Say hi to your movie buddy 💕</div>';

  showNotification('Left the room', 'info');
}

/**
 * Add a chat message to the display
 * @param {string} senderUsername - Username of message sender
 * @param {string} text - Message text
 * @param {string} timestamp - Message timestamp
 */
function addChatMessage(senderUsername, text, timestamp) {
  const chatMessages = document.getElementById('chatMessages');

  // Remove system message if it's the first message
  const systemMessages = chatMessages.querySelectorAll('.system-message');
  if (systemMessages.length > 0 && chatMessages.children.length === 1) {
    systemMessages[0].remove();
  }

  const messageEl = document.createElement('div');
  messageEl.className = 'message';

  messageEl.innerHTML = `
    <div class="message-header">
      <span class="message-username">${escapeHtml(senderUsername)}</span>
      <span class="message-time">${timestamp}</span>
    </div>
    <div class="message-text">${escapeHtml(text)}</div>
  `;

  chatMessages.appendChild(messageEl);

  // Auto-scroll to latest message
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Add a system message to chat
 * @param {string} text - Message text
 */
function addSystemMessage(text) {
  const chatMessages = document.getElementById('chatMessages');

  const messageEl = document.createElement('div');
  messageEl.className = 'system-message';
  messageEl.textContent = text;

  chatMessages.appendChild(messageEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ============================================
// UI FEEDBACK
// ============================================

/**
 * Show error modal
 * @param {string} message - Error message
 */
function showErrorModal(message) {
  const errorModal = document.getElementById('errorModal');
  document.getElementById('errorMessage').textContent = message;
  errorModal.classList.add('active');
}

/**
 * Close error modal
 */
function closeErrorModal() {
  document.getElementById('errorModal').classList.remove('active');
}

/**
 * Show room created modal with link to share
 * @param {object} data - Room data
 */
function showRoomCreatedModal(data) {
  const roomLink = data.roomLink;
  document.getElementById('roomLinkInput').value = roomLink;
  document.getElementById('roomCodeModal').textContent = data.roomCode;
  document.getElementById('roomCreatedModal').classList.add('active');
}

/**
 * Close room created modal
 */
function closeRoomCreatedModal() {
  document.getElementById('roomCreatedModal').classList.remove('active');
}

/**
 * Show notification message
 * @param {string} text - Notification text
 * @param {string} type - 'success', 'error', or 'info'
 */
function showNotification(text, type = 'info') {
  const notificationsArea = document.getElementById('notificationsArea');

  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = text;

  notificationsArea.appendChild(notification);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 4000);
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// ============================================
// YOUTUBE API CALLBACK
// ============================================

/**
 * Callback for when YouTube IFrame API is ready
 * This is called automatically by the YouTube API
 */
function onYouTubeIframeAPIReady() {
  console.log('YouTube IFrame API ready');
  youtubeApiReady = true;

  if (pendingPlayerInit) {
    pendingPlayerInit = false;
    initializeYouTubePlayer();
  }
}

// Fallback: if YouTube API doesn't call the callback within 10 seconds, mark it as ready anyway
setTimeout(() => {
  if (!youtubeApiReady && typeof window.YT !== 'undefined' && window.YT.Player) {
    console.log('YouTube API detected via fallback timer');
    youtubeApiReady = true;
    if (pendingPlayerInit) {
      pendingPlayerInit = false;
      initializeYouTubePlayer();
    }
  }
}, 10000);
