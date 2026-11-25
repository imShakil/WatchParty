import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import Hls from 'hls.js'
import { parseMediaUrl, withStartAtParam } from '@/utils/mediaUrl'
import { YouTubePlayer } from '@/components/player/YouTubePlayer'
import type { UnifiedPlayerRef } from '@/types/player.types'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Loader2,
  Lock,
  Radio,
  Wifi,
  MonitorUp,
  Square,
  RefreshCw,
} from 'lucide-react'

interface PartyPlayerProps {
  streamUrl: string
  sourceType?: string
  posterUrl?: string
  isHost: boolean
  isHostOnlyControl: boolean
  isP2PStream?: boolean
  remoteStream?: MediaStream | null
  embedStartAt?: number
  embedSyncNonce?: number
  embedClockTime?: number
  embedClockRunning?: boolean
  hostSyncTime?: number
  onBroadcastLocalStream?: (stream: MediaStream) => void
  onStopTabShare?: () => void
  onSyncEmbedToHost?: () => void
  onEmbedPlayerEvent?: (currentTime: number, eventName?: string) => void
  videoRef: React.RefObject<HTMLVideoElement | null>
  controllerRef?: React.MutableRefObject<UnifiedPlayerRef | null>
  onPlay: () => void
  onPause: () => void
  onSeek: (time: number) => void
  onBuffering: (buffering: boolean) => void
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export const PartyPlayer: React.FC<PartyPlayerProps> = ({
  streamUrl,
  sourceType,
  posterUrl,
  isHost,
  isHostOnlyControl,
  isP2PStream,
  remoteStream,
  embedStartAt = 0,
  embedSyncNonce = 0,
  embedClockTime = 0,
  embedClockRunning = true,
  hostSyncTime = 0,
  onBroadcastLocalStream,
  onStopTabShare,
  onSyncEmbedToHost,
  onEmbedPlayerEvent,
  videoRef,
  controllerRef,
  onPlay,
  onPause,
  onSeek,
  onBuffering,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [duration, setDuration] = useState<number>(0)
  const [bufferedPercent, setBufferedPercent] = useState<number>(0)
  const [volume, setVolume] = useState<number>(1)
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [isBuffering, setIsBuffering] = useState<boolean>(false)
  const [showControls, setShowControls] = useState<boolean>(true)
  const hideControlsTimer = useRef<number | null>(null)
  const guestVideoRef = useRef<HTMLVideoElement | null>(null)
  const embedIframeRef = useRef<HTMLIFrameElement | null>(null)
  const [guestEmbedTime, setGuestEmbedTime] = useState<number>(0)
  const lastAutoSeekRef = useRef<number>(0)

  useEffect(() => {
    if (guestVideoRef.current && remoteStream) {
      guestVideoRef.current.srcObject = remoteStream
      guestVideoRef.current.play().catch(() => {})
    }
  }, [remoteStream])

  const parsedMedia = useMemo(
    () => parseMediaUrl(streamUrl, undefined, sourceType),
    [streamUrl, sourceType]
  )
  const { normalizedUrl, isEmbed, isYouTube, youtubeId } = parsedMedia
  const isTabShareHost = isHost && isP2PStream && streamUrl.startsWith('p2p://tab-share')

  // Listen for postMessage player telemetry from vidnest.fun, vidlink.pro, vsembed.ru / vidsrc
  useEffect(() => {
    if (!isEmbed) return

    const handleMessage = (event: MessageEvent) => {
      let raw: unknown = event.data
      if (typeof raw === 'string') {
        try {
          raw = JSON.parse(raw)
        } catch {
          return
        }
      }
      if (!raw || typeof raw !== 'object') return
      const payload = raw as Record<string, unknown>

      let parsedTime = Number.NaN
      let parsedEvent: string | undefined

      // 1. VidLink / VsEmbed / VidSrc format: { type: 'PLAYER_EVENT', data: { event, currentTime } }
      if (payload.type === 'PLAYER_EVENT' && payload.data && typeof payload.data === 'object') {
        const d = payload.data as Record<string, unknown>
        parsedTime = Number(d.currentTime)
        parsedEvent = typeof d.event === 'string' ? d.event : undefined
      } else if (payload.source === 'vidnest-player') {
        // 2. VidNest format: { source: 'vidnest-player', ... }
        const nested =
          payload.data && typeof payload.data === 'object'
            ? (payload.data as Record<string, unknown>)
            : payload
        parsedTime = Number(
          nested.currentTime ?? nested.time ?? payload.currentTime ?? payload.time
        )
        parsedEvent =
          typeof (nested.event ?? payload.event ?? payload.type ?? payload.status) === 'string'
            ? String(nested.event ?? payload.event ?? payload.type ?? payload.status)
            : undefined
      }

      if (Number.isNaN(parsedTime) || parsedTime < 0) return

      if (isHost) {
        onEmbedPlayerEvent?.(parsedTime, parsedEvent)
      } else {
        setGuestEmbedTime(parsedTime)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [isEmbed, isHost, onEmbedPlayerEvent])

  // Auto-seek vidnest.fun guest player smoothly when drift > 4.5s during active playback
  useEffect(() => {
    if (
      !isEmbed ||
      isHost ||
      !normalizedUrl.includes('vidnest') ||
      guestEmbedTime <= 0 ||
      hostSyncTime <= 0
    ) {
      return
    }
    const drift = Math.abs(guestEmbedTime - hostSyncTime)
    const now = Date.now()
    if (drift > 4.5 && now - lastAutoSeekRef.current > 4000) {
      lastAutoSeekRef.current = now
      embedIframeRef.current?.contentWindow?.postMessage(
        { action: 'seek', time: Math.floor(hostSyncTime) },
        '*'
      )
    }
  }, [isEmbed, isHost, normalizedUrl, guestEmbedTime, hostSyncTime])

  const canControl = !isHostOnlyControl || isHost

  // Setup HLS / Stream playback
  useEffect(() => {
    const video = videoRef.current
    if (!video || !normalizedUrl || isEmbed || isYouTube) return

    let hls: Hls | null = null

    if (normalizedUrl.includes('.m3u8') && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      })

      hls.loadSource(normalizedUrl)
      hls.attachMedia(video)

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls?.startLoad()
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls?.recoverMediaError()
              break
            default:
              hls?.destroy()
              break
          }
        }
      })
    } else {
      video.src = normalizedUrl
    }

    return () => {
      if (hls) {
        hls.destroy()
      }
    }
  }, [normalizedUrl, isEmbed, isYouTube, videoRef])

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const captureStreamAndBroadcast = () => {
      if (isHost && isP2PStream && onBroadcastLocalStream) {
        try {
          const vid = video as HTMLVideoElement & {
            captureStream?: () => MediaStream
            mozCaptureStream?: () => MediaStream
          }
          const captured = vid.captureStream
            ? vid.captureStream()
            : vid.mozCaptureStream
            ? vid.mozCaptureStream()
            : null
          if (captured) {
            onBroadcastLocalStream(captured)
          }
        } catch (err) {
          console.warn('captureStream error:', err)
        }
      }
    }

    const handlePlay = () => {
      setIsPlaying(true)
      captureStreamAndBroadcast()
    }
    const handlePause = () => setIsPlaying(false)
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      if (video.buffered.length > 0 && video.duration) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1)
        setBufferedPercent((bufferedEnd / video.duration) * 100)
      }
    }
    const handleLoadedMetadata = () => {
      setDuration(video.duration || 0)
      captureStreamAndBroadcast()
    }
    const handleWaiting = () => {
      setIsBuffering(true)
      onBuffering(true)
    }
    const handleCanPlay = () => {
      setIsBuffering(false)
      onBuffering(false)
    }

    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('playing', handleCanPlay)
    video.addEventListener('canplay', handleCanPlay)

    return () => {
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('waiting', handleWaiting)
      video.removeEventListener('playing', handleCanPlay)
      video.removeEventListener('canplay', handleCanPlay)
    }
  }, [videoRef, onBuffering, isHost, isP2PStream, onBroadcastLocalStream])

  // Controls Visibility management
  const triggerUserActivity = useCallback(() => {
    setShowControls(true)
    if (hideControlsTimer.current) {
      window.clearTimeout(hideControlsTimer.current)
    }
    hideControlsTimer.current = window.setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 3200)
  }, [isPlaying])

  const togglePlay = () => {
    if (!canControl) return
    if (controllerRef?.current) {
      if (isPlaying) {
        controllerRef.current.pause()
        setIsPlaying(false)
        onPause()
      } else {
        controllerRef.current.play()
        setIsPlaying(true)
        onPlay()
      }
      return
    }
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play().then(onPlay).catch(() => {})
    } else {
      video.pause()
      onPause()
    }
  }

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canControl) return
    const newTime = parseFloat(e.target.value)
    if (controllerRef?.current) {
      controllerRef.current.seekTo(newTime)
      setCurrentTime(newTime)
      onSeek(newTime)
      return
    }
    const video = videoRef.current
    if (video) {
      video.currentTime = newTime
      setCurrentTime(newTime)
      onSeek(newTime)
    }
  }

  const skipTime = (seconds: number) => {
    if (!canControl) return
    if (controllerRef?.current) {
      const target = Math.max(0, Math.min(duration || 0, currentTime + seconds))
      controllerRef.current.seekTo(target)
      setCurrentTime(target)
      onSeek(target)
      return
    }
    const video = videoRef.current
    if (video) {
      const target = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds))
      video.currentTime = target
      setCurrentTime(target)
      onSeek(target)
    }
  }

  const toggleMute = () => {
    if (controllerRef?.current) {
      const nextMute = !isMuted
      controllerRef.current.setMuted(nextMute)
      setIsMuted(nextMute)
      return
    }
    const video = videoRef.current
    if (!video) return
    const nextMute = !isMuted
    video.muted = nextMute
    setIsMuted(nextMute)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value)
    if (controllerRef?.current) {
      controllerRef.current.setVolume(newVol)
      setVolume(newVol)
      setIsMuted(newVol === 0)
      return
    }
    const video = videoRef.current
    if (video) {
      video.volume = newVol
      setVolume(newVol)
      setIsMuted(newVol === 0)
    }
  }

  const toggleFullscreen = () => {
    const container = containerRef.current
    if (!container) return

    if (!document.fullscreenElement) {
      container.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  const handleYouTubePlay = useCallback(() => {
    setIsPlaying(true)
    onPlay()
  }, [onPlay])

  const handleYouTubePause = useCallback(() => {
    setIsPlaying(false)
    onPause()
  }, [onPause])

  const handleYouTubeTimeUpdate = useCallback((cur: number, dur: number) => {
    setCurrentTime(cur)
    if (dur > 0) setDuration(dur)
  }, [])

  return (
    <div
      ref={containerRef}
      className="player-section"
      onMouseMove={triggerUserActivity}
      onClick={triggerUserActivity}
      style={{ cursor: showControls ? 'default' : 'none' }}
    >
      {/* If YouTube source with sync API */}
      {isYouTube && youtubeId ? (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <YouTubePlayer
            videoId={youtubeId}
            canControl={canControl}
            onPlay={handleYouTubePlay}
            onPause={handleYouTubePause}
            onBuffering={onBuffering}
            controllerRef={controllerRef}
            onTimeUpdate={handleYouTubeTimeUpdate}
          />
        </div>
      ) : isTabShareHost ? (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            background: '#08090c',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(139, 92, 246, 0.16)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MonitorUp size={28} color="#c084fc" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.35rem', color: '#fff' }}>
              Streaming Browser Tab Live
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', maxWidth: '420px', lineHeight: 1.5 }}>
              Your selected browser tab & audio are being broadcast directly to all friends in real-time sync. Keep the movie playing in that tab.
            </p>
            {onStopTabShare && (
              <button
                type="button"
                onClick={onStopTabShare}
                style={{
                  marginTop: '1rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 1rem',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.16)',
                  border: '1px solid rgba(239, 68, 68, 0.45)',
                  color: '#f87171',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Square size={13} fill="currentColor" />
                <span>Stop Sharing Tab</span>
              </button>
            )}
          </div>
        </div>
      ) : isP2PStream && !isHost ? (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          {remoteStream ? (
            <video
              ref={guestVideoRef}
              autoPlay
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
            />
          ) : (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                background: '#08090c',
                padding: '2rem',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'rgba(234, 56, 62, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(234, 56, 62, 0.35)',
                }}
              >
                <Radio size={28} color="#ea383e" className="spin" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  Connecting to Host's Live Video Stream...
                </h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', maxWidth: '420px', lineHeight: 1.5 }}>
                  The host is streaming a local video file directly via encrypted WebRTC peer-to-peer. Video will appear here as soon as the host hits play.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : isEmbed ? (
        (() => {
          const iframeSrc =
            embedStartAt > 0 ? withStartAtParam(normalizedUrl, embedStartAt) : normalizedUrl
          return (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              <iframe
                ref={embedIframeRef}
                key={`${iframeSrc}-${embedSyncNonce}`}
                src={iframeSrc}
                title={isYouTube ? 'YouTube Party Stream' : 'Party Embed Stream'}
                referrerPolicy="origin"
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
              />
              {/* Embed ?startAt= Sync Overlay */}
              <div
                style={{
                  position: 'absolute',
                  top: '0.75rem',
                  right: '0.75rem',
                  zIndex: 25,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.3rem 0.55rem',
                  borderRadius: '999px',
                  background: 'rgba(10, 12, 18, 0.85)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.45)',
                }}
              >
                {isHost ? (
                  <div
                    title="Live timestamp broadcast to guests"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.15rem 0.35rem',
                    }}
                  >
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: embedClockRunning ? '#4ade80' : '#fbbf24',
                        boxShadow: embedClockRunning ? '0 0 8px #4ade80' : 'none',
                      }}
                    />
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: embedClockRunning ? '#cbd5e1' : '#fbbf24',
                      }}
                    >
                      {embedClockRunning ? 'Live Sync' : 'Paused'}
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#fff',
                        fontFamily: 'monospace',
                      }}
                    >
                      {formatTime(embedClockTime)}
                    </span>
                  </div>
                ) : (
                  (() => {
                    const isSynced =
                      guestEmbedTime > 0 && Math.abs(guestEmbedTime - hostSyncTime) <= 3.5
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          const targetSec = Math.max(1, Math.floor(hostSyncTime))
                          if (
                            normalizedUrl.includes('vidnest') &&
                            guestEmbedTime > 0 &&
                            embedIframeRef.current?.contentWindow
                          ) {
                            embedIframeRef.current.contentWindow.postMessage(
                              { action: 'seek', time: targetSec },
                              '*'
                            )
                          } else {
                            onSyncEmbedToHost?.()
                          }
                        }}
                        title="Jump to Host's current movie time"
                        style={{
                          background: isSynced
                            ? 'rgba(34, 197, 94, 0.2)'
                            : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                          border: isSynced ? '1px solid rgba(74, 222, 128, 0.45)' : 'none',
                          borderRadius: '999px',
                          color: isSynced ? '#4ade80' : '#fff',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          padding: '0.28rem 0.7rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <RefreshCw size={12} />
                        <span>
                          {isSynced
                            ? `Synced (${formatTime(hostSyncTime)})`
                            : `Sync (${formatTime(hostSyncTime)})`}
                        </span>
                      </button>
                    )
                  })()
                )}
              </div>
            </div>
          )
        })()
      ) : (
        <>
          {/* Main Video Element */}
          <video
            ref={videoRef}
            poster={posterUrl}
            playsInline
            onClick={togglePlay}
            style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
          />

          {/* Buffering Spinner */}
          {isBuffering && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0, 0, 0, 0.4)',
                pointerEvents: 'none',
                zIndex: 20,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem 1.5rem',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--bg-surface-glass)',
                  backdropFilter: 'var(--backdrop-blur)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <Loader2 size={36} color="var(--accent-purple)" className="spin" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Buffering Stream...
                </span>
              </div>
            </div>
          )}

          {/* Locked controls notice for guests if host only */}
          {!canControl && (
            <div
              style={{
                position: 'absolute',
                top: '1rem',
                left: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem 0.8rem',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(0, 0, 0, 0.65)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                zIndex: 20,
              }}
            >
              <Lock size={12} color="#f59e0b" />
              <span>Host Controls Only</span>
            </div>
          )}

          {/* P2P Live Broadcast Badge */}
          {isP2PStream && (
            <div
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.35rem 0.8rem',
                borderRadius: 'var(--radius-full)',
                background: isHost ? 'rgba(234, 56, 62, 0.25)' : 'rgba(16, 185, 129, 0.25)',
                border: `1px solid ${isHost ? 'rgba(234, 56, 62, 0.5)' : 'rgba(16, 185, 129, 0.5)'}`,
                color: isHost ? '#fca5a5' : '#6ee7b7',
                fontSize: '0.75rem',
                fontWeight: 700,
                backdropFilter: 'blur(12px)',
                zIndex: 35,
              }}
            >
              <Wifi size={13} color={isHost ? '#ea383e' : '#10b981'} />
              <span>{isHost ? 'Broadcasting Local Video' : 'Live P2P Stream'}</span>
            </div>
          )}

          {/* Video Controls Overlay */}
          <div
            className="player-controls-overlay"
            style={{
              opacity: showControls ? 1 : 0,
              pointerEvents: showControls ? 'auto' : 'none',
            }}
          >
            {/* Scrubber Progress Bar */}
            <div style={{ position: 'relative', width: '100%', height: '12px', display: 'flex', alignItems: 'center' }}>
              {/* Buffer track */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  height: '4px',
                  width: `${bufferedPercent}%`,
                  background: 'rgba(255, 255, 255, 0.25)',
                  borderRadius: 'var(--radius-full)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                disabled={!canControl}
                onChange={handleSeekChange}
                style={{
                  width: '100%',
                  height: '10px',
                  cursor: canControl ? 'pointer' : 'not-allowed',
                  accentColor: 'var(--accent-purple)',
                }}
              />
            </div>

            {/* Bottom Controls Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {/* Play/Pause */}
                <button
                  onClick={togglePlay}
                  disabled={!canControl}
                  className="btn-icon"
                  style={{
                    width: '34px',
                    height: '34px',
                    padding: 0,
                    borderRadius: '50%',
                    background: 'var(--accent-purple)',
                    border: 'none',
                    flexShrink: 0,
                  }}
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={16} fill="#fff" /> : <Play size={16} fill="#fff" />}
                </button>

                {/* Skip 10s */}
                <button
                  onClick={() => skipTime(-10)}
                  disabled={!canControl}
                  className="btn-icon"
                  style={{ padding: '0.35rem' }}
                  title="Rewind 10s"
                >
                  <RotateCcw size={15} />
                </button>
                <button
                  onClick={() => skipTime(10)}
                  disabled={!canControl}
                  className="btn-icon"
                  style={{ padding: '0.35rem' }}
                  title="Forward 10s"
                >
                  <RotateCw size={15} />
                </button>

                {/* Time Display */}
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* Volume & Fullscreen */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button onClick={toggleMute} className="btn-icon" style={{ padding: '0.35rem' }} title={isMuted ? 'Unmute' : 'Mute'}>
                  {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="hide-on-mobile"
                  style={{ width: '60px', accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
                />
                <button onClick={toggleFullscreen} className="btn-icon" style={{ padding: '0.35rem' }} title="Fullscreen">
                  {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
