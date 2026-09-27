import React, { useState } from 'react'
import { X, Film, PlayCircle, Sparkles } from 'lucide-react'

interface StreamSelectorModalProps {
  isOpen: boolean
  currentUrl: string
  currentTitle: string
  onClose: () => void
  onSaveStream: (url: string, title: string) => void
}

const PRESET_STREAMS = [
  {
    title: 'Big Buck Bunny (HLS)',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    category: 'Animation',
  },
  {
    title: 'Tears of Steel (HLS)',
    url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    category: 'Sci-Fi Demo',
  },
  {
    title: 'Sintel (Direct MP4)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    category: 'Short Movie',
  },
  {
    title: 'Cosmos Laundromat (YouTube)',
    url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    category: 'YouTube Animation',
  },
]

export const StreamSelectorModal: React.FC<StreamSelectorModalProps> = ({
  isOpen,
  currentUrl,
  currentTitle,
  onClose,
  onSaveStream,
}) => {
  const [streamUrl, setStreamUrl] = useState<string>(currentUrl)
  const [title, setTitle] = useState<string>(currentTitle)

  if (!isOpen) return null

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault()
    if (!streamUrl.trim()) return
    onSaveStream(streamUrl.trim(), title.trim() || 'Watch Party Stream')
    onClose()
  }

  const handleSelectPreset = (presetUrl: string, presetTitle: string) => {
    setStreamUrl(presetUrl)
    setTitle(presetTitle)
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
          maxWidth: '520px',
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
            <Film size={22} color="var(--accent-purple)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Choose Video Stream
            </h3>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ padding: '0.4rem' }}>
            <X size={18} />
          </button>
        </div>

        {/* Preset Demo Streams */}
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '0.5rem', display: 'block' }}>
            Quick Demo Streams
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {PRESET_STREAMS.map((p) => (
              <div
                key={p.url}
                onClick={() => handleSelectPreset(p.url, p.title)}
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: streamUrl === p.url ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-secondary)',
                  border: streamUrl === p.url ? '1px solid var(--accent-purple)' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <PlayCircle size={16} color="var(--accent-purple)" />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {p.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{p.category}</div>
                  </div>
                </div>
                {streamUrl === p.url && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-purple)', fontWeight: 700 }}>
                    Selected
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Custom Stream Input Form */}
        <form onSubmit={handleApply} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Movie / Video Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Inception (2010)"
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Stream URL (YouTube, .m3u8, .mp4, or embed)
            </label>
            <input
              type="text"
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="https://example.com/movie.m3u8"
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={!streamUrl.trim()}
            className="btn-action btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
          >
            <span>Load Video into Party</span>
            <Sparkles size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}
