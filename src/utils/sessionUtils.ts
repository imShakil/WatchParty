/**
 * Manages host session state across page reloads, browser refreshes, and permanent rooms.
 */
import type { RoomMetadata, ChatMessage } from '@/types/party.types'

const HOST_SESSION_KEY = 'dekho_party_host_session'
const PERMANENT_ROOMS_KEY = 'dpwp_permanent_host_rooms'

export interface HostSession {
  roomId: string
  roomMetadata: RoomMetadata
  savedAt: number
}

function sanitizeChatForLocalStorage(messages: ChatMessage[]): ChatMessage[] {
  return messages.slice(-50).map((msg) => {
    const hasDataImage = Boolean(msg.imageUrl?.startsWith('data:'))
    const hasAudio = Boolean(msg.audioUrl)
    let fallbackText = msg.text
    if (!fallbackText && hasDataImage) fallbackText = '[Image]'
    if (!fallbackText && hasAudio) fallbackText = '[Voice Note]'

    return {
      ...msg,
      text: fallbackText,
      imageUrl: hasDataImage ? undefined : msg.imageUrl,
      audioUrl: undefined,
    }
  })
}

export function saveRoomChat(
  roomId: string,
  messages: ChatMessage[],
  isPermanent?: boolean
): void {
  if (typeof window === 'undefined' || !roomId) return
  try {
    const key = `dpwp_chat_${roomId}`
    // Save last 100 messages to sessionStorage for fast reload recovery
    const trimmed = messages.slice(-100)
    sessionStorage.setItem(key, JSON.stringify(trimmed))

    // Persist lightweight chat history in localStorage for permanent rooms (100% client-side)
    const permMap = getPermanentRoomsMap()
    if (isPermanent || permMap[roomId]) {
      const permKey = `dpwp_perm_chat_${roomId}`
      localStorage.setItem(permKey, JSON.stringify(sanitizeChatForLocalStorage(messages)))
    }
  } catch (err) {
    console.warn('Failed to save room chat:', err)
  }
}

export function getRoomChat(roomId: string): ChatMessage[] {
  if (typeof window === 'undefined' || !roomId) return []
  try {
    const sessionRaw = sessionStorage.getItem(`dpwp_chat_${roomId}`)
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw) as ChatMessage[]
      if (parsed.length > 0) return parsed
    }

    const permRaw = localStorage.getItem(`dpwp_perm_chat_${roomId}`)
    if (permRaw) {
      return JSON.parse(permRaw) as ChatMessage[]
    }

    return []
  } catch {
    return []
  }
}

function getPermanentRoomsMap(): Record<string, HostSession> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(PERMANENT_ROOMS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, HostSession>) : {}
  } catch {
    return {}
  }
}

export function saveHostSession(roomId: string, roomMetadata: RoomMetadata): void {
  if (typeof window === 'undefined') return
  try {
    const session: HostSession = {
      roomId,
      roomMetadata,
      savedAt: Date.now(),
    }
    localStorage.setItem(HOST_SESSION_KEY, JSON.stringify(session))

    // Manage permanent room ownership registry (never expires)
    const permMap = getPermanentRoomsMap()
    if (roomMetadata.isPermanent) {
      permMap[roomId] = session
      localStorage.setItem(PERMANENT_ROOMS_KEY, JSON.stringify(permMap))
    } else if (permMap[roomId]) {
      delete permMap[roomId]
      localStorage.setItem(PERMANENT_ROOMS_KEY, JSON.stringify(permMap))
    }
  } catch (err) {
    console.warn('Failed to save host session:', err)
  }
}

export function getHostSession(targetRoomId?: string | null): HostSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(HOST_SESSION_KEY)
    if (raw) {
      const session: HostSession = JSON.parse(raw)
      const isExpired = Date.now() - session.savedAt > 24 * 60 * 60 * 1000
      if (!isExpired && (!targetRoomId || session.roomId === targetRoomId)) {
        return session
      }
      if (isExpired) {
        localStorage.removeItem(HOST_SESSION_KEY)
      }
    }

    // Fallback to permanent host registry if targetRoomId is specified
    if (targetRoomId) {
      const permMap = getPermanentRoomsMap()
      if (permMap[targetRoomId]) {
        return permMap[targetRoomId]
      }
    }

    return null
  } catch {
    return null
  }
}

export function clearHostSession(roomId?: string, keepPermanent = true): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(HOST_SESSION_KEY)
    if (!keepPermanent && roomId) {
      const permMap = getPermanentRoomsMap()
      if (permMap[roomId]) {
        delete permMap[roomId]
        localStorage.setItem(PERMANENT_ROOMS_KEY, JSON.stringify(permMap))
      }
    }
  } catch {}
}
