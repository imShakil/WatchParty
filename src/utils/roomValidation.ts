/**
 * Client-side Room ID format & reserved-word validation.
 */

const RESERVED_ROOM_IDS = new Set([
  'new',
  'create',
  'join',
  'room',
  'rooms',
  'admin',
  'api',
  'home',
  'index',
  'login',
  'auth',
  'settings',
  'party',
])

const VALID_ROOM_ID_REGEX = /^[a-z0-9][a-z0-9_-]*[a-z0-9]$/

export function sanitizeRoomIdInput(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_-]/g, '')
}

export function validateRoomIdFormat(roomId: string): { valid: boolean; reason?: string } {
  const trimmed = roomId.trim().toLowerCase()
  if (!trimmed) {
    return { valid: true } // Empty means auto-generate random ID
  }
  if (trimmed.length < 3) {
    return { valid: false, reason: 'Room ID must be at least 3 characters.' }
  }
  if (trimmed.length > 24) {
    return { valid: false, reason: 'Room ID cannot exceed 24 characters.' }
  }
  if (RESERVED_ROOM_IDS.has(trimmed)) {
    return { valid: false, reason: `"${trimmed}" is a reserved word.` }
  }
  if (!VALID_ROOM_ID_REGEX.test(trimmed)) {
    return {
      valid: false,
      reason: 'Room ID must start and end with a letter or number.',
    }
  }
  return { valid: true }
}

