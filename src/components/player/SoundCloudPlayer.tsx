import React, { useEffect, useRef } from 'react'
import { loadExternalScript } from '@/utils/scriptLoader'
import type { UnifiedPlayerRef } from '@/types/player.types'

interface SoundCloudWidget {
  play(): void
  pause(): void
  seekTo(ms: number): void
  setVolume(vol: number): void
  getDuration(cb: (ms: number) => void): void
  bind(event: string, cb: (data?: { currentPosition?: number }) => void): void
}

interface SoundCloudGlobal {
  Widget: ((iframe: HTMLIFrameElement) => SoundCloudWidget) & {
    Events: {
      READY: string
      PLAY: string
      PAUSE: string
      PLAY_PROGRESS: string
    }
  }
}

declare global {
  interface Window {
    SC?: SoundCloudGlobal
  }
}

interface SoundCloudPlayerProps {
  trackUrl: string
  onPlay: () => void
  onPause: () => void
  onBuffering: (buffering: boolean) => void
  onTimeUpdate?: (currentTime: number, duration: number) => void
  controllerRef?: React.MutableRefObject<UnifiedPlayerRef | null>
}

export const SoundCloudPlayer: React.FC<SoundCloudPlayerProps> = ({
  trackUrl,
  onPlay,
  onPause,
  onBuffering,
  onTimeUpdate,
  controllerRef,
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const widgetRef = useRef<SoundCloudWidget | null>(null)
  const isRemoteAction = useRef<boolean>(false)
  const currentTimeRef = useRef<number>(0)
  const durationRef = useRef<number>(0)
  const isPlayingRef = useRef<boolean>(false)

  const callbacksRef = useRef({ onPlay, onPause, onBuffering, onTimeUpdate })
  useEffect(() => {
    callbacksRef.current = { onPlay, onPause, onBuffering, onTimeUpdate }
  })

  useEffect(() => {
    if (!controllerRef) return
    controllerRef.current = {
      play: () => {
        isRemoteAction.current = true
        widgetRef.current?.play()
        setTimeout(() => {
          isRemoteAction.current = false
        }, 400)
      },
      pause: () => {
        isRemoteAction.current = true
        widgetRef.current?.pause()
        setTimeout(() => {
          isRemoteAction.current = false
        }, 400)
      },
      seekTo: (seconds: number) => {
        isRemoteAction.current = true
        widgetRef.current?.seekTo(Math.max(0, seconds * 1000))
        setTimeout(() => {
          isRemoteAction.current = false
        }, 500)
      },
      getCurrentTime: () => currentTimeRef.current,
      getDuration: () => durationRef.current,
      isPlaying: () => isPlayingRef.current,
      setVolume: (vol: number) => widgetRef.current?.setVolume(Math.round(vol * 100)),
      setMuted: (muted: boolean) => widgetRef.current?.setVolume(muted ? 0 : 100),
    }
    return () => {
      controllerRef.current = null
    }
  }, [controllerRef])

  useEffect(() => {
    let cancelled = false
    void loadExternalScript('https://w.soundcloud.com/player/api.js').then(() => {
      if (cancelled || !iframeRef.current || !window.SC?.Widget) return
      const widget = window.SC.Widget(iframeRef.current)
      widgetRef.current = widget

      const { READY, PLAY, PAUSE, PLAY_PROGRESS } = window.SC.Widget.Events
      widget.bind(READY, () => {
        widget.getDuration((ms) => {
          durationRef.current = (ms || 0) / 1000
        })
      })
      widget.bind(PLAY, () => {
        isPlayingRef.current = true
        callbacksRef.current.onBuffering(false)
        if (!isRemoteAction.current) callbacksRef.current.onPlay()
      })
      widget.bind(PAUSE, () => {
        isPlayingRef.current = false
        if (!isRemoteAction.current) callbacksRef.current.onPause()
      })
      widget.bind(PLAY_PROGRESS, (data) => {
        if (data?.currentPosition !== undefined) {
          currentTimeRef.current = data.currentPosition / 1000
          callbacksRef.current.onTimeUpdate?.(currentTimeRef.current, durationRef.current)
        }
      })
    })
    return () => {
      cancelled = true
      widgetRef.current = null
    }
  }, [trackUrl])

  const widgetSrc = `https://w.soundcloud.com/player/?url=${encodeURIComponent(trackUrl)}&color=%23ea383e&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true`

  return (
    <iframe
      ref={iframeRef}
      key={trackUrl}
      src={widgetSrc}
      title="SoundCloud Party Player"
      allow="autoplay"
      style={{ width: '100%', height: '100%', border: 'none', background: '#090b10' }}
    />
  )
}

