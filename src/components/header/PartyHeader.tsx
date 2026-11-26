import React from 'react'
import { Share2, Film, UserCheck, Shield, Tv, LogOut, Heart } from 'lucide-react'

const SUPPORT_SMARTLINK_URL = 'https://directyp.org/4/aeb051115f4be77122a44707db1760a1'

interface PartyHeaderProps {
  roomTitle: string
  roomId: string
  isHost: boolean
  participantsCount?: number
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flexShrink: 1 }}>
        <a
          href="/"
          style={{ textDecoration: 'none', color: 'inherit', flexShrink: 0 }}
          className="brand-badge"
          title="Return to Dekho Party Home"
        >
          <img
            src="/uploads/dekho-prime-icon-header-128.webp"
            alt="Dekho Prime"
            style={{ width: '26px', height: '26px', objectFit: 'contain' }}
          />
          <span className="brand-title hide-on-xs">
            Dekho<span style={{ color: 'var(--primary-red, #ea383e)' }}>Prime</span>
          </span>
          <span className="brand-tag hide-on-mobile">PARTY</span>
        </a>

        {roomId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
            <span className="hide-on-xs" style={{ color: 'var(--border-subtle)', userSelect: 'none' }}>|</span>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
                <span
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    maxWidth: 'clamp(110px, 32vw, 280px)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: 'var(--text-main)',
                  }}
                  title={roomTitle}
                >
                  {roomTitle || 'Live Watch Room'}
                </span>
              </div>
              <div className="hide-on-xs" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span className={`status-dot ${isPeerBuffering ? 'buffering' : ''}`} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
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
          style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
          title={`Edit Name (${userName})`}
        >
          {isHost ? <Shield size={14} color="#a78bfa" /> : <UserCheck size={14} color="#38bdf8" />}
          <span className="hide-on-mobile">{userName}</span>
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
            <Tv size={15} color={isTheaterMode ? 'var(--accent-purple)' : undefined} />
          </button>
        )}

        {/* Change Stream (Host only) */}
        {isHost && (
          <button
            onClick={onOpenStreamModal}
            className="btn-action"
            title="Change Video or Stream Source"
          >
            <Film size={15} />
          </button>
        )}

        {/* Support Us (Adsterra Smartlink) */}
        <a
          href={SUPPORT_SMARTLINK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-action"
          style={{
            textDecoration: 'none',
            background: 'rgba(236, 72, 153, 0.12)',
            borderColor: 'rgba(236, 72, 153, 0.35)',
            color: '#f472b6',
          }}
          title="Support DekhoPrime Watch Party"
        >
          <Heart size={14} fill="currentColor" />
          <span className="hide-on-mobile">Support Us</span>
        </a>

        {/* Invite Friends Button */}
        <button onClick={onOpenInvite} className="btn-action btn-primary">
          <Share2 size={15} />
          <span className="hide-on-mobile">Invite</span>
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
            <LogOut size={14} color={isHost ? '#f87171' : undefined} />
            <span className="hide-on-mobile">{isHost ? 'End Party' : 'Leave'}</span>
          </button>
        )}
      </div>
    </header>
  )
}
