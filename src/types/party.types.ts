export type PartyMessageType =
  | 'SYNC_STATE'
  | 'PLAY'
  | 'PAUSE'
  | 'SEEK'
  | 'BUFFER_STATE'
  | 'CHAT_MESSAGE'
  | 'REACTION'
  | 'HOST_CHANGE_STREAM'
  | 'ROOM_METADATA'
  | 'JOIN_REQUEST'
  | 'JOIN_ACK'
  | 'JOIN_REJECTED'
  | 'CONTROL_MODE_CHANGE'
  | 'PARTICIPANT_INFO'
  | 'PARTICIPANT_ROSTER'
  | 'ROOM_CLOSED'
  | 'TYPING_STATUS'
  | 'PEER_LEFT'

export interface JoinRejectedPayload {
  reason: 'ROOM_FULL' | 'ROOM_LOCKED' | 'WRONG_PASSCODE'
  message: string
  maxCapacity?: number
  currentCount?: number
  requiresPasscode?: boolean
}

export interface SyncPayload {
  isPlaying: boolean
  currentTime: number
  playbackRate?: number
  timestamp: number
}

export interface ControlPayload {
  time: number
  senderName: string
  timestamp: number
}

export interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  text: string
  imageUrl?: string
  audioUrl?: string
  audioDuration?: number
  timestamp: number
  isSystem?: boolean
  isHost?: boolean
}

export interface ReactionItem {
  id: string
  emoji: string
  senderName: string
  x: number // percentage 10-90% for floating positioning
}

export interface Participant {
  id: string
  name: string
  isHost: boolean
  isSelf: boolean
  isBuffering: boolean
  joinedAt: number
}

export interface RoomMetadata {
  roomId: string
  roomTitle: string
  streamUrl: string
  sourceType?: string
  posterUrl?: string
  isHostOnlyControl: boolean
  hostId: string
  isP2PStream?: boolean
  maxCapacity?: number // default 10, max 15
  isLocked?: boolean
  passcode?: string
  isPermanent?: boolean
}

export interface PartyPacket<T = unknown> {
  type: PartyMessageType
  senderId: string
  senderName: string
  payload: T
}
