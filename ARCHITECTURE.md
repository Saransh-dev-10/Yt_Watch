# System Architecture - YouTube Watch Party 📐

This document explains the architecture and data flow of the YouTube Watch Party project in simple, beginner-friendly terms.

---

## 1. High-Level Flow

Whenever a user interacts with the app (for example, clicking "Play"), here is the exact lifecycle of that action:

```
[ Host User clicks "Play" in React ]
                 │
                 ▼
     [ Socket.IO Client emits "play" ]
                 │
                 ▼
     [ Node.js + Express Server receives "play" ]
                 │
                 ▼
     [ Backend checks: Is user Host or Moderator? ]
                 │
                 ├── ❌ If unauthorized: Emits "error_message" back to user.
                 │
                 └── ✅ If authorized: Updates in-memory Room State
                                │
                                ▼
                 [ Socket.IO broadcasts "play" to room ]
                                │
                                ▼
                 [ Other React clients receive "play" ]
                                │
                                ▼
                 [ YouTube Player plays for everyone ]
```

---

## 2. In-Memory Room State

Instead of using a complex database, all room data is stored in the server's memory inside a JavaScript `Map`:

```javascript
// Server memory structure:
rooms = {
  "ABC123": {
    roomId: "ABC123",
    hostId: "socket_client_id_01",
    videoId: "dQw4w9WgXcQ",
    isPlaying: false,
    currentTime: 45.2,
    participants: [
      { id: "socket_client_id_01", username: "Saransh", role: "Host" },
      { id: "socket_client_id_02", username: "Rahul", role: "Moderator" },
      { id: "socket_client_id_03", username: "Amit", role: "Participant" }
    ]
  }
}
```

### Why use an in-memory Map for the MVP?
- **Speed**: In-memory reads and writes happen in microseconds.
- **Simplicity**: No database connection strings, no SQL/NoSQL schemas, no ORM libraries.
- **Easy Cleanup**: When all users leave a room, the server simply deletes that entry from the map.

---

## 3. The Infinite Loop Problem & How We Solved It

When building synchronized video players, developers often run into an **infinite event echo loop**:

1. Host clicks Play.
2. Host emits `play` to server.
3. Server broadcasts `play` to everyone (including or excluding Host).
4. Guest receives `play` and calls `player.playVideo()`.
5. Guest's YouTube player fires its internal `onStateChange: PLAYING` event.
6. If the Guest's code also sends a `play` event upon state change, it echoes back to the server!
7. The server broadcasts again, creating an endless cycle.

### Our Solution: The `isRemoteAction` Ref Lock
Inside [YouTubePlayer.jsx](file:///c:/Users/choud/OneDrive/Desktop/Yt%20Watch%20Party/frontend/src/components/YouTubePlayer.jsx):

```javascript
const isRemoteAction = useRef(false);

// When server sends a remote playback command:
function handleRemotePlay() {
  isRemoteAction.current = true; // Lock
  ytPlayer.current.playVideo();
}

// When YouTube's internal onStateChange triggers:
function onStateChange(event) {
  if (isRemoteAction.current) {
    // This was triggered by the remote server, NOT the user!
    isRemoteAction.current = false; // Reset lock
    return; // STOP! Do not emit to socket!
  }

  // Only emit to server if local user legitimately clicked player controls
  if (canControl) {
    socket.emit("play", { currentTime });
  }
}
```

---

## 4. Frontend Component Breakdown

```text
App.jsx (Decides whether to show Home or Room based on state)
 ├── Home.jsx
 │    ├── Create Room form (generates new room code & assigns Host)
 │    └── Join Room form (joins existing room as Participant)
 │
 └── Room.jsx
      ├── Header & Navbar (Room ID, Copy Link, Leave Room)
      ├── YouTubePlayer.jsx (Loads YouTube IFrame API & avoids sync loops)
      ├── Video URL Input Bar (Change Video button)
      ├── Playback Controls Bar (Play & Pause buttons, sync indicator)
      └── Participants.jsx (List of users, role badges, Host management actions)
```

---

## 5. Security & Backend Permissions

Hiding buttons in the frontend is not enough. A user can still open the browser console and try to emit socket events directly.

Our backend validates permissions for every single event:

- **Playback Controls (`play`, `pause`, `seek`, `change_video`)**:
  ```javascript
  function canControl(user) {
    return user.role === "Host" || user.role === "Moderator";
  }
  ```
- **Administrative Actions (`assign_role`, `remove_participant`)**:
  ```javascript
  function isHost(user) {
    return user.role === "Host";
  }
  ```

If an unauthorized user attempts an action, the server rejects it and emits an `error_message` event without altering room state.
