import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import Hls from 'hls.js'
import { parseMediaUrl } from '@/utils/mediaUrl'
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
  Tv,
} from 'lucide-react'

interface PartyPlayerProps {
  streamUrl: string
  posterUrl?: string
  isHost: boolean
  isHostOnlyControl: boolean
  videoRef: React.RefObject<HTMLVideoElement | null>
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
  posterUrl,
  isHost,
  isHostOnlyControl,
  videoRef,
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

  const parsedMedia = useMemo(() => parseMediaUrl(streamUrl), [streamUrl])
  const { normalizedUrl, isEmbed, isYouTube } = parsedMedia

  const canControl = !isHostOnlyControl || isHost

  // Setup HLS / Stream playback
  useEffect(() => {
    const video = videoRef.current
    if (!video || !normalizedUrl || isEmbed) return

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
  }, [normalizedUrl, isEmbed, videoRef])

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handlePlay = () => setIsPlaying(true)
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
  }, [videoRef, onBuffering])

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
    const video = videoRef.current
    if (video) {
      video.currentTime = newTime
      setCurrentTime(newTime)
      onSeek(newTime)
    }
  }

  const skipTime = (seconds: number) => {
    if (!canControl) return
    const video = videoRef.current
    if (video) {
      const target = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds))
      video.currentTime = target
      setCurrentTime(target)
      onSeek(target)
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    const nextMute = !isMuted
    video.muted = nextMute
    setIsMuted(nextMute)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value)
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

  return (
    <div
      ref={containerRef}
      className="player-section"
      onMouseMove={triggerUserActivity}
      onClick={triggerUserActivity}
      style={{ cursor: showControls ? 'default' : 'none' }}
    >
      {/* If Embed iFrame */}
      {isEmbed ? (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              padding: '0.6rem 1rem',
              background: 'rgba(139, 92, 246, 0.15)',
              borderBottom: '1px solid rgba(139, 92, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c4b5fd' }}>
              <Tv size={16} />
              <span>
                {isYouTube
                  ? 'YouTube Source Active — Chat & react in real-time with your friends!'
                  : 'Embed Source Active — Use real-time chat & countdown to sync with your friend!'}
              </span>
            </div>
          </div>
          <iframe
            src={normalizedUrl}
            title={isYouTube ? 'YouTube Party Stream' : 'Party Embed Stream'}
            style={{ width: '100%', height: '100%', border: 'none' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
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

          {/* Video Controls Overlay */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '1.5rem',
              background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.95))',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              transition: 'opacity 0.3s ease',
              opacity: showControls ? 1 : 0,
              pointerEvents: showControls ? 'auto' : 'none',
              zIndex: 30,
            }}
          >
            {/* Scrubber Progress Bar */}
            <div style={{ position: 'relative', width: '100%', height: '6px', display: 'flex', alignItems: 'center' }}>
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
                  height: '6px',
                  cursor: canControl ? 'pointer' : 'not-allowed',
                  accentColor: 'var(--accent-purple)',
                }}
              />
            </div>

            {/* Bottom Controls Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {/* Play/Pause */}
                <button
                  onClick={togglePlay}
                  disabled={!canControl}
                  className="btn-icon"
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'var(--accent-purple)',
                    border: 'none',
                  }}
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={18} fill="#fff" /> : <Play size={18} fill="#fff" />}
                </button>

                {/* Skip 10s */}
                <button
                  onClick={() => skipTime(-10)}
                  disabled={!canControl}
                  className="btn-icon"
                  style={{ padding: '0.4rem' }}
                  title="Rewind 10s"
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  onClick={() => skipTime(10)}
                  disabled={!canControl}
                  className="btn-icon"
                  style={{ padding: '0.4rem' }}
                  title="Forward 10s"
                >
                  <RotateCw size={16} />
                </button>

                {/* Time Display */}
                <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* Volume & Fullscreen */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button onClick={toggleMute} className="btn-icon" style={{ padding: '0.4rem' }}>
                  {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  style={{ width: '70px', accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
                />
                <button onClick={toggleFullscreen} className="btn-icon" style={{ padding: '0.4rem' }}>
                  {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
