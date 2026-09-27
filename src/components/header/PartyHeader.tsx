import React from 'react'
import { Users, Share2, Film, Sparkles, UserCheck, Shield } from 'lucide-react'

interface PartyHeaderProps {
  roomTitle: string
  roomId: string
  isHost: boolean
  participantsCount: number
  isPeerBuffering: boolean
  bufferingPeerName?: string
  userName: string
  onOpenInvite: () => void
  onOpenStreamModal: () => void
  onEditName: () => void
}

export const PartyHeader: React.FC<PartyHeaderProps> = ({
  roomTitle,
  roomId,
  isHost,
  participantsCount,
  isPeerBuffering,
  bufferingPeerName,
  userName,
  onOpenInvite,
  onOpenStreamModal,
  onEditName,
}) => {
  return (
    <header className="party-header">
      {/* Brand & Room Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div className="brand-badge">
          <span style={{ fontSize: '1.5rem' }}>🍿</span>
          <span className="brand-title">Dekho Party</span>
          <span className="brand-tag">P2P</span>
        </div>

        {roomId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ color: 'var(--border-subtle)', userSelect: 'none' }}>|</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  maxWidth: '220px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: 'var(--text-main)',
                }}
                title={roomTitle}
              >
                {roomTitle || 'Live Watch Room'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className={`status-dot ${isPeerBuffering ? 'buffering' : ''}`} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  {isPeerBuffering ? `${bufferingPeerName || 'Friend'} buffering...` : 'Synced & Live'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="header-actions">
        {/* User profile pill */}
        <button
          onClick={onEditName}
          className="btn-action"
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
          title="Click to edit name"
        >
          {isHost ? <Shield size={14} color="#a78bfa" /> : <UserCheck size={14} color="#38bdf8" />}
          <span>{userName}</span>
        </button>

        {/* Change Stream (Host only) */}
        {isHost && (
          <button
            onClick={onOpenStreamModal}
            className="btn-action"
            title="Change Video or Stream Source"
          >
            <Film size={16} />
            <span style={{ display: 'none', minWidth: '0' }} className="md-inline">Stream</span>
          </button>
        )}

        {/* Participants count badge */}
        <div className="room-chip" title="Connected Party Members">
          <Users size={15} color="var(--accent-purple)" />
          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{participantsCount}</span>
        </div>

        {/* Invite Friends Button */}
        <button onClick={onOpenInvite} className="btn-action btn-primary">
          <Share2 size={16} />
          <span>Invite</span>
          <Sparkles size={14} />
        </button>
      </div>
    </header>
  )
}
