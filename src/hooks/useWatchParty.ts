import { useState, useEffect, useRef, useCallback } from 'react'
import confetti from 'canvas-confetti'
import { peerService } from '@/services/peerService'
import { parseMediaUrl } from '@/utils/mediaUrl'
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
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [reactions, setReactions] = useState<ReactionItem[]>([])
  const [isPeerBuffering, setIsPeerBuffering] = useState<boolean>(false)
  const [bufferingPeerName, setBufferingPeerName] = useState<string>('')

  // Video Player Ref & Synchronization State
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const isLocalAction = useRef<boolean>(false)
  const lastSyncTime = useRef<number>(0)

  // Save username to storage
  const updateUserName = useCallback((name: string) => {
    const trimmed = name.trim() || `Viewer ${Math.floor(100 + Math.random() * 900)}`
    setUserName(trimmed)
    localStorage.setItem('dekho_party_name', trimmed)
  }, [])

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

      setMessages((prev) => [...prev, msg])

      peerService.send({
        type: 'CHAT_MESSAGE',
        senderId: peerService.myPeerId,
        senderName: userName,
        payload: msg,
      })
    },
    [userName, isHost]
  )

  // Send System Notice
  const addSystemNotice = useCallback((text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        senderId: 'system',
        senderName: 'System',
        text,
        timestamp: Date.now(),
        isSystem: true,
      },
    ])
  }, [])

  // Broadcast player controls
  const handlePlayerPlay = useCallback(() => {
    if (isLocalAction.current) return
    const video = videoRef.current
    if (!video) return

    peerService.send({
      type: 'PLAY',
      senderId: peerService.myPeerId,
      senderName: userName,
      payload: {
        time: video.currentTime,
        senderName: userName,
        timestamp: Date.now(),
      } as ControlPayload,
    })
  }, [userName])

  const handlePlayerPause = useCallback(() => {
    if (isLocalAction.current) return
    const video = videoRef.current
    if (!video) return

    peerService.send({
      type: 'PAUSE',
      senderId: peerService.myPeerId,
      senderName: userName,
      payload: {
        time: video.currentTime,
        senderName: userName,
        timestamp: Date.now(),
      } as ControlPayload,
    })
  }, [userName])

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
    (streamUrl: string, title?: string, poster?: string) => {
      const parsed = parseMediaUrl(streamUrl, title)
      const newMeta: RoomMetadata = {
        ...roomMetadata,
        streamUrl: parsed.normalizedUrl,
        roomTitle: title || parsed.title || roomMetadata.roomTitle,
        posterUrl: poster || roomMetadata.posterUrl,
      }
      setRoomMetadata(newMeta)
      addSystemNotice(`Stream changed to: ${newMeta.roomTitle}`)

      peerService.send({
        type: 'HOST_CHANGE_STREAM',
        senderId: peerService.myPeerId,
        senderName: userName,
        payload: newMeta,
      })
    },
    [roomMetadata, userName, addSystemNotice]
  )

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
          setMessages((prev) => [...prev, msg])
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
          if (video) {
            isLocalAction.current = true
            if (Math.abs(video.currentTime - time) > 1.0) {
              video.currentTime = time
            }
            video.play().catch(() => {
              /* autoplay policy handle */
            })
            setTimeout(() => {
              isLocalAction.current = false
            }, 300)
          }
          break
        }

        case 'PAUSE': {
          const { time, senderName } = packet.payload as ControlPayload
          addSystemNotice(`${senderName} paused playback`)
          if (video) {
            isLocalAction.current = true
            video.pause()
            if (Math.abs(video.currentTime - time) > 1.0) {
              video.currentTime = time
            }
            setTimeout(() => {
              isLocalAction.current = false
            }, 300)
          }
          break
        }

        case 'SEEK': {
          const { time, senderName } = packet.payload as ControlPayload
          addSystemNotice(`${senderName} jumped to ${Math.floor(time / 60)}:${Math.floor(time % 60).toString().padStart(2, '0')}`)
          if (video) {
            isLocalAction.current = true
            video.currentTime = time
            setTimeout(() => {
              isLocalAction.current = false
            }, 300)
          }
          break
        }

        case 'SYNC_STATE': {
          if (isHost) break // only guests sync with host heartbeat
          const { isPlaying, currentTime } = packet.payload as SyncPayload
          if (!video) break

          const drift = Math.abs(video.currentTime - currentTime)
          if (drift > DRIFT_TOLERANCE_SECONDS) {
            isLocalAction.current = true
            video.currentTime = currentTime
            setTimeout(() => {
              isLocalAction.current = false
            }, 300)
          }

          if (isPlaying && video.paused) {
            video.play().catch(() => {})
          } else if (!isPlaying && !video.paused) {
            video.pause()
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

        case 'JOIN_REQUEST': {
          // When someone asks to join, host responds with current metadata and playback state
          if (isHost && video) {
            addSystemNotice(`${packet.senderName} joined the party!`)
            confetti({ particleCount: 30, spread: 45 })

            peerService.send({
              type: 'JOIN_ACK',
              senderId: peerService.myPeerId,
              senderName: userName,
              payload: {
                roomMetadata,
                currentState: {
                  isPlaying: !video.paused,
                  currentTime: video.currentTime,
                },
              },
            })
          }
          break
        }

        case 'JOIN_ACK': {
          const ack = packet.payload as {
            roomMetadata: RoomMetadata
            currentState: { isPlaying: boolean; currentTime: number }
          }
          setRoomMetadata(ack.roomMetadata)
          addSystemNotice(`Joined party hosted by ${packet.senderName}!`)
          if (video && ack.currentState) {
            video.currentTime = ack.currentState.currentTime
            if (ack.currentState.isPlaying) {
              video.play().catch(() => {})
            }
          }
          break
        }
      }
    },
    [isHost, userName, roomMetadata, addSystemNotice]
  )

  // Start Hosting
  const startHost = useCallback(
    async (initialRoomId?: string, initialMeta?: Partial<RoomMetadata>) => {
      try {
        setConnectionStatus('connecting')
        setErrorMessage(null)

        const generatedRoomId =
          initialRoomId || `party-${Math.random().toString(36).substring(2, 8)}`
        const id = await peerService.initHost(generatedRoomId)

        setRoomId(id)
        setIsHost(true)
        setConnectionStatus('connected')

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
          name: isHost ? `Friend ${idx + 1}` : 'Host',
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
      const video = videoRef.current
      peerService.send({
        type: 'JOIN_ACK',
        senderId: peerService.myPeerId,
        senderName: userName,
        payload: {
          roomMetadata,
          currentState: {
            isPlaying: video ? !video.paused : false,
            currentTime: video ? video.currentTime : 0,
          },
        },
      })
    })

    return () => {
      unsubMsg()
      unsubStatus()
      unsubPeers()
      unsubGuest()
    }
  }, [handleIncomingPacket, userName, isHost, roomMetadata])

  // Host heartbeat interval to keep guests in sync
  useEffect(() => {
    if (!isHost || connectionStatus !== 'connected') return

    const interval = setInterval(() => {
      const video = videoRef.current
      if (!video) return

      const now = Date.now()
      if (now - lastSyncTime.current >= SYNC_HEARTBEAT_INTERVAL_MS) {
        lastSyncTime.current = now
        peerService.send({
          type: 'SYNC_STATE',
          senderId: peerService.myPeerId,
          senderName: userName,
          payload: {
            isPlaying: !video.paused,
            currentTime: video.currentTime,
            playbackRate: video.playbackRate,
            timestamp: now,
          } as SyncPayload,
        })
      }
    }, SYNC_HEARTBEAT_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [isHost, connectionStatus, userName])

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
    videoRef,
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
  }
}
