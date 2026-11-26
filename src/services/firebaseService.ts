import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAnalytics, isSupported, logEvent, type Analytics } from 'firebase/analytics'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth'
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  increment,
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
let authInstance: Auth | null = null
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
  if (app) return { app, firestore: firestoreInstance, auth: authInstance }

  try {
    const existingApps = getApps()
    app = existingApps.length > 0 ? existingApps[0] : initializeApp(firebaseConfig)
    firestoreInstance = getFirestore(app)
    authInstance = getAuth(app)

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

  return { app, firestore: firestoreInstance, auth: authInstance }
}

/**
 * Auth helpers (Google Sign-In for Permanent Room ID ownership)
 */
export function getCurrentUserUid(): string | null {
  const { auth } = getFirebase()
  return auth?.currentUser?.uid || null
}

export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  const { auth } = getFirebase()
  if (!auth) {
    callback(null)
    return () => {}
  }
  return onAuthStateChanged(auth, callback)
}

export async function signInWithGoogle(): Promise<User | null> {
  const { auth } = getFirebase()
  if (!auth) return null
  const provider = new GoogleAuthProvider()
  const result = await signInWithPopup(auth, provider)
  return result.user
}

export async function signOutUser(): Promise<void> {
  const { auth } = getFirebase()
  if (!auth) return
  await signOut(auth)
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
 * Consume an ephemeral launch token created by the DekhoPrime main app,
 * returning its hidden stream metadata and deleting the token immediately.
 */
export async function consumeLaunchToken(tokenId: string): Promise<{
  streamUrl?: string
  sourceType?: string
  title?: string
  poster?: string
} | null> {
  const { firestore } = getFirebase()
  if (!firestore || !tokenId) return null

  try {
    const tokenRef = doc(firestore, 'party_launch_tokens', tokenId)
    const snap = await getDoc(tokenRef)
    if (!snap.exists()) return null

    const data = snap.data()
    void deleteDoc(tokenRef).catch(() => {})

    return {
      streamUrl: (data.streamUrl as string) || undefined,
      sourceType: (data.sourceType as string) || undefined,
      title: (data.title as string) || undefined,
      poster: (data.poster as string) || undefined,
    }
  } catch {
    return null
  }
}

/**
 * Check whether a custom Room ID is eligible and available (not active or reserved by another host).
 */
export async function checkRoomIdEligibility(
  roomId: string,
  hasLocalHostOwnership: boolean,
  allowOwnedActive = false
): Promise<{ eligible: boolean; reason?: string; isOwnedPermanent?: boolean }> {
  const { firestore, auth } = getFirebase()
  if (!firestore || !roomId) {
    return { eligible: true }
  }

  try {
    if (auth?.authStateReady) {
      await auth.authStateReady()
    }
    const roomRef = doc(firestore, 'party_rooms', roomId)
    const snap = await getDoc(roomRef)
    if (!snap.exists()) {
      return { eligible: true }
    }

    const data = snap.data()
    const now = Date.now()
    const lastActive =
      data.lastActiveAt?.toMillis?.() || data.createdAt?.toMillis?.() || 0
    const isStale = now - lastActive > STALE_ROOM_THRESHOLD_MS
    const isActive = data.status === 'active' && !isStale
    const isPermanent = Boolean(data.isPermanent)
    const currentUid = auth?.currentUser?.uid || getCurrentUserUid()
    const isOwner =
      Boolean(currentUid && data.ownerUid && data.ownerUid === currentUid) ||
      hasLocalHostOwnership

    if (isActive && !(allowOwnedActive && isOwner)) {
      return {
        eligible: false,
        reason: 'Room ID is currently in use by an active party.',
      }
    }

    if (isPermanent && !isOwner) {
      return {
        eligible: false,
        reason: 'This permanent Room ID is reserved by another host.',
      }
    }

    if (isPermanent && isOwner) {
      return { eligible: true, isOwnedPermanent: true }
    }

    return { eligible: true }
  } catch {
    return { eligible: true }
  }
}

const GLOBAL_STATS_DOC_ID = 'global-stats'

async function ensureAndIncrementTotalRooms(shouldIncrement: boolean): Promise<void> {
  const { firestore } = getFirebase()
  if (!firestore) return

  try {
    const statsRef = doc(firestore, 'party_rooms', GLOBAL_STATS_DOC_ID)
    const statsSnap = await getDoc(statsRef)
    if (!statsSnap.exists()) {
      const roomsSnap = await getDocs(collection(firestore, 'party_rooms'))
      let baseline = 0
      roomsSnap.forEach((d) => {
        if (d.id !== GLOBAL_STATS_DOC_ID) baseline += 1
      })
      await setDoc(
        statsRef,
        {
          status: 'stats',
          totalRoomsCreated: baseline + (shouldIncrement ? 1 : 0),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    } else if (shouldIncrement) {
      await updateDoc(statsRef, {
        totalRoomsCreated: increment(1),
        updatedAt: serverTimestamp(),
      })
    }
  } catch {
    // Non-fatal
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
    ownerUid?: string
  }
): Promise<void> {
  const { firestore } = getFirebase()
  if (!firestore || !roomId || roomId === GLOBAL_STATS_DOC_ID) return

  try {
    const roomRef = doc(firestore, 'party_rooms', roomId)
    const existingSnap = await getDoc(roomRef)
    const resolvedOwnerUid = data.ownerUid || getCurrentUserUid() || undefined
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
        ...(resolvedOwnerUid ? { ownerUid: resolvedOwnerUid } : {}),
        participantCount: 1,
        status: 'active',
        createdAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
      },
      { merge: true }
    )
    if (!existingSnap.exists()) {
      void ensureAndIncrementTotalRooms(true)
    }
  } catch (err) {
    console.warn('[DekhoParty] Firestore register room skipped:', err)
  }
}

/**
 * Update room permanent flag in Firestore
 */
export async function updatePartyRoomPermanent(
  roomId: string,
  isPermanent: boolean,
  ownerUid?: string
): Promise<void> {
  const { firestore } = getFirebase()
  if (!firestore || !roomId) return

  try {
    const roomRef = doc(firestore, 'party_rooms', roomId)
    const uid = ownerUid || getCurrentUserUid()
    await updateDoc(roomRef, {
      isPermanent,
      ...(isPermanent && uid ? { ownerUid: uid } : {}),
      lastActiveAt: serverTimestamp(),
    })
  } catch {
    // Non-fatal
  }
}

export interface PermanentRoomSummary {
  roomId: string
  title: string
  streamUrl?: string
  posterUrl?: string
  status: string
}

/**
 * Fetch all permanent rooms owned by the signed-in Google user.
 */
export async function getUserPermanentRooms(uid: string): Promise<PermanentRoomSummary[]> {
  const { firestore } = getFirebase()
  if (!firestore || !uid) return []

  try {
    const roomsCol = collection(firestore, 'party_rooms')
    // Single-field query avoids requiring a composite Firestore index
    const q = query(roomsCol, where('ownerUid', '==', uid))
    const snap = await getDocs(q)
    const rooms: PermanentRoomSummary[] = []
    snap.forEach((d) => {
      const data = d.data()
      if (!data.isPermanent) return
      rooms.push({
        roomId: d.id,
        title: (data.title as string) || d.id,
        streamUrl: (data.streamUrl as string) || undefined,
        posterUrl: (data.posterUrl as string) || undefined,
        status: (data.status as string) || 'standby',
      })
    })
    return rooms
  } catch (err) {
    console.warn('[DekhoParty] Failed to fetch user permanent rooms:', err)
    return []
  }
}

/**
 * Remove a permanent room from the user's saved list and delete its Firestore record.
 */
export async function removePermanentRoom(roomId: string): Promise<void> {
  const { firestore } = getFirebase()
  if (!firestore || !roomId) return

  try {
    const roomRef = doc(firestore, 'party_rooms', roomId)
    await deleteDoc(roomRef)
  } catch {
    // Fallback if delete rule is restricted
    try {
      const roomRef = doc(firestore, 'party_rooms', roomId)
      await updateDoc(roomRef, {
        isPermanent: false,
        status: 'ended',
        ownerUid: null,
        lastActiveAt: serverTimestamp(),
      })
    } catch {
      // Non-fatal
    }
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
  ownerUid?: string
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
      ownerUid: (data.ownerUid as string) || undefined,
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

const ENDED_ROOM_RETENTION_MS = 24 * 60 * 60 * 1000 // Delete ended temporary rooms after 24 hours

/**
 * Cleanup stale rooms that were abruptly closed without calling endPartyRoom,
 * and delete ended non-permanent rooms older than 1 hour.
 */
export async function cleanupStalePartyRooms(): Promise<void> {
  const { firestore } = getFirebase()
  if (!firestore) return

  try {
    const roomsCol = collection(firestore, 'party_rooms')
    const now = Date.now()

    const activeQuery = query(roomsCol, where('status', '==', 'active'))
    const activeSnap = await getDocs(activeQuery)

    activeSnap.forEach((docSnap) => {
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

    const endedQuery = query(roomsCol, where('status', '==', 'ended'))
    const endedSnap = await getDocs(endedQuery)

    endedSnap.forEach((docSnap) => {
      const data = docSnap.data()
      if (data.isPermanent) return
      const endedAt =
        data.endedAt?.toMillis?.() ||
        data.lastActiveAt?.toMillis?.() ||
        data.createdAt?.toMillis?.() ||
        0
      if (now - endedAt > ENDED_ROOM_RETENTION_MS) {
        void deleteDoc(docSnap.ref).catch(() => {})
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
  totalRoomsCreated: number
}

/**
 * Subscribe to real-time active watch parties, viewer count, and monotonic total rooms created
 */
export function subscribeToActivePartyStats(
  callback: (stats: LivePartyStats) => void
): () => void {
  const { firestore } = getFirebase()
  if (!firestore) {
    callback({ activeRooms: 0, activeViewers: 0, totalRoomsCreated: 0 })
    return () => {}
  }

  let latestActiveRooms = 0
  let latestActiveViewers = 0
  let latestTotalCreated = 0

  const emit = () => {
    callback({
      activeRooms: latestActiveRooms,
      activeViewers: latestActiveViewers,
      totalRoomsCreated: latestTotalCreated,
    })
  }

  try {
    const roomsCol = collection(firestore, 'party_rooms')
    const activeQuery = query(roomsCol, where('status', '==', 'active'))
    const statsRef = doc(firestore, 'party_rooms', GLOBAL_STATS_DOC_ID)

    const unsubActive = onSnapshot(
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

        latestActiveRooms = validRooms
        latestActiveViewers = totalViewers
        emit()
      },
      () => {
        latestActiveRooms = 0
        latestActiveViewers = 0
        emit()
      }
    )

    const unsubTotal = onSnapshot(
      statsRef,
      (snap) => {
        if (!snap.exists()) {
          void ensureAndIncrementTotalRooms(false)
          return
        }
        latestTotalCreated = Number(snap.data()?.totalRoomsCreated) || 0
        emit()
      },
      () => {
        // Non-fatal
      }
    )

    return () => {
      unsubActive()
      unsubTotal()
    }
  } catch {
    callback({ activeRooms: 0, activeViewers: 0, totalRoomsCreated: 0 })
    return () => {}
  }
}

