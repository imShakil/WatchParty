/**
 * Player abstraction types for multi-source playback (HTML5, HLS, YouTube, Local)
 */

export interface UnifiedPlayerRef {
  play: () => Promise<void> | void
  pause: () => void
  seekTo: (timeInSeconds: number) => void
  getCurrentTime: () => number
  getDuration: () => number
  isPlaying: () => boolean
  setVolume: (volume: number) => void
  setMuted: (muted: boolean) => void
  playVideoAt?: (index: number) => void
  nextVideo?: () => void
  previousVideo?: () => void
  getPlaylistIndex?: () => number
}

export interface YouTubePlayerInstance {
  playVideo(): void
  pauseVideo(): void
  seekTo(seconds: number, allowSeekAhead?: boolean): void
  getCurrentTime(): number
  getDuration(): number
  getPlayerState(): number
  setVolume(volume: number): void
  mute(): void
  unMute(): void
  isMuted(): boolean
  setPlaybackRate(rate: number): void
  loadVideoById(videoId: string): void
  cueVideoById?(videoId: string): void
  loadPlaylist?(
    playlist:
      | string
      | string[]
      | {
          list: string
          listType?: 'playlist' | 'user_uploads'
          index?: number
          startSeconds?: number
        }
  ): void
  nextVideo?(): void
  previousVideo?(): void
  playVideoAt?(index: number): void
  getPlaylist?(): string[]
  getPlaylistIndex?(): number
  getVideoData?(): { video_id?: string; title?: string; author?: string }
  destroy(): void
}

export interface YouTubeNamespace {
  Player: new (
    elementId: string | HTMLElement,
    options: {
      videoId?: string
      width?: string | number
      height?: string | number
      playerVars?: Record<string, unknown>
      events?: {
        onReady?: (event: { target: YouTubePlayerInstance }) => void
        onStateChange?: (event: { data: number; target: YouTubePlayerInstance }) => void
        onError?: (event: { data: number }) => void
      }
    }
  ) => YouTubePlayerInstance
  PlayerState: {
    UNSTARTED: number
    ENDED: number
    PLAYING: number
    PAUSED: number
    BUFFERING: number
    CUED: number
  }
}

declare global {
  interface Window {
    YT?: YouTubeNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

