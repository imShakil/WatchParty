import React, { useState, useCallback, useEffect } from 'react'
import {
  Play,
  LogIn,
  Tv,
  Film,
  Clapperboard,
  Smile,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Hash,
  User,
  Flame,
  Users,
  Lock,
  Radio,
  LogOut,
  Pin,
  Trash2,
} from 'lucide-react'
import type { User as FirebaseUser } from 'firebase/auth'
import {
  subscribeToActivePartyStats,
  getUserPermanentRooms,
  removePermanentRoom,
  type LivePartyStats,
  type PermanentRoomSummary,
} from '@/services/firebaseService'
import { clearHostSession } from '@/utils/sessionUtils'
import { useRoomIdEligibility } from '@/hooks/useRoomIdEligibility'
import { sanitizeRoomIdInput } from '@/utils/roomValidation'
import { PartyNativeBanner, PartyLandingPopunder } from '@/components/ads/PartyAds'

interface LandingPageProps {
  userName: string
  user?: FirebaseUser | null
  onSignIn?: () => Promise<FirebaseUser | null>
  onSignOut?: () => Promise<void>
  onSaveName: (name: string) => void
  onHostParty: (
    streamUrl?: string,
    title?: string,
    customRoomId?: string,
    posterUrl?: string,
    isPermanent?: boolean
  ) => void
  onJoinParty: (roomId: string) => void
}

interface FeaturedTitle {
  id: string
  title: string
  type: string
  tag: string
  poster: string
  streamUrl: string
}

const CINEMA_POSTERS_ROW_1 = [
  'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg', // Dune 2
  'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg', // Stranger Things
  'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', // Interstellar
  'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', // Oppenheimer
  'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg', // Spider-Verse
  'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg', // Deadpool & Wolverine
  'https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg', // Breaking Bad
  'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg', // The Dark Knight
]

const CINEMA_POSTERS_ROW_2 = [
  'https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg', // Arcane
  'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg', // Inception
  'https://image.tmdb.org/t/p/w500/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg', // Gladiator II
  'https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg', // Game of Thrones
  'https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg', // The Batman
  'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg', // Avengers Endgame
  'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', // Pulp Fiction
  'https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg', // Spirited Away
]

const FEATURED_TITLES: FeaturedTitle[] = [
  {
    id: 'dune-2',
    title: 'Dune: Part Two',
    type: 'Movie',
    tag: 'Movie • 4K',
    poster: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    streamUrl: 'https://www.youtube.com/watch?v=Way9Dexny3w',
  },
  {
    id: 'stranger-things',
    title: 'Stranger Things',
    type: 'Series',
    tag: 'Series • Sci-Fi',
    poster: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
    streamUrl: 'https://www.youtube.com/watch?v=b9EkMc79ZSU',
  },
  {
    id: 'interstellar',
    title: 'Interstellar',
    type: 'Movie',
    tag: 'Movie • Sci-Fi',
    poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    streamUrl: 'https://www.youtube.com/watch?v=zSWdZVtXT7E',
  },
  {
    id: 'arcane',
    title: 'Arcane',
    type: 'Series',
    tag: 'Series • Animation',
    poster: 'https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg',
    streamUrl: 'https://www.youtube.com/watch?v=fXmAurh012s',
  },
  {
    id: 'oppenheimer',
    title: 'Oppenheimer',
    type: 'Movie',
    tag: 'Movie • Drama',
    poster: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    streamUrl: 'https://www.youtube.com/watch?v=uYPbbksJxIg',
  },
  {
    id: 'the-batman',
    title: 'The Batman',
    type: 'Movie',
    tag: 'Movie • Action',
    poster: 'https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg',
    streamUrl: 'https://www.youtube.com/watch?v=mqqft2x_Aa4',
  },
]

