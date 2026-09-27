/**
 * Utility to parse and normalize video streams and YouTube URLs
 */
export interface ParsedMedia {
  normalizedUrl: string
  isEmbed: boolean
  isYouTube: boolean
  title?: string
}

export function parseMediaUrl(rawUrl: string, defaultTitle?: string): ParsedMedia {
  const url = (rawUrl || '').trim()
  if (!url) {
    return {
      normalizedUrl: '',
      isEmbed: false,
      isYouTube: false,
      title: defaultTitle || 'Watch Party',
    }
  }

  // 1. YouTube Detection (matches youtube.com/watch?v=, youtu.be/, youtube.com/embed/, shorts, etc.)
  const ytMatch = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  )

  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1]
    return {
      normalizedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&enablejsapi=1`,
      isEmbed: true,
      isYouTube: true,
      title: defaultTitle || 'YouTube Video',
    }
  }

  // 2. Third-Party Embeds (iFrame)
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
    title: defaultTitle || (isEmbed ? 'Embedded Stream' : 'Live Video Stream'),
  }
}
