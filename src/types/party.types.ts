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
  | 'CONTROL_MODE_CHANGE'
  | 'PARTICIPANT_INFO'
  | 'PARTICIPANT_ROSTER'

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
  posterUrl?: string
  isHostOnlyControl: boolean
  hostId: string
}

export interface PartyPacket<T = unknown> {
  type: PartyMessageType
  senderId: string
  senderName: string
  payload: T
}
