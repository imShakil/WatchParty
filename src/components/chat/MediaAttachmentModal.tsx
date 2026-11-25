import React, { useState, useRef } from 'react'
import { X, Image as ImageIcon, Link2, Upload, Sparkles, Check, AlertCircle } from 'lucide-react'

interface MediaAttachmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSendMedia: (imageUrl: string, caption?: string) => void
}

interface QuickGif {
  id: string
  title: string
  url: string
  category: 'horror' | 'cry' | 'laugh' | 'popcorn' | 'mindblown'
}

const QUICK_GIFS: QuickGif[] = [
  // Horror / Shock
  {
    id: 'h1',
    title: 'Terrified Scream',
    url: 'https://media.giphy.com/media/14ut8PhnKWCFDq/giphy.gif',
    category: 'horror',
  },
  {
    id: 'h2',
    title: 'Hiding Behind Hands',
    url: 'https://media.giphy.com/media/oubM1tKqnLW5G/giphy.gif',
    category: 'horror',
  },
  {
    id: 'h3',
    title: 'Spooky Shock',
    url: 'https://media.giphy.com/media/3o7TKqnhaBshUXBmG4/giphy.gif',
    category: 'horror',
  },
  {
    id: 'h4',
    title: 'Jumping Back',
    url: 'https://media.giphy.com/media/26ueYUlPAmUkTBfe8/giphy.gif',
    category: 'horror',
  },
  // Cry / Emotional
  {
    id: 'c1',
    title: 'Tears Flowing',
    url: 'https://media.giphy.com/media/2WxWfiavndgcM/giphy.gif',
    category: 'cry',
  },
  {
    id: 'c2',
    title: 'Holding Back Tears',
    url: 'https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif',
    category: 'cry',
  },
  {
    id: 'c3',
    title: 'Heartbroken Sob',
    url: 'https://media.giphy.com/media/L95W4wvxxB1G8/giphy.gif',
    category: 'cry',
  },
  // Laugh
  {
    id: 'l1',
    title: 'Dying Laughing',
    url: 'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif',
    category: 'laugh',
  },
  {
    id: 'l2',
    title: 'Wheezing Laugh',
    url: 'https://media.giphy.com/media/ZqlvCTNHpqrio/giphy.gif',
    category: 'laugh',
  },
  {
    id: 'l3',
    title: 'Pointing Laugh',
    url: 'https://media.giphy.com/media/10uEX5kfeodYgo/giphy.gif',
    category: 'laugh',
  },
  // Popcorn / Hype
  {
    id: 'p1',
    title: 'Eating Popcorn',
    url: 'https://media.giphy.com/media/gl0mkIZOW6Nwc/giphy.gif',
    category: 'popcorn',
  },
  {
    id: 'p2',
    title: 'Intense Watching',
    url: 'https://media.giphy.com/media/t3dLl0TGHCxTG/giphy.gif',
    category: 'popcorn',
  },
  {
    id: 'p3',
    title: 'Standing Ovation',
    url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif',
    category: 'popcorn',
  },
  // Mind Blown
  {
    id: 'm1',
    title: 'Mind Blown',
    url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
    category: 'mindblown',
  },
  {
    id: 'm2',
    title: 'Jaw Dropped',
    url: 'https://media.giphy.com/media/lXu72d4iKwqek/giphy.gif',
    category: 'mindblown',
  },
]

