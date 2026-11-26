import React, { useState, useRef } from 'react'
import { X, Film, PlayCircle, Radio, Upload, Link2, HardDrive, MonitorUp } from 'lucide-react'

interface StreamSelectorModalProps {
  isOpen: boolean
  currentUrl: string
  currentTitle: string
  onClose: () => void
  onSaveStream: (url: string, title: string, isP2P?: boolean) => void
  onStartTabShare?: () => Promise<void> | void
}

const PRESET_STREAMS = [
  {
    title: 'Cosmos Laundromat (YouTube 4K)',
    url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    category: 'YouTube Animation',
  },
  {
    title: 'Big Buck Bunny (HLS)',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    category: 'HLS Live Stream',
  },
  {
    title: 'Tears of Steel (HLS Demo)',
    url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    category: 'HLS Multi-Audio',
  },
  {
    title: 'Sintel Open Movie (MP4)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    category: 'Direct MP4',
  },
]

export const StreamSelectorModal: React.FC<StreamSelectorModalProps> = ({
  isOpen,
  currentUrl,
  currentTitle,
  onClose,
  onSaveStream,
  onStartTabShare,
}) => {
  const [activeTab, setActiveTab] = useState<'url' | 'local' | 'tab'>('url')
  const [streamUrl, setStreamUrl] = useState<string>(currentUrl)
  const [title, setTitle] = useState<string>(currentTitle)
  const [selectedFileName, setSelectedFileName] = useState<string>('')
  const [tabShareError, setTabShareError] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  if (!isOpen) return null

  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault()
    if (!streamUrl.trim()) return
    onSaveStream(streamUrl.trim(), title.trim() || 'Watch Party Stream', false)
    onClose()
  }

  const handleSelectPreset = (presetUrl: string, presetTitle: string) => {
    setStreamUrl(presetUrl)
    setTitle(presetTitle)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const objectUrl = URL.createObjectURL(file)
    const cleanTitle = file.name.replace(/\.[^/.]+$/, '')
    setSelectedFileName(file.name)
    setTitle(cleanTitle)
    setStreamUrl(objectUrl)
  }

  const handleApplyLocalFile = () => {
    if (!streamUrl) return
    onSaveStream(streamUrl, title || selectedFileName || 'Local Video', true)
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
          maxWidth: '540px',
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
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Film size={22} color="var(--accent-purple)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Choose Video Source
            </h3>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ padding: '0.4rem' }}>
            <X size={18} />
          </button>
        </div>

        {/* Source Mode Tabs */}
        <div
          style={{
            display: 'flex',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            padding: '0.25rem',
            gap: '0.25rem',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className="btn-action"
            style={{
              flex: 1,
              justifyContent: 'center',
              background: activeTab === 'url' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'url' ? 'var(--text-main)' : 'var(--text-dim)',
              border: activeTab === 'url' ? '1px solid var(--border-subtle)' : 'none',
              padding: '0.5rem',
              fontSize: '0.85rem',
            }}
          >
            <Link2 size={15} />
            <span>Web URL / YouTube</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('local')}
            className="btn-action"
            style={{
              flex: 1,
              justifyContent: 'center',
              background: activeTab === 'local' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'local' ? 'var(--text-main)' : 'var(--text-dim)',
              border: activeTab === 'local' ? '1px solid var(--border-subtle)' : 'none',
              padding: '0.5rem',
              fontSize: '0.85rem',
            }}
          >
            <HardDrive size={15} />
            <span>Local File</span>
          </button>
          {onStartTabShare && (
            <button
              type="button"
              onClick={() => {
                setTabShareError('')
                setActiveTab('tab')
              }}
              className="btn-action"
              style={{
                flex: 1,
                justifyContent: 'center',
                background: activeTab === 'tab' ? 'var(--bg-surface)' : 'transparent',
                color: activeTab === 'tab' ? 'var(--text-main)' : 'var(--text-dim)',
                border: activeTab === 'tab' ? '1px solid var(--border-subtle)' : 'none',
                padding: '0.5rem',
                fontSize: '0.85rem',
              }}
            >
              <MonitorUp size={15} />
              <span>Share Tab</span>
            </button>
          )}
        </div>

        {activeTab === 'url' && (
          <>
            {/* Preset Streams */}
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '0.5rem', display: 'block' }}>
                Featured Presets
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {PRESET_STREAMS.map((p) => (
                  <div
                    key={p.url}
                    onClick={() => handleSelectPreset(p.url, p.title)}
                    style={{
                      padding: '0.6rem 0.85rem',
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
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)' }}>{p.category}</div>
                      </div>
                    </div>
                    {streamUrl === p.url && (
                      <span style={{ fontSize: '0.725rem', color: 'var(--accent-purple)', fontWeight: 700 }}>
                        Selected
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Stream Input Form */}
            <form onSubmit={handleApplyUrl} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Video Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. My Favorite Movie"
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Media URL (YouTube, Vimeo, Twitch, Dailymotion, SoundCloud, Drive, HLS/DASH, MP4)
                </label>
                <input
                  type="text"
                  value={streamUrl}
                  onChange={(e) => setStreamUrl(e.target.value)}
                  placeholder="https://youtube.com/... or vimeo.com/... or twitch.tv/..."
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
                <span>Load Stream into Party</span>
                <PlayCircle size={16} />
              </button>
            </form>
          </>
        )}

        {activeTab === 'local' && (
          /* Local File Mode */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '2rem 1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                background: 'var(--bg-secondary)',
                transition: 'border-color 0.2s ease',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-matroska"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(139, 92, 246, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Upload size={24} color="var(--accent-purple)" />
              </div>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {selectedFileName ? selectedFileName : 'Choose a Video File from your device'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                  Supports MP4, WebM, MKV, MOV • Zero server upload
                </div>
              </div>
            </div>

            {/* P2P Live Broadcast Notice */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                fontSize: '0.775rem',
                color: '#6ee7b7',
              }}
            >
              <Radio size={16} color="#10b981" />
              <span>
                <strong>Live P2P Broadcast:</strong> Plays directly from your device and streams to all party guests in real time via encrypted WebRTC.
              </span>
            </div>

            {selectedFileName && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Display Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Movie Title"
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
            )}

            <button
              type="button"
              disabled={!streamUrl || !selectedFileName}
              onClick={handleApplyLocalFile}
              className="btn-action btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
            >
              <span>Broadcast Video to Party</span>
              <PlayCircle size={16} />
            </button>
          </div>
        )}

        {activeTab === 'tab' && onStartTabShare && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.75rem 1.25rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                background: 'rgba(139, 92, 246, 0.08)',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(139, 92, 246, 0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MonitorUp size={24} color="#c084fc" />
              </div>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Stream Any Browser Tab Live
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.3rem', lineHeight: 1.5 }}>
                  Pick a browser tab (like Bilibili, anime sites, or sports) and check <strong>Share tab audio</strong> so everyone watches in real-time WebRTC sync.
                </div>
              </div>
            </div>

            {tabShareError && (
              <div style={{ fontSize: '0.78rem', color: '#f87171', textAlign: 'center' }}>
                {tabShareError}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setTabShareError('')
                void Promise.resolve(onStartTabShare())
                  .then(() => onClose())
                  .catch((err: unknown) => {
                    const msg = err instanceof Error ? err.message : 'Tab share cancelled or unsupported.'
                    setTabShareError(msg)
                  })
              }}
              className="btn-action btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
            >
              <MonitorUp size={16} />
              <span>Choose Tab &amp; Start Sharing</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
