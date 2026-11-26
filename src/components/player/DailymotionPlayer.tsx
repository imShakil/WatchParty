import React, { useEffect, useRef } from 'react'
import type { UnifiedPlayerRef } from '@/types/player.types'

interface DailymotionPlayerProps {
  videoId: string
  canControl: boolean
  onPlay: () => void
  onPause: () => void
  onBuffering: (buffering: boolean) => void
  onTimeUpdate?: (currentTime: number, duration: number) => void
  controllerRef?: React.MutableRefObject<UnifiedPlayerRef | null>
}

export const DailymotionPlayer: React.FC<DailymotionPlayerProps> = ({
  videoId,
  canControl: _canControl,
  onPlay,
  onPause,
  onBuffering,
  onTimeUpdate,
  controllerRef,
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const isRemoteAction = useRef<boolean>(false)
  const currentTimeRef = useRef<number>(0)
  const durationRef = useRef<number>(0)
  const isPlayingRef = useRef<boolean>(false)

  const callbacksRef = useRef({ onPlay, onPause, onBuffering, onTimeUpdate })
  useEffect(() => {
    callbacksRef.current = { onPlay, onPause, onBuffering, onTimeUpdate }
  })

  const sendCommand = (command: string, parameters: unknown[] = []) => {
    const win = iframeRef.current?.contentWindow
    if (!win) return
    win.postMessage(JSON.stringify({ command, parameters }), '*')
  }

  useEffect(() => {
    if (!controllerRef) return
    controllerRef.current = {
      play: () => {
        isRemoteAction.current = true
        sendCommand('play')
        setTimeout(() => {
          isRemoteAction.current = false
        }, 400)
      },
      pause: () => {
        isRemoteAction.current = true
        sendCommand('pause')
        setTimeout(() => {
          isRemoteAction.current = false
        }, 400)
      },
      seekTo: (seconds: number) => {
        isRemoteAction.current = true
        sendCommand('seek', [seconds])
        setTimeout(() => {
          isRemoteAction.current = false
        }, 500)
      },
      getCurrentTime: () => currentTimeRef.current,
      getDuration: () => durationRef.current,
      isPlaying: () => isPlayingRef.current,
      setVolume: (vol: number) => sendCommand('volume', [Math.max(0, Math.min(1, vol))]),
      setMuted: (muted: boolean) => sendCommand('muted', [muted]),
    }
    return () => {
      controllerRef.current = null
    }
  }, [controllerRef])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.includes('dailymotion.com')) return
      let data: Record<string, unknown> | null = null
      if (typeof event.data === 'string') {
        const params = new URLSearchParams(event.data)
        const obj: Record<string, unknown> = {}
        params.forEach((v, k) => {
          obj[k] = v
        })
        data = obj
      } else if (event.data && typeof event.data === 'object') {
        data = event.data as Record<string, unknown>
      }
      if (!data) return

      const evt = String(data.event || '')
      if (data.time !== undefined) currentTimeRef.current = Number(data.time) || 0
      if (data.duration !== undefined) durationRef.current = Number(data.duration) || 0

      if (evt === 'timeupdate') {
        callbacksRef.current.onTimeUpdate?.(currentTimeRef.current, durationRef.current)
      } else if (evt === 'playing' || evt === 'play') {
        isPlayingRef.current = true
        callbacksRef.current.onBuffering(false)
        if (!isRemoteAction.current) callbacksRef.current.onPlay()
      } else if (evt === 'pause') {
        isPlayingRef.current = false
        if (!isRemoteAction.current) callbacksRef.current.onPause()
      } else if (evt === 'waiting') {
        callbacksRef.current.onBuffering(true)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const embedUrl = `https://geo.dailymotion.com/player.html?video=${encodeURIComponent(videoId)}`

  return (
    <iframe
      ref={iframeRef}
      key={videoId}
      src={embedUrl}
      title="Dailymotion Watch Party"
      allow="autoplay; fullscreen; picture-in-picture; web-share"
      allowFullScreen
      style={{ width: '100%', height: '100%', border: 'none', background: '#000' }}
    />
  )
}

