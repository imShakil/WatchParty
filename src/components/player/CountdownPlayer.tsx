import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Volume2, VolumeX, ArrowRightCircle, Music, ArrowUpRight } from 'lucide-react'
import { formatCountdownParts, parseCountdownUrl } from '@/utils/countdownStream'
import { playCompletionChime, startCountdownMusicLoop } from '@/utils/countdownAudio'

interface CountdownPlayerProps {
  streamUrl: string
  isHost: boolean
  onCountdownComplete?: (nextUrl: string, nextTitle?: string) => void
}

interface Particle3D {
  x: number
  y: number
  z: number
  size: number
  alpha: number
  crimson: boolean
}

/**
 * Lightweight 60fps 3D perspective canvas: drifting Z-depth cinema dust +
 * dual counter-rotating 3D orbital rings behind the countdown centerpiece.
 */
function useCinema3DBackdrop(canvasRef: React.RefObject<HTMLCanvasElement | null>): void {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let height = 0
    let dpr = 1
    let rafId = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const particles: Particle3D[] = Array.from({ length: 70 }, () => ({
      x: (Math.random() - 0.5) * 1800,
      y: (Math.random() - 0.5) * 1100,
      z: Math.random() * 1000 + 80,
      size: Math.random() * 1.8 + 0.6,
      alpha: Math.random() * 0.45 + 0.15,
      crimson: Math.random() > 0.55,
    }))

    let angle = 0

    const render = () => {
      ctx.clearRect(0, 0, width, height)
      const cx = width / 2
      const cy = height / 2
      const focal = Math.min(width, height) * 0.72

      // Subtle volumetric projector glow
      const glow = ctx.createRadialGradient(cx, cy * 0.92, 10, cx, cy, Math.max(width, height) * 0.58)
      glow.addColorStop(0, 'rgba(234, 56, 62, 0.16)')
      glow.addColorStop(0.42, 'rgba(190, 24, 93, 0.06)')
      glow.addColorStop(1, 'rgba(5, 6, 10, 0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, width, height)

      // 3D Orbital Rings
      angle += 0.0045
      const baseRadius = Math.min(width, height) * 0.34
      ;[
        { r: baseRadius, tiltX: 1.08, tiltY: angle, color: 'rgba(234, 56, 62, 0.22)', lineWidth: 1.2 },
        { r: baseRadius * 1.18, tiltX: 1.22, tiltY: -angle * 0.7, color: 'rgba(255, 255, 255, 0.07)', lineWidth: 1 },
      ].forEach((ring) => {
        ctx.beginPath()
        const steps = 72
        for (let i = 0; i <= steps; i += 1) {
          const theta = (i / steps) * Math.PI * 2
          const rx = Math.cos(theta) * ring.r
          const ry = Math.sin(theta) * ring.r * Math.cos(ring.tiltX)
          const rz = Math.sin(theta) * ring.r * Math.sin(ring.tiltX)
          const rotX = rx * Math.cos(ring.tiltY) - rz * Math.sin(ring.tiltY)
          const rotZ = rx * Math.sin(ring.tiltY) + rz * Math.cos(ring.tiltY)
          const scale = focal / (focal + rotZ + 220)
          const px = cx + rotX * scale
          const py = cy + ry * scale
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.strokeStyle = ring.color
        ctx.lineWidth = ring.lineWidth
        ctx.stroke()
      })

      // 3D Z-depth drifting particles
      for (const p of particles) {
        p.z -= 0.9
        if (p.z <= 20) {
          p.x = (Math.random() - 0.5) * 1800
          p.y = (Math.random() - 0.5) * 1100
          p.z = 1080
        }
        const scale = focal / p.z
        const sx = cx + p.x * scale
        const sy = cy + p.y * scale
        if (sx < -20 || sx > width + 20 || sy < -20 || sy > height + 20) continue
        const depthFade = Math.min(1, (1080 - p.z) / 300)
        const radius = Math.max(0.4, p.size * scale * 1.35)
        ctx.beginPath()
        ctx.arc(sx, sy, radius, 0, Math.PI * 2)
        ctx.fillStyle = p.crimson
          ? `rgba(251, 113, 133, ${p.alpha * depthFade})`
          : `rgba(248, 250, 252, ${p.alpha * 0.7 * depthFade})`
        ctx.fill()
      }

      rafId = window.requestAnimationFrame(render)
    }

    rafId = window.requestAnimationFrame(render)
    return () => {
      window.cancelAnimationFrame(rafId)
      ro.disconnect()
    }
  }, [canvasRef])
}

