import React, { useState } from 'react'
import { X, User, Check } from 'lucide-react'

interface EditNameModalProps {
  isOpen: boolean
  currentName: string
  onClose: () => void
  onSaveName: (newName: string) => void
}

export const EditNameModal: React.FC<EditNameModalProps> = ({
  isOpen,
  currentName,
  onClose,
  onSaveName,
}) => {
  const [name, setName] = useState<string>(currentName)

  if (!isOpen) return null

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSaveName(name.trim())
    onClose()
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
          maxWidth: '400px',
          maxHeight: '90dvh',
          overflowY: 'auto',
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <User size={20} color="var(--accent-purple)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Change Display Name
            </h3>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ padding: '0.4rem' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="text"
            value={name}
            maxLength={25}
            autoFocus
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

          <button
            type="submit"
            disabled={!name.trim()}
            className="btn-action btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <Check size={16} />
            <span>Save Name</span>
          </button>
        </form>
      </div>
    </div>
  )
}
