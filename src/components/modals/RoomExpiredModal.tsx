import React, { useEffect, useState } from 'react'
import { Clapperboard, Home, PlusCircle, AlertCircle, RefreshCw, Play, Crown } from 'lucide-react'

interface RoomExpiredModalProps {
  isOpen: boolean
  roomId: string
  roomTitle?: string
  reason?: string
  onReturnHome: () => void
  onHostParty?: () => void
  onKeepWatchingSolo?: () => void
  onTakeOverHost?: () => void
}

export const RoomExpiredModal: React.FC<RoomExpiredModalProps> = ({
  isOpen,
  roomId,
  roomTitle,
  reason,
  onReturnHome,
  onHostParty,
  onKeepWatchingSolo,
  onTakeOverHost,
}) => {
  const [countdown, setCountdown] = useState<number>(10)
  const [isPaused, setIsPaused] = useState<boolean>(false)

  // Countdown timer for automatic return to home
  useEffect(() => {
    if (!isOpen || isPaused) return

    if (countdown <= 0) {
      onReturnHome()
      return
    }

    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, countdown, isPaused, onReturnHome])

  if (!isOpen) return null

  const displayReason =
    reason ||
    'This watch party is no longer available. The host has either ended the broadcast or the room has expired.'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 250,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(3, 5, 8, 0.88)',
        backdropFilter: 'blur(12px)',
        padding: '1.25rem',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="room-expired-title"
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'rgba(16, 18, 27, 0.96)',
          borderRadius: 'var(--radius-lg, 16px)',
          border: '1px solid rgba(234, 56, 62, 0.3)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.85), 0 0 35px rgba(234, 56, 62, 0.12)',
          padding: '2rem 1.75rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '1.25rem',
        }}
      >
        {/* Animated Theater Closed Icon */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(234, 56, 62, 0.2), rgba(139, 92, 246, 0.15))',
            border: '1px solid rgba(234, 56, 62, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(234, 56, 62, 0.25)',
          }}
        >
          <Clapperboard size={32} color="#ea383e" />
        </div>

        {/* Status Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.3rem 0.85rem',
            borderRadius: '999px',
            background: 'rgba(234, 56, 62, 0.14)',
            border: '1px solid rgba(234, 56, 62, 0.35)',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#ff6b6b',
          }}
        >
          <AlertCircle size={13} />
          Theater Closed
        </div>

        {/* Headings */}
        <div>
          <h2
            id="room-expired-title"
            style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              color: '#ffffff',
              margin: '0 0 0.5rem 0',
              fontFamily: 'var(--font-display, sans-serif)',
            }}
          >
            {roomTitle ? `"${roomTitle}" Has Ended` : 'This Watch Party Has Ended'}
          </h2>
          <p
            style={{
              fontSize: '0.88rem',
              color: 'var(--text-muted, #94a3b8)',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {displayReason}
          </p>
          {roomId && (
            <div
              style={{
                marginTop: '0.75rem',
                fontSize: '0.75rem',
                color: 'rgba(255, 255, 255, 0.4)',
                fontFamily: 'monospace',
              }}
            >
              Room ID: {roomId}
            </div>
          )}
        </div>

        {/* Auto-redirect note */}
        <div
          style={{
            width: '100%',
            padding: '0.65rem 0.9rem',
            borderRadius: 'var(--radius-md, 8px)',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '0.8rem',
            color: 'var(--text-muted, #94a3b8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>
            {isPaused
              ? 'Auto-redirect paused'
              : `Returning to home in ${countdown}s...`}
          </span>
          <button
            type="button"
            onClick={() => setIsPaused((prev) => !prev)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary-red, #ea383e)',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
            }}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            marginTop: '0.25rem',
          }}
        >
          {onKeepWatchingSolo && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onKeepWatchingSolo}
              style={{
                width: '100%',
                padding: '0.8rem 1rem',
                fontSize: '0.92rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              }}
            >
              <Play size={18} fill="currentColor" />
              Keep Watching Solo
            </button>
          )}

          {onTakeOverHost && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onTakeOverHost}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                fontSize: '0.88rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                borderColor: 'rgba(234, 56, 62, 0.4)',
                color: '#fff',
              }}
            >
              <Crown size={17} color="#fbbf24" />
              Take Over & Host for Group
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            onClick={onReturnHome}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              fontSize: '0.88rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <Home size={18} />
            Back to Home
          </button>

          {onHostParty && !onTakeOverHost && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onHostParty}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                fontSize: '0.88rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <PlusCircle size={17} />
              Host a New Party
            </button>
          )}

          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted, #94a3b8)',
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              padding: '0.35rem',
              marginTop: '0.2rem',
              transition: 'color 0.2s',
            }}
          >
            <RefreshCw size={13} />
            Try reconnecting
          </button>
        </div>
      </div>
    </div>
  )
}
