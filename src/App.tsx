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
import { LandingPage } from '@/components/landing/LandingPage'
import { parseCurrentRoute, syncRoomUrl } from '@/utils/routeUtils'
import { getHostSession } from '@/utils/sessionUtils'

export function App() {
  const {
    connectionStatus,
    errorMessage,
    roomId,
    isHost,
    userName,
    updateUserName,
    roomMetadata,
    participants,
    messages,
    reactions,
    isPeerBuffering,
    bufferingPeerName,
    videoRef,
    playerControllerRef,
    triggerReaction,
    sendChatMessage,
    handlePlayerPlay,
    handlePlayerPause,
    handlePlayerSeek,
    handleBuffering,
    changeStream,
    toggleHostOnlyControl,
    startHost,
    joinRoom,
  } = useWatchParty()

  // Modals state
  const [isInviteOpen, setIsInviteOpen] = useState<boolean>(false)
  const [isStreamModalOpen, setIsStreamModalOpen] = useState<boolean>(false)
  const [isEditNameOpen, setIsEditNameOpen] = useState<boolean>(false)
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

  // Determine if user is on landing page (no active room, no direct invite in URL)
  const isLandingView =
    !roomId &&
    connectionStatus !== 'connected' &&
    connectionStatus !== 'connecting' &&
    !urlRoom &&
    initialRoute.type === 'landing'

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
      />

      {/* Main Split View */}
      <main className={`party-main ${isTheaterMode ? 'theater-mode' : ''}`}>
        {/* Left: Video Player */}
        <div style={{ flex: 1, position: 'relative', height: '100%' }}>
          <PartyPlayer
            streamUrl={roomMetadata.streamUrl}
            posterUrl={roomMetadata.posterUrl}
            isHost={isHost}
            isHostOnlyControl={roomMetadata.isHostOnlyControl}
            videoRef={videoRef}
            controllerRef={playerControllerRef}
            onPlay={handlePlayerPlay}
            onPause={handlePlayerPause}
            onSeek={handlePlayerSeek}
            onBuffering={handleBuffering}
          />

          {/* Floating Emoji Reactions Layer */}
          <FloatingReactions reactions={reactions} />
        </div>

        {/* Right: Live Chat & Participants Sidebar */}
        <PartyChat
          messages={messages}
          participants={participants}
          isHost={isHost}
          isHostOnlyControl={roomMetadata.isHostOnlyControl}
          onToggleControlMode={toggleHostOnlyControl}
          onSendMessage={sendChatMessage}
          onTriggerReaction={triggerReaction}
        />
      </main>

      {/* Welcome / Join Modal */}
      <WelcomeModal
        isOpen={isWelcomeOpen && !(roomId && connectionStatus === 'connected')}
        initialRoomParam={urlRoom}
        initialStreamParam={urlStream}
        initialTitleParam={urlTitle}
        userName={userName}
        onSaveName={updateUserName}
        onHostParty={handleHostParty}
        onJoinParty={handleJoinParty}
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
        onSaveStream={(url, title) => changeStream(url, title)}
      />

      {/* Change Name Modal */}
      <EditNameModal
        isOpen={isEditNameOpen}
        currentName={userName}
        onClose={() => setIsEditNameOpen(false)}
        onSaveName={updateUserName}
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
