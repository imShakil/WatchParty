import { useState, useEffect, useRef } from 'react'
import { useWatchParty } from '@/hooks/useWatchParty'
import { usePartyAuth } from '@/hooks/usePartyAuth'
import { PartyHeader } from '@/components/header/PartyHeader'
import { PartyPlayer } from '@/components/player/PartyPlayer'
import { PartyChat } from '@/components/chat/PartyChat'
import { FloatingReactions } from '@/components/reactions/FloatingReactions'
import { InviteModal } from '@/components/modals/InviteModal'
import { StreamSelectorModal } from '@/components/modals/StreamSelectorModal'
import { EditNameModal } from '@/components/modals/EditNameModal'
import { WelcomeModal } from '@/components/modals/WelcomeModal'
import { ConfirmModal } from '@/components/modals/ConfirmModal'
import { RoomExpiredModal } from '@/components/modals/RoomExpiredModal'
import { LandingPage } from '@/components/landing/LandingPage'
import { parseCurrentRoute, syncRoomUrl, cleanSensitiveUrlParams } from '@/utils/routeUtils'
import { getHostSession } from '@/utils/sessionUtils'
import { checkPartyRoomStatus, consumeLaunchToken } from '@/services/firebaseService'

export function App() {
  const { user, signIn, logOut } = usePartyAuth()
  const [standbyOwnerUid, setStandbyOwnerUid] = useState<string | undefined>(undefined)

  const {
    connectionStatus,
    errorMessage,
    isRoomExpired,
    isRoomStandby,
    roomExpiredReason,
    isHostReconnecting,
    hostReconnectCountdown,
    continueWatchingSolo,
    takeOverAsHost,
    markRoomExpired,
    dismissRoomExpired,
    roomId,
    isHost,
    isRoomLocked,
    toggleRoomLock,
    roomPasscode,
    updateRoomPasscode,
    isPermanent,
    toggleRoomPermanent,
    maxCapacity,
    updateMaxCapacity,
    userName,
    updateUserName,
    roomMetadata,
    participants,
    messages,
    reactions,
    typingUsers,
    isPeerBuffering,
    bufferingPeerName,
    remoteStream,
    broadcastLocalStream,
    stopLocalStream,
    embedClockTime,
    embedClockRunning,
    hostSyncTime,
    embedStartAt,
    embedSyncNonce,
    syncEmbedToHost,
    handleEmbedPlayerEvent,
    videoRef,
    playerControllerRef,
    triggerReaction,
    sendChatMessage,
    sendTypingStatus,
    handlePlayerPlay,
    handlePlayerPause,
    handlePlayerSeek,
    handleBuffering,
    changeStream,
    selectPlaylistTrack,
    toggleHostOnlyControl,
    startHost,
    joinRoom,
    terminateRoom,
  } = useWatchParty()

  // Modals state
  const [isInviteOpen, setIsInviteOpen] = useState<boolean>(false)
  const [isStreamModalOpen, setIsStreamModalOpen] = useState<boolean>(false)
  const [isEditNameOpen, setIsEditNameOpen] = useState<boolean>(false)
  const [isConfirmExitOpen, setIsConfirmExitOpen] = useState<boolean>(false)
  // URL and Path Route parsing (/room/:id, /room/new, or landing)
  const [initialRoute] = useState(() => parseCurrentRoute())
  const [launchMeta, setLaunchMeta] = useState<{
    streamUrl?: string
    sourceType?: string
    title?: string
    poster?: string
  } | null>(null)
  const urlRoom = initialRoute.roomId
  const urlStream = launchMeta?.streamUrl || initialRoute.streamUrl
  const urlSourceType = launchMeta?.sourceType || initialRoute.sourceType
  const urlTitle = launchMeta?.title || initialRoute.title
  const urlPoster = launchMeta?.poster || initialRoute.poster

  useEffect(() => {
    cleanSensitiveUrlParams()
    if (!initialRoute.launchToken) return
    void consumeLaunchToken(initialRoute.launchToken).then((resolved) => {
      if (resolved) {
        setLaunchMeta(resolved)
      }
    })
  }, [initialRoute.launchToken])

  const [isWelcomeOpen, setIsWelcomeOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const initial = parseCurrentRoute()
    if (initial.roomId && getHostSession(initial.roomId)) return false
    return true
  })
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(false)

  // Auto-fill nickname from Google profile when signed in (if still default Viewer XXX)
  useEffect(() => {
    if (user?.displayName && userName.startsWith('Viewer ')) {
      updateUserName(user.displayName)
    }
  }, [user?.displayName, userName, updateUserName])

  // Sync route when connected to a room
  useEffect(() => {
    if (roomId && connectionStatus === 'connected') {
      syncRoomUrl(roomId)
    }
  }, [roomId, connectionStatus])

  // Auto-restore host status on page reload if this client hosted this room
  useEffect(() => {
    if (!urlRoom || connectionStatus !== 'disconnected') return
    const savedHost = getHostSession(urlRoom)
    if (savedHost) {
      startHost(urlRoom, savedHost.roomMetadata)
    }
  }, [urlRoom, connectionStatus, startHost])

  // Pre-check direct room URL status in Firestore to detect expired theater early
  useEffect(() => {
    if (!urlRoom || getHostSession(urlRoom) || connectionStatus === 'connected') return

    void checkPartyRoomStatus(urlRoom).then((status) => {
      if (status.exists && !status.isActive) {
        setIsWelcomeOpen(false)
        if (status.isPermanent) {
          setStandbyOwnerUid(status.ownerUid)
          markRoomExpired(
            'This permanent watch room is currently on standby. The host is away.',
            true
          )
        } else {
          markRoomExpired('This watch party has already ended or the host is offline.', false)
        }
      }
    })
  }, [urlRoom, markRoomExpired, connectionStatus])

  const handleHostParty = (
    streamUrl?: string,
    title?: string,
    customRoomId?: string,
    posterUrl?: string,
    permanentFlag?: boolean
  ) => {
    const defaultStream =
      urlStream || streamUrl || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
    const defaultTitle = urlTitle || title || 'DekhoPrime Watch Party'
    const defaultPoster = urlPoster || posterUrl || undefined

    startHost(customRoomId, {
      streamUrl: defaultStream,
      sourceType: urlSourceType || undefined,
      roomTitle: defaultTitle,
      posterUrl: defaultPoster,
      isPermanent: permanentFlag,
    })
    setIsWelcomeOpen(false)
  }

  const preTabShareMetaRef = useRef<{ url: string; title: string } | null>(null)
  const activeTabStreamRef = useRef<MediaStream | null>(null)
  const [localTabStream, setLocalTabStream] = useState<MediaStream | null>(null)

  const handleStopTabShare = () => {
    if (activeTabStreamRef.current) {
      for (const track of activeTabStreamRef.current.getTracks()) {
        track.stop()
      }
      activeTabStreamRef.current = null
    }
    setLocalTabStream(null)
    stopLocalStream()
    const prev = preTabShareMetaRef.current
    if (prev && prev.url && !prev.url.startsWith('p2p://')) {
      changeStream(prev.url, prev.title, undefined, false)
    }
    preTabShareMetaRef.current = null
  }

  const handleStartTabShare = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error('Browser tab sharing is not supported on this device/browser.')
    }
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    })
    if (roomMetadata.streamUrl && !roomMetadata.streamUrl.startsWith('p2p://')) {
      preTabShareMetaRef.current = {
        url: roomMetadata.streamUrl,
        title: roomMetadata.roomTitle,
      }
    }
    activeTabStreamRef.current = stream
    setLocalTabStream(stream)
    const videoTrack = stream.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.onended = () => handleStopTabShare()
    }
    broadcastLocalStream(stream)
    changeStream('p2p://tab-share', 'Live Browser Tab Share', undefined, true)
  }

  const handleJoinParty = (targetRoomId: string) => {
    joinRoom(targetRoomId)
    setIsWelcomeOpen(false)
  }

  // Determine if user is on landing page (no active room, no direct invite in URL, and room not expired)
  const isLandingView =
    !roomId &&
    connectionStatus !== 'connected' &&
    connectionStatus !== 'connecting' &&
    !urlRoom &&
    initialRoute.type === 'landing' &&
    !isRoomExpired

  if (isLandingView) {
    return (
      <>
        <LandingPage
          userName={userName}
          user={user}
          onSignIn={signIn}
          onSignOut={logOut}
          onSaveName={updateUserName}
          onHostParty={handleHostParty}
          onJoinParty={handleJoinParty}
        />
        {errorMessage && (
          <div
            style={{
              position: 'fixed',
              bottom: '1rem',
              left: '1rem',
              zIndex: 110,
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--danger, #ef4444)',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
            }}
          >
            {errorMessage}
          </div>
        )}
      </>
    )
  }

  return (
    <div className="app-container">
      {/* Top Header */}
      <PartyHeader
        roomTitle={roomMetadata.roomTitle}
        roomId={roomId}
        isHost={isHost}
        participantsCount={participants.length}
        isPeerBuffering={isPeerBuffering}
        bufferingPeerName={bufferingPeerName}
        userName={userName}
        isTheaterMode={isTheaterMode}
        onToggleTheaterMode={() => setIsTheaterMode((prev) => !prev)}
        onOpenInvite={() => setIsInviteOpen(true)}
        onOpenStreamModal={() => setIsStreamModalOpen(true)}
        onEditName={() => setIsEditNameOpen(true)}
        onLeaveOrTerminate={() => setIsConfirmExitOpen(true)}
      />

      {/* Main Split View */}
      <main className={`party-main ${isTheaterMode ? 'theater-mode' : ''}`}>
        {/* Left: Video Player */}
        <div className="player-wrapper">
          <PartyPlayer
            streamUrl={roomMetadata.streamUrl}
            sourceType={roomMetadata.sourceType}
            posterUrl={roomMetadata.posterUrl}
            isHost={isHost}
            isHostOnlyControl={roomMetadata.isHostOnlyControl}
            isP2PStream={roomMetadata.isP2PStream}
            remoteStream={remoteStream}
            localTabStream={localTabStream}
            embedStartAt={embedStartAt}
            embedSyncNonce={embedSyncNonce}
            embedClockTime={embedClockTime}
            embedClockRunning={embedClockRunning}
            hostSyncTime={hostSyncTime}
            onBroadcastLocalStream={broadcastLocalStream}
            onStopTabShare={handleStopTabShare}
            onSyncEmbedToHost={syncEmbedToHost}
            onEmbedPlayerEvent={handleEmbedPlayerEvent}
            videoRef={videoRef}
            controllerRef={playerControllerRef}
            onPlay={handlePlayerPlay}
            onPause={handlePlayerPause}
            onSeek={handlePlayerSeek}
            onBuffering={handleBuffering}
            onSelectPlaylistTrack={selectPlaylistTrack}
          />

          {/* Subtle Room ID Watermark */}
          {roomId && (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                bottom: '3.25rem',
                left: '0.85rem',
                zIndex: 18,
                pointerEvents: 'none',
                userSelect: 'none',
                fontSize: '0.7rem',
                fontFamily: 'monospace',
                fontWeight: 600,
                letterSpacing: '0.04em',
                color: 'rgba(255, 255, 255, 0.28)',
                textShadow: '0 1px 4px rgba(0, 0, 0, 0.85)',
              }}
            >
              #{roomId}
            </div>
          )}

          {/* Floating Emoji Reactions Layer */}
          <FloatingReactions reactions={reactions} />

          {/* Host Reconnecting Grace Period Banner */}
          {isHostReconnecting && (
            <div
              style={{
                position: 'absolute',
                top: '1rem',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 40,
                background: 'rgba(18, 21, 31, 0.94)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(245, 158, 11, 0.45)',
                borderRadius: '999px',
                padding: '0.5rem 1.15rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 15px rgba(245, 158, 11, 0.2)',
                color: '#fbbf24',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  border: '2px solid #fbbf24',
                  borderTopColor: 'transparent',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <span>Host disconnected. Reconnecting ({hostReconnectCountdown}s)...</span>
            </div>
          )}
        </div>

        {/* Right: Live Chat & Participants Sidebar */}
        <PartyChat
          messages={messages}
          participants={participants}
          typingUsers={typingUsers}
          isHost={isHost}
          isHostOnlyControl={roomMetadata.isHostOnlyControl}
          onToggleControlMode={toggleHostOnlyControl}
          isRoomLocked={isRoomLocked}
          onToggleRoomLock={toggleRoomLock}
          roomPasscode={roomPasscode}
          onUpdateRoomPasscode={updateRoomPasscode}
          isPermanent={isPermanent}
          onTogglePermanent={toggleRoomPermanent}
          isSignedIn={Boolean(user)}
          onSignInForPermanent={() => void signIn()}
          maxCapacity={maxCapacity}
          onUpdateMaxCapacity={updateMaxCapacity}
          onSendMessage={sendChatMessage}
          onSendTypingStatus={sendTypingStatus}
          onTriggerReaction={triggerReaction}
        />
      </main>

      {/* Welcome / Join Modal */}
      <WelcomeModal
        key={urlTitle || urlStream || 'default'}
        isOpen={isWelcomeOpen && !isRoomExpired && !(roomId && connectionStatus === 'connected')}
        initialRoomParam={urlRoom}
        initialStreamParam={urlStream}
        initialTitleParam={urlTitle}
        userName={userName}
        user={user}
        onSignIn={signIn}
        onSaveName={updateUserName}
        onHostParty={handleHostParty}
        onJoinParty={handleJoinParty}
      />

      {/* Theater Closed / Room Expired / Standby Modal */}
      <RoomExpiredModal
        isOpen={isRoomExpired}
        roomId={roomId || urlRoom || ''}
        roomTitle={roomMetadata.roomTitle}
        reason={roomExpiredReason}
        isStandby={isRoomStandby}
        isStandbyOwner={Boolean(
          (user?.uid && standbyOwnerUid && user.uid === standbyOwnerUid) ||
            (!standbyOwnerUid && getHostSession(roomId || urlRoom || ''))
        )}
        onReturnHome={dismissRoomExpired}
        onKeepWatchingSolo={continueWatchingSolo}
        onTakeOverHost={takeOverAsHost}
        onJoinWithPasscode={(passcode) => joinRoom(roomId || urlRoom || '', passcode)}
        onWakeUpHost={() =>
          startHost(roomId || urlRoom || '', {
            streamUrl: roomMetadata.streamUrl,
            roomTitle: roomMetadata.roomTitle,
            posterUrl: roomMetadata.posterUrl,
            isPermanent: true,
            ownerUid: user?.uid || standbyOwnerUid,
          })
        }
        onWaitForHost={() => joinRoom(roomId || urlRoom || '')}
        onSignInToClaim={() => void signIn()}
        onHostParty={() => {
          dismissRoomExpired()
          window.location.href = '/?action=host'
        }}
      />

      {/* Share / Invite Friends Modal */}
      <InviteModal
        isOpen={isInviteOpen}
        roomId={roomId}
        roomTitle={roomMetadata.roomTitle}
        onClose={() => setIsInviteOpen(false)}
      />

      {/* Stream Selector Modal */}
      <StreamSelectorModal
        isOpen={isStreamModalOpen}
        currentUrl={roomMetadata.streamUrl}
        currentTitle={roomMetadata.roomTitle}
        onClose={() => setIsStreamModalOpen(false)}
        onSaveStream={(url, title, isP2P) => changeStream(url, title, undefined, isP2P)}
        onStartTabShare={handleStartTabShare}
      />

      {/* Change Name Modal */}
      <EditNameModal
        isOpen={isEditNameOpen}
        currentName={userName}
        onClose={() => setIsEditNameOpen(false)}
        onSaveName={updateUserName}
      />

      {/* Leave or Terminate Room Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmExitOpen}
        title={isHost ? 'End Watch Party?' : 'Leave Watch Party?'}
        message={
          isHost
            ? 'Are you sure you want to end this watch party for everyone? All connected friends will be disconnected from the room.'
            : 'Are you sure you want to leave this watch party?'
        }
        confirmText={isHost ? 'End Party for Everyone' : 'Leave Party'}
        cancelText="Stay in Room"
        isDestructive={isHost}
        onConfirm={terminateRoom}
        onClose={() => setIsConfirmExitOpen(false)}
      />

      {/* Connection error toast if any */}
      {errorMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '1rem',
            left: '1rem',
            zIndex: 110,
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--danger)',
            color: '#fff',
            fontSize: '0.85rem',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
          }}
        >
          {errorMessage}
        </div>
      )}
    </div>
  )
}

export default App
