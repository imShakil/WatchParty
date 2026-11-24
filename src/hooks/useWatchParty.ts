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
import type { UnifiedPlayerRef } from '@/types/player.types'
import type {
  ChatMessage,
  ReactionItem,
  Participant,
  RoomMetadata,
  PartyPacket,
  SyncPayload,
  ControlPayload,
} from '@/types/party.types'

const DRIFT_TOLERANCE_SECONDS = 1.8
const SYNC_HEARTBEAT_INTERVAL_MS = 3000

export function useWatchParty() {
  const [connectionStatus, setConnectionStatus] = useState<
    'disconnected' | 'connecting' | 'connected' | 'error'
  >('disconnected')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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
  })

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

  const roomIdRef = useRef<string>(roomId)
  const messagesRef = useRef<ChatMessage[]>([])

  useEffect(() => {
    roomIdRef.current = roomId
  }, [roomId])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

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

      // Auto-remove reaction after 2.5s animation
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== reactionId))
      }, 2500)
    },
    [userName]
  )

  // Send Chat Message
  const sendChatMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return

      const msg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        senderId: peerService.myPeerId,
        senderName: userName,
        text: trimmed,
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
    },
    [userName, isHost, appendMessage]
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

        case 'JOIN_REQUEST': {
          // When someone asks to join, host responds with current metadata, playback state, and host info
          const req = packet.payload as { peerId: string; userName: string }
          if (req && req.peerId && req.userName) {
            participantNamesRef.current[req.peerId] = req.userName
            setParticipants((prev) =>
              prev.map((p) => (p.id === req.peerId ? { ...p, name: req.userName } : p))
            )
          }

          if (isHost) {
            addSystemNotice(`${packet.senderName} joined the party!`)
            confetti({ particleCount: 30, spread: 45 })

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
                hostName: userName,
                chatHistory: messagesRef.current.slice(-50),
              },
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
          peerService.cleanup()
          setConnectionStatus('disconnected')
          setErrorMessage('The host has ended the watch party.')
          setTimeout(() => {
            window.location.href = '/'
          }, 2500)
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
        const meta: RoomMetadata = {
          roomId: id,
          roomTitle: initialMeta?.roomTitle || parsed.title || 'Movie Watch Party',
          streamUrl: parsed.normalizedUrl,
          posterUrl: initialMeta?.posterUrl || '',
          isHostOnlyControl: true,
          hostId: id,
        }
        setRoomMetadata(meta)
        saveHostSession(id, meta)

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
    async (targetRoomId: string) => {
      if (!targetRoomId.trim()) return

      try {
        setConnectionStatus('connecting')
        setErrorMessage(null)
        const cleanId = targetRoomId.trim()
        setRoomId(cleanId)
        setIsHost(false)

        const cached = getRoomChat(cleanId)
        if (cached.length > 0) {
          setMessages(cached)
        }

        clearHostSession()
        await peerService.initGuest(cleanId)

        // Send join request to host
        peerService.send({
          type: 'JOIN_REQUEST',
          senderId: peerService.myPeerId,
          senderName: userName,
          payload: { peerId: peerService.myPeerId, userName },
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
        setConnectionStatus('error')
        const msg = err instanceof Error ? err.message : 'Could not join room'
        setErrorMessage(msg)
      }
    },
    [userName, addSystemNotice]
  )

  // Listen to Peer events
  useEffect(() => {
    const unsubMsg = peerService.onMessage(handleIncomingPacket)
    const unsubStatus = peerService.onStatus((status, err) => {
      setConnectionStatus(status)
      if (err) setErrorMessage(err)
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

    return () => {
      unsubMsg()
      unsubStatus()
      unsubPeers()
      unsubGuest()
      unsubStream()
    }
  }, [handleIncomingPacket, userName, isHost, roomMetadata, getIsPlayingState, getCurrentPlaybackTime, addSystemNotice])

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
    if (isHost) {
      peerService.send({
        type: 'ROOM_CLOSED',
        senderId: peerService.myPeerId,
        senderName: userName,
        payload: { reason: 'Host terminated party' },
      })
    }
    clearHostSession()
    peerService.cleanup()
    setRoomId('')
    setIsHost(false)
    setConnectionStatus('disconnected')
    window.location.href = '/'
  }, [isHost, userName])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      peerService.cleanup()
    }
  }, [])

  return {
    connectionStatus,
    errorMessage,
    roomId,
    isHost,
    userName,
    updateUserName,
    roomMetadata,
    participants,
    messages,
    reactions,
    isPeerBuffering,
    bufferingPeerName,
    remoteStream,
    broadcastLocalStream,
    videoRef,
    playerControllerRef,
    triggerReaction,
    sendChatMessage,
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
