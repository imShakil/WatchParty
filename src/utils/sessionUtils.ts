/**
 * Manages host session state across page reloads and browser refreshes.
 */
import type { RoomMetadata } from '@/types/party.types'

const HOST_SESSION_KEY = 'dekho_party_host_session'

export interface HostSession {
  roomId: string
  roomMetadata: RoomMetadata
  savedAt: number
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
  } catch (err) {
    console.warn('Failed to save host session:', err)
  }
}

export function getHostSession(targetRoomId?: string | null): HostSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(HOST_SESSION_KEY)
    if (!raw) return null
    const session: HostSession = JSON.parse(raw)

    // Expire session after 24 hours
    if (Date.now() - session.savedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(HOST_SESSION_KEY)
      return null
    }

    // If targetRoomId is specified, check that it matches
    if (targetRoomId && session.roomId !== targetRoomId) {
      return null
    }

    return session
  } catch {
    return null
  }
}

export function clearHostSession(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(HOST_SESSION_KEY)
  } catch {}
}