export const LandingPage: React.FC<LandingPageProps> = ({
  userName,
  user,
  onSignIn,
  onSignOut,
  onSaveName,
  onHostParty,
  onJoinParty,
}) => {
  const [name, setName] = useState<string>(userName)
  const [joinCode, setJoinCode] = useState<string>('')
  const [partyName, setPartyName] = useState<string>('')
  const [customSlug, setCustomSlug] = useState<string>('')
  const [isPermanent, setIsPermanent] = useState<boolean>(false)
  const [showAdvancedSlug, setShowAdvancedSlug] = useState<boolean>(false)
  const [liveStats, setLiveStats] = useState<LivePartyStats>({ activeRooms: 0, activeViewers: 0 })
  const [myPermanentRooms, setMyPermanentRooms] = useState<PermanentRoomSummary[]>([])
  const slugEligibility = useRoomIdEligibility(customSlug)

  useEffect(() => {
    const unsub = subscribeToActivePartyStats((stats) => {
      setLiveStats(stats)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!user?.uid) return
    let cancelled = false
    void getUserPermanentRooms(user.uid).then((rooms) => {
      if (!cancelled) setMyPermanentRooms(rooms)
    })
    return () => {
      cancelled = true
    }
  }, [user?.uid])

  const handleHost = (e: React.FormEvent) => {
    e.preventDefault()
    if (slugEligibility.status === 'invalid' || slugEligibility.status === 'checking') return
    onSaveName(name.trim() || userName)
    const sanitizedSlug = sanitizeRoomIdInput(customSlug.trim())
    onHostParty(
      undefined,
      partyName.trim() || 'My Watch Party',
      sanitizedSlug || undefined,
      undefined,
      Boolean(user && isPermanent)
    )
  }

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode.trim()) return
    onSaveName(name.trim() || userName)
    onJoinParty(joinCode.trim())
  }

  const handleQuickStartParty = useCallback(
    (item: FeaturedTitle) => {
      onSaveName(name.trim() || userName)
      const cleanSlug = item.id.toLowerCase().replace(/[^a-z0-9]/g, '')
      const randSuffix = Math.random().toString(36).substring(2, 6)
      const slug = `dpwp-${cleanSlug}-${randSuffix}`
      onHostParty(item.streamUrl, `${item.title} Watch Party`, slug, item.poster)
    },
    [name, userName, onSaveName, onHostParty]
  )

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #100b1a 0%, #0c0e17 28%, #08090c 100%)',
        color: 'var(--text-main)',
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
        position: 'relative',
      }}
    >
      <PartyLandingPopunder />
      {/* Top Navbar */}
      <nav className="landing-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img
            src="/uploads/dekho-prime-icon-header-128.webp"
            alt="Dekho Prime"
            style={{ width: '32px', height: '32px', objectFit: 'contain' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: '1.35rem',
                letterSpacing: '-0.02em',
                color: 'var(--text-main)',
              }}
            >
              Dekho<span style={{ color: 'var(--primary-red, #ea383e)' }}>Prime</span>
            </span>
            <span
              style={{
                fontSize: '0.675rem',
                fontWeight: 800,
                padding: '0.15rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(234, 56, 62, 0.18)',
                color: '#ea383e',
                border: '1px solid rgba(234, 56, 62, 0.35)',
                letterSpacing: '0.05em',
              }}
            >
              PARTY
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {user ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.3rem 0.65rem',
                borderRadius: '999px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                fontSize: '0.78rem',
              }}
            >
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }}
                />
              )}
              <span className="hide-on-xs" style={{ color: '#e2e8f0', fontWeight: 600 }}>
                {user.displayName?.split(' ')[0] || 'Signed In'}
              </span>
              {onSignOut && (
                <button
                  type="button"
                  onClick={() => void onSignOut()}
                  title="Sign out"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.1rem',
                  }}
                >
                  <LogOut size={13} />
                </button>
              )}
            </div>
          ) : (
            onSignIn && (
              <button
                type="button"
                onClick={() => void onSignIn()}
                className="btn-action"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.8rem',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                }}
              >
                <span>Sign in with Google</span>
              </button>
            )
          )}

          <a
            href="https://dekhoprime.live"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-action"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.825rem',
              textDecoration: 'none',
              color: 'var(--text-muted)',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <Tv size={15} color="#ea383e" />
            <span className="hide-on-xs">Dekho Prime Web</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero-section">
        {/* Cinema Projector Overhead Spotlight */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '-40px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: '960px',
            height: '480px',
            background:
              'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(234, 56, 62, 0.28) 0%, rgba(139, 92, 246, 0.16) 40%, transparent 75%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* Ambient Movie Theater Backdrop Wall: Visible Scrolling Rows */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: '-10% -20% 0 -20%',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            opacity: 0.32,
            filter: 'contrast(1.1) saturate(1.2)',
            pointerEvents: 'none',
            zIndex: 0,
            maskImage:
              'radial-gradient(ellipse 90% 80% at 50% 35%, rgba(0, 0, 0, 0.85) 15%, rgba(0, 0, 0, 0.3) 65%, transparent 95%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 90% 80% at 50% 35%, rgba(0, 0, 0, 0.85) 15%, rgba(0, 0, 0, 0.3) 65%, transparent 95%)',
          }}
        >
          {/* Row 1: Forward Marquee */}
          <div className="cinema-marquee-row">
            {CINEMA_POSTERS_ROW_1.concat(CINEMA_POSTERS_ROW_1).map((src, i) => (
              <div key={`row1-${i}`} className="marquee-card">
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ))}
          </div>

          {/* Row 2: Reverse Marquee */}
          <div className="cinema-marquee-row reverse">
            {CINEMA_POSTERS_ROW_2.concat(CINEMA_POSTERS_ROW_2).map((src, i) => (
              <div key={`row2-${i}`} className="marquee-card">
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Foreground Content */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Eyebrow Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 1rem',
              borderRadius: 'var(--radius-full)',
              background: liveStats.activeRooms > 0 ? 'rgba(16, 185, 129, 0.16)' : 'rgba(234, 56, 62, 0.16)',
              border: liveStats.activeRooms > 0 ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(234, 56, 62, 0.35)',
              fontSize: '0.825rem',
              color: liveStats.activeRooms > 0 ? '#a7f3d0' : '#fecaca',
              fontWeight: 600,
              marginBottom: '1.25rem',
              backdropFilter: 'blur(8px)',
              boxShadow: liveStats.activeRooms > 0 ? '0 4px 16px rgba(16, 185, 129, 0.15)' : '0 4px 16px rgba(234, 56, 62, 0.15)',
            }}
          >
            {liveStats.activeRooms > 0 ? (
              <>
                <span className="status-dot" style={{ backgroundColor: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                <span>{liveStats.activeRooms} Live {liveStats.activeRooms === 1 ? 'Party' : 'Parties'} • {liveStats.activeViewers} Watching</span>
              </>
            ) : (
              <>
                <Clapperboard size={14} color="#ea383e" />
                <span>Watch Movies & Series With Friends</span>
              </>
            )}
          </div>

          {/* Main Headline */}
          <h1
            style={{
              fontSize: 'clamp(1.85rem, 6vw, 3.8rem)',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              fontFamily: 'var(--font-display)',
              maxWidth: '860px',
              margin: '0 auto 1.25rem',
              textShadow: '0 4px 20px rgba(0, 0, 0, 0.8)',
            }}
          >
            Watch Movies Together.{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #ea383e 0%, #f43f5e 60%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Synced to the Second.
            </span>
          </h1>

          {/* Polished Subtitle */}
          <p
            style={{
              fontSize: 'clamp(0.9rem, 3.5vw, 1.15rem)',
              color: '#cbd5e1',
              maxWidth: '660px',
              margin: '0 auto 2.25rem',
              lineHeight: 1.6,
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.6)',
            }}
          >
            Stream movies, series, YouTube videos, and local files with friends. When you play, pause, or rewind, everyone stays in lockstep. Zero lag, no accounts needed.
          </p>

          {/* Quick Nickname Pill (or Signed-in Profile Badge) */}
          {user ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.55rem',
                padding: '0.45rem 1.05rem',
                background: 'rgba(15, 17, 23, 0.88)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 'var(--radius-full)',
                marginBottom: '2.25rem',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
              }}
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <User size={15} color="#ea383e" />
              )}
              <span style={{ fontSize: '0.825rem', color: 'var(--text-dim)', fontWeight: 500 }}>
                Hosting as
              </span>
              <span style={{ fontSize: '0.88rem', color: '#fff', fontWeight: 700 }}>
                {user.displayName || name}
              </span>
            </div>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1.15rem',
                background: 'rgba(15, 17, 23, 0.88)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 'var(--radius-full)',
                marginBottom: '2.5rem',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
              }}
            >
              <User size={15} color="#ea383e" />
              <span style={{ fontSize: '0.825rem', color: 'var(--text-dim)', fontWeight: 500 }}>
                Your Name:
              </span>
              <input
                type="text"
                value={name}
                maxLength={25}
                onChange={(e) => {
                  setName(e.target.value)
                  onSaveName(e.target.value)
                }}
                placeholder="Viewer Name"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  outline: 'none',
                  width: '135px',
                }}
              />
            </div>
          )}

          {/* Action Cards: Host or Join */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
              gap: '1.5rem',
              maxWidth: '860px',
              margin: '0 auto',
              textAlign: 'left',
            }}
          >
            {/* Host Party Box */}
            <form
              onSubmit={handleHost}
              style={{
                background: 'rgba(18, 21, 31, 0.82)',
                backdropFilter: 'blur(20px)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(234, 56, 62, 0.3)',
                boxShadow: '0 16px 36px rgba(0, 0, 0, 0.6), 0 0 20px rgba(234, 56, 62, 0.15)',
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1.25rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(234, 56, 62, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Play size={18} color="#ea383e" fill="#ea383e" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Host a Watch Party</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      Create a room in seconds and share your invite link.
                    </p>
                  </div>
                </div>

                <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Party Name
                    </label>
                    <input
                      type="text"
                      value={partyName}
                      maxLength={40}
                      onChange={(e) => setPartyName(e.target.value)}
                      placeholder="e.g. Dune 2 Movie Night"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(10, 12, 18, 0.85)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: 'var(--text-main)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        marginTop: '0.25rem',
                      }}
                    />
                  </div>

                  {showAdvancedSlug ? (
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Hash size={12} color="#ea383e" /> Custom Room ID (Optional)
                      </label>
                      <input
                        type="text"
                        value={customSlug}
                        maxLength={24}
                        onChange={(e) => setCustomSlug(sanitizeRoomIdInput(e.target.value))}
                        placeholder="e.g. movie-night"
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          borderRadius: 'var(--radius-md)',
                          background: 'rgba(10, 12, 18, 0.85)',
                          border:
                            slugEligibility.status === 'invalid'
                              ? '1px solid #ef4444'
                              : slugEligibility.status === 'eligible'
                              ? '1px solid #22c55e'
                              : '1px solid rgba(255, 255, 255, 0.12)',
                          color: 'var(--text-main)',
                          fontSize: '0.85rem',
                          outline: 'none',
                          marginTop: '0.25rem',
                        }}
                      />
                      {slugEligibility.status !== 'idle' && (
                        <div
                          style={{
                            fontSize: '0.72rem',
                            marginTop: '0.3rem',
                            fontWeight: 600,
                            color:
                              slugEligibility.status === 'eligible'
                                ? '#4ade80'
                                : slugEligibility.status === 'invalid'
                                ? '#f87171'
                                : 'var(--text-muted)',
                          }}
                        >
                          {slugEligibility.status === 'eligible' ? '✓ ' : ''}
                          {slugEligibility.message}
                        </div>
                      )}

                      {user ? (
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginTop: '0.55rem',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            color: isPermanent ? '#fbbf24' : 'var(--text-muted)',
                            fontWeight: 500,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isPermanent}
                            onChange={(e) => setIsPermanent(e.target.checked)}
                            style={{ accentColor: '#ea383e', cursor: 'pointer' }}
                          />
                          <span>Keep this room permanent</span>
                        </label>
                      ) : (
                        onSignIn && (
                          <button
                            type="button"
                            onClick={() => {
                              void onSignIn().then((u) => {
                                if (u) setIsPermanent(true)
                              })
                            }}
                            style={{
                              marginTop: '0.55rem',
                              background: 'rgba(251, 191, 36, 0.08)',
                              border: '1px solid rgba(251, 191, 36, 0.28)',
                              borderRadius: '6px',
                              padding: '0.4rem 0.65rem',
                              color: '#fbbf24',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <Pin size={12} />
                            <span>Sign in with Google for Permanent Room ID</span>
                          </button>
                        )
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAdvancedSlug(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ea383e',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                        padding: 0,
                      }}
                    >
                      + Set Custom Room ID
                    </button>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={slugEligibility.status === 'invalid' || slugEligibility.status === 'checking'}
                className="btn-action btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '0.85rem',
                  fontSize: '0.95rem',
                  opacity:
                    slugEligibility.status === 'invalid' || slugEligibility.status === 'checking'
                      ? 0.5
                      : 1,
                }}
              >
                <Play size={16} fill="#fff" />
                <span>Create Watch Room</span>
                <ChevronRight size={16} />
              </button>
            </form>

            {/* Join Party Box */}
            <form
              onSubmit={handleJoin}
              style={{
                background: 'rgba(18, 21, 31, 0.82)',
                backdropFilter: 'blur(20px)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                boxShadow: '0 16px 36px rgba(0, 0, 0, 0.6), 0 0 20px rgba(6, 182, 212, 0.1)',
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1.25rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(6, 182, 212, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <LogIn size={18} color="var(--accent-cyan)" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Join a Watch Party</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      Enter a room code or paste an invite link to jump in.
                    </p>
                  </div>
                </div>

                <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Room ID or Party URL
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => {
                      const val = e.target.value.trim()
                      const match = val.match(/\/room\/([^/?#]+)/)
                      if (match) {
                        setJoinCode(match[1])
                      } else {
                        setJoinCode(val)
                      }
                    }}
                    placeholder="e.g. movie-night or dpwp-123456"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(10, 12, 18, 0.85)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!joinCode.trim()}
                className="btn-action"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '0.85rem',
                  fontSize: '0.95rem',
                  background: joinCode.trim() ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  borderColor: joinCode.trim() ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                  color: joinCode.trim() ? '#fff' : 'var(--text-dim)',
                  cursor: joinCode.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                <LogIn size={16} />
                <span>Join Party Now</span>
                <ChevronRight size={16} />
              </button>
            </form>
          </div>

          {/* Signed-in User's Permanent Rooms (Right in Hero for 1-click Launch & Delete) */}
          {user && myPermanentRooms.length > 0 && (
            <div
              style={{
                marginTop: '1.5rem',
                padding: '1rem 1.15rem',
                borderRadius: 'var(--radius-lg)',
                background: 'rgba(15, 17, 25, 0.88)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(251, 191, 36, 0.25)',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Pin size={14} color="#fbbf24" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>
                    Your Permanent Rooms ({myPermanentRooms.length})
                  </span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                  Click any room to start hosting
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                {myPermanentRooms.map((rm) => (
                  <div
                    key={rm.roomId}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      borderRadius: '10px',
                      background: 'rgba(251, 191, 36, 0.08)',
                      border: '1px solid rgba(251, 191, 36, 0.3)',
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        onHostParty(rm.streamUrl, rm.title, rm.roomId, rm.posterUrl, true)
                      }
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        padding: '0.5rem 0.75rem',
                        background: 'none',
                        border: 'none',
                        color: '#fff',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Play size={12} fill="#fbbf24" color="#fbbf24" />
                      <span>{rm.title}</span>
                      <span
                        style={{
                          color: '#94a3b8',
                          fontFamily: 'monospace',
                          fontSize: '0.72rem',
                        }}
                      >
                        /{rm.roomId}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void removePermanentRoom(rm.roomId)
                        clearHostSession(rm.roomId, false)
                        setMyPermanentRooms((prev) =>
                          prev.filter((item) => item.roomId !== rm.roomId)
                        )
                      }}
                      title={`Delete permanent room /${rm.roomId}`}
                      aria-label={`Delete permanent room ${rm.roomId}`}
                      style={{
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: 'none',
                        borderLeft: '1px solid rgba(251, 191, 36, 0.2)',
                        color: '#f87171',
                        padding: '0.5rem 0.55rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Featured / Trending Movies & Shows Showcase */}
      <section
        style={{
          padding: '2.5rem 1.5rem 3.5rem',
          maxWidth: '1240px',
          margin: '0 auto',
          width: '100%',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Native Sponsored Banner */}
        <PartyNativeBanner />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Flame size={18} color="#ea383e" />
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                Popular for Watch Parties
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Pick a movie or show to launch a synchronized room instantly.
            </p>
          </div>

          <a
            href="https://dekhoprime.live"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '0.8rem',
              color: '#ea383e',
              textDecoration: 'none',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <span>Browse All Movies on Dekho Prime</span>
            <ExternalLink size={13} />
          </a>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {FEATURED_TITLES.map((item) => (
            <div
              key={item.id}
              className="cinema-card"
              onClick={() => handleQuickStartParty(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleQuickStartParty(item)
                }
              }}
              style={{
                background: 'rgba(21, 24, 34, 0.75)',
                backdropFilter: 'blur(12px)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
              }}
            >
              {/* Poster with Play Hover Overlay */}
              <div style={{ position: 'relative', aspectRatio: '2/3', overflow: 'hidden' }}>
                <img
                  src={item.poster}
                  alt={item.title}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: '0.5rem',
                    left: '0.5rem',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(10, 12, 18, 0.85)',
                    backdropFilter: 'blur(6px)',
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    zIndex: 2,
                  }}
                >
                  {item.tag}
                </span>

                {/* Netflix-style Hover Play Overlay */}
                <div
                  className="cinema-play-overlay"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(10, 12, 18, 0.95) 0%, rgba(10, 12, 18, 0.45) 55%, rgba(10, 12, 18, 0.25) 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    zIndex: 3,
                  }}
                >
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: 'var(--primary-red, #ea383e)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 18px rgba(234, 56, 62, 0.65)',
                    }}
                  >
                    <Play size={20} color="#fff" fill="#fff" style={{ marginLeft: '2px' }} />
                  </div>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      letterSpacing: '0.02em',
                    }}
                  >
                    Start Party
                  </span>
                </div>
              </div>

              {/* Title & Type */}
              <div style={{ padding: '0.75rem 0.85rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <h4
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: 'var(--text-main)',
                  }}
                >
                  {item.title}
                </h4>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{item.tag}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works & Formats Section */}
      <section
        style={{
          padding: '3.5rem 1.5rem',
          maxWidth: '1240px',
          margin: '0 auto',
          width: '100%',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              marginBottom: '0.45rem',
            }}
          >
            How Watch Party Works
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            No accounts or downloads required. Start a room and watch together in seconds.
          </p>
        </div>

        {/* 3 Practical Steps */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {/* Step 1 */}
          <div
            style={{
              background: 'rgba(21, 24, 34, 0.65)',
              backdropFilter: 'blur(12px)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(234, 56, 62, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Play size={18} color="#ea383e" fill="#ea383e" />
              </div>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'rgba(255, 255, 255, 0.12)', fontFamily: 'var(--font-display)' }}>
                01
              </span>
            </div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Choose or paste any video</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
              Pick from featured titles above, paste a YouTube link or live IPTV feed, or load a local video file from your device.
            </p>
          </div>

          {/* Step 2 */}
          <div
            style={{
              background: 'rgba(21, 24, 34, 0.65)',
              backdropFilter: 'blur(12px)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(139, 92, 246, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users size={18} color="var(--accent-purple)" />
              </div>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'rgba(255, 255, 255, 0.12)', fontFamily: 'var(--font-display)' }}>
                02
              </span>
            </div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Send your invite link</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
              Share your room URL with friends. Lock the room anytime with one click once everyone joins (supports up to 15 viewers).
            </p>
          </div>

          {/* Step 3 */}
          <div
            style={{
              background: 'rgba(21, 24, 34, 0.65)',
              backdropFilter: 'blur(12px)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(251, 191, 36, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Smile size={18} color="#fbbf24" />
              </div>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'rgba(255, 255, 255, 0.12)', fontFamily: 'var(--font-display)' }}>
                03
              </span>
            </div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Watch and react together</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
              Playback stays in sync automatically. Send 30s voice notes, share images, and drop live reactions without buffering drift.
            </p>
          </div>
        </div>

        {/* Supported Media & Privacy Pills Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '0.65rem',
            marginTop: '2.5rem',
          }}
        >
          <span className="format-pill">
            <Radio size={14} color="#ea383e" />
            <span>Live IPTV & HLS</span>
          </span>
          <span className="format-pill">
            <Play size={14} color="#ea383e" />
            <span>YouTube Sync</span>
          </span>
          <span className="format-pill">
            <Film size={14} color="#a78bfa" />
            <span>MP4 & WebM</span>
          </span>
          <span className="format-pill">
            <span>🎙️</span>
            <span>30s Voice Notes</span>
          </span>
          <span className="format-pill">
            <Lock size={13} color="#fbbf24" />
            <span>1-Tap Room Lock</span>
          </span>
          <span className="format-pill">
            <Users size={14} color="#34d399" />
            <span>Up to 15 Viewers</span>
          </span>
          <span className="format-pill">
            <ShieldCheck size={14} color="#60a5fa" />
            <span>No Accounts Needed</span>
          </span>
        </div>
      </section>

      {/* Dekho Prime Catalog Banner */}
      <section
        style={{
          padding: '2rem 1.5rem 4rem',
          maxWidth: '1240px',
          margin: '0 auto',
          width: '100%',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(234, 56, 62, 0.18) 0%, rgba(139, 92, 246, 0.18) 100%)',
            border: '1px solid rgba(234, 56, 62, 0.35)',
            borderRadius: 'var(--radius-lg)',
            padding: '2.5rem 2rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem',
          }}
        >
          <div style={{ maxWidth: '640px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Connected to Dekho Prime
            </span>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.35rem' }}>
              Stream from the Dekho Prime Catalog
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: 1.5 }}>
              Browse movies, TV series, anime, and live cricket matches on Dekho Prime, and start a watch party on any stream with one click.
            </p>
          </div>

          <a
            href="https://dekhoprime.live"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-action btn-primary"
            style={{
              padding: '0.85rem 1.5rem',
              fontSize: '0.95rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
            }}
          >
            <span>Explore Dekho Prime Catalog</span>
            <ExternalLink size={16} />
          </a>
        </div>
      </section>

      {/* Compact Footer */}
      <footer
        style={{
          marginTop: 'auto',
          padding: '1.15rem 1.5rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '0.78rem',
          color: 'var(--text-dim)',
          background: 'rgba(10, 12, 18, 0.95)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <img
              src="/uploads/dekho-prime-icon-header-128.webp"
              alt="Dekho Prime"
              style={{ width: '16px', height: '16px', objectFit: 'contain' }}
            />
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>DekhoPrime Party</span>
            <span>•</span>
            <span>
              <a href="https://dekhoprime.live" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
                Dekho Prime
              </a>{' '}
              © {new Date().getFullYear()}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Free forever • Ads cover domain &amp; hosting
            </span>
            <a
              href="https://beta.publishers.adsterra.com/referral/1XU1UuDLQw"
              target="_blank"
              rel="nofollow noopener noreferrer"
              style={{
                display: 'inline-block',
                borderRadius: '4px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                flexShrink: 0,
              }}
            >
              <img
                alt="Adsterra"
                src="https://landings-cdn.adsterratech.com/referralBanners/gif/120x60_adsterra_reff.gif"
                width={96}
                height={48}
                style={{ display: 'block', objectFit: 'cover' }}
              />
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