export const MediaAttachmentModal: React.FC<MediaAttachmentModalProps> = ({
  isOpen,
  onClose,
  onSendMedia,
}) => {
  const [activeTab, setActiveTab] = useState<'gifs' | 'url' | 'upload'>('gifs')
  const [gifCategory, setGifCategory] = useState<string>('all')
  const [urlInput, setUrlInput] = useState<string>('')
  const [caption, setCaption] = useState<string>('')
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleClose = () => {
    setUrlInput('')
    setCaption('')
    setUploadPreview(null)
    setUploadError(null)
    setIsProcessing(false)
    onClose()
  }

  if (!isOpen) return null

  const handleSelectGif = (gifUrl: string) => {
    onSendMedia(gifUrl, caption.trim() || undefined)
    handleClose()
  }

  const handleSendUrl = (e: React.FormEvent) => {
    e.preventDefault()
    if (!urlInput.trim()) return
    onSendMedia(urlInput.trim(), caption.trim() || undefined)
    handleClose()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError(null)
    setIsProcessing(true)

    // Verify it is an image
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, GIF, WebP).')
      setIsProcessing(false)
      return
    }

    // If it's an animated GIF, read directly as base64 without canvas resize
    if (file.type === 'image/gif') {
      if (file.size > 2 * 1024 * 1024) {
        setUploadError('GIF is too large (max 2MB for fast peer sync).')
        setIsProcessing(false)
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        setUploadPreview(reader.result as string)
        setIsProcessing(false)
      }
      reader.onerror = () => {
        setUploadError('Failed to read image.')
        setIsProcessing(false)
      }
      reader.readAsDataURL(file)
      return
    }

    // For standard images, compress via canvas to max 800px width/height for fast P2P transmission
    const img = new Image()
    const reader = new FileReader()
    reader.onload = () => {
      img.onload = () => {
        try {
          const maxDim = 800
          let { width, height } = img
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width)
              width = maxDim
            } else {
              width = Math.round((width * maxDim) / height)
              height = maxDim
            }
          }

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            setUploadPreview(reader.result as string)
            setIsProcessing(false)
            return
          }

          ctx.drawImage(img, 0, 0, width, height)
          const compressed = canvas.toDataURL('image/jpeg', 0.82)
          setUploadPreview(compressed)
          setIsProcessing(false)
        } catch {
          setUploadPreview(reader.result as string)
          setIsProcessing(false)
        }
      }
      img.onerror = () => {
        setUploadError('Invalid image file.')
        setIsProcessing(false)
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleSendUpload = () => {
    if (!uploadPreview) return
    onSendMedia(uploadPreview, caption.trim() || undefined)
    handleClose()
  }

  const filteredGifs =
    gifCategory === 'all'
      ? QUICK_GIFS
      : QUICK_GIFS.filter((g) => g.category === gifCategory)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 150,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        padding: '1rem',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90dvh',
          background: 'rgba(18, 21, 31, 0.98)',
          borderRadius: 'var(--radius-lg, 16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.85)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sparkles size={18} color="var(--primary-red)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Send GIF or Image
            </h3>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              display: 'flex',
              padding: '0.2rem',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(0, 0, 0, 0.25)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('gifs')}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'gifs' ? '2px solid var(--accent-purple)' : '2px solid transparent',
              color: activeTab === 'gifs' ? 'var(--text-main)' : 'var(--text-dim)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
            }}
          >
            <Sparkles size={15} />
            <span>Reaction GIFs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('url')}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'url' ? '2px solid var(--accent-purple)' : '2px solid transparent',
              color: activeTab === 'url' ? 'var(--text-main)' : 'var(--text-dim)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
            }}
          >
            <Link2 size={15} />
            <span>Image URL</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'upload' ? '2px solid var(--accent-purple)' : '2px solid transparent',
              color: activeTab === 'upload' ? 'var(--text-main)' : 'var(--text-dim)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
            }}
          >
            <Upload size={15} />
            <span>Upload</span>
          </button>
        </div>

        {/* Caption Input Field */}
        <div style={{ padding: '0.75rem 1.25rem 0.25rem' }}>
          <input
            type="text"
            value={caption}
            maxLength={100}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add an optional caption..."
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem',
              borderRadius: 'var(--radius-md, 8px)',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
        </div>

        {/* Tab 1: Reaction GIFs */}
        {activeTab === 'gifs' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.25rem 1.25rem' }}>
            {/* Category Filter Chips */}
            <div
              style={{
                display: 'flex',
                gap: '0.35rem',
                overflowX: 'auto',
                paddingBottom: '0.65rem',
                marginBottom: '0.65rem',
              }}
            >
              {[
                { id: 'all', label: 'All' },
                { id: 'horror', label: '😱 Horror' },
                { id: 'cry', label: '😭 Cry' },
                { id: 'laugh', label: '😂 Laugh' },
                { id: 'popcorn', label: '🍿 Popcorn' },
                { id: 'mindblown', label: '🤯 Shock' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setGifCategory(c.id)}
                  style={{
                    padding: '0.3rem 0.65rem',
                    borderRadius: 'var(--radius-full)',
                    background: gifCategory === c.id ? 'var(--accent-purple)' : 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* GIFs Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.65rem',
              }}
            >
              {filteredGifs.map((gif) => (
                <button
                  key={gif.id}
                  type="button"
                  onClick={() => handleSelectGif(gif.url)}
                  style={{
                    background: '#0d1117',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 'var(--radius-md, 8px)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    aspectRatio: '16/10',
                  }}
                  title={`Send ${gif.title}`}
                >
                  <img
                    src={gif.url}
                    alt={gif.title}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: '0.2rem 0.4rem',
                      background: 'rgba(0, 0, 0, 0.75)',
                      fontSize: '0.7rem',
                      color: '#fff',
                      textAlign: 'left',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {gif.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: URL Input */}
        {activeTab === 'url' && (
          <form
            onSubmit={handleSendUrl}
            style={{
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Direct Image or GIF Web URL
              </label>
              <input
                type="url"
                required
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/movie-scene.gif"
                style={{
                  width: '100%',
                  marginTop: '0.35rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md, 8px)',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>

            {urlInput.trim() && (
              <div
                style={{
                  width: '100%',
                  maxHeight: '180px',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  background: '#0a0d14',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={urlInput.trim()}
                  alt="Preview"
                  style={{ maxWidth: '100%', maxHeight: '180px', objectFit: 'contain' }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={!urlInput.trim()}
              className="btn-action btn-primary"
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '0.9rem',
                justifyContent: 'center',
                opacity: urlInput.trim() ? 1 : 0.5,
              }}
            >
              <Check size={16} />
              <span>Send Image to Room</span>
            </button>
          </form>
        )}

        {/* Tab 3: Upload Local File */}
        {activeTab === 'upload' && (
          <div
            style={{
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {!uploadPreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed rgba(255, 255, 255, 0.2)',
                  borderRadius: 'var(--radius-lg, 12px)',
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'rgba(255, 255, 255, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem',
                  transition: 'border-color 0.2s',
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
                  <ImageIcon size={24} color="var(--accent-purple)" />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                    {isProcessing ? 'Processing image...' : 'Click or tap to choose an image/GIF'}
                  </p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    PNG, JPG, WebP, or GIF (auto-synced to friends over P2P)
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    maxHeight: '200px',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    background: '#0a0d14',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={uploadPreview}
                    alt="Upload preview"
                    style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setUploadPreview(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      background: 'rgba(0, 0, 0, 0.75)',
                      border: 'none',
                      color: '#fff',
                      borderRadius: '50%',
                      width: '26px',
                      height: '26px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    title="Remove image"
                  >
                    <X size={15} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSendUpload}
                  className="btn-action btn-primary"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '0.9rem',
                    justifyContent: 'center',
                  }}
                >
                  <Check size={16} />
                  <span>Send to Room</span>
                </button>
              </div>
            )}

            {uploadError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.8rem',
                  color: 'var(--danger)',
                }}
              >
                <AlertCircle size={15} />
                <span>{uploadError}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
