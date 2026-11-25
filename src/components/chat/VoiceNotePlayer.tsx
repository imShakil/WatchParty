import React, { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2 } from 'lucide-react'

interface VoiceNotePlayerProps {
  audioUrl: string
  duration?: number
  isSenderMe?: boolean
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
  audioUrl,
  duration,
  isSenderMe = false,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [totalDuration, setTotalDuration] = useState<number>(duration || 0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleLoadedMetadata = () => {
      if (!totalDuration && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(audio.duration)
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [totalDuration])

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().then(() => {
        setIsPlaying(true)
      }).catch((err) => {
        console.warn('Audio play prevented:', err)
      })
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !totalDuration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, clickX / rect.width))
    const targetTime = percentage * totalDuration

    audio.currentTime = targetTime
    setCurrentTime(targetTime)
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        padding: '0.4rem 0.6rem',
        borderRadius: '12px',
        background: isSenderMe ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.06)',
        width: '100%',
        minWidth: '180px',
        maxWidth: '240px',
      }}
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlayPause}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: 'none',
          background: isSenderMe ? '#ffffff' : 'var(--accent-purple, #8b5cf6)',
          color: isSenderMe ? '#7c3aed' : '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        }}
        aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
      >
        {isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" style={{ marginLeft: '2px' }} />}
      </button>

      {/* Waveform Scrubber & Timer */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <div
          onClick={handleSeek}
          style={{
            height: '6px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '999px',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              background: isSenderMe ? '#ffffff' : 'var(--accent-purple, #8b5cf6)',
              borderRadius: '999px',
              transition: 'width 0.1s linear',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.7rem',
            color: 'rgba(255, 255, 255, 0.75)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <span>{formatTime(isPlaying ? currentTime : (totalDuration || 0))}</span>
          <Volume2 size={11} style={{ opacity: 0.6 }} />
        </div>
      </div>
    </div>
  )
}

