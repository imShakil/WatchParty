import React, { useState, useRef, useEffect } from 'react'
import {
  Send,
  Users,
  MessageSquare,
  Shield,
  Smile,
  ToggleLeft,
  ToggleRight,
  Image as ImageIcon,
  X,
  Mic,
  Lock,
  Unlock,
  KeyRound,
  Pin,
  Minus,
  Plus,
} from 'lucide-react'
import type { ChatMessage, Participant } from '@/types/party.types'
import { MediaAttachmentModal } from './MediaAttachmentModal'
import { VoiceNotePlayer } from './VoiceNotePlayer'
import { VoiceRecorder } from './VoiceRecorder'

interface PartyChatProps {
  messages: ChatMessage[]
  participants: Participant[]
  typingUsers?: string[]
  isHost: boolean
  isHostOnlyControl: boolean
  onToggleControlMode: () => void
  isRoomLocked?: boolean
  onToggleRoomLock?: () => void
  roomPasscode?: string
  onUpdateRoomPasscode?: (code: string) => void
  isPermanent?: boolean
  onTogglePermanent?: () => void
  maxCapacity?: number
  onUpdateMaxCapacity?: (cap: number) => void
  onSendMessage: (text: string, imageUrl?: string, audioUrl?: string, audioDuration?: number) => void
  onSendTypingStatus?: (isTyping: boolean) => void
  onTriggerReaction: (emoji: string) => void
}

const REACTION_EMOJIS = ['❤️', '😂', '😭', '😱', '🍿', '🔥', '😮', '👏', '🎉', '👻']

const CHAT_INPUT_EMOJIS = [
  '😀', '😂', '🤣', '😍', '🥰', '😎', '🥳', '🥺', '😭', '😱',
  '🤯', '🔥', '🍿', '🎬', '👏', '👍', '🙌', '🎉', '👻', '💯',
  '❤️', '💔', '👀', '✨', '🙏', '😜', '🤔', '💀', '😴', '💪',
]

