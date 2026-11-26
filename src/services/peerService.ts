import Peer, { type DataConnection, type MediaConnection } from 'peerjs'
import type { PartyPacket } from '@/types/party.types'

export type PeerEventHandler = (packet: PartyPacket) => void
export type PeerStatusHandler = (
  status: 'disconnected' | 'connecting' | 'connected' | 'error',
  errorMsg?: string
) => void
export type PeerConnectionListHandler = (peerIds: string[]) => void
export type GuestConnectedHandler = (guestPeerId: string) => void
export type GuestDisconnectedHandler = (guestPeerId: string) => void
export type RemoteStreamHandler = (stream: MediaStream) => void

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]

export class PeerService {
  private peer: Peer | null = null
  private hostConnection: DataConnection | null = null
  private guestConnections: Map<string, DataConnection> = new Map()
  private mediaCalls: Map<string, MediaConnection> = new Map()
  private activeLocalStream: MediaStream | null = null
  private connectTimeoutTimer: ReturnType<typeof setTimeout> | null = null

  public myPeerId: string = ''
  public isHost: boolean = false

  private messageListeners: Set<PeerEventHandler> = new Set()
  private statusListeners: Set<PeerStatusHandler> = new Set()
  private peerListListeners: Set<PeerConnectionListHandler> = new Set()
  private guestConnectedListeners: Set<GuestConnectedHandler> = new Set()
  private guestDisconnectedListeners: Set<GuestDisconnectedHandler> = new Set()
  private remoteStreamListeners: Set<RemoteStreamHandler> = new Set()

  /**
   * Initialize a host peer with optional custom room ID and retry mechanism for reloads
   */
  public async initHost(
    roomId?: string,
    retryCount: number = 0,
    strictCustomId: boolean = false
  ): Promise<string> {
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
        // If ID is temporarily locked on page reload/tab close, retry until PeerJS releases it
        if (err.type === 'unavailable-id' && roomId) {
          const maxRetries = strictCustomId ? 6 : 2
          if (retryCount < maxRetries) {
            setTimeout(() => {
              this.initHost(roomId, retryCount + 1, strictCustomId).then(resolve).catch(reject)
            }, 1500)
            return
          }
          if (strictCustomId) {
            const collisionErr = new Error(
              'Previous session is still closing on the server. Please wait a few seconds and try again.'
            )
            this.notifyStatus('error', collisionErr.message)
            reject(collisionErr)
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

      // Guest answers incoming live media streams from host
      peerInstance.on('call', (mediaConn) => {
        mediaConn.answer() // Answer with no outbound media track
        mediaConn.on('stream', (remoteStream) => {
          this.notifyRemoteStream(remoteStream)
        })
      })

      peerInstance.on('error', (err) => {
        const isUnavailable =
          err.type === 'peer-unavailable' ||
          (err.message && err.message.toLowerCase().includes('could not connect to peer'))
        const errMsg = isUnavailable ? 'ROOM_EXPIRED' : (err.message || 'Peer connection error')
        this.notifyStatus('error', errMsg)
        reject(err)
      })

      peerInstance.on('disconnected', () => {
        this.notifyStatus('disconnected')
      })
    })
  }

  /**
   * Attempt to reconnect to host during temporary disconnect or page reload
   */
  public async reconnectToHost(hostId: string): Promise<boolean> {
    if (!this.peer || this.peer.destroyed || this.peer.disconnected) {
      try {
        await this.initGuest(hostId)
        return true
      } catch {
        return false
      }
    }

    return new Promise((resolve) => {
      this.connectToHost(
        hostId,
        () => resolve(true),
        () => resolve(false)
      )
    })
  }

  private connectToHost(
    hostId: string,
    onSuccess: () => void,
    onError: (err: Error) => void
  ): void {
    if (!this.peer) return

    if (this.connectTimeoutTimer) {
      clearTimeout(this.connectTimeoutTimer)
      this.connectTimeoutTimer = null
    }

    let isResolved = false
    this.connectTimeoutTimer = setTimeout(() => {
      if (!isResolved) {
        isResolved = true
        this.notifyStatus('error', 'ROOM_EXPIRED')
        onError(new Error('ROOM_EXPIRED'))
      }
    }, 6000)

    const conn = this.peer.connect(hostId, {
      reliable: true,
    })

    this.hostConnection = conn

    const handleOpen = () => {
      if (isResolved) return
      isResolved = true
      if (this.connectTimeoutTimer) {
        clearTimeout(this.connectTimeoutTimer)
        this.connectTimeoutTimer = null
      }
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
      if (this.connectTimeoutTimer) {
        clearTimeout(this.connectTimeoutTimer)
        this.connectTimeoutTimer = null
      }
      this.notifyStatus('disconnected', 'HOST_LEFT')
      this.notifyPeerList([])
    })

