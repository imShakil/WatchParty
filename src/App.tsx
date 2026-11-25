import { useState, useEffect } from 'react'
import { useWatchParty } from '@/hooks/useWatchParty'
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
import { parseCurrentRoute, syncRoomUrl } from '@/utils/routeUtils'
import { getHostSession } from '@/utils/sessionUtils'
import { checkPartyRoomStatus } from '@/services/firebaseService'

export function App() {
  const {
    connectionStatus,
    errorMessage,
    isRoomExpired,
    roomExpiredReason,
    isHostReconnecting,
    hostReconnectCountdown,
    continueWatchingSolo,
    takeOverAsHost,
    markRoomExpired,
    dismissRoomExpired,
    roomId,
    isHost,
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
  const urlRoom = initialRoute.roomId
  const urlStream = initialRoute.streamUrl
  const urlTitle = initialRoute.title

  const [isWelcomeOpen, setIsWelcomeOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const initial = parseCurrentRoute()
    if (initial.roomId && getHostSession(initial.roomId)) return false
    return true
  })
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(false)

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
        markRoomExpired('This watch party has already ended or the host is offline.')
      }
    })
  }, [urlRoom, markRoomExpired, connectionStatus])

  const handleHostParty = (
    streamUrl?: string,
    title?: string,
    customRoomId?: string,
    posterUrl?: string
  ) => {
    const defaultStream =
      urlStream || streamUrl || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
    const defaultTitle = urlTitle || title || 'Live Watch Party'
    const defaultPoster = posterUrl || undefined

    startHost(customRoomId, {
      streamUrl: defaultStream,
      roomTitle: defaultTitle,
      posterUrl: defaultPoster,
    })
    setIsWelcomeOpen(false)
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
      <LandingPage
        userName={userName}
        onSaveName={updateUserName}
        onHostParty={handleHostParty}
        onJoinParty={handleJoinParty}
      />
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
            posterUrl={roomMetadata.posterUrl}
            isHost={isHost}
            isHostOnlyControl={roomMetadata.isHostOnlyControl}
            isP2PStream={roomMetadata.isP2PStream}
            remoteStream={remoteStream}
            onBroadcastLocalStream={broadcastLocalStream}
            videoRef={videoRef}
            controllerRef={playerControllerRef}
            onPlay={handlePlayerPlay}
            onPause={handlePlayerPause}
            onSeek={handlePlayerSeek}
            onBuffering={handleBuffering}
          />

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
          onSendMessage={sendChatMessage}
          onSendTypingStatus={sendTypingStatus}
          onTriggerReaction={triggerReaction}
        />
      </main>

      {/* Welcome / Join Modal */}
      <WelcomeModal
        isOpen={isWelcomeOpen && !isRoomExpired && !(roomId && connectionStatus === 'connected')}
        initialRoomParam={urlRoom}
        initialStreamParam={urlStream}
        initialTitleParam={urlTitle}
        userName={userName}
        onSaveName={updateUserName}
        onHostParty={handleHostParty}
        onJoinParty={handleJoinParty}
      />

      {/* Theater Closed / Room Expired Modal */}
      <RoomExpiredModal
        isOpen={isRoomExpired}
        roomId={roomId || urlRoom || ''}
        roomTitle={roomMetadata.roomTitle}
        reason={roomExpiredReason}
        onReturnHome={dismissRoomExpired}
        onKeepWatchingSolo={continueWatchingSolo}
        onTakeOverHost={takeOverAsHost}
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
