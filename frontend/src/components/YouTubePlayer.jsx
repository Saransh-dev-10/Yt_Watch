import React, { useEffect, useRef } from "react";

export default function YouTubePlayer({
  videoId,
  canControl,
  onPlay,
  onPause,
  onSeek,
  playerRef
}) {
  const containerRef = useRef(null);
  const ytPlayer = useRef(null);
  const isRemoteAction = useRef(false);

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player || !containerRef.current) return;

      ytPlayer.current = new window.YT.Player(containerRef.current, {
        videoId: videoId || "dQw4w9WgXcQ",
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          modestbranding: 1
        },
        events: {
          onReady: (event) => {
            console.log("[YouTube Player] Ready");
            if (playerRef) {
              playerRef.current = {
                play: () => {
                  isRemoteAction.current = true;
                  event.target.playVideo();
                },
                pause: () => {
                  isRemoteAction.current = true;
                  event.target.pauseVideo();
                },
                seekTo: (seconds) => {
                  isRemoteAction.current = true;
                  event.target.seekTo(seconds, true);
                },
                loadVideo: (newVideoId) => {
                  isRemoteAction.current = true;
                  event.target.loadVideoById(newVideoId);
                },
                getCurrentTime: () => event.target.getCurrentTime()
              };
            }
          },
          onStateChange: (event) => {
            if (isRemoteAction.current) {
              isRemoteAction.current = false;
              return;
            }

            if (!canControl) {
              return;
            }

            const currentTime = Math.floor(event.target.getCurrentTime() || 0);

            if (event.data === window.YT.PlayerState.PLAYING) {
              if (onPlay) onPlay(currentTime);
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              if (onPause) onPause(currentTime);
            }
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (ytPlayer.current && ytPlayer.current.destroy) {
        ytPlayer.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (ytPlayer.current && ytPlayer.current.loadVideoById && videoId) {
      isRemoteAction.current = true;
      ytPlayer.current.loadVideoById(videoId);
    }
  }, [videoId]);

  return (
    <div className="player-wrapper">
      <div ref={containerRef}></div>
    </div>
  );
}
