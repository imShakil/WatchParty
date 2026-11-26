import React, { useEffect, useRef, useState } from 'react'
import { loadExternalScript } from '@/utils/scriptLoader'
import type { UnifiedPlayerRef } from '@/types/player.types'
import { Loader2 } from 'lucide-react'

interface TwitchPlayerInstance {
  play(): void
  pause(): void
  seek(timestamp: number): void
  getCurrentTime(): number
  getDuration(): number
  isPaused(): boolean
  setVolume(volumeLevel: number): void
  setMuted(muted: boolean): void
  addEventListener(event: string, cb: () => void): void
  setChannel?(channel: string): void
  setVideo?(video: string): void
  destroy?(): void
}

interface TwitchGlobal {
  Player: {
    new (
      element: HTMLElement | string,
      options: Record<string, unknown>
    ): TwitchPlayerInstance
    READY: string
    PLAY: string
    PAUSE: string
    ONLINE: string
    OFFLINE: string
  }
}

declare global {
  interface Window {
    Twitch?: TwitchGlobal
  }
}

interface TwitchPlayerProps {
  channel?: string
  videoId?: string
  onPlay: () => void
  onPause: () => void
  onBuffering: (buffering: boolean) => void
  onTimeUpdate?: (currentTime: number, duration: number) => void
  controllerRef?: React.MutableRefObject<UnifiedPlayerRef | null>
}

export const TwitchPlayer: React.FC<TwitchPlayerProps> = ({
  channel,
  videoId,
  onPlay,
  onPause,
  onBuffering,
  onTimeUpdate,
  controllerRef,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<TwitchPlayerInstance | null>(null)
  const isRemoteAction = useRef<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const initialSourceRef = useRef({ channel, videoId })

  const callbacksRef = useRef({ onPlay, onPause, onBuffering, onTimeUpdate })
  useEffect(() => {
    callbacksRef.current = { onPlay, onPause, onBuffering, onTimeUpdate }
  })

  useEffect(() => {
    if (!controllerRef) return
    controllerRef.current = {
      play: () => {
        isRemoteAction.current = true
        playerRef.current?.play()
        setTimeout(() => {
          isRemoteAction.current = false
        }, 400)
      },
      pause: () => {
        isRemoteAction.current = true
        playerRef.current?.pause()
        setTimeout(() => {
          isRemoteAction.current = false
        }, 400)
      },
      seekTo: (seconds: number) => {
        isRemoteAction.current = true
        playerRef.current?.seek(seconds)
        setTimeout(() => {
          isRemoteAction.current = false
        }, 500)
      },
      getCurrentTime: () => playerRef.current?.getCurrentTime() || 0,
      getDuration: () => playerRef.current?.getDuration() || 0,
      isPlaying: () => !(playerRef.current?.isPaused() ?? true),
      setVolume: (vol: number) => playerRef.current?.setVolume(Math.max(0, Math.min(1, vol))),
      setMuted: (muted: boolean) => playerRef.current?.setMuted(muted),
    }
    return () => {
      controllerRef.current = null
    }
  }, [controllerRef])

  useEffect(() => {
    const interval = window.setInterval(() => {
      const p = playerRef.current
      if (p) {
        callbacksRef.current.onTimeUpdate?.(p.getCurrentTime() || 0, p.getDuration() || 0)
      }
    }, 500)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    let cancelled = false
    const containerEl = mountRef.current
    if (!containerEl) return

    const { channel: initChannel, videoId: initVideo } = initialSourceRef.current

    void loadExternalScript('https://player.twitch.tv/js/embed/v1.js')
      .then(() => {
        if (cancelled || !window.Twitch?.Player) return

        containerEl.innerHTML = ''
        const hostEl = document.createElement('div')
        hostEl.style.width = '100%'
        hostEl.style.height = '100%'
        containerEl.appendChild(hostEl)

        const parents = Array.from(
          new Set([window.location.hostname, 'party.dekhoprime.live', 'localhost'])
        )

        const player = new window.Twitch.Player(hostEl, {
          width: '100%',
          height: '100%',
          ...(initVideo ? { video: initVideo } : { channel: initChannel }),
          parent: parents,
          autoplay: true,
        })
        playerRef.current = player

        const { READY, PLAY, PAUSE } = window.Twitch.Player
        player.addEventListener(READY, () => {
          if (!cancelled) setIsLoading(false)
        })
        player.addEventListener(PLAY, () => {
          callbacksRef.current.onBuffering(false)
          if (!isRemoteAction.current) callbacksRef.current.onPlay()
        })
        player.addEventListener(PAUSE, () => {
          if (!isRemoteAction.current) callbacksRef.current.onPause()
        })
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
      playerRef.current?.destroy?.()
      playerRef.current = null
      containerEl.innerHTML = ''
    }
  }, [])

  useEffect(() => {
    const player = playerRef.current
    if (!player) return
    if (videoId && videoId !== initialSourceRef.current.videoId) {
      initialSourceRef.current = { channel: undefined, videoId }
      player.setVideo?.(videoId)
    } else if (channel && channel !== initialSourceRef.current.channel) {
      initialSourceRef.current = { channel, videoId: undefined }
      player.setChannel?.(channel)
    }
  }, [channel, videoId])

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
            Loading Twitch Stream...
          </span>
        </div>
      )}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}

