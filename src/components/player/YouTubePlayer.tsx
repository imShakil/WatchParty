import React, { useEffect, useRef, useState } from 'react'
import { loadYouTubeIframeApi } from '@/utils/youtubeLoader'
import type { YouTubePlayerInstance, UnifiedPlayerRef } from '@/types/player.types'
import { Loader2 } from 'lucide-react'

interface YouTubePlayerProps {
  videoId: string
  canControl: boolean
  onPlay: () => void
  onPause: () => void
  onBuffering: (buffering: boolean) => void
  onTimeUpdate?: (currentTime: number, duration: number) => void
  controllerRef?: React.MutableRefObject<UnifiedPlayerRef | null>
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  canControl,
  onPlay,
  onPause,
  onBuffering,
  onTimeUpdate,
  controllerRef,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<YouTubePlayerInstance | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const isRemoteAction = useRef<boolean>(false)
  const currentVideoId = useRef<string>(videoId)

  // Keep latest callbacks in ref to avoid recreating the player on function reference changes
  const callbacksRef = useRef({
    onPlay,
    onPause,
    onBuffering,
    onTimeUpdate,
  })

  useEffect(() => {
    callbacksRef.current = {
      onPlay,
      onPause,
      onBuffering,
      onTimeUpdate,
    }
  })

  // Attach unified controller interface
  useEffect(() => {
    if (!controllerRef) return

    controllerRef.current = {
      play: () => {
        const player = playerRef.current
        if (player) {
          isRemoteAction.current = true
          player.playVideo()
          setTimeout(() => {
            isRemoteAction.current = false
          }, 400)
        }
      },
      pause: () => {
        const player = playerRef.current
        if (player) {
          isRemoteAction.current = true
          player.pauseVideo()
          setTimeout(() => {
            isRemoteAction.current = false
          }, 400)
        }
      },
      seekTo: (seconds: number) => {
        const player = playerRef.current
        if (player) {
          isRemoteAction.current = true
          player.seekTo(seconds, true)
          setTimeout(() => {
            isRemoteAction.current = false
          }, 500)
        }
      },
      getCurrentTime: () => {
        return playerRef.current?.getCurrentTime() || 0
      },
      getDuration: () => {
        return playerRef.current?.getDuration() || 0
      },
      isPlaying: () => {
        return (
          playerRef.current?.getPlayerState() === window.YT?.PlayerState.PLAYING
        )
      },
      setVolume: (vol: number) => {
        playerRef.current?.setVolume(Math.round(vol * 100))
      },
      setMuted: (muted: boolean) => {
        if (muted) {
          playerRef.current?.mute()
        } else {
          playerRef.current?.unMute()
        }
      },
    }

    return () => {
      if (controllerRef) {
        controllerRef.current = null
      }
    }
  }, [controllerRef])

  // Periodic time update without triggering player re-renders
  useEffect(() => {
    const interval = window.setInterval(() => {
      const p = playerRef.current
      if (p && typeof p.getCurrentTime === 'function') {
        const cur = p.getCurrentTime()
        const dur = p.getDuration()
        callbacksRef.current.onTimeUpdate?.(cur, dur)
      }
    }, 500)

    return () => {
      window.clearInterval(interval)
    }
  }, [])

  // Initialize or update YouTube Player
  useEffect(() => {
    let isCancelled = false

    // If player is already initialized and only videoId changed, load video without recreating iframe
    if (playerRef.current) {
      if (currentVideoId.current !== videoId) {
        currentVideoId.current = videoId
        try {
          playerRef.current.loadVideoById(videoId)
        } catch (e) {
          console.error('Failed to switch YouTube videoId:', e)
        }
      }
      return
    }

    currentVideoId.current = videoId

    loadYouTubeIframeApi()
      .then((YT) => {
        if (isCancelled || !mountRef.current) return

        playerRef.current = new YT.Player(mountRef.current, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            controls: canControl ? 1 : 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            origin: window.location.origin,
            enablejsapi: 1,
            fs: 0,
            iv_load_policy: 3,
            cc_load_policy: 0,
          },
          events: {
            onReady: () => {
              if (isCancelled) return
              setIsLoading(false)
            },
            onStateChange: (event) => {
              if (isCancelled) return
              const state = event.data

              if (state === YT.PlayerState.BUFFERING) {
                callbacksRef.current.onBuffering(true)
                return
              }

              callbacksRef.current.onBuffering(false)

              // Ignore if triggered by programmatic peer sync
              if (isRemoteAction.current) {
                return
              }

              if (state === YT.PlayerState.PLAYING) {
                callbacksRef.current.onPlay()
              } else if (state === YT.PlayerState.PAUSED) {
                callbacksRef.current.onPause()
              }
            },
          },
        })
      })
      .catch((err) => {
        console.error('Failed to initialize YouTube player:', err)
        if (!isCancelled) setIsLoading(false)
      })

    return () => {
      isCancelled = true
      if (playerRef.current) {
        try {
          playerRef.current.destroy()
        } catch {
          // ignore cleanup errors
        }
        playerRef.current = null
      }
    }
  }, [videoId, canControl])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}>
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            background: 'var(--bg-primary)',
            zIndex: 10,
          }}
        >
          <Loader2 size={36} color="var(--accent-purple)" className="spin" />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Loading YouTube Video...
          </span>
        </div>
      )}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
