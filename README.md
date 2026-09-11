# YouTube Watch Party 🍿🎬

A simple, lightweight, real-time YouTube Watch Party web application built for beginners. It allows multiple users to watch YouTube videos together in perfect synchronization.

---

## 🌟 Features

- **Create & Join Rooms**: Generate a unique 6-character room code or join existing rooms.
- **Direct Link Sharing**: Share a room link (e.g. `http://localhost:5173/?room=ABC123`) that automatically prompts friends to join.
- **Real-Time Video Synchronization**:
  - **Play**: Everyone's video starts playing simultaneously.
  - **Pause**: Everyone's video pauses simultaneously.
  - **Seek**: Everyone's video jumps to the exact timestamp.
  - **Change Video**: Paste any YouTube link or video ID to update the video for all viewers.
- **Loop-Prevention Mechanism**: Prevents infinite echo loops when receiving remote playback events.
- **Roles & Permissions System**:
  - **Host**: Room creator. Can play, pause, seek, change video, assign/demote Moderators, and remove participants.
  - **Moderator**: Can play, pause, seek, and change video.
  - **Participant**: Watch-only participant. Playback controls are disabled.
- **Strict Backend Permission Enforcement**: All Socket.IO actions are validated on the server. Unauthorized socket calls from regular participants are rejected.
- **In-Memory Store**: No database setup required. Rooms and participants live in simple server-side JavaScript data structures.

---

## 🛠 Tech Stack

- **Frontend**:
  - [React](https://react.dev/) (Plain JavaScript, no TypeScript)
  - [Vite](https://vitejs.dev/) (Fast dev environment & bundler)
  - [Socket.IO Client](https://socket.io/)
  - [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference)
  - Vanilla CSS (Clean, modern dark mode design)

- **Backend**:
  - [Node.js](https://nodejs.org/)
  - [Express](https://expressjs.com/)
  - [Socket.IO](https://socket.io/)
  - In-Memory JavaScript `Map` store

---

## 📁 Folder Structure

```text
Yt Watch Party/
├── backend/
│   ├── package.json         # Backend dependencies (express, cors, socket.io)
│   ├── server.js            # Express server, Socket.IO handlers, role checks
│   └── test_sync.js         # Automated real-time synchronization test script
├── frontend/
│   ├── index.html           # HTML template
│   ├── package.json         # Frontend dependencies (react, socket.io-client)
│   ├── vite.config.js       # Vite configuration
│   └── src/
│       ├── main.jsx         # React application entry point
│       ├── App.jsx          # Simple page router (Home <-> Room)
│       ├── socket.js        # Socket.IO client instance
│       ├── index.css        # Clean, modern dark theme styling
│       ├── components/
│       │   ├── YouTubePlayer.jsx  # YouTube IFrame player with anti-loop ref
│       │   └── Participants.jsx   # Participant list & Host control buttons
│       └── pages/
│           ├── Home.jsx     # Landing page (Create / Join room cards)
│           └── Room.jsx     # Active watch party room
├── ARCHITECTURE.md          # Architecture diagram and data flow guide
└── README.md                # Project documentation
```

---

## 🚀 Running Locally

### Prerequisites
- Node.js (version 18 or higher recommended)
- npm

### 1. Start the Backend
Open a terminal:
```bash
cd backend
npm install
npm start
```
The backend will run on: **`http://localhost:5000`**

### 2. Start the Frontend
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```
The frontend will run on: **`http://localhost:5173`**

### 3. Try it out!
1. Open `http://localhost:5173` in your browser.
2. Enter your name (e.g. `Saransh`) under **Create Room** and click **Create Room**.
3. Copy the room link or Room ID.
4. Open an incognito window or a different browser tab, go to the link, and enter a second name (e.g. `Rahul`) to join.
5. Click **Play**, **Pause**, or change the video URL from the Host window — watch both tabs synchronize instantly!

---

## 🧪 Running the Automated Sync Test

An end-to-end test script is included in `backend/test_sync.js` that tests all 10 core real-time events without needing a browser:

```bash
cd backend
node test_sync.js
```

---

## ⚡ How Real-Time Synchronization Works

1. When a Host clicks **Play**, the frontend calls `socket.emit("play", { currentTime })`.
2. The server checks the sender's role:
   ```javascript
   function canControl(user) {
     return user.role === "Host" || user.role === "Moderator";
   }
   ```
3. If valid, the server updates its room state and broadcasts `socket.to(roomId).emit("play", { currentTime, by })` to all other users in that room.
4. **Preventing Infinite Loops**:
   - When other clients receive the remote `"play"` event, they set a local lock: `isRemoteAction.current = true`.
   - Then they instruct the YouTube player to play: `player.playVideo()`.
   - The YouTube player triggers its own `onStateChange` event. Because `isRemoteAction.current` is `true`, the component resets the flag and does **NOT** emit another `"play"` event back to the server.

---

## 🛡 Roles and Permissions

| Role | Play / Pause / Seek | Change Video | Assign / Demote Moderator | Remove Participant |
| :--- | :---: | :---: | :---: | :---: |
| **Host** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Moderator** | ✅ Yes | ✅ Yes | ❌ No | ❌ No |
| **Participant** | ❌ No | ❌ No | ❌ No | ❌ No |

*Note: Playback buttons are disabled in the UI for Participants, and the backend rejects any unauthorized Socket.IO events.*

---

## 🌐 Deployment Instructions

### Backend (Render)
1. Push this repository to GitHub.
2. Go to [Render.com](https://render.com) and click **New + Web Service**.
3. Connect your repository.
4. Set the following settings:
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Click **Create Web Service**.
6. Render will assign you a live URL, for example: `https://yt-watch-party-backend.onrender.com`.

### Frontend (Vercel or Render Static Site)
1. In `frontend/`, create a file named `.env.production`:
   ```env
   VITE_BACKEND_URL=https://yt-watch-party-backend.onrender.com
   ```
2. Go to [Vercel](https://vercel.com) or Render and create a new project with root directory set to `frontend`.
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Deploy! Your frontend is now connected to your live backend.
