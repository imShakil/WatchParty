/**
 * Utility to parse and normalize video streams, YouTube URLs, and local media.
 */
export type MediaType = 'hls' | 'youtube' | 'direct' | 'embed' | 'local'

export interface ParsedMedia {
  normalizedUrl: string
  isEmbed: boolean
  isYouTube: boolean
  youtubeId?: string
  youtubePlaylistId?: string
  youtubePlaylistIndex?: number
  mediaType: MediaType
  title?: string
}

function extractYouTubeParams(rawUrl: string): {
  videoId?: string
  playlistId?: string
  playlistIndex?: number
} | null {
  const ytVideoMatch = rawUrl.match(
    /(?:youtu\.be\/|(?:www\.|m\.|music\.)?youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/
  )
  const videoId = ytVideoMatch?.[1]

  let playlistId: string | undefined
  let playlistIndex: number | undefined
  let isYouTubeHost = Boolean(videoId)

  try {
    const parsed = new URL(rawUrl)
    const host = parsed.hostname.toLowerCase()
    if (
      host === 'youtu.be' ||
      host.endsWith('youtube.com') ||
      host.endsWith('youtube-nocookie.com')
    ) {
      isYouTubeHost = true
      const listParam = parsed.searchParams.get('list')?.trim()
      if (listParam && /^[\w-]+$/.test(listParam) && listParam.length >= 10) {
        playlistId = listParam
      }
      const indexParam = parsed.searchParams.get('index')
      if (indexParam) {
        const idx = Number.parseInt(indexParam, 10)
        if (!Number.isNaN(idx) && idx > 0) {
          playlistIndex = idx - 1
        }
      }
    }
  } catch {
    // Non-URL input
  }

  if (!isYouTubeHost || (!videoId && !playlistId)) {
    return null
  }

  return { videoId, playlistId, playlistIndex }
}

export function parseMediaUrl(
  rawUrl: string,
  defaultTitle?: string,
  explicitType?: string | null
): ParsedMedia {
  const url = (rawUrl || '').trim()
  if (!url) {
    return {
      normalizedUrl: '',
      isEmbed: false,
      isYouTube: false,
      mediaType: 'direct',
      title: defaultTitle || 'Watch Party',
    }
  }

  // 0. Local file blob URL
  if (url.startsWith('blob:') || url.startsWith('local://')) {
    return {
      normalizedUrl: url,
      isEmbed: false,
      isYouTube: false,
      mediaType: 'local',
      title: defaultTitle || 'Local Video',
    }
  }

  // 1. YouTube Detection (videos, shorts, live, and playlists)
  const ytParams = extractYouTubeParams(url)
  if (ytParams) {
    const { videoId, playlistId, playlistIndex } = ytParams
    const normalizedUrl = playlistId
      ? videoId
        ? `https://www.youtube-nocookie.com/embed/${videoId}?list=${encodeURIComponent(playlistId)}&autoplay=1&playsinline=1&rel=0&enablejsapi=1`
        : `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(playlistId)}&autoplay=1&playsinline=1&rel=0&enablejsapi=1`
      : `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&enablejsapi=1`

    return {
      normalizedUrl,
      isEmbed: false,
      isYouTube: true,
      youtubeId: videoId,
      youtubePlaylistId: playlistId,
      youtubePlaylistIndex: playlistIndex,
      mediaType: 'youtube',
      title: defaultTitle || (playlistId ? 'YouTube Playlist' : 'YouTube Video'),
    }
  }

  // 2. HLS stream detection
  if (explicitType === 'hls' || url.includes('.m3u8')) {
    return {
      normalizedUrl: url,
      isEmbed: false,
      isYouTube: false,
      mediaType: 'hls',
      title: defaultTitle || 'Live HLS Stream',
    }
  }

  // 3. Explicit Embed or Third-Party Embeds (iFrame)
  const isEmbed =
    explicitType === 'embed' ||
    url.includes('/embed') ||
    url.includes('vidsrc') ||
    url.includes('2embed') ||
    url.includes('player') ||
    url.includes('multiembed') ||
    url.includes('autoembed') ||
    url.includes('superembed')

  return {
    normalizedUrl: url,
    isEmbed,
    isYouTube: false,
    mediaType: isEmbed ? 'embed' : 'direct',
    title: defaultTitle || (isEmbed ? 'Embedded Stream' : 'Video Stream'),
  }
}

/**
 * Append or update ?startAt=<seconds> query param for embed players that support start time.
 */
export function withStartAtParam(rawUrl: string, seconds: number): string {
  if (!rawUrl || seconds <= 0) return rawUrl
  try {
    const parsed = new URL(rawUrl)
    parsed.searchParams.set('startAt', String(Math.floor(seconds)))
    return parsed.toString()
  } catch {
    return rawUrl
  }
}
