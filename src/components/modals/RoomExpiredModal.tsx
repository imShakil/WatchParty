import React, { useEffect, useState } from 'react'
import {
  Clapperboard,
  Home,
  PlusCircle,
  AlertCircle,
  RefreshCw,
  Play,
  Crown,
  Users,
  Lock,
  KeyRound,
  ArrowRight,
  Pin,
  Clock,
} from 'lucide-react'

interface RoomExpiredModalProps {
  isOpen: boolean
  roomId: string
  roomTitle?: string
  reason?: string
  isStandby?: boolean
  onReturnHome: () => void
  onHostParty?: () => void
  onKeepWatchingSolo?: () => void
  onTakeOverHost?: () => void
  onJoinWithPasscode?: (passcode: string) => void
  onWakeUpHost?: () => void
  onWaitForHost?: () => void
}

export const RoomExpiredModal: React.FC<RoomExpiredModalProps> = ({
  isOpen,
  roomId,
  roomTitle,
  reason,
  isStandby = false,
  onReturnHome,
  onHostParty,
  onKeepWatchingSolo,
  onTakeOverHost,
  onJoinWithPasscode,
  onWakeUpHost,
  onWaitForHost,
}) => {
  const isRoomFull = Boolean(reason && reason.toLowerCase().includes('full'))
  const isRoomLocked = Boolean(reason && reason.toLowerCase().includes('locked'))
  const isWrongPasscode = Boolean(
    reason && (reason.toLowerCase().includes('passcode') || reason.toLowerCase().includes('password'))
  )
  const isRejectedFromJoin = isRoomFull || isRoomLocked || isWrongPasscode

  const [countdown, setCountdown] = useState<number>(10)
  const [isPaused, setIsPaused] = useState<boolean>(isWrongPasscode || isStandby)
  const [enteredPasscode, setEnteredPasscode] = useState<string>('')
  const [passcodeError, setPasscodeError] = useState<string>('')
  const [isWaitingForHost, setIsWaitingForHost] = useState<boolean>(false)

  // Countdown timer for automatic return to home
  useEffect(() => {
    if (!isOpen || isPaused || isWrongPasscode || isStandby) return

    if (countdown <= 0) {
      onReturnHome()
      return
    }

    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, countdown, isPaused, isWrongPasscode, isStandby, onReturnHome])

  // Auto-poll every 5s if guest chose to Wait for Host in a standby permanent room
  useEffect(() => {
    if (!isOpen || !isStandby || !isWaitingForHost) return

    const pollInterval = setInterval(() => {
      onWaitForHost?.()
    }, 5000)

    return () => clearInterval(pollInterval)
  }, [isOpen, isStandby, isWaitingForHost, onWaitForHost])

  if (!isOpen) return null

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = enteredPasscode.trim()
    if (!trimmed) {
      setPasscodeError('Please enter a passcode')
      return
    }
    setPasscodeError('')
    onJoinWithPasscode?.(trimmed)
  }

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
          border: isStandby
            ? '1px solid rgba(251, 191, 36, 0.35)'
            : isWrongPasscode
            ? '1px solid rgba(168, 85, 247, 0.35)'
            : isRoomFull
            ? '1px solid rgba(251, 191, 36, 0.35)'
            : isRoomLocked
            ? '1px solid rgba(239, 68, 68, 0.35)'
            : '1px solid rgba(234, 56, 62, 0.3)',
          boxShadow: isStandby
            ? '0 24px 64px rgba(0, 0, 0, 0.85), 0 0 35px rgba(251, 191, 36, 0.14)'
            : isWrongPasscode
            ? '0 24px 64px rgba(0, 0, 0, 0.85), 0 0 35px rgba(168, 85, 247, 0.15)'
            : '0 24px 64px rgba(0, 0, 0, 0.85), 0 0 35px rgba(234, 56, 62, 0.12)',
          padding: '2rem 1.75rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '1.25rem',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: isStandby
              ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.25), rgba(245, 158, 11, 0.15))'
              : isWrongPasscode
              ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(126, 34, 206, 0.15))'
              : isRoomFull
              ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.15))'
              : isRoomLocked
              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(185, 28, 28, 0.15))'
              : 'linear-gradient(135deg, rgba(234, 56, 62, 0.2), rgba(139, 92, 246, 0.15))',
            border: isStandby
              ? '1px solid rgba(251, 191, 36, 0.45)'
              : isWrongPasscode
              ? '1px solid rgba(168, 85, 247, 0.45)'
              : isRoomFull
              ? '1px solid rgba(251, 191, 36, 0.4)'
              : isRoomLocked
              ? '1px solid rgba(239, 68, 68, 0.4)'
              : '1px solid rgba(234, 56, 62, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isStandby
              ? '0 8px 24px rgba(251, 191, 36, 0.25)'
              : isWrongPasscode
              ? '0 8px 24px rgba(168, 85, 247, 0.25)'
              : isRoomFull
              ? '0 8px 24px rgba(251, 191, 36, 0.25)'
              : isRoomLocked
              ? '0 8px 24px rgba(239, 68, 68, 0.25)'
              : '0 8px 24px rgba(234, 56, 62, 0.25)',
          }}
        >
          {isStandby ? (
            <Pin size={30} color="#fbbf24" />
          ) : isWrongPasscode ? (
            <KeyRound size={32} color="#c084fc" />
          ) : isRoomFull ? (
            <Users size={32} color="#fbbf24" />
          ) : isRoomLocked ? (
            <Lock size={32} color="#f87171" />
          ) : (
            <Clapperboard size={32} color="#ea383e" />
          )}
        </div>

        {/* Status Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.3rem 0.85rem',
            borderRadius: '999px',
            background: isStandby
              ? 'rgba(251, 191, 36, 0.14)'
              : isWrongPasscode
              ? 'rgba(168, 85, 247, 0.15)'
              : isRoomFull
              ? 'rgba(251, 191, 36, 0.14)'
              : isRoomLocked
              ? 'rgba(239, 68, 68, 0.14)'
              : 'rgba(234, 56, 62, 0.14)',
            border: isStandby
              ? '1px solid rgba(251, 191, 36, 0.35)'
              : isWrongPasscode
              ? '1px solid rgba(168, 85, 247, 0.4)'
              : isRoomFull
              ? '1px solid rgba(251, 191, 36, 0.35)'
              : isRoomLocked
              ? '1px solid rgba(239, 68, 68, 0.35)'
              : '1px solid rgba(234, 56, 62, 0.35)',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: isStandby
              ? '#fbbf24'
              : isWrongPasscode
              ? '#c084fc'
              : isRoomFull
              ? '#fbbf24'
              : isRoomLocked
              ? '#f87171'
              : '#ff6b6b',
          }}
        >
          <AlertCircle size={13} />
          {isStandby
            ? 'Permanent Hub • Standby'
            : isWrongPasscode
            ? 'Password Protected'
            : isRoomFull
            ? 'Room at Capacity'
            : isRoomLocked
            ? 'Private Party'
            : 'Theater Closed'}
        </div>

        {/* Headings */}
        <div>
          <h2
            id="room-expired-title"
            style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: '#ffffff',
              margin: '0 0 0.5rem 0',
              fontFamily: 'var(--font-display, sans-serif)',
            }}
          >
            {isStandby
              ? roomTitle
                ? `"${roomTitle}" is on Standby`
                : 'Permanent Room is on Standby'
              : isWrongPasscode
              ? 'Passcode Required'
              : isRoomFull
              ? 'Watch Party is Full'
              : isRoomLocked
              ? 'Watch Party is Locked'
              : roomTitle
              ? `"${roomTitle}" Has Ended`
              : 'This Watch Party Has Ended'}
          </h2>
          <p
            style={{
              fontSize: '0.88rem',
              color: 'var(--text-muted, #94a3b8)',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {isStandby
              ? 'The host is currently away. This is a permanent watch room—you can wait for the host or wake it up and host for your group.'
              : isWrongPasscode
              ? reason || 'This watch party is password protected. Enter the host passcode to enter.'
              : displayReason}
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

        {/* Standby Waiting Banner */}
        {isStandby && isWaitingForHost && (
          <div
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md, 8px)',
              background: 'rgba(139, 92, 246, 0.14)',
              border: '1px solid rgba(139, 92, 246, 0.35)',
              color: '#ddd6fe',
              fontSize: '0.82rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <Clock size={15} />
            <span>Waiting for host to arrive... checking every 5s</span>
          </div>
        )}

        {/* Password Entry Form (when password protected or wrong passcode entered) */}
        {isWrongPasscode && (
          <form
            onSubmit={handlePasscodeSubmit}
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              marginTop: '0.25rem',
            }}
          >
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="password"
                value={enteredPasscode}
                onChange={(e) => {
                  setEnteredPasscode(e.target.value)
                  if (passcodeError) setPasscodeError('')
                }}
                placeholder="Enter passcode..."
                maxLength={30}
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem',
                  borderRadius: 'var(--radius-md, 8px)',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: passcodeError
                    ? '1px solid #ef4444'
                    : '1px solid rgba(168, 85, 247, 0.4)',
                  color: '#ffffff',
                  fontSize: '1rem',
                  outline: 'none',
                  textAlign: 'center',
                  letterSpacing: '0.15em',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {passcodeError && (
              <span style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 600 }}>
                {passcodeError}
              </span>
            )}

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                fontSize: '0.92rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                border: 'none',
                borderRadius: 'var(--radius-md, 8px)',
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)',
                transition: 'transform 0.15s ease',
              }}
            >
              <KeyRound size={17} />
              <span>Unlock & Join Party</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* Auto-redirect note (only shown when not prompted for passcode and not in standby) */}
        {!isWrongPasscode && !isStandby && (
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
        )}

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
          {/* Standby Mode Buttons */}
          {isStandby && onWakeUpHost && (
            <button
              type="button"
              onClick={onWakeUpHost}
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                fontSize: '0.92rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                border: 'none',
                borderRadius: 'var(--radius-md, 8px)',
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
              }}
            >
              <Crown size={18} />
              Wake Up & Host for Group
            </button>
          )}

          {isStandby && onWaitForHost && (
            <button
              type="button"
              onClick={() => setIsWaitingForHost((prev) => !prev)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                fontSize: '0.88rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                background: isWaitingForHost
                  ? 'rgba(139, 92, 246, 0.2)'
                  : 'rgba(139, 92, 246, 0.12)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                borderRadius: 'var(--radius-md, 8px)',
                color: '#c4b5fd',
                cursor: 'pointer',
              }}
            >
              <Clock size={17} />
              {isWaitingForHost ? 'Stop Waiting' : 'Wait for Host'}
            </button>
          )}

          {/* Keep Watching Solo - Only allowed when room ended organically */}
          {!isRejectedFromJoin && !isStandby && onKeepWatchingSolo && (
            <button
              type="button"
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
                border: 'none',
                borderRadius: 'var(--radius-md, 8px)',
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
              }}
            >
              <Play size={18} fill="currentColor" />
              Keep Watching Solo
            </button>
          )}

          {/* Take Over & Host for Group - Only allowed when host disconnected organically */}
          {!isRejectedFromJoin && !isStandby && onTakeOverHost && (
            <button
              type="button"
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
                background: 'rgba(251, 191, 36, 0.12)',
                border: '1px solid rgba(251, 191, 36, 0.45)',
                borderRadius: 'var(--radius-md, 8px)',
                color: '#fbbf24',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Crown size={17} color="#fbbf24" />
              Take Over & Host for Group
            </button>
          )}

          {/* Back to Home */}
          <button
            type="button"
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
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              borderRadius: 'var(--radius-md, 8px)',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Home size={18} />
            Back to Home
          </button>

          {/* Host New Party */}
          {!isRejectedFromJoin && !isStandby && onHostParty && !onTakeOverHost && (
            <button
              type="button"
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
                background: 'rgba(234, 56, 62, 0.12)',
                border: '1px solid rgba(234, 56, 62, 0.4)',
                borderRadius: 'var(--radius-md, 8px)',
                color: '#ff6b6b',
                cursor: 'pointer',
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