export const CountdownPlayer: React.FC<CountdownPlayerProps> = ({
  streamUrl,
  isHost,
  onCountdownComplete,
}) => {
  const config = useMemo(() => parseCountdownUrl(streamUrl), [streamUrl])
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [soundMuted, setSoundMuted] = useState(false)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chimedForTargetRef = useRef<number | null>(null)
  const autoSwitchedTargetRef = useRef<number | null>(null)

  useCinema3DBackdrop(canvasRef)

  useEffect(() => {
    setNowMs(Date.now())
    const timer = window.setInterval(() => {
      setNowMs(Date.now())
    }, 250)
    return () => window.clearInterval(timer)
  }, [streamUrl])

  const remainingMs = config ? Math.max(0, config.targetMs - nowMs) : 0
  const parts = useMemo(() => formatCountdownParts(remainingMs), [remainingMs])

  const progressPercent = useMemo(() => {
    if (!config) return 0
    const total = Math.max(1000, config.targetMs - config.startMs)
    const elapsed = Math.min(total, Math.max(0, nowMs - config.startMs))
    return Math.round((elapsed / total) * 100)
  }, [config, nowMs])

  // Background music playback (built-in synth preset or external online URL)
  useEffect(() => {
    setAutoplayBlocked(false)
    if (!config?.musicUrl || parts.isFinished || soundMuted) {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      return
    }

    if (config.musicUrl.startsWith('preset://')) {
      return startCountdownMusicLoop(config.musicUrl)
    }

    const el = audioRef.current
    if (!el) return
    el.volume = 0.45
    void el.play().catch(() => {
      setAutoplayBlocked(true)
    })
    return () => {
      el.pause()
    }
  }, [config?.musicUrl, parts.isFinished, soundMuted])

  useEffect(() => {
    if (!config || !parts.isFinished) return

    if (config.chime && !soundMuted && chimedForTargetRef.current !== config.targetMs) {
      chimedForTargetRef.current = config.targetMs
      playCompletionChime()
    }

    if (
      isHost &&
      config.nextUrl &&
      onCountdownComplete &&
      autoSwitchedTargetRef.current !== config.targetMs
    ) {
      const switchTimer = window.setTimeout(() => {
        autoSwitchedTargetRef.current = config.targetMs
        onCountdownComplete(config.nextUrl!, config.nextTitle)
      }, 3000)
      return () => window.clearTimeout(switchTimer)
    }
  }, [config, parts.isFinished, soundMuted, isHost, onCountdownComplete])

  if (!config) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#05060a',
          color: 'var(--text-muted)',
        }}
      >
        Invalid countdown stream.
      </div>
    )
  }

  const timeSegments = [
    ...(parts.days > 0 ? [{ label: 'DAYS', value: String(parts.days).padStart(2, '0') }] : []),
    ...(parts.days > 0 || parts.hours > 0
      ? [{ label: 'HOURS', value: String(parts.hours).padStart(2, '0') }]
      : []),
    { label: 'MINUTES', value: String(parts.minutes).padStart(2, '0') },
    { label: 'SECONDS', value: String(parts.seconds).padStart(2, '0') },
  ]

  const isExternalMusic = Boolean(config.musicUrl && !config.musicUrl.startsWith('preset://'))

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(1rem, 3vw, 2.5rem)',
        background: 'radial-gradient(circle at 50% 45%, #110c12 0%, #07080d 55%, #040508 100%)',
        overflow: 'hidden',
        textAlign: 'center',
      }}
    >
      {/* Real 3D Depth & Orbital Canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />

      {isExternalMusic && (
        <audio
          ref={audioRef}
          src={config.musicUrl}
          loop
          preload="auto"
          muted={soundMuted}
        />
      )}

      {/* Sound toggle */}
      {(config.chime || config.musicUrl) && (
        <button
          type="button"
          onClick={() => {
            if (autoplayBlocked && audioRef.current) {
              setAutoplayBlocked(false)
              setSoundMuted(false)
              void audioRef.current.play().catch(() => {})
              return
            }
            setSoundMuted((prev) => !prev)
          }}
          title={soundMuted ? 'Unmute countdown audio' : 'Mute countdown audio'}
          style={{
            position: 'absolute',
            top: '0.9rem',
            right: '0.9rem',
            zIndex: 15,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.38rem',
            padding: '0.35rem 0.72rem',
            borderRadius: '999px',
            background: autoplayBlocked ? 'rgba(234, 56, 62, 0.25)' : 'rgba(255, 255, 255, 0.05)',
            border: autoplayBlocked
              ? '1px solid rgba(251, 113, 133, 0.55)'
              : '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(8px)',
            color: '#e2e8f0',
            fontSize: '0.72rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {soundMuted || autoplayBlocked ? <VolumeX size={13} /> : <Volume2 size={13} />}
          <span>
            {autoplayBlocked
              ? 'Tap for Audio'
              : soundMuted
                ? 'Muted'
                : config.musicUrl
                  ? 'Music On'
                  : 'Chime On'}
          </span>
        </button>
      )}

      {/* Center Editorial Stage */}
      <div
        style={{
          position: 'relative',
          zIndex: 5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          maxWidth: '760px',
        }}
      >
        {/* Minimal Premiere Eyebrow */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.68rem',
            fontWeight: 700,
            letterSpacing: '0.26em',
            textTransform: 'uppercase',
            color: parts.isFinished ? '#6ee7b7' : 'rgba(253, 164, 175, 0.88)',
            marginBottom: '0.55rem',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: parts.isFinished ? '#10b981' : '#ea383e',
              boxShadow: parts.isFinished ? '0 0 10px #10b981' : '0 0 10px #ea383e',
            }}
          />
          <span>{parts.isFinished ? 'NOW STARTING' : 'DEKHOPRIME PRESENTS'}</span>
        </div>

        {/* Headline */}
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.25rem, 3.2vw, 2.25rem)',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            marginBottom: 'clamp(1.1rem, 2.8vh, 2rem)',
            textShadow: '0 4px 24px rgba(0, 0, 0, 0.75)',
          }}
        >
          {parts.isFinished ? config.doneText : config.text}
        </h2>

        {/* Clean Architectural Countdown Numerals */}
        {!parts.isFinished && (
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'center',
              gap: 'clamp(0.75rem, 2.4vw, 1.8rem)',
              flexWrap: 'wrap',
            }}
          >
            {timeSegments.map((seg, idx) => (
              <React.Fragment key={seg.label}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: 'clamp(64px, 12vw, 118px)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(2.4rem, 7vw, 4.75rem)',
                      fontWeight: 800,
                      lineHeight: 0.95,
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '-0.04em',
                      background: 'linear-gradient(180deg, #ffffff 30%, rgba(255, 255, 255, 0.62) 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: 'drop-shadow(0 8px 24px rgba(0, 0, 0, 0.65))',
                    }}
                  >
                    {seg.value}
                  </span>
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      letterSpacing: '0.2em',
                      color: 'rgba(148, 163, 184, 0.72)',
                      marginTop: '0.55rem',
                    }}
                  >
                    {seg.label}
                  </span>
                </div>
                {idx < timeSegments.length - 1 && (
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(1.8rem, 4.8vw, 3.2rem)',
                      fontWeight: 300,
                      color: 'rgba(234, 56, 62, 0.55)',
                      lineHeight: 1,
                      alignSelf: 'flex-start',
                      marginTop: '0.15rem',
                      userSelect: 'none',
                    }}
                  >
                    :
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Minimal Hairline Progress */}
        <div
          style={{
            width: 'min(340px, 76%)',
            height: '2px',
            borderRadius: '999px',
            background: 'rgba(255, 255, 255, 0.1)',
            overflow: 'hidden',
            marginTop: 'clamp(1.25rem, 3vh, 2.1rem)',
          }}
        >
          <div
            style={{
              width: `${parts.isFinished ? 100 : progressPercent}%`,
              height: '100%',
              background: parts.isFinished
                ? '#10b981'
                : 'linear-gradient(90deg, rgba(234, 56, 62, 0.4), #ea383e)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        {/* Subtle Meta Line (Music + Next Stream) */}
        {(config.musicUrl || config.nextUrl) && (
          <div
            style={{
              marginTop: '0.85rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.85rem',
              fontSize: '0.74rem',
              color: 'rgba(203, 213, 225, 0.72)',
            }}
          >
            {config.musicUrl && !parts.isFinished && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Music size={12} color="#fb7185" />
                <span>{config.musicTitle || 'Background Audio'}</span>
              </span>
            )}
            {config.nextUrl && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: parts.isFinished ? '#6ee7b7' : undefined,
                  fontWeight: parts.isFinished ? 600 : 500,
                }}
              >
                <ArrowRightCircle size={12} />
                <span>
                  {parts.isFinished
                    ? `Starting ${config.nextTitle || 'next stream'}...`
                    : `Up next: ${config.nextTitle || config.nextUrl}`}
                </span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Subtle Cinema Lower-Third Watermark Link */}
      <a
        href="https://dekhoprime.live"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'absolute',
          bottom: '0.95rem',
          right: '1rem',
          zIndex: 12,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.35rem 0.75rem',
          borderRadius: '999px',
          background: 'rgba(10, 12, 18, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          textDecoration: 'none',
          color: 'rgba(248, 250, 252, 0.85)',
          fontSize: '0.72rem',
          fontWeight: 600,
          letterSpacing: '0.01em',
        }}
      >
        <span>
          Dekho<span style={{ color: '#ea383e' }}>Prime</span>.live
        </span>
        <span style={{ color: 'rgba(148, 163, 184, 0.55)' }}>•</span>
        <span style={{ color: 'rgba(148, 163, 184, 0.85)', fontWeight: 500 }}>
          Movies, Live TV &amp; Anime
        </span>
        <ArrowUpRight size={12} color="#fb7185" />
      </a>
    </div>
  )
}
