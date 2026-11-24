/**
 * Utilities for URL parsing, route matching, and clean browser history management.
 * Supports /room/:roomId, /room/new, and fallback ?room=xxx.
 */

export interface ParsedRoute {
  type: 'landing' | 'room' | 'new-party'
  roomId: string | null
  streamUrl: string | null
  title: string | null
  poster: string | null
}

export function parseCurrentRoute(): ParsedRoute {
  if (typeof window === 'undefined') {
    return {
      type: 'landing',
      roomId: null,
      streamUrl: null,
      title: null,
      poster: null,
    }
  }

  const pathname = window.location.pathname.replace(/\/+$/, '')
  const params = new URLSearchParams(window.location.search)

  const streamUrl = params.get('stream')
  const title = params.get('title')
  const poster = params.get('poster')
  const queryRoom = params.get('room')

  // Check /room/:id format
  const roomPathMatch = pathname.match(/^\/room\/([^/]+)$/)
  if (roomPathMatch) {
    const rawId = decodeURIComponent(roomPathMatch[1])
    if (rawId === 'new') {
      return {
        type: 'new-party',
        roomId: null,
        streamUrl,
        title,
        poster,
      }
    }
    return {
      type: 'room',
      roomId: rawId,
      streamUrl,
      title,
      poster,
    }
  }

  // Fallback to ?room= query param
  if (queryRoom) {
    return {
      type: 'room',
      roomId: queryRoom,
      streamUrl,
      title,
      poster,
    }
  }

  // If there are stream parameters but at root, treat as new-party intent
  if (streamUrl || title) {
    return {
      type: 'new-party',
      roomId: null,
      streamUrl,
      title,
      poster,
    }
  }

  return {
    type: 'landing',
    roomId: null,
    streamUrl: null,
    title: null,
    poster: null,
  }
}

/**
 * Update browser URL to /room/:roomId without page reload
 */
export function syncRoomUrl(roomId: string): void {
  if (typeof window === 'undefined') return
  const currentPath = window.location.pathname
  const targetPath = `/room/${encodeURIComponent(roomId)}`

  if (currentPath !== targetPath) {
    window.history.replaceState({ roomId }, '', targetPath)
  }
}

/**
 * Return to home landing page URL
 */
export function syncLandingUrl(): void {
  if (typeof window === 'undefined') return
  if (window.location.pathname !== '/') {
    window.history.pushState({}, '', '/')
  }
}

/**
 * Build shareable invite URL
 */
export function getPartyShareUrl(roomId: string): string {
  if (typeof window === 'undefined') {
    return `https://play.dekhoprime.live/room/${encodeURIComponent(roomId)}`
  }
  const origin = window.location.origin
  return `${origin}/room/${encodeURIComponent(roomId)}`
}

