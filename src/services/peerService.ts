import Peer, { type DataConnection } from 'peerjs'
import type { PartyPacket } from '@/types/party.types'

export type PeerEventHandler = (packet: PartyPacket) => void
export type PeerStatusHandler = (
  status: 'disconnected' | 'connecting' | 'connected' | 'error',
  errorMsg?: string
) => void
export type PeerConnectionListHandler = (peerIds: string[]) => void
export type GuestConnectedHandler = (guestPeerId: string) => void

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]

export class PeerService {
  private peer: Peer | null = null
  private hostConnection: DataConnection | null = null
  private guestConnections: Map<string, DataConnection> = new Map()

  public myPeerId: string = ''
  public isHost: boolean = false

  private messageListeners: Set<PeerEventHandler> = new Set()
  private statusListeners: Set<PeerStatusHandler> = new Set()
  private peerListListeners: Set<PeerConnectionListHandler> = new Set()
  private guestConnectedListeners: Set<GuestConnectedHandler> = new Set()

  /**
   * Initialize a host peer with optional custom room ID and retry mechanism for reloads
   */
  public async initHost(roomId?: string, retryCount: number = 0): Promise<string> {
    this.isHost = true
    return new Promise((resolve, reject) => {
      this.cleanup()

      const peerInstance = roomId
        ? new Peer(roomId, { config: { iceServers: ICE_SERVERS } })
        : new Peer({ config: { iceServers: ICE_SERVERS } })

      this.peer = peerInstance

      peerInstance.on('open', (id) => {
        this.myPeerId = id
        this.notifyStatus('connected')
        resolve(id)
      })

      peerInstance.on('connection', (conn) => {
        this.setupGuestConnection(conn)
      })

      peerInstance.on('error', (err) => {
        // If ID is temporarily locked on page reload, retry once after a short delay
        if (err.type === 'unavailable-id' && roomId) {
          if (retryCount < 2) {
            setTimeout(() => {
              this.initHost(roomId, retryCount + 1).then(resolve).catch(reject)
            }, 1200)
            return
          }
          this.initHost().then(resolve).catch(reject)
          return
        }
        this.notifyStatus('error', err.message || 'Peer connection error')
        reject(err)
      })

      peerInstance.on('disconnected', () => {
        this.notifyStatus('disconnected')
      })
    })
  }

  /**
   * Initialize a guest peer and connect to target host room
   */
  public async initGuest(hostId: string): Promise<void> {
    this.isHost = false
    return new Promise((resolve, reject) => {
      this.cleanup()

      const peerInstance = new Peer({ config: { iceServers: ICE_SERVERS } })
      this.peer = peerInstance

      peerInstance.on('open', (id) => {
        this.myPeerId = id
        this.notifyStatus('connecting')
        this.connectToHost(hostId, resolve, reject)
      })

      peerInstance.on('error', (err) => {
        this.notifyStatus('error', err.message || 'Peer connection error')
        reject(err)
      })

      peerInstance.on('disconnected', () => {
        this.notifyStatus('disconnected')
      })
    })
  }

  private connectToHost(
    hostId: string,
    onSuccess: () => void,
    onError: (err: Error) => void
  ): void {
    if (!this.peer) return

    const conn = this.peer.connect(hostId, {
      reliable: true,
    })

    this.hostConnection = conn

    const handleOpen = () => {
      this.notifyStatus('connected')
      this.notifyPeerList([hostId])
      onSuccess()
    }

    if (conn.open) {
      handleOpen()
    } else {
      conn.on('open', handleOpen)
    }

    conn.on('data', (data) => {
      this.handleIncomingData(data)
    })

    conn.on('close', () => {
      this.notifyStatus('disconnected', 'Host disconnected')
      this.notifyPeerList([])
    })

    conn.on('error', (err) => {
      this.notifyStatus('error', err.message || 'Connection to host failed')
      onError(err)
    })
  }

  private setupGuestConnection(conn: DataConnection): void {
    const handleOpen = () => {
      this.guestConnections.set(conn.peer, conn)
      this.notifyPeerList(Array.from(this.guestConnections.keys()))
      this.notifyGuestConnected(conn.peer)
    }

    if (conn.open) {
      handleOpen()
    } else {
      conn.on('open', handleOpen)
    }

    conn.on('data', (data) => {
      this.handleIncomingData(data)
      // Host relays message to other guests
      this.relayToOtherGuests(conn.peer, data)
    })

    conn.on('close', () => {
      this.guestConnections.delete(conn.peer)
      this.notifyPeerList(Array.from(this.guestConnections.keys()))
    })

    conn.on('error', () => {
      this.guestConnections.delete(conn.peer)
      this.notifyPeerList(Array.from(this.guestConnections.keys()))
    })
  }

  private relayToOtherGuests(senderPeerId: string, data: unknown): void {
    for (const [peerId, conn] of this.guestConnections.entries()) {
      if (peerId !== senderPeerId && conn.open) {
        try {
          conn.send(data)
        } catch {
          // ignore transient send errors
        }
      }
    }
  }

  public send(packet: PartyPacket): void {
    if (this.isHost) {
      // Host broadcasts to all connected guests
      for (const conn of this.guestConnections.values()) {
        if (conn.open) {
          try {
            conn.send(packet)
          } catch {
            // handle transient error
          }
        }
      }
    } else if (this.hostConnection) {
      // Guest sends to host
      if (this.hostConnection.open) {
        try {
          this.hostConnection.send(packet)
        } catch {
          // handle transient error
        }
      } else {
        // Queue if opening
        this.hostConnection.once('open', () => {
          try {
            this.hostConnection?.send(packet)
          } catch {
            // handle error
          }
        })
      }
    }
  }

  private handleIncomingData(data: unknown): void {
    if (data && typeof data === 'object' && 'type' in data) {
      const packet = data as PartyPacket
      for (const listener of this.messageListeners) {
        listener(packet)
      }
    }
  }

  public onMessage(listener: PeerEventHandler): () => void {
    this.messageListeners.add(listener)
    return () => {
      this.messageListeners.delete(listener)
    }
  }

  public onStatus(listener: PeerStatusHandler): () => void {
    this.statusListeners.add(listener)
    return () => {
      this.statusListeners.delete(listener)
    }
  }

  public onPeerListChange(listener: PeerConnectionListHandler): () => void {
    this.peerListListeners.add(listener)
    return () => {
      this.peerListListeners.delete(listener)
    }
  }

  public onGuestConnected(listener: GuestConnectedHandler): () => void {
    this.guestConnectedListeners.add(listener)
    return () => {
      this.guestConnectedListeners.delete(listener)
    }
  }

  private notifyStatus(
    status: 'disconnected' | 'connecting' | 'connected' | 'error',
    errorMsg?: string
  ): void {
    for (const listener of this.statusListeners) {
      listener(status, errorMsg)
    }
  }

  private notifyPeerList(peerIds: string[]): void {
    for (const listener of this.peerListListeners) {
      listener(peerIds)
    }
  }

  private notifyGuestConnected(guestPeerId: string): void {
    for (const listener of this.guestConnectedListeners) {
      listener(guestPeerId)
    }
  }

  public cleanup(): void {
    if (this.hostConnection) {
      this.hostConnection.close()
      this.hostConnection = null
    }

    for (const conn of this.guestConnections.values()) {
      conn.close()
    }
    this.guestConnections.clear()

    if (this.peer) {
      this.peer.destroy()
      this.peer = null
    }

    this.myPeerId = ''
  }
}

export const peerService = new PeerService()
