import React, { useEffect, useRef, useState } from 'react'
import VimeoPlayerSdk from '@vimeo/player'
import type { UnifiedPlayerRef } from '@/types/player.types'
import { Loader2 } from 'lucide-react'

interface VimeoPlayerProps {
  videoId: string
  canControl: boolean
  onPlay: () => void
  onPause: () => void
  onBuffering: (buffering: boolean) => void
  onTimeUpdate?: (currentTime: number, duration: number) => void
  controllerRef?: React.MutableRefObject<UnifiedPlayerRef | null>
}

export const VimeoPlayer: React.FC<VimeoPlayerProps> = ({
  videoId,
  canControl,
  onPlay,
  onPause,
  onBuffering,
  onTimeUpdate,
  controllerRef,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<VimeoPlayerSdk | null>(null)
  const isRemoteAction = useRef<boolean>(false)
  const currentTimeRef = useRef<number>(0)
  const durationRef = useRef<number>(0)
  const isPlayingRef = useRef<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const initialVideoIdRef = useRef<string>(videoId)

  const callbacksRef = useRef({ onPlay, onPause, onBuffering, onTimeUpdate })
  useEffect(() => {
    callbacksRef.current = { onPlay, onPause, onBuffering, onTimeUpdate }
  })

  useEffect(() => {
    if (!controllerRef) return
    controllerRef.current = {
      play: () => {
        isRemoteAction.current = true
        void playerRef.current?.play().catch(() => {})
        setTimeout(() => {
          isRemoteAction.current = false
        }, 400)
      },
      pause: () => {
        isRemoteAction.current = true
        void playerRef.current?.pause().catch(() => {})
        setTimeout(() => {
          isRemoteAction.current = false
        }, 400)
      },
      seekTo: (seconds: number) => {
        isRemoteAction.current = true
        void playerRef.current?.setCurrentTime(seconds).catch(() => {})
        setTimeout(() => {
          isRemoteAction.current = false
        }, 500)
      },
      getCurrentTime: () => currentTimeRef.current,
      getDuration: () => durationRef.current,
      isPlaying: () => isPlayingRef.current,
      setVolume: (vol: number) => {
        void playerRef.current?.setVolume(Math.max(0, Math.min(1, vol))).catch(() => {})
      },
      setMuted: (muted: boolean) => {
        void playerRef.current?.setMuted(muted).catch(() => {})
      },
    }
    return () => {
      controllerRef.current = null
    }
  }, [controllerRef])

  useEffect(() => {
    const containerEl = mountRef.current
    if (!containerEl) return

    containerEl.innerHTML = ''
    const hostEl = document.createElement('div')
    hostEl.style.width = '100%'
    hostEl.style.height = '100%'
    containerEl.appendChild(hostEl)

    const player = new VimeoPlayerSdk(hostEl, {
      id: Number(initialVideoIdRef.current),
      autoplay: true,
      responsive: true,
      controls: canControl,
      dnt: true,
    })
    playerRef.current = player

    player.ready().then(() => {
      setIsLoading(false)
      void player.getDuration().then((d) => {
        durationRef.current = d || 0
      })
    }).catch(() => {
      setIsLoading(false)
    })

    player.on('play', () => {
      isPlayingRef.current = true
      callbacksRef.current.onBuffering(false)
      if (!isRemoteAction.current) callbacksRef.current.onPlay()
    })

    player.on('pause', () => {
      isPlayingRef.current = false
      if (!isRemoteAction.current) callbacksRef.current.onPause()
    })

    player.on('bufferstart', () => callbacksRef.current.onBuffering(true))
    player.on('bufferend', () => callbacksRef.current.onBuffering(false))

    player.on('timeupdate', (data: { seconds: number; duration: number }) => {
      currentTimeRef.current = data.seconds || 0
      if (data.duration > 0) durationRef.current = data.duration
      callbacksRef.current.onTimeUpdate?.(currentTimeRef.current, durationRef.current)
    })

    return () => {
      void player.destroy().catch(() => {})
      playerRef.current = null
      containerEl.innerHTML = ''
    }
  }, [canControl])

  useEffect(() => {
    if (!playerRef.current || !videoId || videoId === initialVideoIdRef.current) return
    initialVideoIdRef.current = videoId
    void playerRef.current.loadVideo(Number(videoId)).catch(() => {})
  }, [videoId])

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
            Loading Vimeo Video...
          </span>
        </div>
      )}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}