    conn.on('error', (err) => {
      if (isResolved) return
      isResolved = true
      if (this.connectTimeoutTimer) {
        clearTimeout(this.connectTimeoutTimer)
        this.connectTimeoutTimer = null
      }
      this.notifyStatus('error', 'ROOM_EXPIRED')
      onError(err)
    })
  }

  private setupGuestConnection(conn: DataConnection): void {
    const handleOpen = () => {
      this.guestConnections.set(conn.peer, conn)
      this.notifyPeerList(Array.from(this.guestConnections.keys()))
      this.notifyGuestConnected(conn.peer)

      // If host is currently broadcasting a local video stream, call this new guest
      if (this.activeLocalStream && this.peer) {
        try {
          const call = this.peer.call(conn.peer, this.activeLocalStream)
          if (call) {
            this.capVideoBitrate(call)
            this.mediaCalls.set(conn.peer, call)
            call.on('close', () => {
              this.mediaCalls.delete(conn.peer)
            })
            call.on('error', () => {
              this.mediaCalls.delete(conn.peer)
            })
          }
        } catch (err) {
          console.error(`Failed to initiate media call to guest ${conn.peer}:`, err)
        }
      }
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
      const call = this.mediaCalls.get(conn.peer)
      if (call) {
        try {
          call.close()
        } catch {
          // ignore
        }
        this.mediaCalls.delete(conn.peer)
      }
      this.guestConnections.delete(conn.peer)
      this.notifyPeerList(Array.from(this.guestConnections.keys()))
      this.notifyGuestDisconnected(conn.peer)
    })

    conn.on('error', () => {
      const call = this.mediaCalls.get(conn.peer)
      if (call) {
        try {
          call.close()
        } catch {
          // ignore
        }
        this.mediaCalls.delete(conn.peer)
      }
      this.guestConnections.delete(conn.peer)
      this.notifyPeerList(Array.from(this.guestConnections.keys()))
      this.notifyGuestDisconnected(conn.peer)
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

  /**
   * Send a packet directly to a specific connected guest peer
   */
  public sendToGuest(targetPeerId: string, packet: PartyPacket): void {
    const conn = this.guestConnections.get(targetPeerId)
    if (conn && conn.open) {
      try {
        conn.send(packet)
      } catch {
        // handle transient error
      }
    }
  }

  /**
   * Disconnect a specific guest peer from the host
   */
  public disconnectGuest(targetPeerId: string): void {
    const conn = this.guestConnections.get(targetPeerId)
    if (conn) {
      try {
        conn.close()
      } catch {
        // ignore
      }
      this.guestConnections.delete(targetPeerId)
    }
    const call = this.mediaCalls.get(targetPeerId)
    if (call) {
      try {
        call.close()
      } catch {
        // ignore
      }
      this.mediaCalls.delete(targetPeerId)
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

  public onGuestDisconnected(listener: GuestDisconnectedHandler): () => void {
    this.guestDisconnectedListeners.add(listener)
    return () => {
      this.guestDisconnectedListeners.delete(listener)
    }
  }

  private notifyGuestDisconnected(guestPeerId: string): void {
    for (const listener of this.guestDisconnectedListeners) {
      listener(guestPeerId)
    }
  }

  private capVideoBitrate(call: MediaConnection, maxBitrate = 1_800_000): void {
    const pc = call.peerConnection
    if (!pc) return
    for (const sender of pc.getSenders()) {
      if (sender.track?.kind === 'video') {
        const params = sender.getParameters()
        if (!params.encodings || params.encodings.length === 0) {
          params.encodings = [{}]
        }
        params.encodings[0].maxBitrate = maxBitrate
        void sender.setParameters(params).catch(() => {})
      }
    }
  }

  public broadcastStream(stream: MediaStream): void {
    this.activeLocalStream = stream
    if (!this.peer || !this.isHost) return

    for (const guestId of this.guestConnections.keys()) {
      const existingCall = this.mediaCalls.get(guestId)
      if (existingCall) {
        try {
          existingCall.close()
        } catch {
          // ignore
        }
      }

      try {
        const call = this.peer.call(guestId, stream)
        if (call) {
          this.capVideoBitrate(call)
          this.mediaCalls.set(guestId, call)
          call.on('close', () => {
            this.mediaCalls.delete(guestId)
          })
          call.on('error', () => {
            this.mediaCalls.delete(guestId)
          })
        }
      } catch (err) {
        console.error(`Failed to call peer ${guestId} with stream:`, err)
      }
    }
  }

  public stopStream(): void {
    this.activeLocalStream = null
    for (const call of this.mediaCalls.values()) {
      try {
        call.close()
      } catch {
        // ignore
      }
    }
    this.mediaCalls.clear()
  }

  public onRemoteStream(listener: RemoteStreamHandler): () => void {
    this.remoteStreamListeners.add(listener)
    return () => {
      this.remoteStreamListeners.delete(listener)
    }
  }

  private notifyRemoteStream(stream: MediaStream): void {
    for (const listener of this.remoteStreamListeners) {
      listener(stream)
    }
  }

  public cleanup(): void {
    if (this.connectTimeoutTimer) {
      clearTimeout(this.connectTimeoutTimer)
      this.connectTimeoutTimer = null
    }

    this.stopStream()
    this.remoteStreamListeners.clear()
    this.guestDisconnectedListeners.clear()

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
