import React, { useState, useEffect } from "react";
import { socket } from "../socket";

export default function Home({ onJoinedRoom }) {
  const [createUsername, setCreateUsername] = useState("");
  const [joinUsername, setJoinUsername] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get("room");
    if (roomParam) {
      setJoinRoomId(roomParam.toUpperCase());
    }
  }, []);

  useEffect(() => {
    function handleError(data) {
      setErrorMessage(data.message || "An unexpected error occurred.");
    }

    socket.on("error_message", handleError);
    return () => {
      socket.off("error_message", handleError);
    };
  }, []);

  const handleCreateRoom = (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!createUsername.trim()) {
      setErrorMessage("Please enter your username to create a room.");
      return;
    }

    socket.emit(
      "join_room",
      {
        username: createUsername.trim(),
        isCreating: true
      },
      (res) => {
        if (res && res.success) {
          onJoinedRoom({
            roomId: res.roomId,
            username: createUsername.trim(),
            isHost: true,
            initialRole: res.role || "Host",
            initialRoomData: res.room
          });
        }
      }
    );
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!joinUsername.trim()) {
      setErrorMessage("Please enter your username to join.");
      return;
    }

    if (!joinRoomId.trim()) {
      setErrorMessage("Please enter a valid Room ID.");
      return;
    }

    socket.emit(
      "join_room",
      {
        roomId: joinRoomId.trim().toUpperCase(),
        username: joinUsername.trim(),
        isCreating: false
      },
      (res) => {
        if (res && res.success) {
          onJoinedRoom({
            roomId: res.roomId,
            username: joinUsername.trim(),
            isHost: res.role === "Host",
            initialRole: res.role || "Participant",
            initialRoomData: res.room
          });
        }
      }
    );
  };

  return (
    <div className="home-page">
      <div className="home-header">
        <h1>YouTube Watch Party</h1>
        <p>Watch synchronized videos together with friends in real-time</p>
      </div>

      {errorMessage && (
        <div className="error-banner" style={{ maxWidth: "850px", width: "100%" }}>
          ⚠️ {errorMessage}
        </div>
      )}

      <div className="cards-container">
        <div className="card">
          <h2>Create Room</h2>
          <p className="card-subtitle">Start a new party and invite others</p>

          <form onSubmit={handleCreateRoom}>
            <div className="form-group">
              <label>Your Username</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Saransh"
                value={createUsername}
                onChange={(e) => setCreateUsername(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
              Create Room
            </button>
          </form>
        </div>

        <div className="divider">OR</div>

        <div className="card">
          <h2>Join Room</h2>
          <p className="card-subtitle">Enter a Room ID shared with you</p>

          <form onSubmit={handleJoinRoom}>
            <div className="form-group">
              <label>Room ID</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. ABC123"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
              />
            </div>

            <div className="form-group">
              <label>Your Username</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Rahul"
                value={joinUsername}
                onChange={(e) => setJoinUsername(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-blue" style={{ width: "100%" }}>
              Join Room
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
