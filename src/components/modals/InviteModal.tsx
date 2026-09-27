import React, { useState } from 'react'
import { X, Copy, Check, Share2, Sparkles } from 'lucide-react'

interface InviteModalProps {
  isOpen: boolean
  roomId: string
  roomTitle: string
  onClose: () => void
}

export const InviteModal: React.FC<InviteModalProps> = ({ isOpen, roomId, roomTitle, onClose }) => {
  const [copied, setCopied] = useState<boolean>(false)

  if (!isOpen) return null

  const inviteLink = `${window.location.origin}/?room=${encodeURIComponent(roomId)}`

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    })
  }

  const handleShareNative = () => {
    if (navigator.share) {
      navigator.share({
        title: `Join my Watch Party: ${roomTitle}`,
        text: `Watch ${roomTitle} together with me in real-time on Dekho Party!`,
        url: inviteLink,
      }).catch(() => {})
    } else {
      handleCopy()
    }
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
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-glass)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🍿</span>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Invite to Watch Party
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                Anyone with this link can watch & chat with you
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ padding: '0.4rem' }}>
            <X size={18} />
          </button>
        </div>

        {/* Room Code Badge */}
        <div
          style={{
            padding: '1rem',
            background: 'rgba(139, 92, 246, 0.1)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#c4b5fd' }}>
            Room Code
          </span>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '0.1em', color: '#fff', fontFamily: 'monospace' }}>
            {roomId}
          </span>
        </div>

        {/* Link Input & Copy */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            Party Invite URL
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              readOnly
              value={inviteLink}
              style={{
                flex: 1,
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                fontSize: '0.825rem',
                outline: 'none',
              }}
            />
            <button onClick={handleCopy} className="btn-action btn-primary" style={{ minWidth: '95px' }}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Share Native button */}
        <button onClick={handleShareNative} className="btn-action" style={{ width: '100%', justifyContent: 'center' }}>
          <Share2 size={16} color="var(--accent-purple)" />
          <span>Share directly to Friends</span>
          <Sparkles size={14} color="#f59e0b" />
        </button>
      </div>
    </div>
  )
}
