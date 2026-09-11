import React from "react";

export default function Participants({
  participants,
  currentUserRole,
  currentUserId,
  onAssignRole,
  onRemoveParticipant
}) {
  const isHost = currentUserRole === "Host";

  return (
    <div className="participants-sidebar">
      <div className="sidebar-header">
        <h3>Participants</h3>
        <span className="badge-count">{participants.length}</span>
      </div>

      <ul className="participants-list">
        {participants.map((p) => {
          const isCurrentUser = p.id === currentUserId;

          return (
            <li key={p.id} className="participant-item">
              <div className="participant-info">
                <span className="participant-name">
                  {p.username}
                  {isCurrentUser && <span className="you-tag">(You)</span>}
                </span>

                <span className={`role-badge role-${p.role.toLowerCase()}`}>
                  {p.role}
                </span>
              </div>

              {isHost && !isCurrentUser && (
                <div className="participant-actions">
                  {p.role === "Participant" ? (
                    <button
                      className="btn btn-sm btn-blue"
                      onClick={() => onAssignRole(p.id, "Moderator")}
                      title="Promote to Moderator"
                    >
                      Make Mod
                    </button>
                  ) : p.role === "Moderator" ? (
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => onAssignRole(p.id, "Participant")}
                      title="Demote to Participant"
                    >
                      Dismiss Mod
                    </button>
                  ) : null}

                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => onRemoveParticipant(p.id)}
                    title="Remove participant from room"
                  >
                    Remove
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
