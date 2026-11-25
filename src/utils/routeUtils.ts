/**
 * Utilities for URL parsing, route matching, and clean browser history management.
 * Supports /room/:roomId, /room/new, ?launch=<token>, #p=<opaque>, and fallback ?room=xxx.
 */

const LAUNCH_XOR_KEY = 'dp.launch.v1'

export interface ParsedRoute {
  type: 'landing' | 'room' | 'new-party'
  roomId: string | null
  streamUrl: string | null
  sourceType: string | null
  title: string | null
  poster: string | null
  launchToken: string | null
}

function decodeOpaquePayload(encoded: string): {
  s?: string
  k?: string
  t?: string
  i?: string
} | null {
  try {
    const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4 === 0 ? b64 : b64 + '='.repeat(4 - (b64.length % 4))
    const bin = atob(pad)
    const xored = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) {
      xored[i] = bin.charCodeAt(i)
    }
    const decoded = new Uint8Array(xored.length)
    for (let i = 0; i < xored.length; i++) {
      decoded[i] = xored[i] ^ LAUNCH_XOR_KEY.charCodeAt(i % LAUNCH_XOR_KEY.length)
    }
    const json = new TextDecoder().decode(decoded)
    return JSON.parse(json) as { s?: string; k?: string; t?: string; i?: string }
  } catch {
    return null
  }
}

export function parseCurrentRoute(): ParsedRoute {
  if (typeof window === 'undefined') {
    return {
      type: 'landing',
      roomId: null,
      streamUrl: null,
      sourceType: null,
      title: null,
      poster: null,
      launchToken: null,
    }
  }

  const pathname = window.location.pathname.replace(/\/+$/, '')
  const params = new URLSearchParams(window.location.search)
  const hash = window.location.hash || ''

  let streamUrl = params.get('stream')
  let sourceType = params.get('type')
  let title = params.get('title')
  let poster = params.get('poster')
  const launchToken = params.get('launch')
  const queryRoom = params.get('room')

  // Decode #p=<opaque> hash fallback if present
  if (hash.startsWith('#p=')) {
    const payload = decodeOpaquePayload(hash.slice(3))
    if (payload) {
      streamUrl = payload.s || streamUrl
      sourceType = payload.k || sourceType
      title = payload.t || title
      poster = payload.i || poster
    }
  }

  // Check /room/:id format
  const roomPathMatch = pathname.match(/^\/room\/([^/]+)$/)
  if (roomPathMatch) {
    const rawId = decodeURIComponent(roomPathMatch[1])
    if (rawId === 'new') {
      return {
        type: 'new-party',
        roomId: null,
        streamUrl,
        sourceType,
        title,
        poster,
        launchToken,
      }
    }
    return {
      type: 'room',
      roomId: rawId,
      streamUrl,
      sourceType,
      title,
      poster,
      launchToken,
    }
  }

  // Fallback to ?room= query param
  if (queryRoom) {
    return {
      type: 'room',
      roomId: queryRoom,
      streamUrl,
      sourceType,
      title,
      poster,
      launchToken,
    }
  }

  // If there are launch/stream parameters at root, treat as new-party intent
  if (launchToken || streamUrl || title) {
    return {
      type: 'new-party',
      roomId: null,
      streamUrl,
      sourceType,
      title,
      poster,
      launchToken,
    }
  }

  return {
    type: 'landing',
    roomId: null,
    streamUrl: null,
    sourceType: null,
    title: null,
    poster: null,
    launchToken: null,
  }
}

/**
 * Strip sensitive launch/stream query or hash parameters from the address bar after parsing.
 */
export function cleanSensitiveUrlParams(): void {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  const hasSensitive =
    params.has('launch') ||
    params.has('stream') ||
    params.has('type') ||
    window.location.hash.startsWith('#p=')
  if (hasSensitive) {
    const cleanUrl = window.location.pathname.replace(/\/+$/, '') || '/'
    window.history.replaceState(null, '', cleanUrl)
  }
}

/**
 * Update browser URL to /room/:roomId without page reload
 */
export function syncRoomUrl(roomId: string): void {
  if (typeof window === 'undefined') return
  const currentPath = window.location.pathname
  const targetPath = `/room/${encodeURIComponent(roomId)}`

  if (currentPath !== targetPath || window.location.search || window.location.hash) {
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
    return `https://party.dekhoprime.live/room/${encodeURIComponent(roomId)}`
  }
  const origin = window.location.origin
  return `${origin}/room/${encodeURIComponent(roomId)}`
}
