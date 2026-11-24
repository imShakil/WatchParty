/**
 * Utility to parse and normalize video streams, YouTube URLs, and local media.
 */
export type MediaType = 'hls' | 'youtube' | 'direct' | 'embed' | 'local'

export interface ParsedMedia {
  normalizedUrl: string
  isEmbed: boolean
  isYouTube: boolean
  youtubeId?: string
  mediaType: MediaType
  title?: string
}

export function parseMediaUrl(rawUrl: string, defaultTitle?: string): ParsedMedia {
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

  // 1. YouTube Detection (matches youtube.com, youtube-nocookie.com, youtu.be, embed, shorts, etc.)
  const ytMatch = url.match(
    /(?:youtu\.be\/|(?:www\.|m\.|music\.)?youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/
  )

  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1]
    return {
      normalizedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&enablejsapi=1`,
      isEmbed: false,
      isYouTube: true,
      youtubeId: videoId,
      mediaType: 'youtube',
      title: defaultTitle || 'YouTube Video',
    }
  }

  // 2. HLS stream detection
  if (url.includes('.m3u8')) {
    return {
      normalizedUrl: url,
      isEmbed: false,
      isYouTube: false,
      mediaType: 'hls',
      title: defaultTitle || 'Live HLS Stream',
    }
  }

  // 3. Third-Party Embeds (iFrame)
  const isEmbed =
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
