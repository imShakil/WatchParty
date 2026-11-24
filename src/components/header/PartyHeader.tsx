import React from 'react'
import { Users, Share2, Film, Sparkles, UserCheck, Shield, Tv, LogOut } from 'lucide-react'

interface PartyHeaderProps {
  roomTitle: string
  roomId: string
  isHost: boolean
  participantsCount: number
  isPeerBuffering: boolean
  bufferingPeerName?: string
  userName: string
  isTheaterMode?: boolean
  onToggleTheaterMode?: () => void
  onOpenInvite: () => void
  onOpenStreamModal: () => void
  onEditName: () => void
  onLeaveOrTerminate?: () => void
}

export const PartyHeader: React.FC<PartyHeaderProps> = ({
  roomTitle,
  roomId,
  isHost,
  participantsCount,
  isPeerBuffering,
  bufferingPeerName,
  userName,
  isTheaterMode,
  onToggleTheaterMode,
  onOpenInvite,
  onOpenStreamModal,
  onEditName,
  onLeaveOrTerminate,
}) => {
  return (
    <header className="party-header">
      {/* Brand & Room Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <a
          href="/"
          style={{ textDecoration: 'none', color: 'inherit' }}
          className="brand-badge"
          title="Return to Dekho Party Home"
        >
          <img
            src="/uploads/dekho-prime-icon-header-128.webp"
            alt="Dekho Prime"
            style={{ width: '28px', height: '28px', objectFit: 'contain' }}
          />
          <span className="brand-title">
            Dekho<span style={{ color: 'var(--primary-red, #ea383e)' }}>Prime</span>
          </span>
          <span className="brand-tag">PARTY</span>
        </a>

        {roomId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ color: 'var(--border-subtle)', userSelect: 'none' }}>|</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 700,
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
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    padding: '0.1rem 0.45rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(139, 92, 246, 0.15)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    color: '#c4b5fd',
                  }}
                  title={`Room ID: ${roomId}`}
                >
                  #{roomId}
                </span>
              </div>
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

        {/* Theater / Cinema Mode Toggle */}
        {onToggleTheaterMode && (
          <button
            onClick={onToggleTheaterMode}
            className={`btn-action ${isTheaterMode ? 'active' : ''}`}
            style={{
              background: isTheaterMode ? 'rgba(139, 92, 246, 0.25)' : undefined,
              borderColor: isTheaterMode ? 'var(--accent-purple)' : undefined,
            }}
            title={isTheaterMode ? 'Exit Cinema Mode' : 'Cinema Mode (Wide Screen)'}
          >
            <Tv size={16} color={isTheaterMode ? 'var(--accent-purple)' : undefined} />
            <span style={{ display: 'none', minWidth: '0' }} className="md-inline">Cinema</span>
          </button>
        )}

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

        {/* End Room (Host) or Leave Room (Guest) */}
        {onLeaveOrTerminate && (
          <button
            onClick={onLeaveOrTerminate}
            className="btn-action"
            style={
              isHost
                ? {
                    background: 'rgba(239, 68, 68, 0.12)',
                    borderColor: 'rgba(239, 68, 68, 0.35)',
                    color: '#f87171',
                  }
                : {
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderColor: 'rgba(255, 255, 255, 0.12)',
                    color: 'var(--text-dim)',
                  }
            }
            title={isHost ? 'End watch party for everyone' : 'Leave watch party'}
          >
            <LogOut size={15} color={isHost ? '#f87171' : undefined} />
            <span className="btn-text-responsive">{isHost ? 'End Party' : 'Leave'}</span>
          </button>
        )}
      </div>
    </header>
  )
}
