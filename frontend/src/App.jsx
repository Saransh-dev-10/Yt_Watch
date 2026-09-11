import React, { useState } from "react";
import Home from "./pages/Home";
import Room from "./pages/Room";

export default function App() {
  const [currentRoom, setCurrentRoom] = useState(null);

  const handleJoinedRoom = ({ roomId, username, isHost, initialRole, initialRoomData }) => {
    const newUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    window.history.pushState({ path: newUrl }, "", newUrl);

    setCurrentRoom({
      roomId,
      username,
      isHost,
      initialRole: initialRole || (isHost ? "Host" : "Participant"),
      initialRoomData
    });
  };

  const handleLeaveRoom = () => {
    const cleanUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.pushState({ path: cleanUrl }, "", cleanUrl);

    setCurrentRoom(null);
  };

  return (
    <div className="app-container">
      {currentRoom ? (
        <Room
          roomId={currentRoom.roomId}
          currentUsername={currentRoom.username}
          initialRole={currentRoom.initialRole}
          initialRoomData={currentRoom.initialRoomData}
          onLeaveRoom={handleLeaveRoom}
        />
      ) : (
        <Home onJoinedRoom={handleJoinedRoom} />
      )}
    </div>
  );
}
