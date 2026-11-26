import React, { useEffect, useRef, useState } from 'react'
import { loadYouTubeIframeApi } from '@/utils/youtubeLoader'
import type { YouTubePlayerInstance, UnifiedPlayerRef } from '@/types/player.types'
import { Loader2 } from 'lucide-react'

export interface YouTubePlaylistState {
  index: number
  videoId: string
  videoIds: string[]
  title?: string
}

interface YouTubePlayerProps {
  videoId?: string
  thumbnailVideoId?: string
  playlistId?: string
  playlistIndex?: number
  canControl: boolean
  onPlay: () => void
  onPause: () => void
  onBuffering: (buffering: boolean) => void
  onPlayingStateChange?: (playing: boolean) => void
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onPlaylistUpdate?: (state: YouTubePlaylistState) => void
  controllerRef?: React.MutableRefObject<UnifiedPlayerRef | null>
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  thumbnailVideoId,
  playlistId,
  playlistIndex = 0,
  canControl: _canControl,
  onPlay,
  onPause,
  onBuffering,
  onPlayingStateChange,
  onTimeUpdate,
  onPlaylistUpdate,
  controllerRef,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<YouTubePlayerInstance | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [hasStarted, setHasStarted] = useState<boolean>(false)
  const [activeVideoId, setActiveVideoId] = useState<string | undefined>(videoId)
  const isRemoteAction = useRef<boolean>(false)
  const currentVideoId = useRef<string | undefined>(videoId)
  const currentPlaylistId = useRef<string | undefined>(playlistId)

  // Keep latest callbacks in ref to avoid recreating the player on function reference changes
  const callbacksRef = useRef({
    onPlay,
    onPause,
    onBuffering,
    onPlayingStateChange,
    onTimeUpdate,
    onPlaylistUpdate,
  })

  useEffect(() => {
    callbacksRef.current = {
      onPlay,
      onPause,
      onBuffering,
      onPlayingStateChange,
      onTimeUpdate,
      onPlaylistUpdate,
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
      playVideoAt: (index: number) => {
        const player = playerRef.current
        if (player?.playVideoAt) {
          isRemoteAction.current = true
          player.playVideoAt(index)
          setTimeout(() => {
            isRemoteAction.current = false
          }, 500)
        }
      },
      nextVideo: () => {
        const player = playerRef.current
        if (player?.nextVideo) {
          isRemoteAction.current = true
          player.nextVideo()
          setTimeout(() => {
            isRemoteAction.current = false
          }, 500)
        }
      },
      previousVideo: () => {
        const player = playerRef.current
        if (player?.previousVideo) {
          isRemoteAction.current = true
          player.previousVideo()
          setTimeout(() => {
            isRemoteAction.current = false
          }, 500)
        }
      },
      getPlaylistIndex: () => {
        return playerRef.current?.getPlaylistIndex?.() ?? 0
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

  const initialParamsRef = useRef({ videoId, playlistId, playlistIndex })

  // Initialize YouTube Player ONCE on mount and destroy only on unmount
  useEffect(() => {
    let isCancelled = false
    const containerEl = mountRef.current
    const {
      videoId: initVideoId,
      playlistId: initPlaylistId,
      playlistIndex: initPlaylistIndex,
    } = initialParamsRef.current

    const emitPlaylistState = (player: YouTubePlayerInstance) => {
      if (!currentPlaylistId.current) return
      const videoIds = player.getPlaylist?.() || []
      const index = player.getPlaylistIndex?.() ?? 0
      const data = player.getVideoData?.()
      callbacksRef.current.onPlaylistUpdate?.({
        index: index >= 0 ? index : 0,
        videoId: data?.video_id || videoIds[index] || '',
        videoIds,
        title: data?.title,
      })
    }

    currentVideoId.current = initVideoId
    currentPlaylistId.current = initPlaylistId

    loadYouTubeIframeApi()
      .then((YT) => {
        if (isCancelled || !mountRef.current) return

        const playerVars: Record<string, unknown> = {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin,
          enablejsapi: 1,
          fs: 0,
          iv_load_policy: 3,
          cc_load_policy: 0,
        }

        if (initPlaylistId) {
          playerVars.listType = 'playlist'
          playerVars.list = initPlaylistId
          if (initPlaylistIndex > 0) {
            playerVars.index = initPlaylistIndex
          }
        }

        const hostEl = mountRef.current
        hostEl.innerHTML = ''
        const playerEl = document.createElement('div')
        playerEl.style.width = '100%'
        playerEl.style.height = '100%'
        hostEl.appendChild(playerEl)

        playerRef.current = new YT.Player(playerEl, {
          ...(initVideoId && !initPlaylistId ? { videoId: initVideoId } : {}),
          width: '100%',
          height: '100%',
          playerVars,
          events: {
            onReady: (event) => {
              if (isCancelled) return
              setIsLoading(false)
              const readyId =
                event.target.getVideoData?.()?.video_id ||
                event.target.getPlaylist?.()?.[initPlaylistIndex] ||
                initVideoId
              if (readyId) setActiveVideoId(readyId)
              emitPlaylistState(event.target)
            },
            onStateChange: (event) => {
              if (isCancelled) return
              const state = event.data

              if (state === YT.PlayerState.BUFFERING) {
                callbacksRef.current.onBuffering(true)
                return
              }

              callbacksRef.current.onBuffering(false)
              emitPlaylistState(event.target)

              const data = event.target.getVideoData?.()
              if (data?.video_id) {
                setActiveVideoId(data.video_id)
              }

              if (state === YT.PlayerState.PLAYING) {
                setHasStarted(true)
                callbacksRef.current.onPlayingStateChange?.(true)
              } else if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.ENDED) {
                callbacksRef.current.onPlayingStateChange?.(false)
              }

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
      if (containerEl) {
        containerEl.innerHTML = ''
      }
    }
  }, [])

  // Switch video or playlist without recreating the iframe
  useEffect(() => {
    const player = playerRef.current
    if (!player) return

    if (playlistId && currentPlaylistId.current !== playlistId) {
      currentPlaylistId.current = playlistId
      currentVideoId.current = videoId
      setHasStarted(false)
      setActiveVideoId(videoId)
      try {
        player.loadPlaylist?.({
          list: playlistId,
          listType: 'playlist',
          index: playlistIndex,
        })
      } catch (e) {
        console.error('Failed to switch YouTube playlist:', e)
      }
    } else if (!playlistId && videoId && currentVideoId.current !== videoId) {
      currentPlaylistId.current = undefined
      currentVideoId.current = videoId
      setHasStarted(false)
      setActiveVideoId(videoId)
      try {
        player.loadVideoById(videoId)
      } catch (e) {
        console.error('Failed to switch YouTube videoId:', e)
      }
    }
  }, [videoId, playlistId, playlistIndex])

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
      {!isLoading && !hasStarted && (activeVideoId || thumbnailVideoId || videoId) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 8,
            background: '#000',
            pointerEvents: 'none',
          }}
        >
          <img
            src={`https://i.ytimg.com/vi/${activeVideoId || thumbnailVideoId || videoId}/hqdefault.jpg`}
            alt="Video preview"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'brightness(0.75)',
            }}
          />
        </div>
      )}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
