import React, { useState } from 'react'
import { Play, LogIn, User } from 'lucide-react'

interface WelcomeModalProps {
  isOpen: boolean
  initialRoomParam: string | null
  initialStreamParam: string | null
  initialTitleParam: string | null
  userName: string
  onSaveName: (name: string) => void
  onHostParty: (streamUrl?: string, title?: string) => void
  onJoinParty: (roomId: string) => void
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  initialRoomParam,
  initialStreamParam,
  initialTitleParam,
  userName,
  onSaveName,
  onHostParty,
  onJoinParty,
}) => {
  const [name, setName] = useState<string>(userName)
  const [joinCode, setJoinCode] = useState<string>(initialRoomParam || '')
  const streamUrl = initialStreamParam || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
  const streamTitle = initialTitleParam || 'Big Buck Bunny (Demo Party)'

  if (!isOpen) return null

  const handleStartHosting = () => {
    onSaveName(name.trim() || userName)
    onHostParty(streamUrl, streamTitle)
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
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-glass)',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
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
              background: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              fontSize: '1.8rem',
              marginBottom: '0.75rem',
            }}
          >
            🍿
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
            Welcome to <span className="brand-title">Dekho Party</span>
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Watch movies & shows together in perfect peer-to-peer sync with live chat.
          </p>
        </div>

        {/* Username Selection */}
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

        {/* If Invite Room Param is present in URL */}
        {initialRoomParam ? (
          <div
            style={{
              padding: '1.25rem',
              background: 'rgba(139, 92, 246, 0.12)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              textAlign: 'center',
            }}
          >
            <div>
              <span style={{ fontSize: '0.8rem', color: '#c4b5fd', fontWeight: 600 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                gap: '1rem',
              }}
            >
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                  Host a Party
                </h4>
                <p style={{ fontSize: '0.775rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
                  Start a fresh room, pick a video, and invite friends with a link.
                </p>
              </div>
              <button
                onClick={handleStartHosting}
                className="btn-action btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
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
