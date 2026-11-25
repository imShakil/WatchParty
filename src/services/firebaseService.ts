import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAnalytics, isSupported, logEvent, type Analytics } from 'firebase/analytics'
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore'

// Fallback configuration ensuring Firebase always initializes reliably
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDQ_wQ7kC3QmM0m51s9NX_Ie5jge2_cob8',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'dekho-prime-iptv.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'dekho-prime-iptv',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'dekho-prime-iptv.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '25653412693',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:25653412693:web:8de2cd0ff5b4794f0c25dc',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-T3GKH4CRZ0',
}

let app: FirebaseApp | null = null
let analyticsInstance: Analytics | null = null
let firestoreInstance: Firestore | null = null
let isAnalyticsInitializing = false

// Multi-tier room timing:
// 1. Soft Stale (2 min): excluded from public landing page counter if host is lagging or disconnected
export const SOFT_STALE_THRESHOLD_MS = 120 * 1000
// 2. Hard Stale (5 min): automatically transitions room status to 'ended' in Firestore
export const STALE_ROOM_THRESHOLD_MS = 300 * 1000

/**
 * Initialize Firebase safely (singleton)
 */
function getFirebase() {
  if (app) return { app, firestore: firestoreInstance }

  try {
    const existingApps = getApps()
    app = existingApps.length > 0 ? existingApps[0] : initializeApp(firebaseConfig)
    firestoreInstance = getFirestore(app)

    // Lazy load Analytics asynchronously with browser support check
    if (!isAnalyticsInitializing && typeof window !== 'undefined') {
      isAnalyticsInitializing = true
      isSupported()
        .then((supported) => {
          if (supported && app) {
            analyticsInstance = getAnalytics(app)
          }
        })
        .catch(() => {
          // Non-fatal if blocked by browser privacy or ad-blocker
        })

      // Clean up orphaned stale rooms in background
      setTimeout(() => {
        void cleanupStalePartyRooms()
      }, 1500)
    }
  } catch (err) {
    console.warn('[DekhoParty] Firebase initialization deferred:', err)
  }

  return { app, firestore: firestoreInstance }
}

/**
 * Log analytics event to Firebase / GA4
 */
export function logPartyEvent(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  getFirebase()

  if (analyticsInstance) {
    try {
      logEvent(analyticsInstance, eventName, params)
    } catch {
      // Non-fatal if blocked
    }
  } else {
    // If analytics is still initializing, attempt logging once ready
    void isSupported()
      .then((supported) => {
        if (supported && app) {
          if (!analyticsInstance) {
            analyticsInstance = getAnalytics(app)
          }
          logEvent(analyticsInstance, eventName, params)
        }
      })
      .catch(() => {})
  }
}

/**
 * Register newly created watch party room in Firestore
 */
export async function registerPartyRoom(
  roomId: string,
  data: {
    title: string
    hostName: string
    isP2P?: boolean
    streamUrl?: string
    posterUrl?: string
    maxCapacity?: number
    isLocked?: boolean
    isPermanent?: boolean
  }
): Promise<void> {
  const { firestore } = getFirebase()
  if (!firestore || !roomId) return

  try {
    const roomRef = doc(firestore, 'party_rooms', roomId)
    await setDoc(
      roomRef,
      {
        roomId,
        title: data.title || 'Live Watch Party',
        hostName: data.hostName || 'Host',
        isP2P: Boolean(data.isP2P),
        ...(data.streamUrl ? { streamUrl: data.streamUrl } : {}),
        ...(data.posterUrl ? { posterUrl: data.posterUrl } : {}),
        maxCapacity: data.maxCapacity || 10,
        isLocked: Boolean(data.isLocked),
        isPermanent: Boolean(data.isPermanent),
        participantCount: 1,
        status: 'active',
        createdAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
      },
      { merge: true }
    )
  } catch (err) {
    console.warn('[DekhoParty] Firestore register room skipped:', err)
  }
}

/**
 * Update room permanent flag in Firestore
 */
export async function updatePartyRoomPermanent(
  roomId: string,
  isPermanent: boolean
): Promise<void> {
  const { firestore } = getFirebase()
  if (!firestore || !roomId) return

  try {
    const roomRef = doc(firestore, 'party_rooms', roomId)
    await updateDoc(roomRef, {
      isPermanent,
      lastActiveAt: serverTimestamp(),
    })
  } catch {
    // Non-fatal
  }
}

/**
 * Update real-time participant count and heartbeat timestamp
 */
export async function updatePartyRoomParticipantCount(
  roomId: string,
  count: number
): Promise<void> {
  const { firestore } = getFirebase()
  if (!firestore || !roomId) return

  try {
    const roomRef = doc(firestore, 'party_rooms', roomId)
    await updateDoc(roomRef, {
      participantCount: Math.max(1, count),
      lastActiveAt: serverTimestamp(),
    })
  } catch {
    // Non-fatal if room already closed or offline
  }
}

/**
 * Update periodic heartbeat for an active watch party room
 */
export async function updatePartyRoomHeartbeat(
  roomId: string,
  participantCount?: number
): Promise<void> {
  const { firestore } = getFirebase()
  if (!firestore || !roomId) return

  try {
    const roomRef = doc(firestore, 'party_rooms', roomId)
    const updatePayload: Record<string, unknown> = {
      status: 'active',
      lastActiveAt: serverTimestamp(),
    }
    if (typeof participantCount === 'number') {
      updatePayload.participantCount = Math.max(1, participantCount)
    }
    await updateDoc(roomRef, updatePayload)
  } catch {
    // Non-fatal if offline
  }
}

