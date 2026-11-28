import React, { useEffect, useMemo, useState } from 'react'
import type { ChatMessage } from '@/types/party.types'

interface TheaterChatToastsProps {
  messages: ChatMessage[]
}

const TOAST_TTL_MS = 4500

export const TheaterChatToasts: React.FC<TheaterChatToastsProps> = ({ messages }) => {
  const [baselineCount] = useState<number>(() => messages.length)
  const [expiredIds, setExpiredIds] = useState<Set<string>>(() => new Set())

  const visibleToasts = useMemo(
    () =>
      messages
        .slice(baselineCount)
        .filter((m) => !m.isSystem && !expiredIds.has(m.id) && (m.text || m.audioUrl || m.imageUrl))
        .slice(-3),
    [messages, baselineCount, expiredIds]
  )

  useEffect(() => {
    if (visibleToasts.length === 0) return

    const timers = visibleToasts.map((msg) =>
      window.setTimeout(() => {
        setExpiredIds((prev) => {
          if (prev.has(msg.id)) return prev
          const next = new Set(prev)
          next.add(msg.id)
          return next
        })
      }, TOAST_TTL_MS)
    )

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer)
      }
    }
  }, [visibleToasts])

  if (visibleToasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      style={{
        position: 'absolute',
        bottom: '5.5rem',
        left: '1rem',
        zIndex: 26,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        maxWidth: 'min(320px, 75vw)',
        pointerEvents: 'none',
      }}
    >
      {visibleToasts.map((m) => {
        const preview = m.text
          ? m.text
          : m.audioUrl
          ? '🎙️ Voice note'
          : '📷 Photo / GIF'
        return (
          <div
            key={m.id}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '10px',
              background: 'rgba(10, 12, 18, 0.78)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.45)',
              fontSize: '0.78rem',
              color: '#f8fafc',
              lineHeight: 1.35,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            <span
              style={{
                fontWeight: 700,
                color: m.isHost ? '#fda4af' : '#f472b6',
                marginRight: '0.35rem',
              }}
            >
              {m.senderName}:
            </span>
            <span>{preview}</span>
          </div>
        )
      })}
    </div>
  )
}
