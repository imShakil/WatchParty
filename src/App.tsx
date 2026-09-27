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
  const [isWelcomeOpen, setIsWelcomeOpen] = useState<boolean>(true)

  // URL Params query
  const [urlRoom] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return new URLSearchParams(window.location.search).get('room')
  })
  const [urlStream] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return new URLSearchParams(window.location.search).get('stream')
  })
  const [urlTitle] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return new URLSearchParams(window.location.search).get('title')
  })

  // Close welcome modal when connected to a room
  useEffect(() => {
    if (roomId && connectionStatus === 'connected') {
      setIsWelcomeOpen(false)
    }
  }, [roomId, connectionStatus])

  const handleHostParty = (streamUrl?: string, title?: string) => {
    const defaultStream =
      urlStream || streamUrl || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
    const defaultTitle = urlTitle || title || 'Big Buck Bunny (Live Party)'

    startHost(undefined, {
      streamUrl: defaultStream,
      roomTitle: defaultTitle,
    })
    setIsWelcomeOpen(false)
  }

  const handleJoinParty = (targetRoomId: string) => {
    joinRoom(targetRoomId)
    setIsWelcomeOpen(false)
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
        onOpenInvite={() => setIsInviteOpen(true)}
        onOpenStreamModal={() => setIsStreamModalOpen(true)}
        onEditName={() => setIsEditNameOpen(true)}
      />

      {/* Main Split View */}
      <main className="party-main">
        {/* Left: Video Player */}
        <div style={{ flex: 1, position: 'relative', height: '100%' }}>
          <PartyPlayer
            streamUrl={roomMetadata.streamUrl}
            posterUrl={roomMetadata.posterUrl}
            isHost={isHost}
            isHostOnlyControl={roomMetadata.isHostOnlyControl}
            videoRef={videoRef}
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
        isOpen={isWelcomeOpen}
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
