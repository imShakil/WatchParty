import React, { useState } from 'react'
import { Play, LogIn, User, Hash, Pin } from 'lucide-react'
import type { User as FirebaseUser } from 'firebase/auth'
import { useRoomIdEligibility } from '@/hooks/useRoomIdEligibility'
import { sanitizeRoomIdInput } from '@/utils/roomValidation'

interface WelcomeModalProps {
  isOpen: boolean
  initialRoomParam: string | null
  initialStreamParam: string | null
  initialTitleParam: string | null
  userName: string
  user?: FirebaseUser | null
  onSignIn?: () => Promise<FirebaseUser | null>
  onSaveName: (name: string) => void
  onHostParty: (
    streamUrl?: string,
    title?: string,
    customRoomId?: string,
    posterUrl?: string,
    isPermanent?: boolean
  ) => void
  onJoinParty: (roomId: string) => void
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  initialRoomParam,
  initialStreamParam,
  initialTitleParam,
  userName,
  user,
  onSignIn,
  onSaveName,
  onHostParty,
  onJoinParty,
}) => {
  const [name, setName] = useState<string>(userName)
  const [joinCode, setJoinCode] = useState<string>(initialRoomParam || '')
  const [partyTitle, setPartyTitle] = useState<string>(initialTitleParam || 'My Watch Party')
  const [customRoomId, setCustomRoomId] = useState<string>('')
  const [isPermanent, setIsPermanent] = useState<boolean>(false)
  const [showAdvancedHost, setShowAdvancedHost] = useState<boolean>(false)
  const slugEligibility = useRoomIdEligibility(customRoomId)

  const streamUrl = initialStreamParam || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
  const streamTitle = partyTitle || initialTitleParam || 'Live Watch Party'

  if (!isOpen) return null

  const handleStartHosting = () => {
    if (slugEligibility.status === 'invalid' || slugEligibility.status === 'checking') return
    onSaveName(name.trim() || userName)
    const sanitizedSlug = sanitizeRoomIdInput(customRoomId.trim())
    onHostParty(
      streamUrl,
      streamTitle,
      sanitizedSlug || undefined,
      undefined,
      Boolean(user && isPermanent)
    )
  }

  const handleJoinExisting = () => {
    if (!joinCode.trim()) return
    onSaveName(name.trim() || userName)
    onJoinParty(joinCode.trim())
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(5, 6, 9, 0.88)',
        backdropFilter: 'blur(12px)',
        padding: '0.85rem',
      }}
    >
      <div className="welcome-modal-card">
        {/* Brand Banner */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(234, 56, 62, 0.12)',
              border: '1px solid rgba(234, 56, 62, 0.25)',
              marginBottom: '0.75rem',
            }}
          >
            <img
              src="/uploads/dekho-prime-icon-header-128.webp"
              alt="Dekho Prime"
              style={{ width: '34px', height: '34px', objectFit: 'contain' }}
            />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
            Welcome to <span className="brand-title">Dekho<span style={{ color: 'var(--primary-red, #ea383e)' }}>Prime</span></span> <span className="brand-tag">PARTY</span>
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Watch movies & shows together in perfect peer-to-peer sync with live chat.
          </p>
        </div>

        {/* Username Selection (auto-filled when signed in with Google) */}
        {user ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.55rem',
              padding: '0.6rem 0.9rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.86rem',
            }}
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <User size={15} color="var(--accent-purple)" />
            )}
            <span style={{ color: 'var(--text-muted)' }}>Joining as</span>
            <strong style={{ color: '#fff' }}>{user.displayName || name}</strong>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <User size={14} color="var(--accent-purple)" /> Your Nickname
            </label>
            <input
              type="text"
              value={name}
              maxLength={25}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              style={{
                padding: '0.75rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>
        )}

        {/* If Invite Room Param is present in URL */}
        {initialRoomParam ? (
          <div
            style={{
              padding: '1.25rem',
              background: 'rgba(234, 56, 62, 0.12)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(234, 56, 62, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              textAlign: 'center',
            }}
          >
            <div>
              <span style={{ fontSize: '0.8rem', color: '#fda4af', fontWeight: 600 }}>
                You were invited to Room:
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', fontFamily: 'monospace', marginTop: '0.25rem' }}>
                {initialRoomParam}
              </div>
            </div>
            <button
              onClick={handleJoinExisting}
              className="btn-action btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontSize: '0.95rem' }}
            >
              <LogIn size={18} />
              <span>Join Watch Party Now</span>
            </button>
          </div>
        ) : (
          /* Host or Join choices */
          <div className="welcome-modal-grid">
            {/* Create Room Box */}
            <div
              style={{
                padding: '1.25rem',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Host a Party
                </h4>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.2rem' }}>
                    Party Name
                  </label>
                  <input
                    type="text"
                    value={partyTitle}
                    maxLength={40}
                    onChange={(e) => setPartyTitle(e.target.value)}
                    placeholder="e.g. Movie Marathon"
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.6rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-main)',
                      fontSize: '0.8rem',
                      outline: 'none',
                    }}
                  />
                </div>

                {showAdvancedHost ? (
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                      <Hash size={12} color="var(--accent-purple)" /> Custom Room ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={customRoomId}
                      maxLength={24}
                      onChange={(e) => setCustomRoomId(sanitizeRoomIdInput(e.target.value))}
                      placeholder="e.g. shakil-cinema"
                      style={{
                        width: '100%',
                        padding: '0.45rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-surface)',
                        border:
                          slugEligibility.status === 'invalid'
                            ? '1px solid #ef4444'
                            : slugEligibility.status === 'eligible'
                            ? '1px solid #22c55e'
                            : '1px solid var(--border-subtle)',
                        color: 'var(--text-main)',
                        fontSize: '0.8rem',
                        outline: 'none',
                      }}
                    />
                    {slugEligibility.status !== 'idle' && (
                      <div
                        style={{
                          fontSize: '0.7rem',
                          marginTop: '0.25rem',
                          fontWeight: 600,
                          color:
                            slugEligibility.status === 'eligible'
                              ? '#4ade80'
                              : slugEligibility.status === 'invalid'
                              ? '#f87171'
                              : 'var(--text-dim)',
                        }}
                      >
                        {slugEligibility.status === 'eligible' ? '✓ ' : ''}
                        {slugEligibility.message}
                      </div>
                    )}
                    {user ? (
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          marginTop: '0.5rem',
                          cursor: 'pointer',
                          fontSize: '0.725rem',
                          color: isPermanent ? '#fbbf24' : 'var(--text-dim)',
                          fontWeight: 500,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isPermanent}
                          onChange={(e) => setIsPermanent(e.target.checked)}
                          style={{ accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
                        />
                        <span>Keep room permanent</span>
                      </label>
                    ) : (
                      onSignIn && (
                        <button
                          type="button"
                          onClick={() => {
                            void onSignIn().then((u) => {
                              if (u) setIsPermanent(true)
                            })
                          }}
                          style={{
                            marginTop: '0.45rem',
                            background: 'rgba(251, 191, 36, 0.08)',
                            border: '1px solid rgba(251, 191, 36, 0.25)',
                            borderRadius: '6px',
                            padding: '0.35rem 0.55rem',
                            color: '#fbbf24',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          <Pin size={11} />
                          <span>Sign in with Google for Permanent Room</span>
                        </button>
                      )
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAdvancedHost(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-purple)',
                      fontSize: '0.725rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      padding: 0,
                    }}
                  >
                    + Set Custom Room ID
                  </button>
                )}
              </div>
              <button
                onClick={handleStartHosting}
                disabled={slugEligibility.status === 'invalid' || slugEligibility.status === 'checking'}
                className="btn-action btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  opacity:
                    slugEligibility.status === 'invalid' || slugEligibility.status === 'checking'
                      ? 0.5
                      : 1,
                }}
              >
                <Play size={16} fill="#fff" />
                <span>Create Room</span>
              </button>
            </div>

            {/* Join Room Box */}
            <div
              style={{
                padding: '1.25rem',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                  Join with Code
                </h4>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter Room ID"
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    fontSize: '0.8rem',
                    outline: 'none',
                  }}
                />
              </div>
              <button
                onClick={handleJoinExisting}
                disabled={!joinCode.trim()}
                className="btn-action"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  background: joinCode.trim() ? 'var(--bg-surface-hover)' : 'transparent',
                }}
              >
                <LogIn size={16} />
                <span>Join Room</span>
              </button>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          Powered by WebRTC DataChannels • Zero buffer latency • End-to-End P2P Sync
        </div>
      </div>
    </div>
  )
}