/**
 * Check room status in Firestore before attempting or after losing connection
 */
export async function checkPartyRoomStatus(roomId: string): Promise<{
  exists: boolean
  isActive: boolean
  isPermanent?: boolean
  status?: 'active' | 'standby' | 'ended'
  title?: string
  streamUrl?: string
  posterUrl?: string
  isLocked?: boolean
  isFull?: boolean
  maxCapacity?: number
  participantCount?: number
}> {
  const { firestore } = getFirebase()
  if (!firestore || !roomId) {
    return { exists: false, isActive: false }
  }

  try {
    const roomRef = doc(firestore, 'party_rooms', roomId)
    const snap = await getDoc(roomRef)
    if (!snap.exists()) {
      return { exists: false, isActive: false }
    }

    const data = snap.data()
    const now = Date.now()
    const lastActive =
      data.lastActiveAt?.toMillis?.() || data.createdAt?.toMillis?.() || 0
    const isStale = now - lastActive > STALE_ROOM_THRESHOLD_MS
    const isPermanent = Boolean(data.isPermanent)
    const isActive = data.status === 'active' && !isStale
    const status = isActive ? 'active' : isPermanent ? 'standby' : 'ended'
    const maxCapacity = (data.maxCapacity as number) || 10
    const participantCount = (data.participantCount as number) || 1
    const isLocked = Boolean(data.isLocked)
    const isFull = participantCount >= maxCapacity

    return {
      exists: true,
      isActive,
      isPermanent,
      status,
      title: (data.title as string) || undefined,
      streamUrl: (data.streamUrl as string) || undefined,
      posterUrl: (data.posterUrl as string) || undefined,
      isLocked,
      isFull,
      maxCapacity,
      participantCount,
    }
  } catch {
    // On read error, default to true so P2P attempt can continue
    return { exists: true, isActive: true }
  }
}

/**
 * Cleanup stale rooms that were abruptly closed without calling endPartyRoom
 */
export async function cleanupStalePartyRooms(): Promise<void> {
  const { firestore } = getFirebase()
  if (!firestore) return

  try {
    const roomsCol = collection(firestore, 'party_rooms')
    const activeQuery = query(roomsCol, where('status', '==', 'active'))
    const snap = await getDocs(activeQuery)
    const now = Date.now()

    snap.forEach((docSnap) => {
      const data = docSnap.data()
      const lastActive =
        data.lastActiveAt?.toMillis?.() || data.createdAt?.toMillis?.() || 0
      if (now - lastActive > STALE_ROOM_THRESHOLD_MS) {
        if (data.isPermanent) {
          void updateDoc(docSnap.ref, {
            status: 'standby',
            participantCount: 0,
          }).catch(() => {})
        } else {
          void updateDoc(docSnap.ref, {
            status: 'ended',
            endedAt: serverTimestamp(),
          }).catch(() => {})
        }
      }
    })
  } catch {
    // Non-fatal
  }
}

/**
 * Mark watch party room as ended/closed (or standby if permanent) in Firestore
 */
export async function endPartyRoom(roomId: string, isPermanent?: boolean): Promise<void> {
  const { firestore } = getFirebase()
  if (!firestore || !roomId) return

  try {
    const roomRef = doc(firestore, 'party_rooms', roomId)
    if (isPermanent) {
      await updateDoc(roomRef, {
        status: 'standby',
        participantCount: 0,
        lastActiveAt: serverTimestamp(),
      })
    } else {
      await updateDoc(roomRef, {
        status: 'ended',
        endedAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
      })
    }
  } catch {
    // Non-fatal if already removed
  }
}

export interface LivePartyStats {
  activeRooms: number
  activeViewers: number
}

/**
 * Subscribe to real-time active watch parties and viewer count for landing page badge
 */
export function subscribeToActivePartyStats(
  callback: (stats: LivePartyStats) => void
): () => void {
  const { firestore } = getFirebase()
  if (!firestore) {
    callback({ activeRooms: 0, activeViewers: 0 })
    return () => {}
  }

  try {
    const roomsCol = collection(firestore, 'party_rooms')
    const activeQuery = query(roomsCol, where('status', '==', 'active'))

    const unsubscribe = onSnapshot(
      activeQuery,
      (snapshot) => {
        let totalViewers = 0
        let validRooms = 0
        const now = Date.now()

        snapshot.forEach((docSnap) => {
          const roomData = docSnap.data()
          const lastActive =
            roomData.lastActiveAt?.toMillis?.() ||
            roomData.createdAt?.toMillis?.() ||
            0
          const isSoftStale = now - lastActive > SOFT_STALE_THRESHOLD_MS
          const isHardStale = now - lastActive > STALE_ROOM_THRESHOLD_MS

          if (!isSoftStale && roomData.status === 'active') {
            validRooms += 1
            totalViewers += Number(roomData.participantCount) || 1
          } else if (isHardStale && roomData.status === 'active') {
            if (roomData.isPermanent) {
              void updateDoc(docSnap.ref, {
                status: 'standby',
                participantCount: 0,
              }).catch(() => {})
            } else {
              // Asynchronously mark hard stale room as ended in Firestore
              void updateDoc(docSnap.ref, {
                status: 'ended',
                endedAt: serverTimestamp(),
              }).catch(() => {})
            }
          }
        })

        callback({
          activeRooms: validRooms,
          activeViewers: totalViewers,
        })
      },
      () => {
        // Fallback on permission or network error
        callback({ activeRooms: 0, activeViewers: 0 })
      }
    )

    return unsubscribe
  } catch {
    callback({ activeRooms: 0, activeViewers: 0 })
    return () => {}
  }
}