export const PartyChat: React.FC<PartyChatProps> = ({
  messages,
  participants,
  typingUsers = [],
  isHost,
  isHostOnlyControl,
  onToggleControlMode,
  isRoomLocked = false,
  onToggleRoomLock,
  roomPasscode = '',
  onUpdateRoomPasscode,
  isPermanent = false,
  onTogglePermanent,
  maxCapacity = 10,
  onUpdateMaxCapacity,
  onSendMessage,
  onSendTypingStatus,
  onTriggerReaction,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'people'>('chat')
  const [inputText, setInputText] = useState<string>('')
  const [isMediaModalOpen, setIsMediaModalOpen] = useState<boolean>(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [isVoiceRecording, setIsVoiceRecording] = useState<boolean>(false)
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState<boolean>(false)
  const [passcodeDraft, setPasscodeDraft] = useState<string>(roomPasscode || '')
  const [isEditingPasscode, setIsEditingPasscode] = useState<boolean>(false)
  const emojiPickerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(-1 as unknown as ReturnType<typeof setTimeout>)

  // Close emoji picker on outside click or escape
  useEffect(() => {
    if (!isEmojiPickerOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setIsEmojiPickerOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEmojiPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isEmojiPickerOpen])

  const handleInsertEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji)
    inputRef.current?.focus()
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputText(val)

    if (onSendTypingStatus) {
      onSendTypingStatus(true)
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        onSendTypingStatus(false)
      }, 2500)
    }
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return
    clearTimeout(typingTimeoutRef.current)
    onSendTypingStatus?.(false)
    onSendMessage(inputText)
    setInputText('')
  }

  const handleSendMedia = (imageUrl: string, caption?: string) => {
    clearTimeout(typingTimeoutRef.current)
    onSendTypingStatus?.(false)
    onSendMessage(caption || '', imageUrl)
  }

  const handleSendVoice = (audioUrl: string, duration: number) => {
    clearTimeout(typingTimeoutRef.current)
    onSendTypingStatus?.(false)
    onSendMessage('', undefined, audioUrl, duration)
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
            gap: '0.45rem',
            transition: 'color 0.2s',
          }}
        >
          <Users size={16} />
          <span>People ({participants.length}/{maxCapacity})</span>
          {isRoomLocked && (
            <span title="Room Locked" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <Lock size={12} color="#f87171" />
            </span>
          )}
          {Boolean(roomPasscode) && (
            <span title={`Passcode Protected ("${roomPasscode}")`} style={{ display: 'inline-flex', alignItems: 'center' }}>
              <KeyRound size={12} color="#c084fc" />
            </span>
          )}
          {isPermanent && (
            <span title="Permanent Room" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <Pin size={12} color="#fbbf24" />
            </span>
          )}
        </button>
      </div>

      {/* People Tab Content */}
      {activeTab === 'people' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Host Controls Section */}
          {isHost && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {/* Host Only Controls Toggle */}
              <div
                style={{
                  padding: '0.75rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(139, 92, 246, 0.08)',
                  border: '1px solid rgba(139, 92, 246, 0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Host Only Controls
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                    {isHostOnlyControl ? 'Only host controls playback' : 'Anyone can control video'}
                  </div>
                </div>
                <button
                  onClick={onToggleControlMode}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-purple)', padding: '0.2rem' }}
                  title="Toggle host only control"
                >
                  {isHostOnlyControl ? <ToggleRight size={26} /> : <ToggleLeft size={26} color="var(--text-dim)" />}
                </button>
              </div>

              {/* 1-Tap Lock Room Toggle */}
              <div
                style={{
                  padding: '0.75rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: isRoomLocked ? 'rgba(234, 56, 62, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                  border: isRoomLocked ? '1px solid rgba(234, 56, 62, 0.35)' : '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '8px',
                      background: isRoomLocked ? 'rgba(234, 56, 62, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isRoomLocked ? '#ff6b6b' : 'var(--text-dim)',
                    }}
                  >
                    {isRoomLocked ? <Lock size={15} /> : <Unlock size={15} />}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: isRoomLocked ? '#ff6b6b' : 'var(--text-main)' }}>
                      Lock Room {isRoomLocked ? '(Locked)' : ''}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      {isRoomLocked ? 'Prevent new guests from joining' : 'Anyone with link can join'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onToggleRoomLock}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: isRoomLocked ? '#ff6b6b' : 'var(--text-dim)',
                    padding: '0.2rem',
                  }}
                  title={isRoomLocked ? 'Unlock Room' : 'Lock Room'}
                  aria-label={isRoomLocked ? 'Unlock Room' : 'Lock Room'}
                >
                  {isRoomLocked ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                </button>
              </div>

              {/* Room Passcode / PIN Protection */}
              <div
                style={{
                  padding: '0.75rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: roomPasscode ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                  border: roomPasscode ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '8px',
                        background: roomPasscode ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: roomPasscode ? '#c084fc' : 'var(--text-dim)',
                      }}
                    >
                      <KeyRound size={15} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: roomPasscode ? '#c084fc' : 'var(--text-main)' }}>
                        Passcode Protection {roomPasscode ? `("${roomPasscode}")` : ''}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                        {roomPasscode
                          ? 'Guests must enter this passcode to join'
                          : 'Optional PIN or password to lock room'}
                      </div>
                    </div>
                  </div>

                  {!isEditingPasscode && (
                    <button
                      type="button"
                      onClick={() => {
                        setPasscodeDraft(roomPasscode || '')
                        setIsEditingPasscode(true)
                      }}
                      style={{
                        background: roomPasscode ? 'rgba(168, 85, 247, 0.18)' : 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid ' + (roomPasscode ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255, 255, 255, 0.15)'),
                        color: roomPasscode ? '#e9d5ff' : 'var(--text-main)',
                        borderRadius: '6px',
                        padding: '0.3rem 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {roomPasscode ? 'Change PIN' : 'Set PIN'}
                    </button>
                  )}
                </div>

                {isEditingPasscode && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      onUpdateRoomPasscode?.(passcodeDraft.trim())
                      setIsEditingPasscode(false)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      marginTop: '0.2rem',
                    }}
                  >
                    <input
                      type="text"
                      value={passcodeDraft}
                      maxLength={20}
                      onChange={(e) => setPasscodeDraft(e.target.value)}
                      placeholder="e.g. 1234 or cinema"
                      autoFocus
                      style={{
                        flex: 1,
                        padding: '0.45rem 0.75rem',
                        borderRadius: '6px',
                        background: 'rgba(0, 0, 0, 0.35)',
                        border: '1px solid rgba(168, 85, 247, 0.5)',
                        color: '#ffffff',
                        fontSize: '0.85rem',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        padding: '0.45rem 0.75rem',
                        borderRadius: '6px',
                        background: '#7c3aed',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Save
                    </button>
                    {roomPasscode && (
                      <button
                        type="button"
                        onClick={() => {
                          setPasscodeDraft('')
                          onUpdateRoomPasscode?.('')
                          setIsEditingPasscode(false)
                        }}
                        style={{
                          padding: '0.45rem 0.65rem',
                          borderRadius: '6px',
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                          color: '#f87171',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Remove
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setPasscodeDraft(roomPasscode || '')
                        setIsEditingPasscode(false)
                      }}
                      style={{
                        padding: '0.45rem 0.55rem',
                        borderRadius: '6px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-dim)',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </form>
                )}
              </div>

              {/* Permanent Room Toggle */}
              <div
                style={{
                  padding: '0.75rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: isPermanent ? 'rgba(251, 191, 36, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                  border: isPermanent ? '1px solid rgba(251, 191, 36, 0.35)' : '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '8px',
                      background: isPermanent ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isPermanent ? '#fbbf24' : 'var(--text-dim)',
                    }}
                  >
                    <Pin size={15} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: isPermanent ? '#fbbf24' : 'var(--text-main)' }}>
                      Permanent Room {isPermanent ? '(Active)' : ''}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      {isPermanent ? 'Link & settings saved indefinitely' : 'Auto-closes when host leaves'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onTogglePermanent}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: isPermanent ? '#fbbf24' : 'var(--text-dim)',
                    padding: '0.2rem',
                  }}
                  title={isPermanent ? 'Switch to Temporary Room' : 'Make Room Permanent'}
                  aria-label={isPermanent ? 'Switch to Temporary Room' : 'Make Room Permanent'}
                >
                  {isPermanent ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                </button>
              </div>

              {/* Room Capacity Stepper (Default 10, Max 15) */}
              <div
                style={{
                  padding: '0.75rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Room Capacity Limit
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                    Default 10, Max 15 ({participants.length}/{maxCapacity} joined)
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <button
                    type="button"
                    disabled={maxCapacity <= Math.max(2, participants.length)}
                    onClick={() => onUpdateMaxCapacity?.(maxCapacity - 1)}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      background: 'rgba(255, 255, 255, 0.06)',
                      color: maxCapacity <= Math.max(2, participants.length) ? 'rgba(255, 255, 255, 0.2)' : '#fff',
                      cursor: maxCapacity <= Math.max(2, participants.length) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Decrease capacity"
                  >
                    <Minus size={13} />
                  </button>

                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: 'var(--text-main)',
                      minWidth: '22px',
                      textAlign: 'center',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {maxCapacity}
                  </span>

                  <button
                    type="button"
                    disabled={maxCapacity >= 15}
                    onClick={() => onUpdateMaxCapacity?.(maxCapacity + 1)}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      background: 'rgba(255, 255, 255, 0.06)',
                      color: maxCapacity >= 15 ? 'rgba(255, 255, 255, 0.2)' : '#fff',
                      cursor: maxCapacity >= 15 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Increase capacity (max 15)"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Guest Locked Banner */}
          {!isHost && isRoomLocked && (
            <div
              style={{
                padding: '0.6rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(234, 56, 62, 0.12)',
                border: '1px solid rgba(234, 56, 62, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#ff6b6b',
                fontSize: '0.78rem',
                fontWeight: 600,
              }}
            >
              <Lock size={14} />
              <span>Private Party: Room locked by host</span>
            </div>
          )}

          {/* Participants list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)' }}>
              In This Room ({participants.length}/{maxCapacity})
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
                      padding: m.text ? '0.6rem 0.85rem' : '0.25rem',
                      borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      background: isMe ? 'var(--accent-purple)' : 'var(--bg-surface)',
                      color: '#fff',
                      fontSize: '0.85rem',
                      border: isMe ? 'none' : '1px solid var(--border-subtle)',
                      wordBreak: 'break-word',
                      lineHeight: 1.4,
                    }}
                  >
                    {m.imageUrl && (
                      <div
                        style={{
                          marginBottom: m.text ? '0.45rem' : '0',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          background: '#090b10',
                          maxWidth: '220px',
                          maxHeight: '140px',
                          position: 'relative',
                        }}
                      >
                        <img
                          src={m.imageUrl}
                          alt="Attachment"
                          loading="lazy"
                          onClick={() => setLightboxImage(m.imageUrl || null)}
                          style={{
                            width: '100%',
                            height: '140px',
                            borderRadius: '8px',
                            objectFit: 'cover',
                            cursor: 'pointer',
                            display: 'block',
                          }}
                        />
                      </div>
                    )}
                    {m.audioUrl && (
                      <div style={{ marginBottom: m.text ? '0.35rem' : '0' }}>
                        <VoiceNotePlayer
                          audioUrl={m.audioUrl}
                          duration={m.audioDuration}
                          isSenderMe={isMe}
                        />
                      </div>
                    )}
                    {m.text && <div>{m.text}</div>}
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing Indicator Bar */}
          {typingUsers.length > 0 && (
            <div
              style={{
                padding: '0.35rem 0.85rem',
                fontSize: '0.75rem',
                color: 'var(--text-dim)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: 'rgba(0, 0, 0, 0.35)',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <span className="typing-dots">
                <span />
                <span />
                <span />
              </span>
              <span>
                {typingUsers.length === 1
                  ? `${typingUsers[0]} is typing...`
                  : typingUsers.length === 2
                  ? `${typingUsers[0]} and ${typingUsers[1]} are typing...`
                  : `${typingUsers[0]} and ${typingUsers.length - 1} others are typing...`}
              </span>
            </div>
          )}

          {/* Quick Emoji Reactions Tray */}
          <div
            style={{
              padding: '0.4rem 0.6rem',
              background: 'rgba(0, 0, 0, 0.3)',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
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
                  padding: '0.3rem',
                  borderRadius: '6px',
                  transition: 'transform 0.15s ease',
                  touchAction: 'manipulation',
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
          <div
            className="chat-input-form"
            style={{
              padding: '0.65rem 0.85rem',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-main)',
              position: 'relative',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            {isVoiceRecording ? (
              <VoiceRecorder
                autoStart={true}
                onSendVoice={handleSendVoice}
                onCancel={() => setIsVoiceRecording(false)}
              />
            ) : (
              <form
                onSubmit={handleSend}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '24px',
                  padding: '0.2rem 0.35rem 0.2rem 0.65rem',
                  boxSizing: 'border-box',
                  position: 'relative',
                }}
              >
                {/* Left: Image / GIF attachment button */}
                <button
                  type="button"
                  onClick={() => setIsMediaModalOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    padding: '0.35rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    transition: 'color 0.15s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
                  title="Share Photo or GIF"
                  aria-label="Share Photo or GIF"
                >
                  <ImageIcon size={18} />
                </button>

                {/* Center: Text Input Field */}
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  placeholder="Say something to the room..."
                  className="chat-input-field"
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-main)',
                    padding: '0.45rem 0.4rem',
                    minWidth: 0,
                    fontSize: '15px',
                  }}
                />

                {/* Right: Emoji Picker Button & Popover */}
                <div style={{ position: 'relative' }} ref={emojiPickerRef}>
                  <button
                    type="button"
                    onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: isEmojiPickerOpen ? 'var(--accent-purple)' : 'var(--text-dim)',
                      padding: '0.35rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      transition: 'color 0.15s',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      if (!isEmojiPickerOpen) e.currentTarget.style.color = '#fff'
                    }}
                    onMouseLeave={(e) => {
                      if (!isEmojiPickerOpen) e.currentTarget.style.color = 'var(--text-dim)'
                    }}
                    title="Insert emoji"
                    aria-label="Insert emoji"
                    aria-expanded={isEmojiPickerOpen}
                  >
                    <Smile size={18} />
                  </button>

                  {/* Emoji Popover */}
                  {isEmojiPickerOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 0.65rem)',
                        right: 0,
                        zIndex: 130,
                        background: 'rgba(18, 21, 31, 0.96)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '16px',
                        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.7), 0 0 15px rgba(139, 92, 246, 0.15)',
                        padding: '0.6rem',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(6, 1fr)',
                        gap: '0.35rem',
                        width: '240px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                      }}
                    >
                      {CHAT_INPUT_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleInsertEmoji(emoji)}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.25rem',
                            padding: '0.3rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.15s, transform 0.1s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                            e.currentTarget.style.transform = 'scale(1.2)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'none'
                            e.currentTarget.style.transform = 'scale(1)'
                          }}
                          title={emoji}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Rightmost Action: Send when typing, Mic when empty */}
                {inputText.trim() ? (
                  <button
                    type="submit"
                    style={{
                      background: 'var(--accent-purple)',
                      border: 'none',
                      color: '#fff',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                      boxShadow: '0 2px 8px rgba(139, 92, 246, 0.4)',
                      transition: 'transform 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    title="Send message"
                    aria-label="Send message"
                  >
                    <Send size={15} style={{ marginLeft: '1px' }} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsVoiceRecording(true)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: 'none',
                      color: '#fbbf24',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(251, 191, 36, 0.18)'
                      e.currentTarget.style.transform = 'scale(1.06)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                      e.currentTarget.style.transform = 'scale(1)'
                    }}
                    title="Record 30s Voice Note (1-tap)"
                    aria-label="Record voice note"
                  >
                    <Mic size={17} />
                  </button>
                )}
              </form>
            )}
          </div>

          {/* Media Attachment Modal (GIFs & Images) */}
          <MediaAttachmentModal
            isOpen={isMediaModalOpen}
            onClose={() => setIsMediaModalOpen(false)}
            onSendMedia={handleSendMedia}
          />

          {/* Lightbox / Zoom Modal */}
          {lightboxImage && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 300,
                background: 'rgba(0, 0, 0, 0.9)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.5rem',
              }}
              onClick={() => setLightboxImage(null)}
            >
              <button
                onClick={() => setLightboxImage(null)}
                style={{
                  position: 'absolute',
                  top: '1.5rem',
                  right: '1.5rem',
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={20} />
              </button>
              <img
                src={lightboxImage}
                alt="Enlarged"
                style={{
                  maxWidth: '90vw',
                  maxHeight: '85vh',
                  objectFit: 'contain',
                  borderRadius: 'var(--radius-lg, 12px)',
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9)',
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </>
      )}
    </aside>
  )
}
