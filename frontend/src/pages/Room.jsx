import React, { useState, useEffect, useRef } from "react";
import YouTubePlayer from "../components/YouTubePlayer";
import Participants from "../components/Participants";
import NotificationBell from "../components/NotificationBell";
import { socket } from "../socket";

function extractVideoId(input) {
  if (!input) return null;
  const trimmed = input.trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  const matchWatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (matchWatch && matchWatch[1]) return matchWatch[1];

  const matchShort = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (matchShort && matchShort[1]) return matchShort[1];

  const matchEmbed = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (matchEmbed && matchEmbed[1]) return matchEmbed[1];

  const matchShorts = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (matchShorts && matchShorts[1]) return matchShorts[1];

  const matchLive = trimmed.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/);
  if (matchLive && matchLive[1]) return matchLive[1];

  return null;
}

export default function Room({ roomId, currentUsername, initialRole, initialRoomData, onLeaveRoom }) {
  const [videoId, setVideoId] = useState(initialRoomData?.videoId || "dQw4w9WgXcQ");
  const [isPlaying, setIsPlaying] = useState(initialRoomData?.isPlaying || false);
  const [participants, setParticipants] = useState(initialRoomData?.participants || []);
  const [myRole, setMyRole] = useState(
    initialRole ||
    (initialRoomData?.participants?.find(
      (p) => p.id === socket.id || (currentUsername && p.username === currentUsername)
    )?.role) ||
    "Participant"
  );
  const [inputUrl, setInputUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const playerRef = useRef(null);

  const canControl = myRole === "Host" || myRole === "Moderator";

  const showNotification = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const updateParticipantsAndRole = (newParticipants, forcedRole) => {
    if (newParticipants && Array.isArray(newParticipants)) {
      setParticipants(newParticipants);
      const me = newParticipants.find(
        (p) => p.id === socket.id || (currentUsername && p.username === currentUsername)
      );
      if (me && me.role) {
        setMyRole(me.role);
        return;
      }
    }
    if (forcedRole) {
      setMyRole(forcedRole);
    }
  };

  useEffect(() => {
    if (participants && participants.length > 0) {
      const me = participants.find(
        (p) => p.id === socket.id || (currentUsername && p.username === currentUsername)
      );
      if (me && me.role && me.role !== myRole) {
        setMyRole(me.role);
      }
    }
  }, [participants, currentUsername, myRole]);

  useEffect(() => {
    socket.emit("request_sync");

    socket.on("sync_state", (data) => {
      if (data.videoId) setVideoId(data.videoId);
      if (data.participants) {
        updateParticipantsAndRole(data.participants, data.yourRole);
      } else if (data.yourRole) {
        setMyRole(data.yourRole);
      }
      setIsPlaying(data.isPlaying);

      if (typeof data.currentTime === "number" && data.currentTime > 0) {
        setTimeout(() => {
          if (playerRef.current) {
            playerRef.current.seekTo(data.currentTime);
            if (data.isPlaying) playerRef.current.play();
          }
        }, 800);
      }
    });

    socket.on("play", (data) => {
      setIsPlaying(true);
      if (playerRef.current) {
        if (typeof data.currentTime === "number") {
          const current = playerRef.current.getCurrentTime();
          if (Math.abs(current - data.currentTime) > 1.5) {
            playerRef.current.seekTo(data.currentTime);
          }
        }
        playerRef.current.play();
      }
      showNotification(`▶️ ${data.by || "Someone"} played the video`);
    });

    socket.on("pause", (data) => {
      setIsPlaying(false);
      if (playerRef.current) {
        if (typeof data.currentTime === "number") {
          playerRef.current.seekTo(data.currentTime);
        }
        playerRef.current.pause();
      }
      showNotification(`⏸️ ${data.by || "Someone"} paused the video`);
    });

    socket.on("seek", (data) => {
      if (playerRef.current && typeof data.currentTime === "number") {
        playerRef.current.seekTo(data.currentTime);
      }
      showNotification(`⏩ ${data.by || "Someone"} jumped to ${Math.floor(data.currentTime)}s`);
    });

    socket.on("change_video", (data) => {
      setVideoId(data.videoId);
      setIsPlaying(false);
      showNotification(`🎬 ${data.by || "Someone"} changed the video`);
    });

    socket.on("user_joined", (data) => {
      if (data.participants) {
        updateParticipantsAndRole(data.participants);
      }
    });

    socket.on("user_left", (data) => {
      if (data.participants) {
        updateParticipantsAndRole(data.participants);
      }
    });

    socket.on("role_assigned", (data) => {
      if (data.participants) {
        updateParticipantsAndRole(data.participants);
      }
      if (data.targetUserId === socket.id && data.newRole) {
        setMyRole(data.newRole);
      }
    });

    socket.on("participant_removed", (data) => {
      alert(data.message || "You were removed from the room by the Host.");
      onLeaveRoom();
    });

    socket.on("error_message", (data) => {
      showNotification(`⚠️ ${data.message}`);
    });

    return () => {
      socket.off("sync_state");
      socket.off("play");
      socket.off("pause");
      socket.off("seek");
      socket.off("change_video");
      socket.off("user_joined");
      socket.off("user_left");
      socket.off("role_assigned");
      socket.off("participant_removed");
      socket.off("error_message");
    };
  }, [onLeaveRoom, currentUsername]);

  const handlePlayClick = () => {
    if (!canControl) return;
    const currentTime = playerRef.current ? playerRef.current.getCurrentTime() : 0;
    setIsPlaying(true);
    if (playerRef.current) playerRef.current.play();
    socket.emit("play", { currentTime });
  };

  const handlePauseClick = () => {
    if (!canControl) return;
    const currentTime = playerRef.current ? playerRef.current.getCurrentTime() : 0;
    setIsPlaying(false);
    if (playerRef.current) playerRef.current.pause();
    socket.emit("pause", { currentTime });
  };

  const handlePlayerPlay = (currentTime) => {
    if (canControl) {
      setIsPlaying(true);
      socket.emit("play", { currentTime });
    }
  };

  const handlePlayerPause = (currentTime) => {
    if (canControl) {
      setIsPlaying(false);
      socket.emit("pause", { currentTime });
    }
  };

  const handleChangeVideo = (e) => {
    e.preventDefault();
    if (!canControl) return;

    const extracted = extractVideoId(inputUrl);
    if (!extracted) {
      showNotification("⚠️ Invalid YouTube URL. Please provide a valid YouTube link.");
      return;
    }

    socket.emit("change_video", { videoId: extracted });
    setInputUrl("");
  };

  const handleCopyLink = () => {
    const inviteUrl = `${window.location.origin}/?room=${roomId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAssignRole = (targetUserId, newRole) => {
    socket.emit("assign_role", { targetUserId, role: newRole });
  };

  const handleRemoveParticipant = (targetUserId) => {
    if (window.confirm("Are you sure you want to remove this participant?")) {
      socket.emit("remove_participant", { targetUserId });
    }
  };

  const handleLeave = () => {
    socket.emit("leave_room");
    onLeaveRoom();
  };

  return (
    <div className="room-page">
      <header className="navbar">
        <div className="navbar-brand">
          <svg viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
          <span>YouTube Watch Party</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div className="room-badge-container">
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Room:</span>
            <span className="room-id-tag">{roomId}</span>
            <button className="btn btn-sm btn-secondary" onClick={handleCopyLink}>
              {copied ? "Copied! ✓" : "Copy Link"}
            </button>
            <NotificationBell />
          </div>

          <button className="btn btn-sm btn-danger" onClick={handleLeave}>
            Leave Room
          </button>
        </div>
      </header>

      {toastMessage && (
        <div style={{
          backgroundColor: "#1f2937",
          border: "1px solid #374151",
          color: "#f3f4f6",
          padding: "0.6rem 1.2rem",
          borderRadius: "6px",
          position: "fixed",
          bottom: "1.5rem",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
        }}>
          {toastMessage}
        </div>
      )}

      <main className="room-container">
        <section className="video-column">
          <YouTubePlayer
            videoId={videoId}
            canControl={canControl}
            onPlay={handlePlayerPlay}
            onPause={handlePlayerPause}
            playerRef={playerRef}
          />

          <form className="url-bar-card" onSubmit={handleChangeVideo}>
            <input
              type="text"
              className="form-input"
              placeholder="Paste YouTube Video Link or ID (e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ)"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              disabled={!canControl}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!canControl || !inputUrl.trim()}
            >
              Change Video
            </button>
          </form>

          <div className="controls-card">
            <div className="control-buttons">
              <button
                className="btn btn-primary"
                onClick={handlePlayClick}
                disabled={!canControl}
              >
                ▶ Play
              </button>

              <button
                className="btn btn-secondary"
                onClick={handlePauseClick}
                disabled={!canControl}
              >
                ⏸ Pause
              </button>
            </div>

            <div className="status-pill">
              <span className={`status-indicator ${isPlaying ? "" : "paused"}`}></span>
              <span>{isPlaying ? "Playing in Sync" : "Paused"}</span>
            </div>

            <div className="user-status-card">
              You are <strong>{currentUsername}</strong> (<span style={{ color: myRole === "Host" ? "var(--badge-host)" : myRole === "Moderator" ? "var(--badge-mod)" : "var(--badge-part)" }}>{myRole}</span>)
              {!canControl && <span style={{ marginLeft: "0.5rem" }}>— <em>Controls disabled (Watch-only)</em></span>}
            </div>
          </div>
        </section>

        <aside>
          <Participants
            participants={participants}
            currentUserRole={myRole}
            currentUserId={socket.id}
            onAssignRole={handleAssignRole}
            onRemoveParticipant={handleRemoveParticipant}
          />
        </aside>
      </main>
    </div>
  );
}
