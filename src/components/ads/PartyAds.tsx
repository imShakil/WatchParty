import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'

const NATIVE_KEY = '331fe37cf5e60232243441a554ac6cc0'
const NATIVE_SRC = `https://bancadeltempoidea.org/21/${NATIVE_KEY}`
const SOCIAL_BAR_SRC = 'https://bancadeltempoidea.org/14/e707056cd692c37917bf36a5c7566e9f'
const POPUNDER_SRC = 'https://aarems.org/1/1480ae7f4985b28644f98baf916d0471'
const BANNER_KEY = '773d4c36364712df44a7948a59a573e2'
const BANNER_SRC = `https://bancadeltempoidea.org/22/${BANNER_KEY}`

export const SMARTLINK_URL = 'https://directyp.org/4/aeb051115f4be77122a44707db1760a1'

const CORNER_AD_DURATION_SEC = 15
const CORNER_AD_INITIAL_DELAY_MS = 8000
const CORNER_AD_REPEAT_MS = 12 * 60 * 1000

function buildBannerSrcDoc(): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background: transparent;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    </style>
  </head>
  <body>
    <script>
      atOptions = {
        'key': '${BANNER_KEY}',
        'format': 'iframe',
        'height': 50,
        'width': 320,
        'params': {}
      };
    </script>
    <script data-cfasync="false" src="${BANNER_SRC}"></script>
  </body>
</html>`
}

/**
 * Loads Adsterra Social Bar globally once per session.
 */
export const PartySocialBar: React.FC = () => {
  useEffect(() => {
    const existing = document.querySelector(`script[src="${SOCIAL_BAR_SRC}"]`)
    if (existing) return

    const script = document.createElement('script')
    script.src = SOCIAL_BAR_SRC
    script.async = true
    script.setAttribute('data-cfasync', 'false')
    document.body.appendChild(script)
  }, [])

  return null
}

/**
 * Loads Adsterra Popunder ONLY on the Landing Page (never inside active Watch Party rooms).
 */
export const PartyLandingPopunder: React.FC = () => {
  useEffect(() => {
    const existing = document.querySelector(`script[src="${POPUNDER_SRC}"]`)
    if (existing) return

    const script = document.createElement('script')
    script.src = POPUNDER_SRC
    script.async = true
    script.setAttribute('data-cfasync', 'false')
    document.body.appendChild(script)

    return () => {
      script.remove()
    }
  }, [])

  return null
}

/**
 * Renders Adsterra Native Banner on the Landing Page.
 */
export const PartyNativeBanner: React.FC = () => {
  useEffect(() => {
    const existing = document.querySelector(`script[src="${NATIVE_SRC}"]`)
    if (existing) return

    const script = document.createElement('script')
    script.src = NATIVE_SRC
    script.async = true
    script.setAttribute('fetchpriority', 'high')
    script.setAttribute('data-cfasync', 'false')
    document.body.appendChild(script)
  }, [])

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1160px',
        margin: '0 auto 2rem',
        padding: '0.75rem 1rem',
        borderRadius: 'var(--radius-lg, 14px)',
        background: 'rgba(255, 255, 255, 0.025)',
        border: '1px solid rgba(255, 255, 255, 0.07)',
      }}
    >
      <div
        style={{
          fontSize: '0.65rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-dim, #64748b)',
          marginBottom: '0.45rem',
        }}
      >
        Sponsored
      </div>
      <div id={`container-${NATIVE_KEY}`} />
    </div>
  )
}

/**
 * Non-intrusive 320x50 timed corner overlay inside the Watch Party player.
 * Shows for 15 seconds (enough for Adsterra impression tracking), then auto-hides.
 */
export const PartyPlayerCornerAd: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const [visible, setVisible] = useState<boolean>(false)
  const [secondsLeft, setSecondsLeft] = useState<number>(CORNER_AD_DURATION_SEC)
  const [cycle, setCycle] = useState<number>(0)

  useEffect(() => {
    if (!isActive) return

    const showCycle = () => {
      setSecondsLeft(CORNER_AD_DURATION_SEC)
      setCycle((c) => c + 1)
      setVisible(true)
    }

    const initialTimer = setTimeout(showCycle, CORNER_AD_INITIAL_DELAY_MS)
    const repeatTimer = setInterval(showCycle, CORNER_AD_REPEAT_MS)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(repeatTimer)
    }
  }, [isActive])

  useEffect(() => {
    if (!visible) return

    const countdown = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setVisible(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(countdown)
  }, [visible])

  if (!isActive || !visible) return null

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '1rem',
        left: '1rem',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        padding: '0.35rem',
        borderRadius: '10px',
        background: 'rgba(10, 12, 18, 0.9)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.65)',
        maxWidth: 'calc(100% - 2rem)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 0.25rem',
          fontSize: '0.65rem',
          color: '#94a3b8',
          fontWeight: 600,
        }}
      >
        <span>Ad • {secondsLeft}s</span>
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Close ad"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '4px',
            color: '#cbd5e1',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.15rem',
          }}
        >
          <X size={11} />
        </button>
      </div>
      <iframe
        key={cycle}
        title="Sponsored Banner"
        srcDoc={buildBannerSrcDoc()}
        width={320}
        height={50}
        scrolling="no"
        style={{
          border: 'none',
          display: 'block',
          borderRadius: '6px',
          width: '320px',
          maxWidth: '100%',
          height: '50px',
        }}
      />
    </div>
  )
}

