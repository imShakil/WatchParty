import React, { useEffect } from 'react'
import { AlertTriangle, LogOut, X } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
  onConfirm: () => void
  onClose: () => void
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  onConfirm,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        padding: '1rem',
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          maxHeight: '90dvh',
          overflowY: 'auto',
          background: 'rgba(18, 21, 31, 0.95)',
          borderRadius: 'var(--radius-lg, 16px)',
          border: isDestructive ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
          boxShadow: isDestructive ? '0 20px 40px rgba(0, 0, 0, 0.8), 0 0 25px rgba(239, 68, 68, 0.15)' : '0 20px 40px rgba(0, 0, 0, 0.8)',
          padding: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: isDestructive ? 'rgba(239, 68, 68, 0.18)' : 'rgba(234, 56, 62, 0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {isDestructive ? (
                <AlertTriangle size={22} color="#ef4444" />
              ) : (
                <LogOut size={20} color="#a78bfa" />
              )}
            </div>
            <div>
              <h3
                id="confirm-modal-title"
                style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main, #ffffff)' }}
              >
                {title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-dim, #94a3b8)',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-sm, 6px)',
            }}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted, #cbd5e1)', lineHeight: 1.5 }}>
          {message}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-action"
            style={{
              padding: '0.55rem 1rem',
              fontSize: '0.875rem',
              borderRadius: 'var(--radius-md, 8px)',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: 'var(--text-main, #ffffff)',
            }}
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className="btn-action"
            style={{
              padding: '0.55rem 1.15rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              borderRadius: 'var(--radius-md, 8px)',
              background: isDestructive
                ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
                : 'linear-gradient(135deg, #e11d48 0%, #ea383e 100%)',
              border: isDestructive ? '1px solid #ef4444' : '1px solid #ea383e',
              color: '#ffffff',
              boxShadow: isDestructive
                ? '0 4px 14px rgba(239, 68, 68, 0.4)'
                : '0 4px 14px rgba(234, 56, 62, 0.4)',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

