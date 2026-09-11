import React, { useState, useEffect, useRef } from "react";
import { socket } from "../socket";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState(null);
  
  const panelRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleJoin = (data) => {
      const msg = `👤 ${data.username} joined the room`;
      addNotification("join", data.username, msg);
    };

    const handleLeave = (data) => {
      const msg = `👋 ${data.username} left the room`;
      addNotification("leave", data.username, msg);
    };

    socket.on("user_joined", handleJoin);
    socket.on("user_left", handleLeave);

    return () => {
      socket.off("user_joined", handleJoin);
      socket.off("user_left", handleLeave);
    };
  }, []);

  const addNotification = (type, username, message) => {
    const id = Date.now() + Math.random();
    const newNotif = {
      id,
      type,
      username,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setNotifications(prev => [newNotif, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    setToast({ id, message });
    setTimeout(() => {
      setToast(prev => (prev && prev.id === id ? null : prev));
    }, 4000);
  };

  const togglePanel = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
    }
  };

  return (
    <div className="notification-bell-container" ref={panelRef}>
      <button className="bell-button" onClick={togglePanel}>
        🔔
        {unreadCount > 0 && <span className="unread-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-panel">
          <div className="notification-header">Notifications</div>
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">No notifications yet</div>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} className="notification-item">
                  <div className="notification-message">{notif.message}</div>
                  <div className="notification-time">{notif.timestamp}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="notification-toast">
          {toast.message}
        </div>
      )}
    </div>
  );
}
