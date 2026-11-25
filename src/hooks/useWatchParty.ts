import { useState, useEffect, useRef, useCallback } from 'react'
import confetti from 'canvas-confetti'
import { peerService } from '@/services/peerService'
import { parseMediaUrl } from '@/utils/mediaUrl'
import { parseCurrentRoute } from '@/utils/routeUtils'
import {
  saveHostSession,
  clearHostSession,
  saveRoomChat,
  getRoomChat,
} from '@/utils/sessionUtils'
import {
  logPartyEvent,
  registerPartyRoom,
  updatePartyRoomParticipantCount,
  updatePartyRoomHeartbeat,
  updatePartyRoomPermanent,
  checkPartyRoomStatus,
  endPartyRoom,
} from '@/services/firebaseService'
import type { UnifiedPlayerRef } from '@/types/player.types'
import type {
  ChatMessage,
  ReactionItem,
  Participant,
  RoomMetadata,
  PartyPacket,
  SyncPayload,
  ControlPayload,
  JoinRejectedPayload,
} from '@/types/party.types'

const DRIFT_TOLERANCE_SECONDS = 1.8
const SYNC_HEARTBEAT_INTERVAL_MS = 3000

export function useWatchParty() {
  const [connectionStatus, setConnectionStatus] = useState<
    'disconnected' | 'connecting' | 'connected' | 'error'
  >('disconnected')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isRoomExpired, setIsRoomExpired] = useState<boolean>(false)
  const [isRoomStandby, setIsRoomStandby] = useState<boolean>(false)
  const [roomExpiredReason, setRoomExpiredReason] = useState<string>('')
  const [isHostReconnecting, setIsHostReconnecting] = useState<boolean>(false)
  const [hostReconnectCountdown, setHostReconnectCountdown] = useState<number>(35)

  const isHostReconnectingRef = useRef<boolean>(false)
  const hostReconnectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isIntentionalExit = useRef<boolean>(false)

  useEffect(() => {
    isHostReconnectingRef.current = isHostReconnecting
  }, [isHostReconnecting])

  const [roomId, setRoomId] = useState<string>('')
  const [isHost, setIsHost] = useState<boolean>(false)
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('dekho_party_name') || `Viewer ${Math.floor(100 + Math.random() * 900)}`
  })

  // Room & Stream Metadata
  const [roomMetadata, setRoomMetadata] = useState<RoomMetadata>({
    roomId: '',
    roomTitle: 'Live Watch Party',
    streamUrl: '',
    posterUrl: '',
    isHostOnlyControl: true,
    hostId: '',
    maxCapacity: 10,
    isLocked: false,
  })

  // Room Privacy & Capacity Settings
  const [maxCapacity, setMaxCapacity] = useState<number>(10)
  const [isRoomLocked, setIsRoomLocked] = useState<boolean>(false)
  const [roomPasscode, setRoomPasscode] = useState<string>('')
  const [isPermanent, setIsPermanent] = useState<boolean>(false)

  const maxCapacityRef = useRef<number>(10)
  const isRoomLockedRef = useRef<boolean>(false)
  const roomPasscodeRef = useRef<string>('')
  const isPermanentRef = useRef<boolean>(false)
  const joinPasscodeRef = useRef<string>('')
  const isJoinRejectedRef = useRef<boolean>(false)

  useEffect(() => {
    maxCapacityRef.current = maxCapacity
  }, [maxCapacity])

  useEffect(() => {
    isRoomLockedRef.current = isRoomLocked
  }, [isRoomLocked])

  useEffect(() => {
    roomPasscodeRef.current = roomPasscode
  }, [roomPasscode])

  // Participants & Chat
  const [participants, setParticipants] = useState<Participant[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === 'undefined') return []
    const route = parseCurrentRoute()
    return route.roomId ? getRoomChat(route.roomId) : []
  })
  const [reactions, setReactions] = useState<ReactionItem[]>([])
  const [isPeerBuffering, setIsPeerBuffering] = useState<boolean>(false)
  const [bufferingPeerName, setBufferingPeerName] = useState<string>('')
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const typingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const roomIdRef = useRef<string>(roomId)
  const messagesRef = useRef<ChatMessage[]>([])
  const participantsRef = useRef<Participant[]>([])

  useEffect(() => {
    roomIdRef.current = roomId
  }, [roomId])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    participantsRef.current = participants
  }, [participants])

  const appendMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev
      const next = [...prev, msg]
      if (roomIdRef.current) {
        saveRoomChat(roomIdRef.current, next)
      }
      return next
    })
  }, [])

  // Video Player Ref & Synchronization State
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const playerControllerRef = useRef<UnifiedPlayerRef | null>(null)
  const isLocalAction = useRef<boolean>(false)
  const lastSyncTime = useRef<number>(0)
  const participantNamesRef = useRef<Record<string, string>>({})

  // Unified playback state helpers
  const getCurrentPlaybackTime = useCallback((): number => {
    if (playerControllerRef.current) {
      return playerControllerRef.current.getCurrentTime()
    }
    return videoRef.current?.currentTime || 0
  }, [])

  const getIsPlayingState = useCallback((): boolean => {
    if (playerControllerRef.current) {
      return playerControllerRef.current.isPlaying()
    }
    return videoRef.current ? !videoRef.current.paused : false
  }, [])

  // Save username to storage
  const updateUserName = useCallback((name: string) => {
    const trimmed = name.trim() || `Viewer ${Math.floor(100 + Math.random() * 900)}`
    setUserName(trimmed)
    localStorage.setItem('dekho_party_name', trimmed)
    if (peerService.myPeerId) {
      participantNamesRef.current[peerService.myPeerId] = trimmed
    }
    setParticipants((prev) =>
      prev.map((p) => (p.isSelf ? { ...p, name: trimmed } : p))
    )
    peerService.send({
      type: 'PARTICIPANT_INFO',
      senderId: peerService.myPeerId,
      senderName: trimmed,
      payload: { id: peerService.myPeerId, name: trimmed, isHost },
    })
  }, [isHost])

  // Trigger floating reaction locally & send to peers
  const triggerReaction = useCallback(
    (emoji: string) => {
      const reactionId = `${Date.now()}-${Math.random()}`
      const newReaction: ReactionItem = {
        id: reactionId,
        emoji,
        senderName: userName,
        x: Math.floor(20 + Math.random() * 60), // 20% to 80% screen width
      }

      setReactions((prev) => [...prev, newReaction])

      if (emoji === '🎉') {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
        })
      }

      peerService.send({
        type: 'REACTION',
        senderId: peerService.myPeerId,
        senderName: userName,
        payload: { emoji, x: newReaction.x },
      })

      logPartyEvent('party_reaction', { emoji, roomId: roomIdRef.current })

      // Auto-remove reaction after 2.5s animation
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== reactionId))
      }, 2500)
    },
    [userName]
  )

  // Send Chat Message (text, image/GIF attachment, or 30s voice note)
  const sendChatMessage = useCallback(
    (text: string, imageUrl?: string, audioUrl?: string, audioDuration?: number) => {
      const trimmed = text.trim()
      if (!trimmed && !imageUrl && !audioUrl) return

      const msg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        senderId: peerService.myPeerId,
        senderName: userName,
        text: trimmed,
        imageUrl,
        audioUrl,
        audioDuration,
        timestamp: Date.now(),
        isHost,
      }

      appendMessage(msg)

      peerService.send({
        type: 'CHAT_MESSAGE',
        senderId: peerService.myPeerId,
        senderName: userName,
        payload: msg,
      })

      logPartyEvent('party_chat_sent', {
        roomId: roomIdRef.current,
        hasAttachment: Boolean(imageUrl),
        hasAudio: Boolean(audioUrl),
      })

      // Immediately cancel typing status when message is sent
      peerService.send({
        type: 'TYPING_STATUS',
        senderId: peerService.myPeerId,
        senderName: userName,
        payload: { isTyping: false, senderName: userName },
      })
    },
    [userName, isHost, appendMessage]
  )

  // Send Typing Status
  const sendTypingStatus = useCallback(
    (isTyping: boolean) => {
      peerService.send({
        type: 'TYPING_STATUS',
        senderId: peerService.myPeerId,
        senderName: userName,
        payload: { isTyping, senderName: userName },
      })
    },
    [userName]
  )

  // Send System Notice
  const addSystemNotice = useCallback(
    (text: string) => {
      appendMessage({
        id: `sys-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        senderId: 'system',
        senderName: 'System',
        text,
        timestamp: Date.now(),
        isSystem: true,
      })
    },
    [appendMessage]
  )

  // Broadcast player controls
  const handlePlayerPlay = useCallback(() => {
    if (isLocalAction.current) return
    const curTime = getCurrentPlaybackTime()

    peerService.send({
      type: 'PLAY',
      senderId: peerService.myPeerId,
      senderName: userName,
      payload: {
        time: curTime,
        senderName: userName,
        timestamp: Date.now(),
      } as ControlPayload,
    })
  }, [userName, getCurrentPlaybackTime])

  const handlePlayerPause = useCallback(() => {
    if (isLocalAction.current) return
    const curTime = getCurrentPlaybackTime()

    peerService.send({
      type: 'PAUSE',
      senderId: peerService.myPeerId,
      senderName: userName,
      payload: {
        time: curTime,
        senderName: userName,
        timestamp: Date.now(),
      } as ControlPayload,
    })
  }, [userName, getCurrentPlaybackTime])

  const handlePlayerSeek = useCallback(
    (time: number) => {
      if (isLocalAction.current) return

      peerService.send({
        type: 'SEEK',
        senderId: peerService.myPeerId,
        senderName: userName,
        payload: {
          time,
          senderName: userName,
          timestamp: Date.now(),
        } as ControlPayload,
      })
    },
    [userName]
  )

  const handleBuffering = useCallback(
    (buffering: boolean) => {
      peerService.send({
        type: 'BUFFER_STATE',
        senderId: peerService.myPeerId,
        senderName: userName,
        payload: { isBuffering: buffering, senderName: userName },
      })
    },
    [userName]
  )

  // Change Stream URL
  const changeStream = useCallback(
    (streamUrl: string, title?: string, poster?: string, isP2P?: boolean) => {
      if (!isP2P) {
        peerService.stopStream()
        setRemoteStream(null)
      }

      const parsed = isP2P ? { normalizedUrl: streamUrl, title } : parseMediaUrl(streamUrl, title)
      const newMeta: RoomMetadata = {
        ...roomMetadata,
        streamUrl: parsed.normalizedUrl,
        roomTitle: title || parsed.title || roomMetadata.roomTitle,
        posterUrl: poster || roomMetadata.posterUrl,
        isP2PStream: isP2P,
      }
      setRoomMetadata(newMeta)
      if (isHost && newMeta.roomId) {
        saveHostSession(newMeta.roomId, newMeta)
      }
      addSystemNotice(`Stream changed to: ${newMeta.roomTitle}`)

      peerService.send({
        type: 'HOST_CHANGE_STREAM',
        senderId: peerService.myPeerId,
        senderName: userName,
        payload: newMeta,
      })
    },
    [roomMetadata, userName, addSystemNotice, isHost]
  )

  const broadcastLocalStream = useCallback((stream: MediaStream) => {
    peerService.broadcastStream(stream)
  }, [])

  // Toggle host only control mode
  const toggleHostOnlyControl = useCallback(() => {
    if (!isHost) return
    const updated = !roomMetadata.isHostOnlyControl
    setRoomMetadata((prev) => ({ ...prev, isHostOnlyControl: updated }))
    addSystemNotice(
      updated ? 'Controls locked: Only Host can control playback.' : 'Controls unlocked: Anyone can play/pause.'
    )

    peerService.send({
      type: 'CONTROL_MODE_CHANGE',
      senderId: peerService.myPeerId,
      senderName: userName,
      payload: { isHostOnlyControl: updated },
    })
  }, [isHost, roomMetadata.isHostOnlyControl, userName, addSystemNotice])

  // Handle incoming packets
  const handleIncomingPacket = useCallback(
    (packet: PartyPacket) => {
      const video = videoRef.current

      switch (packet.type) {
        case 'CHAT_MESSAGE': {
          const msg = packet.payload as ChatMessage
          appendMessage(msg)
          break
        }

        case 'REACTION': {
          const { emoji, x } = packet.payload as { emoji: string; x: number }
          const reactionId = `${Date.now()}-${Math.random()}`
          setReactions((prev) => [
            ...prev,
            { id: reactionId, emoji, senderName: packet.senderName, x: x || 50 },
          ])
          if (emoji === '🎉') {
            confetti({ particleCount: 40, spread: 50, origin: { y: 0.8 } })
          }
          setTimeout(() => {
            setReactions((prev) => prev.filter((r) => r.id !== reactionId))
          }, 2500)
          break
        }

        case 'PLAY': {
          const { time, senderName } = packet.payload as ControlPayload
          addSystemNotice(`${senderName} started playback`)
          isLocalAction.current = true
          if (playerControllerRef.current) {
            if (Math.abs(playerControllerRef.current.getCurrentTime() - time) > 1.0) {
              playerControllerRef.current.seekTo(time)
            }
            playerControllerRef.current.play()
          } else if (video) {
            if (Math.abs(video.currentTime - time) > 1.0) {
              video.currentTime = time
            }
            video.play().catch(() => {})
          }
          setTimeout(() => {
            isLocalAction.current = false
          }, 350)
          break
        }

        case 'PAUSE': {
          const { time, senderName } = packet.payload as ControlPayload
          addSystemNotice(`${senderName} paused playback`)
          isLocalAction.current = true
          if (playerControllerRef.current) {
            playerControllerRef.current.pause()
            if (Math.abs(playerControllerRef.current.getCurrentTime() - time) > 1.0) {
              playerControllerRef.current.seekTo(time)
            }
          } else if (video) {
            video.pause()
            if (Math.abs(video.currentTime - time) > 1.0) {
              video.currentTime = time
            }
          }
          setTimeout(() => {
            isLocalAction.current = false
          }, 350)
          break
        }

        case 'SEEK': {
          const { time, senderName } = packet.payload as ControlPayload
          addSystemNotice(`${senderName} jumped to ${Math.floor(time / 60)}:${Math.floor(time % 60).toString().padStart(2, '0')}`)
          isLocalAction.current = true
          if (playerControllerRef.current) {
            playerControllerRef.current.seekTo(time)
          } else if (video) {
            video.currentTime = time
          }
          setTimeout(() => {
            isLocalAction.current = false
          }, 350)
          break
        }

        case 'SYNC_STATE': {
          if (isHost) break // only guests sync with host heartbeat
          const { isPlaying, currentTime } = packet.payload as SyncPayload
          const curTime = getCurrentPlaybackTime()
          const isCurPlaying = getIsPlayingState()
          const drift = Math.abs(curTime - currentTime)

          if (drift > DRIFT_TOLERANCE_SECONDS) {
            isLocalAction.current = true
            if (playerControllerRef.current) {
              playerControllerRef.current.seekTo(currentTime)
            } else if (video) {
              video.currentTime = currentTime
            }
            setTimeout(() => {
              isLocalAction.current = false
            }, 350)
          }

          if (isPlaying && !isCurPlaying) {
            if (playerControllerRef.current) {
              playerControllerRef.current.play()
            } else if (video) {
              video.play().catch(() => {})
            }
          } else if (!isPlaying && isCurPlaying) {
            if (playerControllerRef.current) {
              playerControllerRef.current.pause()
            } else if (video) {
              video.pause()
            }
          }
          break
        }

        case 'BUFFER_STATE': {
          const { isBuffering: peerBuf, senderName } = packet.payload as {
            isBuffering: boolean
            senderName: string
          }
          setIsPeerBuffering(peerBuf)
          setBufferingPeerName(peerBuf ? senderName : '')
          break
        }

        case 'HOST_CHANGE_STREAM': {
          const meta = packet.payload as RoomMetadata
          setRoomMetadata(meta)
          if (!meta.isP2PStream) {
            setRemoteStream(null)
          }
          addSystemNotice(`Host loaded a new stream: ${meta.roomTitle || 'Media'}`)
          break
        }

        case 'CONTROL_MODE_CHANGE': {
          const { isHostOnlyControl } = packet.payload as { isHostOnlyControl: boolean }
          setRoomMetadata((prev) => ({ ...prev, isHostOnlyControl }))
          addSystemNotice(
            isHostOnlyControl
              ? 'Controls locked: Only Host can control playback.'
              : 'Controls unlocked: Anyone can play/pause.'
          )
          break
        }

        case 'PARTICIPANT_INFO': {
          const info = packet.payload as { id: string; name: string }
          if (info && info.id && info.name) {
            participantNamesRef.current[info.id] = info.name
            setParticipants((prev) =>
              prev.map((p) => (p.id === info.id ? { ...p, name: info.name } : p))
            )
          }
          break
        }

        case 'ROOM_METADATA': {
          const meta = packet.payload as RoomMetadata
          setRoomMetadata(meta)
          if (typeof meta.maxCapacity === 'number') {
            setMaxCapacity(meta.maxCapacity)
          }
          if (typeof meta.isLocked === 'boolean') {
            setIsRoomLocked(meta.isLocked)
          }
          break
        }

        case 'JOIN_REQUEST': {
          // When someone asks to join, host responds with current metadata, playback state, and host info
          const req = packet.payload as { peerId: string; userName: string; passcode?: string }
          if (req && req.peerId && req.userName) {
            participantNamesRef.current[req.peerId] = req.userName
          }

          if (isHost) {
            const guestPeerId = req.peerId
            const isAlreadyParticipant = participantsRef.current.some((p) => p.id === guestPeerId)

            // 1. Password Protected Room Check (if host set a passcode)
            if (roomPasscodeRef.current && !isAlreadyParticipant) {
              const guestPass = req.passcode?.trim() || ''
              const expectedPass = roomPasscodeRef.current.trim()
              if (!guestPass || guestPass !== expectedPass) {
                peerService.sendToGuest(guestPeerId, {
                  type: 'JOIN_REJECTED',
                  senderId: peerService.myPeerId,
                  senderName: userName,
                  payload: {
                    reason: 'WRONG_PASSCODE',
                    message: guestPass ? 'Incorrect room passcode.' : 'This watch party is password protected.',
                    requiresPasscode: true,
                  },
                })
                setTimeout(() => peerService.disconnectGuest(guestPeerId), 800)
                break
              }
            } else if (isRoomLockedRef.current && !isAlreadyParticipant) {
              // 2. Strict Room Lock (no password, host locked the room to everyone)
              peerService.sendToGuest(guestPeerId, {
                type: 'JOIN_REJECTED',
                senderId: peerService.myPeerId,
                senderName: userName,
                payload: {
                  reason: 'ROOM_LOCKED',
                  message: 'This watch party is locked by the host.',
                },
              })
              setTimeout(() => peerService.disconnectGuest(guestPeerId), 800)
              break
            }

            // 3. Room Capacity Limit (default 10, max 15)
            const currentCap = maxCapacityRef.current || 10
            if (participantsRef.current.length >= currentCap && !isAlreadyParticipant) {
              peerService.sendToGuest(guestPeerId, {
                type: 'JOIN_REJECTED',
                senderId: peerService.myPeerId,
                senderName: userName,
                payload: {
                  reason: 'ROOM_FULL',
                  message: `This room is full (max ${currentCap} participants reached).`,
                  maxCapacity: currentCap,
                  currentCount: participantsRef.current.length,
                },
              })
              setTimeout(() => peerService.disconnectGuest(guestPeerId), 800)
              break
            }

            addSystemNotice(`${packet.senderName} joined the party!`)
            confetti({ particleCount: 30, spread: 45 })

            setParticipants((prev) => {
              const updated = prev.some((p) => p.id === req.peerId)
                ? prev.map((p) => (p.id === req.peerId ? { ...p, name: req.userName } : p))
                : [
                    ...prev,
                    {
                      id: req.peerId,
                      name: req.userName,
                      isHost: false,
                      isSelf: false,
                      isBuffering: false,
                      joinedAt: Date.now(),
                    },
                  ]

              // Propagate new participant roster to all connected guests
              peerService.send({
                type: 'PARTICIPANT_ROSTER',
                senderId: peerService.myPeerId,
                senderName: userName,
                payload: {
                  participants: updated.map((p) => ({
                    id: p.id,
                    name: p.name,
                    isHost: p.isHost,
                  })),
                },
              })

              return updated
            })

            peerService.sendToGuest(guestPeerId, {
              type: 'JOIN_ACK',
              senderId: peerService.myPeerId,
              senderName: userName,
              payload: {
                roomMetadata: {
                  ...roomMetadata,
                  maxCapacity: maxCapacityRef.current,
                  isLocked: isRoomLockedRef.current,
                },
                currentState: {
                  isPlaying: getIsPlayingState(),
                  currentTime: getCurrentPlaybackTime(),
                },
                hostName: userName,
                chatHistory: messagesRef.current.slice(-50),
              },
            })
          }
          break
        }

        case 'JOIN_REJECTED': {
          const payload = packet.payload as JoinRejectedPayload
          isJoinRejectedRef.current = true
          setRoomExpiredReason(payload?.message || 'Unable to join watch party')
          setIsRoomExpired(true)
          setConnectionStatus('disconnected')
          break
        }

        case 'PARTICIPANT_ROSTER': {
          const rosterPayload = packet.payload as {
            participants: Array<{ id: string; name: string; isHost: boolean }>
          }
          if (rosterPayload && Array.isArray(rosterPayload.participants)) {
            setParticipants((prev) => {
              const selfId = peerService.myPeerId
              return rosterPayload.participants.map((p) => {
                const existing = prev.find((x) => x.id === p.id)
                return {
                  id: p.id,
                  name: p.id === selfId ? userName : p.name,
                  isHost: p.isHost,
                  isSelf: p.id === selfId,
                  isBuffering: existing ? existing.isBuffering : false,
                  joinedAt: existing ? existing.joinedAt : Date.now(),
                }
              })
            })
          }
          break
        }

        case 'TYPING_STATUS': {
          const { isTyping, senderName } = packet.payload as {
            isTyping: boolean
            senderName: string
          }
          const pId = packet.senderId
          if (pId === peerService.myPeerId) break

          const existingTimer = typingTimersRef.current.get(pId)
          if (existingTimer) {
            clearTimeout(existingTimer)
            typingTimersRef.current.delete(pId)
          }

          if (isTyping) {
            setTypingUsers((prev) => (prev.includes(senderName) ? prev : [...prev, senderName]))
            const timer = setTimeout(() => {
              setTypingUsers((prev) => prev.filter((n) => n !== senderName))
              typingTimersRef.current.delete(pId)
            }, 3000)
            typingTimersRef.current.set(pId, timer)
          } else {
            setTypingUsers((prev) => prev.filter((n) => n !== senderName))
          }
          break
        }

        case 'PEER_LEFT': {
          const { peerId, userName: leftUser } = packet.payload as {
            peerId: string
            userName: string
          }
          if (peerId === peerService.myPeerId) break

          const displayName = leftUser || participantNamesRef.current[peerId] || 'A friend'
          addSystemNotice(`${displayName} left the party.`)
          setParticipants((prev) => prev.filter((p) => p.id !== peerId))
          setTypingUsers((prev) => prev.filter((n) => n !== displayName))

          if (isHost) {
            setParticipants((prev) => {
              const remaining = prev.filter((p) => p.id !== peerId)
              peerService.send({
                type: 'PARTICIPANT_ROSTER',
                senderId: peerService.myPeerId,
                senderName: userName,
                payload: {
                  participants: remaining.map((p) => ({
                    id: p.id,
                    name: p.name,
                    isHost: p.isHost,
                  })),
                },
              })
              return remaining
            })
          }
          break
        }

        case 'JOIN_ACK': {
          const ack = packet.payload as {
            roomMetadata: RoomMetadata
            currentState: { isPlaying: boolean; currentTime: number }
            hostName?: string
            chatHistory?: ChatMessage[]
          }
          setRoomMetadata(ack.roomMetadata)
          if (typeof ack.roomMetadata?.maxCapacity === 'number') {
            setMaxCapacity(ack.roomMetadata.maxCapacity)
          }
          if (typeof ack.roomMetadata?.isLocked === 'boolean') {
            setIsRoomLocked(ack.roomMetadata.isLocked)
          }
          if (ack.chatHistory && ack.chatHistory.length > 0) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id))
              const toAdd = ack.chatHistory!.filter((m) => !existingIds.has(m.id))
              const merged = [...prev, ...toAdd].sort((a, b) => a.timestamp - b.timestamp)
              if (roomIdRef.current) {
                saveRoomChat(roomIdRef.current, merged)
              }
              return merged
            })
          }
          const hostDisplayName = ack.hostName || packet.senderName
          participantNamesRef.current[packet.senderId] = hostDisplayName
          setParticipants((prev) =>
            prev.map((p) =>
              p.id === packet.senderId || p.isHost ? { ...p, name: hostDisplayName } : p
            )
          )

          addSystemNotice(`Joined party hosted by ${hostDisplayName}!`)
          if (ack.currentState) {
            if (playerControllerRef.current) {
              playerControllerRef.current.seekTo(ack.currentState.currentTime)
              if (ack.currentState.isPlaying) {
                playerControllerRef.current.play()
              }
            } else if (video) {
              video.currentTime = ack.currentState.currentTime
              if (ack.currentState.isPlaying) {
                video.play().catch(() => {})
              }
            }
          }
          break
        }

        case 'ROOM_CLOSED': {
          addSystemNotice('The host has ended this watch party.')
          if (hostReconnectTimerRef.current) {
            clearInterval(hostReconnectTimerRef.current)
            hostReconnectTimerRef.current = null
          }
          setIsHostReconnecting(false)
          peerService.cleanup()
          setConnectionStatus('disconnected')
          setIsRoomExpired(true)
          setRoomExpiredReason('The host has ended this watch party.')
          break
        }
      }
    },
    [isHost, userName, roomMetadata, addSystemNotice, getCurrentPlaybackTime, getIsPlayingState, appendMessage]
  )

  // Start Hosting
  const startHost = useCallback(
    async (initialRoomId?: string, initialMeta?: Partial<RoomMetadata>) => {
      try {
        setConnectionStatus('connecting')
        setErrorMessage(null)

        const generatedRoomId =
          initialRoomId || `dpwp-${Math.random().toString(36).substring(2, 8)}`
        const id = await peerService.initHost(generatedRoomId)

        setRoomId(id)
        setIsHost(true)
        setConnectionStatus('connected')

        const cached = getRoomChat(id)
        if (cached.length > 0) {
          setMessages(cached)
        }

        const parsed = parseMediaUrl(initialMeta?.streamUrl || '', initialMeta?.roomTitle)
        const initCap = Math.max(2, Math.min(15, initialMeta?.maxCapacity ?? 10))
        const initLocked = Boolean(initialMeta?.isLocked)
        const initPasscode = initialMeta?.passcode || ''
        const initPermanent = Boolean(initialMeta?.isPermanent)
        setMaxCapacity(initCap)
        maxCapacityRef.current = initCap
        setIsRoomLocked(initLocked)
        isRoomLockedRef.current = initLocked
        setRoomPasscode(initPasscode)
        roomPasscodeRef.current = initPasscode
        setIsPermanent(initPermanent)
        isPermanentRef.current = initPermanent
        setIsRoomExpired(false)
        setIsRoomStandby(false)
        setRoomExpiredReason('')

        const meta: RoomMetadata = {
          roomId: id,
          roomTitle: initialMeta?.roomTitle || parsed.title || 'Movie Watch Party',
          streamUrl: parsed.normalizedUrl,
          posterUrl: initialMeta?.posterUrl || '',
          isHostOnlyControl: true,
          hostId: id,
          maxCapacity: initCap,
          isLocked: initLocked,
          passcode: initPasscode,
          isPermanent: initPermanent,
        }
        setRoomMetadata(meta)
        saveHostSession(id, meta)

        logPartyEvent('party_created', {
          roomId: id,
          title: meta.roomTitle,
          isP2P: Boolean(meta.isP2PStream),
          isPermanent: initPermanent,
        })
        void registerPartyRoom(id, {
          title: meta.roomTitle,
          hostName: userName,
          isP2P: meta.isP2PStream,
          streamUrl: meta.streamUrl,
          posterUrl: meta.posterUrl,
          maxCapacity: initCap,
          isLocked: initLocked,
          isPermanent: initPermanent,
        })

        setParticipants([
          {
            id,
            name: `${userName} (Host)`,
            isHost: true,
            isSelf: true,
            isBuffering: false,
            joinedAt: Date.now(),
          },
        ])

        addSystemNotice(`Party Room created! Room ID: ${id}. Share link with your friends to start.`)
      } catch (err: unknown) {
        setConnectionStatus('error')
        const msg = err instanceof Error ? err.message : 'Failed to create room'
        setErrorMessage(msg)
      }
    },
    [userName, addSystemNotice]
  )

  // Join existing Room as Guest
  const joinRoom = useCallback(
    async (targetRoomId: string, passcode?: string) => {
      if (!targetRoomId.trim()) return

      try {
        setConnectionStatus('connecting')
        setErrorMessage(null)
        isJoinRejectedRef.current = false
        setIsRoomExpired(false)
        setRoomExpiredReason('')
        if (passcode !== undefined) {
          joinPasscodeRef.current = passcode.trim()
        }
        const cleanId = targetRoomId.trim()
        setRoomId(cleanId)
        setIsHost(false)

        const cached = getRoomChat(cleanId)
        if (cached.length > 0) {
          setMessages(cached)
        }

        clearHostSession()

        // Verify room in Firestore first if available
        const roomStatus = await checkPartyRoomStatus(cleanId)
        if (roomStatus.exists && !roomStatus.isActive) {
          if (roomStatus.isPermanent) {
            setIsRoomStandby(true)
            setRoomMetadata((prev) => ({
              ...prev,
              roomId: cleanId,
              roomTitle: roomStatus.title || prev.roomTitle,
              streamUrl: roomStatus.streamUrl || prev.streamUrl,
              posterUrl: roomStatus.posterUrl || prev.posterUrl,
              isPermanent: true,
            }))
            setRoomExpiredReason(
              'This permanent watch room is currently on standby. The host is away.'
            )
          } else {
            setIsRoomStandby(false)
            setRoomExpiredReason('This watch party has already ended or the host is offline.')
          }
          setIsRoomExpired(true)
          setConnectionStatus('disconnected')
          return
        }
        setIsRoomStandby(false)

        if (roomStatus.title) {
          setRoomMetadata((prev) => ({ ...prev, roomTitle: roomStatus.title || prev.roomTitle }))
        }

        await peerService.initGuest(cleanId)

        logPartyEvent('party_joined', {
          roomId: cleanId,
        })

        // Send join request to host with optional passcode
        peerService.send({
          type: 'JOIN_REQUEST',
          senderId: peerService.myPeerId,
          senderName: userName,
          payload: { peerId: peerService.myPeerId, userName, passcode: joinPasscodeRef.current || undefined },
        })

        setParticipants([
          {
            id: peerService.myPeerId,
            name: userName,
            isHost: false,
            isSelf: true,
            isBuffering: false,
            joinedAt: Date.now(),
          },
        ])

        addSystemNotice(`Connected to room: ${cleanId}`)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Could not join room'
        if (msg === 'ROOM_EXPIRED' || msg.includes('ROOM_EXPIRED')) {
          setIsRoomExpired(true)
          setRoomExpiredReason('This watch party has expired or the host is offline.')
          setConnectionStatus('disconnected')
        } else {
          setConnectionStatus('error')
          setErrorMessage(msg)
        }
      }
    },
    [userName, addSystemNotice]
  )

  const startHostReconnectGracePeriod = useCallback(() => {
    if (isHost || isHostReconnectingRef.current) return

    setIsHostReconnecting(true)
    setHostReconnectCountdown(35)

    // Pause player while waiting so viewers do not drift
    if (playerControllerRef.current) {
      playerControllerRef.current.pause()
    } else if (videoRef.current) {
      videoRef.current.pause()
    }

    if (hostReconnectTimerRef.current) {
      clearInterval(hostReconnectTimerRef.current)
    }

    let remaining = 35
    hostReconnectTimerRef.current = setInterval(async () => {
      remaining -= 1
      setHostReconnectCountdown(remaining)

      // Try reconnecting to host every ~3 seconds
      if (remaining % 3 === 0 && roomIdRef.current) {
        const connected = await peerService.reconnectToHost(roomIdRef.current)
        if (connected) {
          if (hostReconnectTimerRef.current) {
            clearInterval(hostReconnectTimerRef.current)
            hostReconnectTimerRef.current = null
          }
          setIsHostReconnecting(false)
          addSystemNotice('Host reconnected! Sync resumed.')
          return
        }
      }

      if (remaining <= 0) {
        if (hostReconnectTimerRef.current) {
          clearInterval(hostReconnectTimerRef.current)
          hostReconnectTimerRef.current = null
        }
        setIsHostReconnecting(false)
        setIsRoomExpired(true)
        setRoomExpiredReason('The host did not return. The watch party has ended.')
        setConnectionStatus('disconnected')
      }
    }, 1000)
  }, [isHost, addSystemNotice])

  // Listen to Peer events
  useEffect(() => {
    const unsubMsg = peerService.onMessage(handleIncomingPacket)
    const unsubStatus = peerService.onStatus((status, err) => {
      setConnectionStatus(status)
      if (status === 'connected') {
        if (hostReconnectTimerRef.current) {
          clearInterval(hostReconnectTimerRef.current)
          hostReconnectTimerRef.current = null
        }
        setIsHostReconnecting(false)
      }

      if (err) {
        if (err === 'ROOM_EXPIRED' || err === 'HOST_LEFT') {
          // If connection closed because host rejected our join request (e.g. locked, full, wrong passcode),
          // DO NOT overwrite the rejection reason or trigger host reconnect/solo watch!
          if (isJoinRejectedRef.current) {
            return
          }
          // If we are guest and previously connected, give host a 35s grace window to reload
          if (!isHost && roomIdRef.current && !isRoomExpired) {
            startHostReconnectGracePeriod()
          } else {
            setIsRoomExpired(true)
            setRoomExpiredReason('This watch party has expired or the host is offline.')
            setErrorMessage(null)
          }
        } else {
          setErrorMessage(err)
        }
      }
    })
    const unsubPeers = peerService.onPeerListChange((peerIds) => {
      setParticipants((prev) => {
        const self = prev.find((p) => p.isSelf) || {
          id: peerService.myPeerId,
          name: userName,
          isHost,
          isSelf: true,
          isBuffering: false,
          joinedAt: Date.now(),
        }

        const rem = peerIds.map((pId, idx) => ({
          id: pId,
          name: participantNamesRef.current[pId] || (isHost ? `Friend ${idx + 1}` : 'Host'),
          isHost: !isHost,
          isSelf: false,
          isBuffering: false,
          joinedAt: Date.now(),
        }))

        return [self, ...rem]
      })
    })

    const unsubGuest = peerService.onGuestConnected(() => {
      if (!isHost) return
      peerService.send({
        type: 'JOIN_ACK',
        senderId: peerService.myPeerId,
        senderName: userName,
        payload: {
          roomMetadata,
          currentState: {
            isPlaying: getIsPlayingState(),
            currentTime: getCurrentPlaybackTime(),
          },
          chatHistory: messagesRef.current.slice(-50),
        },
      })
    })

    const unsubStream = peerService.onRemoteStream((stream) => {
      setRemoteStream(stream)
      addSystemNotice('Connected to live P2P video stream from host')
    })

    const unsubGuestDisconnect = peerService.onGuestDisconnected((peerId) => {
      const leftName = participantNamesRef.current[peerId] || 'A friend'
      addSystemNotice(`${leftName} left the party.`)
      setParticipants((prev) => {
        const remaining = prev.filter((p) => p.id !== peerId)
        if (isHost) {
          peerService.send({
            type: 'PARTICIPANT_ROSTER',
            senderId: peerService.myPeerId,
            senderName: userName,
            payload: {
              participants: remaining.map((p) => ({
                id: p.id,
                name: p.name,
                isHost: p.isHost,
              })),
            },
          })
        }
        return remaining
      })
      setTypingUsers((prev) => prev.filter((n) => n !== leftName))
    })

    return () => {
      unsubMsg()
      unsubStatus()
      unsubPeers()
      unsubGuest()
      unsubGuestDisconnect()
      unsubStream()
    }
  }, [
    handleIncomingPacket,
    userName,
    isHost,
    roomMetadata,
    getIsPlayingState,
    getCurrentPlaybackTime,
    addSystemNotice,
    startHostReconnectGracePeriod,
    isRoomExpired,
  ])

  // Broadcast PEER_LEFT on tab close or navigation, and mark room ended if host
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Guard host against accidental close when friends are watching
      if (isHost && participants.length > 1 && !isIntentionalExit.current) {
        e.preventDefault()
        e.returnValue = ''
      }

      if (!isHost && peerService.myPeerId) {
        peerService.send({
          type: 'PEER_LEFT',
          senderId: peerService.myPeerId,
          senderName: userName,
          payload: { peerId: peerService.myPeerId, userName },
        })
      } else if (isHost && roomIdRef.current && isIntentionalExit.current) {
        void endPartyRoom(roomIdRef.current, isPermanentRef.current)
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isHost, userName, participants.length])

  // Sync real-time participant count and periodic heartbeat to Firestore when host is running room
  useEffect(() => {
    if (!isHost || connectionStatus !== 'connected' || !roomId) return

    void updatePartyRoomParticipantCount(roomId, participants.length)

    const interval = setInterval(() => {
      void updatePartyRoomHeartbeat(roomId, participants.length)
    }, 25000)

    return () => clearInterval(interval)
  }, [isHost, roomId, connectionStatus, participants.length])

  // Host heartbeat interval to keep guests in sync
  useEffect(() => {
    if (!isHost || connectionStatus !== 'connected') return

    const interval = setInterval(() => {
      const now = Date.now()
      if (now - lastSyncTime.current >= SYNC_HEARTBEAT_INTERVAL_MS) {
        lastSyncTime.current = now
        const curTime = getCurrentPlaybackTime()
        const curPlaying = getIsPlayingState()

        peerService.send({
          type: 'SYNC_STATE',
          senderId: peerService.myPeerId,
          senderName: userName,
          payload: {
            isPlaying: curPlaying,
            currentTime: curTime,
            playbackRate: 1.0,
            timestamp: now,
          } as SyncPayload,
        })
      }
    }, SYNC_HEARTBEAT_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [isHost, connectionStatus, userName, getCurrentPlaybackTime, getIsPlayingState])

  const terminateRoom = useCallback(() => {
    isIntentionalExit.current = true
    if (hostReconnectTimerRef.current) {
      clearInterval(hostReconnectTimerRef.current)
      hostReconnectTimerRef.current = null
    }
    setIsHostReconnecting(false)

    logPartyEvent('party_ended', {
      roomId,
      isHost,
    })

    if (isHost) {
      if (roomId) {
        void endPartyRoom(roomId, isPermanentRef.current)
      }
      peerService.send({
        type: 'ROOM_CLOSED',
        senderId: peerService.myPeerId,
        senderName: userName,
        payload: { reason: 'Host terminated party' },
      })
    } else {
      peerService.send({
        type: 'PEER_LEFT',
        senderId: peerService.myPeerId,
        senderName: userName,
        payload: { peerId: peerService.myPeerId, userName },
      })
    }
    clearHostSession(roomId, isPermanentRef.current)
    peerService.cleanup()
    setRoomId('')
    setIsHost(false)
    setConnectionStatus('disconnected')
    window.location.href = '/'
  }, [isHost, userName, roomId])

  const continueWatchingSolo = useCallback(() => {
    if (hostReconnectTimerRef.current) {
      clearInterval(hostReconnectTimerRef.current)
      hostReconnectTimerRef.current = null
    }
    setIsHostReconnecting(false)
    setIsRoomExpired(false)
    setRoomExpiredReason('')
    peerService.cleanup()
    clearHostSession()
    setConnectionStatus('disconnected')
    addSystemNotice('Now watching solo. Playback is independent.')
    if (playerControllerRef.current) {
      playerControllerRef.current.play()
    } else if (videoRef.current) {
      videoRef.current.play().catch(() => {})
    }
  }, [addSystemNotice])

  const takeOverAsHost = useCallback(() => {
    if (hostReconnectTimerRef.current) {
      clearInterval(hostReconnectTimerRef.current)
      hostReconnectTimerRef.current = null
    }
    setIsHostReconnecting(false)
    setIsRoomExpired(false)
    setRoomExpiredReason('')
    peerService.cleanup()

    const curTime = getCurrentPlaybackTime()
    const curStream = roomMetadata.streamUrl
    const curTitle = `${roomMetadata.roomTitle} (Resumed)`
    const newRoomId = `dpwp-${Math.random().toString(36).substring(2, 8)}`

    void startHost(newRoomId, {
      streamUrl: curStream,
      roomTitle: curTitle,
      posterUrl: roomMetadata.posterUrl,
    }).then(() => {
      setTimeout(() => {
        if (playerControllerRef.current) {
          playerControllerRef.current.seekTo(curTime)
        } else if (videoRef.current) {
          videoRef.current.currentTime = curTime
        }
      }, 500)
    })
  }, [getCurrentPlaybackTime, roomMetadata, startHost])

  const markRoomExpired = useCallback((reason?: string, standby?: boolean) => {
    setIsRoomStandby(Boolean(standby))
    setIsRoomExpired(true)
    if (reason) {
      setRoomExpiredReason(reason)
    }
    setConnectionStatus('disconnected')
  }, [])

  const dismissRoomExpired = useCallback(() => {
    isIntentionalExit.current = true
    if (hostReconnectTimerRef.current) {
      clearInterval(hostReconnectTimerRef.current)
      hostReconnectTimerRef.current = null
    }
    setIsHostReconnecting(false)
    setIsRoomExpired(false)
    setIsRoomStandby(false)
    setRoomExpiredReason('')
    setConnectionStatus('disconnected')
    clearHostSession()
    peerService.cleanup()
    window.location.href = '/'
  }, [])

  // Toggle Room Lock
  const toggleRoomLock = useCallback(() => {
    setIsRoomLocked((prev) => {
      const next = !prev
      isRoomLockedRef.current = next
      setRoomMetadata((m) => {
        const updated: RoomMetadata = { ...m, isLocked: next }
        peerService.send({
          type: 'ROOM_METADATA',
          senderId: peerService.myPeerId,
          senderName: userName,
          payload: updated,
        })
        return updated
      })
      addSystemNotice(next ? '🔒 Room is now locked to new guests.' : '🔓 Room is now unlocked.')
      return next
    })
  }, [userName, addSystemNotice])

  // Update Max Room Capacity (default 10, max 15)
  const updateMaxCapacity = useCallback((newCap: number) => {
    const clamped = Math.max(2, Math.min(15, newCap))
    setMaxCapacity(clamped)
    maxCapacityRef.current = clamped
    setRoomMetadata((m) => {
      const updated: RoomMetadata = { ...m, maxCapacity: clamped }
      peerService.send({
        type: 'ROOM_METADATA',
        senderId: peerService.myPeerId,
        senderName: userName,
        payload: updated,
      })
      return updated
    })
    addSystemNotice(`Room capacity set to ${clamped} participants (max 15).`)
  }, [userName, addSystemNotice])

  // Update Room Passcode
  const updateRoomPasscode = useCallback((pass: string) => {
    const trimmed = pass.trim()
    setRoomPasscode(trimmed)
    roomPasscodeRef.current = trimmed
    setRoomMetadata((m) => {
      const updated: RoomMetadata = { ...m, passcode: trimmed || undefined }
      peerService.send({
        type: 'ROOM_METADATA',
        senderId: peerService.myPeerId,
        senderName: userName,
        payload: updated,
      })
      return updated
    })
    addSystemNotice(
      trimmed
        ? `🔒 Room passcode set to "${trimmed}". Guests must enter it to join.`
        : '🔓 Room passcode removed. Anyone with the link can join.'
    )
  }, [userName, addSystemNotice])

  // Toggle Permanent Room Mode
  const toggleRoomPermanent = useCallback(() => {
    setIsPermanent((prev) => {
      const next = !prev
      isPermanentRef.current = next
      setRoomMetadata((m) => {
        const updated: RoomMetadata = { ...m, isPermanent: next }
        if (roomIdRef.current) {
          saveHostSession(roomIdRef.current, updated)
          void updatePartyRoomPermanent(roomIdRef.current, next)
        }
        peerService.send({
          type: 'ROOM_METADATA',
          senderId: peerService.myPeerId,
          senderName: userName,
          payload: updated,
        })
        return updated
      })
      addSystemNotice(
        next
          ? '📌 Room marked as Permanent. Link & settings will persist indefinitely.'
          : '🕒 Room switched to Standard (temporary) mode.'
      )
      return next
    })
  }, [userName, addSystemNotice])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hostReconnectTimerRef.current) {
        clearInterval(hostReconnectTimerRef.current)
        hostReconnectTimerRef.current = null
      }
      peerService.cleanup()
    }
  }, [])

  return {
    connectionStatus,
    errorMessage,
    isRoomExpired,
    isRoomStandby,
    roomExpiredReason,
    isHostReconnecting,
    hostReconnectCountdown,
    markRoomExpired,
    dismissRoomExpired,
    continueWatchingSolo,
    takeOverAsHost,
    roomId,
    isHost,
    isRoomLocked,
    toggleRoomLock,
    maxCapacity,
    updateMaxCapacity,
    roomPasscode,
    updateRoomPasscode,
    isPermanent,
    toggleRoomPermanent,
    userName,
    updateUserName,
    roomMetadata,
    participants,
    messages,
    reactions,
    typingUsers,
    isPeerBuffering,
    bufferingPeerName,
    remoteStream,
    broadcastLocalStream,
    videoRef,
    playerControllerRef,
    triggerReaction,
    sendChatMessage,
    sendTypingStatus,
    handlePlayerPlay,
    handlePlayerPause,
    handlePlayerSeek,
    handleBuffering,
    changeStream,
    toggleHostOnlyControl,
    startHost,
    joinRoom,
    terminateRoom,
  }
}
