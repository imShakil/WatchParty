import React, { useState, useRef, useEffect } from 'react'
import { Send, Users, MessageSquare, Shield, Smile, ToggleLeft, ToggleRight } from 'lucide-react'
import type { ChatMessage, Participant } from '@/types/party.types'

interface PartyChatProps {
  messages: ChatMessage[]
  participants: Participant[]
  isHost: boolean
  isHostOnlyControl: boolean
  onToggleControlMode: () => void
  onSendMessage: (text: string) => void
  onTriggerReaction: (emoji: string) => void
}

const REACTION_EMOJIS = ['❤️', '😂', '🍿', '🔥', '😮', '👏', '🎉']

export const PartyChat: React.FC<PartyChatProps> = ({
  messages,
  participants,
  isHost,
  isHostOnlyControl,
  onToggleControlMode,
  onSendMessage,
  onTriggerReaction,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'people'>('chat')
  const [inputText, setInputText] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return
    onSendMessage(inputText)
    setInputText('')
  }

  return (
    <aside className="chat-section">
      {/* Tab Switcher */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(0, 0, 0, 0.2)',
        }}
      >
        <button
          onClick={() => setActiveTab('chat')}
          style={{
            flex: 1,
            padding: '0.85rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'chat' ? '2px solid var(--accent-purple)' : '2px solid transparent',
            color: activeTab === 'chat' ? 'var(--text-main)' : 'var(--text-dim)',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'color 0.2s',
          }}
        >
          <MessageSquare size={16} />
          <span>Chat</span>
        </button>

        <button
          onClick={() => setActiveTab('people')}
          style={{
            flex: 1,
            padding: '0.85rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'people' ? '2px solid var(--accent-purple)' : '2px solid transparent',
            color: activeTab === 'people' ? 'var(--text-main)' : 'var(--text-dim)',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'color 0.2s',
          }}
        >
          <Users size={16} />
          <span>People ({participants.length})</span>
        </button>
      </div>

      {/* People Tab Content */}
      {activeTab === 'people' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Host Controls Permission Box */}
          {isHost && (
            <div
              style={{
                padding: '0.85rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Host Only Controls
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  {isHostOnlyControl ? 'Only you can play, pause & seek' : 'All participants can control video'}
                </div>
              </div>
              <button
                onClick={onToggleControlMode}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-purple)' }}
              >
                {isHostOnlyControl ? <ToggleRight size={28} /> : <ToggleLeft size={28} color="var(--text-dim)" />}
              </button>
            </div>
          )}

          {/* Participants list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)' }}>
              In This Room ({participants.length})
            </span>
            {participants.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.8rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: p.isHost ? 'var(--accent-purple)' : '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#fff',
                    }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-main)' }}>
                    {p.name} {p.isSelf && <span style={{ color: 'var(--text-dim)' }}>(You)</span>}
                  </span>
                </div>

                {p.isHost && (
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#a78bfa',
                      background: 'rgba(139, 92, 246, 0.15)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    <Shield size={10} /> Host
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat Tab Content */}
      {activeTab === 'chat' && (
        <>
          {/* Messages list */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            {messages.length === 0 && (
              <div
                style={{
                  margin: 'auto',
                  textAlign: 'center',
                  color: 'var(--text-dim)',
                  fontSize: '0.85rem',
                  padding: '1.5rem',
                }}
              >
                <Smile size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                <p>Welcome to the party!</p>
                <p style={{ fontSize: '0.75rem' }}>Send a message or drop an emoji reaction.</p>
              </div>
            )}

            {messages.map((m) => {
              if (m.isSystem) {
                return (
                  <div
                    key={m.id}
                    style={{
                      textAlign: 'center',
                      fontSize: '0.725rem',
                      color: 'var(--text-dim)',
                      padding: '0.25rem 0.5rem',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: 'var(--radius-full)',
                      margin: '0.25rem auto',
                    }}
                  >
                    {m.text}
                  </div>
                )
              }

              const isMe = m.senderId === 'me' || m.senderName.includes('(You)')

              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      marginBottom: '0.15rem',
                      paddingLeft: isMe ? '0' : '0.25rem',
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isMe ? 'var(--accent-purple)' : 'var(--text-muted)' }}>
                      {m.senderName}
                    </span>
                    {m.isHost && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          padding: '0 0.3rem',
                          borderRadius: '4px',
                          background: 'rgba(139, 92, 246, 0.2)',
                          color: '#c4b5fd',
                        }}
                      >
                        Host
                      </span>
                    )}
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    style={{
                      padding: '0.6rem 0.85rem',
                      borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      background: isMe ? 'var(--accent-purple)' : 'var(--bg-surface)',
                      color: '#fff',
                      fontSize: '0.85rem',
                      border: isMe ? 'none' : '1px solid var(--border-subtle)',
                      wordBreak: 'break-word',
                      lineHeight: 1.4,
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Emoji Reactions Tray */}
          <div
            style={{
              padding: '0.5rem 0.8rem',
              background: 'rgba(0, 0, 0, 0.3)',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onTriggerReaction(emoji)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  padding: '0.2rem',
                  borderRadius: '6px',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.25)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                title={`Send ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Message Input Form */}
          <form
            onSubmit={handleSend}
            style={{
              padding: '0.75rem 1rem',
              background: 'var(--bg-secondary)',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              gap: '0.5rem',
            }}
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Say something to the room..."
              style={{
                flex: 1,
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="btn-action btn-primary"
              style={{ padding: '0.65rem 0.85rem', opacity: inputText.trim() ? 1 : 0.5 }}
            >
              <Send size={15} />
            </button>
          </form>
        </>
      )}
    </aside>
  )
}
