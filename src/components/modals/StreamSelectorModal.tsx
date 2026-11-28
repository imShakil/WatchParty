import React, { useState, useRef, useEffect } from 'react'
import { X, Film, PlayCircle, Radio, Upload, Link2, HardDrive, MonitorUp, Timer, Volume2, Square } from 'lucide-react'
import { buildCountdownUrl, COUNTDOWN_MUSIC_PRESETS } from '@/utils/countdownStream'
import { startCountdownMusicLoop } from '@/utils/countdownAudio'

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
  // {
  //   title: 'Tears of Steel (HLS Demo)',
  //   url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
  //   category: 'HLS Multi-Audio',
  // },
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
  const [activeTab, setActiveTab] = useState<'url' | 'local' | 'tab' | 'countdown'>('url')
  const [streamUrl, setStreamUrl] = useState<string>(currentUrl)
  const [title, setTitle] = useState<string>(currentTitle)
  const [selectedFileName, setSelectedFileName] = useState<string>('')
  const [tabShareError, setTabShareError] = useState<string>('')
  const [countdownMode, setCountdownMode] = useState<'duration' | 'datetime'>('duration')
  const [durationMinutes, setDurationMinutes] = useState<number>(5)
  const [durationSeconds, setDurationSeconds] = useState<number>(0)
  const [targetDateTime, setTargetDateTime] = useState<string>(() => {
    const d = new Date(Date.now() + 15 * 60 * 1000)
    const offset = d.getTimezoneOffset() * 60000
    return new Date(d.getTime() - offset).toISOString().slice(0, 16)
  })
  const [countdownText, setCountdownText] = useState<string>('Movie Night Starts Soon')
  const [countdownDoneText, setCountdownDoneText] = useState<string>("It's Showtime!")
  const [countdownChime, setCountdownChime] = useState<boolean>(true)
  const [countdownMusicChoice, setCountdownMusicChoice] = useState<string>('preset://lofi')
  const [countdownCustomMusicUrl, setCountdownCustomMusicUrl] = useState<string>('')
  const [isPreviewingMusic, setIsPreviewingMusic] = useState<boolean>(false)
  const [countdownNextUrl, setCountdownNextUrl] = useState<string>('')
  const [countdownNextTitle, setCountdownNextTitle] = useState<string>('')
  const [countdownError, setCountdownError] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!isOpen || activeTab !== 'countdown' || !isPreviewingMusic) return
    if (!countdownMusicChoice.startsWith('preset://')) return
    const stop = startCountdownMusicLoop(countdownMusicChoice)
    return () => stop()
  }, [isOpen, activeTab, isPreviewingMusic, countdownMusicChoice])

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

  const handleApplyCountdown = (e: React.FormEvent) => {
    e.preventDefault()
    setCountdownError('')
    const now = Date.now()
    let targetMs = now

    if (countdownMode === 'duration') {
      const totalMs = Math.max(0, (Number(durationMinutes) || 0) * 60 + (Number(durationSeconds) || 0)) * 1000
      if (totalMs < 1000) {
        setCountdownError('Please enter a duration of at least 1 second.')
        return
      }
      targetMs = now + totalMs
    } else {
      const parsed = new Date(targetDateTime).getTime()
      if (!Number.isFinite(parsed) || parsed <= now) {
        setCountdownError('Please pick a future date and time.')
        return
      }
      targetMs = parsed
    }

    const headline = countdownText.trim() || 'Starting Soon'
    const resolvedMusicUrl =
      countdownMusicChoice === 'custom'
        ? countdownCustomMusicUrl.trim() || undefined
        : countdownMusicChoice || undefined
    const selectedPreset = COUNTDOWN_MUSIC_PRESETS.find((p) => p.id === countdownMusicChoice)
    const resolvedMusicTitle =
      countdownMusicChoice === 'custom'
        ? 'Custom Audio Stream'
        : selectedPreset && selectedPreset.id
          ? selectedPreset.label
          : undefined

    const url = buildCountdownUrl({
      targetMs,
      startMs: now,
      text: headline,
      doneText: countdownDoneText.trim() || "It's Time!",
      chime: countdownChime,
      musicUrl: resolvedMusicUrl,
      musicTitle: resolvedMusicTitle,
      nextUrl: countdownNextUrl.trim() || undefined,
      nextTitle: countdownNextTitle.trim() || undefined,
    })
    onSaveStream(url, `⏳ ${headline}`, false)
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
            <span>Stream URL</span>
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
          <button
            type="button"
            onClick={() => {
              setCountdownError('')
              setActiveTab('countdown')
            }}
            className="btn-action"
            style={{
              flex: 1,
              justifyContent: 'center',
              background: activeTab === 'countdown' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'countdown' ? 'var(--text-main)' : 'var(--text-dim)',
              border: activeTab === 'countdown' ? '1px solid var(--border-subtle)' : 'none',
              padding: '0.5rem',
              fontSize: '0.85rem',
            }}
          >
            <Timer size={15} />
            <span>Countdown</span>
          </button>
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
                      background: streamUrl === p.url ? 'rgba(234, 56, 62, 0.15)' : 'var(--bg-secondary)',
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
                  background: 'rgba(234, 56, 62, 0.15)',
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
                border: '1px solid rgba(234, 56, 62, 0.3)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.75rem 1.25rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                background: 'rgba(234, 56, 62, 0.08)',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(234, 56, 62, 0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MonitorUp size={24} color="#fb7185" />
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

        {activeTab === 'countdown' && (
          <form onSubmit={handleApplyCountdown} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                type="button"
                onClick={() => setCountdownMode('duration')}
                className="btn-action"
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  padding: '0.45rem',
                  fontSize: '0.8rem',
                  background: countdownMode === 'duration' ? 'rgba(234, 56, 62, 0.2)' : 'var(--bg-secondary)',
                  border: countdownMode === 'duration' ? '1px solid var(--accent-purple)' : '1px solid var(--border-subtle)',
                  color: countdownMode === 'duration' ? '#fecdd3' : 'var(--text-dim)',
                }}
              >
                Duration Timer
              </button>
              <button
                type="button"
                onClick={() => setCountdownMode('datetime')}
                className="btn-action"
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  padding: '0.45rem',
                  fontSize: '0.8rem',
                  background: countdownMode === 'datetime' ? 'rgba(234, 56, 62, 0.2)' : 'var(--bg-secondary)',
                  border: countdownMode === 'datetime' ? '1px solid var(--accent-purple)' : '1px solid var(--border-subtle)',
                  color: countdownMode === 'datetime' ? '#fecdd3' : 'var(--text-dim)',
                }}
              >
                Target Date &amp; Time
              </button>
            </div>

            {countdownMode === 'duration' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {[1, 5, 10, 15, 30, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => {
                        setDurationMinutes(mins)
                        setDurationSeconds(0)
                      }}
                      style={{
                        padding: '0.32rem 0.65rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: durationMinutes === mins && durationSeconds === 0 ? 'var(--accent-purple)' : 'var(--bg-secondary)',
                        color: durationMinutes === mins && durationSeconds === 0 ? '#fff' : 'var(--text-muted)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      {mins === 60 ? '1 hr' : `${mins}m`}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem' }}>
                      Minutes
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={10080}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Math.max(0, Number(e.target.value)))}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-main)',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem' }}>
                      Seconds
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={durationSeconds}
                      onChange={(e) => setDurationSeconds(Math.min(59, Math.max(0, Number(e.target.value))))}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-main)',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem' }}>
                  Target Local Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={targetDateTime}
                  onChange={(e) => setTargetDateTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem' }}>
                Countdown Text
              </label>
              <input
                type="text"
                value={countdownText}
                onChange={(e) => setCountdownText(e.target.value)}
                placeholder="e.g. Movie Night Starts Soon"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem' }}>
                  End Message
                </label>
                <input
                  type="text"
                  value={countdownDoneText}
                  onChange={(e) => setCountdownDoneText(e.target.value)}
                  placeholder="It's Showtime!"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    fontSize: '0.82rem',
                  }}
                />
              </div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  paddingTop: '1.15rem',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={countdownChime}
                  onChange={(e) => setCountdownChime(e.target.checked)}
                />
                <span>Chime at 0</span>
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                Background Music (Optional)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select
                  value={countdownMusicChoice}
                  onChange={(e) => {
                    setCountdownMusicChoice(e.target.value)
                    setIsPreviewingMusic(false)
                  }}
                  style={{
                    flex: 1,
                    padding: '0.58rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    fontSize: '0.84rem',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {COUNTDOWN_MUSIC_PRESETS.map((preset) => (
                    <option key={preset.id || 'none'} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                  <option value="custom">Custom Online Audio URL (MP3 / OGG / Stream)</option>
                </select>
                {countdownMusicChoice.startsWith('preset://') && (
                  <button
                    type="button"
                    onClick={() => setIsPreviewingMusic((prev) => !prev)}
                    title={isPreviewingMusic ? 'Stop preview' : 'Preview track'}
                    className="btn-action"
                    style={{
                      padding: '0.55rem 0.75rem',
                      fontSize: '0.78rem',
                      background: isPreviewingMusic ? 'rgba(239, 68, 68, 0.16)' : 'var(--bg-secondary)',
                      border: isPreviewingMusic
                        ? '1px solid rgba(239, 68, 68, 0.45)'
                        : '1px solid var(--border-subtle)',
                      color: isPreviewingMusic ? '#fca5a5' : 'var(--text-main)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isPreviewingMusic ? <Square size={12} fill="currentColor" /> : <Volume2 size={14} />}
                    <span>{isPreviewingMusic ? 'Stop' : 'Preview'}</span>
                  </button>
                )}
              </div>
              {countdownMusicChoice === 'custom' && (
                <input
                  type="url"
                  value={countdownCustomMusicUrl}
                  onChange={(e) => setCountdownCustomMusicUrl(e.target.value)}
                  placeholder="https://example.com/music.mp3 (MP3, OGG, AAC)"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    fontSize: '0.82rem',
                  }}
                />
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                Auto-Switch to Next Stream at 00:00 (Optional)
              </label>
              <input
                type="text"
                value={countdownNextUrl}
                onChange={(e) => setCountdownNextUrl(e.target.value)}
                placeholder="https://... (YouTube, HLS .m3u8, MP4)"
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '0.82rem',
                }}
              />
              {countdownNextUrl.trim() && (
                <input
                  type="text"
                  value={countdownNextTitle}
                  onChange={(e) => setCountdownNextTitle(e.target.value)}
                  placeholder="Next Stream Title (optional)"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    fontSize: '0.82rem',
                  }}
                />
              )}
            </div>

            {countdownError && (
              <div style={{ fontSize: '0.78rem', color: '#f87171' }}>{countdownError}</div>
            )}

            <button
              type="submit"
              className="btn-action btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
            >
              <Timer size={16} />
              <span>Start Synced Countdown</span>
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
