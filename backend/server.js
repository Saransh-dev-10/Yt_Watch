const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

const rooms = new Map();

function generateRoomId() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return rooms.has(result) ? generateRoomId() : result;
}

function canControl(user) {
  return user && (user.role === "Host" || user.role === "Moderator");
}

function isHost(user) {
  return user && user.role === "Host";
}

function getParticipant(room, socketId) {
  if (!room || !room.participants) return null;
  return room.participants.find((p) => p.id === socketId);
}

app.get("/", (req, res) => {
  res.send({ status: "YouTube Watch Party Backend is running!" });
});

io.on("connection", (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  socket.on("join_room", ({ roomId, username, isCreating }, callback) => {
    if (!username || !username.trim()) {
      return socket.emit("error_message", { message: "Username is required." });
    }

    let targetRoomId = roomId ? roomId.trim().toUpperCase() : null;

    if (isCreating) {
      targetRoomId = generateRoomId();

      const newRoom = {
        roomId: targetRoomId,
        hostId: socket.id,
        videoId: "dQw4w9WgXcQ",
        isPlaying: false,
        currentTime: 0,
        participants: [
          {
            id: socket.id,
            username: username.trim(),
            role: "Host"
          }
        ]
      };

      rooms.set(targetRoomId, newRoom);
      console.log(`[Room Created] Room ID: ${targetRoomId} by Host: ${username}`);
    } else {
      if (!targetRoomId || !rooms.has(targetRoomId)) {
        return socket.emit("error_message", { message: "Room not found. Please check the Room ID." });
      }

      const room = rooms.get(targetRoomId);

      const newParticipant = {
        id: socket.id,
        username: username.trim(),
        role: "Participant"
      };

      room.participants.push(newParticipant);
      console.log(`[User Joined] ${username} joined Room: ${targetRoomId} as Participant`);
    }

    const room = rooms.get(targetRoomId);

    socket.data.roomId = targetRoomId;
    socket.data.username = username.trim();

    socket.join(targetRoomId);

    socket.emit("sync_state", {
      roomId: room.roomId,
      hostId: room.hostId,
      videoId: room.videoId,
      isPlaying: room.isPlaying,
      currentTime: room.currentTime,
      participants: room.participants,
      yourRole: getParticipant(room, socket.id)?.role || "Participant"
    });

    socket.to(targetRoomId).emit("user_joined", {
      username: username.trim(),
      role: getParticipant(room, socket.id)?.role,
      participants: room.participants
    });

    const myRole = getParticipant(room, socket.id)?.role || (isCreating ? "Host" : "Participant");

    if (typeof callback === "function") {
      callback({
        success: true,
        roomId: targetRoomId,
        role: myRole,
        room: {
          roomId: room.roomId,
          hostId: room.hostId,
          videoId: room.videoId,
          isPlaying: room.isPlaying,
          currentTime: room.currentTime,
          participants: room.participants,
          yourRole: myRole
        }
      });
    }
  });

  socket.on("request_sync", () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const user = getParticipant(room, socket.id);
    socket.emit("sync_state", {
      roomId: room.roomId,
      hostId: room.hostId,
      videoId: room.videoId,
      isPlaying: room.isPlaying,
      currentTime: room.currentTime,
      participants: room.participants,
      yourRole: user?.role || "Participant"
    });
  });

  socket.on("play", ({ currentTime }) => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room) return;

    const user = getParticipant(room, socket.id);

    if (!canControl(user)) {
      return socket.emit("error_message", { message: "Permission Denied: Only Host or Moderator can play." });
    }

    room.isPlaying = true;
    if (typeof currentTime === "number") {
      room.currentTime = currentTime;
    }

    console.log(`[Play] Room: ${roomId} at ${room.currentTime}s by ${user.username}`);

    socket.to(roomId).emit("play", {
      currentTime: room.currentTime,
      by: user.username
    });
  });

  socket.on("pause", ({ currentTime }) => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room) return;

    const user = getParticipant(room, socket.id);

    if (!canControl(user)) {
      return socket.emit("error_message", { message: "Permission Denied: Only Host or Moderator can pause." });
    }

    room.isPlaying = false;
    if (typeof currentTime === "number") {
      room.currentTime = currentTime;
    }

    console.log(`[Pause] Room: ${roomId} at ${room.currentTime}s by ${user.username}`);

    socket.to(roomId).emit("pause", {
      currentTime: room.currentTime,
      by: user.username
    });
  });

  socket.on("seek", ({ currentTime }) => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room) return;

    const user = getParticipant(room, socket.id);

    if (!canControl(user)) {
      return socket.emit("error_message", { message: "Permission Denied: Only Host or Moderator can seek." });
    }

    if (typeof currentTime === "number") {
      room.currentTime = currentTime;
    }

    console.log(`[Seek] Room: ${roomId} to ${currentTime}s by ${user.username}`);

    socket.to(roomId).emit("seek", {
      currentTime: room.currentTime,
      by: user.username
    });
  });

  socket.on("change_video", ({ videoId }) => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room) return;

    const user = getParticipant(room, socket.id);

    if (!canControl(user)) {
      return socket.emit("error_message", { message: "Permission Denied: Only Host or Moderator can change the video." });
    }

    if (!videoId || typeof videoId !== "string") {
      return socket.emit("error_message", { message: "Invalid video ID." });
    }

    room.videoId = videoId.trim();
    room.currentTime = 0;
    room.isPlaying = false;

    console.log(`[Change Video] Room: ${roomId} video changed to ${room.videoId} by ${user.username}`);

    io.in(roomId).emit("change_video", {
      videoId: room.videoId,
      by: user.username
    });
  });

  socket.on("assign_role", ({ targetUserId, role }) => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room) return;

    const sender = getParticipant(room, socket.id);

    if (!isHost(sender)) {
      return socket.emit("error_message", { message: "Permission Denied: Only the Host can assign roles." });
    }

    if (role !== "Moderator" && role !== "Participant") {
      return socket.emit("error_message", { message: "Invalid role specified." });
    }

    const targetUser = getParticipant(room, targetUserId);
    if (!targetUser) {
      return socket.emit("error_message", { message: "Target user not found." });
    }

    if (targetUser.id === room.hostId) {
      return socket.emit("error_message", { message: "Cannot change the Host's role." });
    }

    targetUser.role = role;
    console.log(`[Role Assigned] ${targetUser.username} is now ${role} in Room: ${roomId}`);

    io.in(roomId).emit("role_assigned", {
      targetUserId,
      newRole: role,
      participants: room.participants
    });
  });

  socket.on("remove_participant", ({ targetUserId }) => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room) return;

    const sender = getParticipant(room, socket.id);

    if (!isHost(sender)) {
      return socket.emit("error_message", { message: "Permission Denied: Only the Host can remove participants." });
    }

    if (targetUserId === socket.id) {
      return socket.emit("error_message", { message: "Host cannot remove themselves from the room." });
    }

    const targetIndex = room.participants.findIndex((p) => p.id === targetUserId);
    if (targetIndex === -1) {
      return socket.emit("error_message", { message: "Participant not found." });
    }

    const removedUser = room.participants[targetIndex];
    room.participants.splice(targetIndex, 1);

    console.log(`[Participant Removed] ${removedUser.username} removed from Room: ${roomId} by Host`);

    io.to(targetUserId).emit("participant_removed", {
      message: "You have been removed from the room by the Host."
    });

    const targetSocket = io.sockets.sockets.get(targetUserId);
    if (targetSocket) {
      targetSocket.leave(roomId);
      delete targetSocket.data.roomId;
    }

    socket.to(roomId).emit("user_left", {
      username: removedUser.username,
      participants: room.participants
    });
  });

  function handleUserLeave() {
    const roomId = socket.data.roomId;
    if (!roomId || !rooms.has(roomId)) return;

    const room = rooms.get(roomId);
    const index = room.participants.findIndex((p) => p.id === socket.id);
    if (index === -1) return;

    const departingUser = room.participants[index];
    room.participants.splice(index, 1);

    console.log(`[User Left] ${departingUser.username} left Room: ${roomId}`);

    if (departingUser.role === "Host" && room.participants.length > 0) {
      const nextHost = room.participants.find((p) => p.role === "Moderator") || room.participants[0];
      nextHost.role = "Host";
      room.hostId = nextHost.id;
      console.log(`[New Host] Transferred Host to ${nextHost.username} in Room: ${roomId}`);
    }

    if (room.participants.length === 0) {
      rooms.delete(roomId);
      console.log(`[Room Deleted] Room: ${roomId} was deleted because it became empty.`);
    } else {
      socket.to(roomId).emit("user_left", {
        username: departingUser.username,
        participants: room.participants
      });
    }

    socket.leave(roomId);
    delete socket.data.roomId;
  }

  socket.on("leave_room", handleUserLeave);
  socket.on("disconnect", () => {
    console.log(`[Socket Disconnected] ID: ${socket.id}`);
    handleUserLeave();
  });
});

server.listen(PORT, () => {
  console.log(`>>> YouTube Watch Party Server running on http://localhost:${PORT}`);
});
