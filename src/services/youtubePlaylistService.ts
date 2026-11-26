export interface YouTubePlaylistItem {
  videoId: string
  title: string
  thumbnailUrl: string
  channelTitle?: string
  position: number
}

export interface YouTubePlaylistResult {
  playlistId: string
  items: YouTubePlaylistItem[]
  source: 'data-api' | 'iframe-fallback'
  fallbackReason?: 'no-api-key' | 'quota-exceeded' | 'request-failed'
}

const QUOTA_COOLDOWN_KEY = 'dpwp_yt_api_quota_until'
const QUOTA_COOLDOWN_MS = 60 * 60 * 1000 // 1 hour cooldown on quota/rate errors
const playlistCache = new Map<string, YouTubePlaylistResult>()

function isQuotaCoolingDown(): boolean {
  try {
    const raw = localStorage.getItem(QUOTA_COOLDOWN_KEY)
    if (!raw) return false
    const until = Number.parseInt(raw, 10)
    if (Number.isNaN(until)) return false
    if (Date.now() < until) return true
    localStorage.removeItem(QUOTA_COOLDOWN_KEY)
  } catch {
    // Ignore storage errors
  }
  return false
}

function markQuotaExhausted(): void {
  try {
    localStorage.setItem(QUOTA_COOLDOWN_KEY, String(Date.now() + QUOTA_COOLDOWN_MS))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Fetches YouTube playlist items via YouTube Data API v3 (1 quota unit).
 * Automatically falls back when VITE_YOUTUBE_API_KEY is missing or quota is exceeded.
 */
export async function fetchYouTubePlaylist(playlistId: string): Promise<YouTubePlaylistResult> {
  if (!playlistId) {
    return { playlistId: '', items: [], source: 'iframe-fallback', fallbackReason: 'request-failed' }
  }

  const cached = playlistCache.get(playlistId)
  if (cached) return cached

  const apiKey = (import.meta.env.VITE_YOUTUBE_API_KEY || '').trim()
  if (!apiKey) {
    return { playlistId, items: [], source: 'iframe-fallback', fallbackReason: 'no-api-key' }
  }

  if (isQuotaCoolingDown()) {
    return { playlistId, items: [], source: 'iframe-fallback', fallbackReason: 'quota-exceeded' }
  }

  try {
    const endpoint =
      `https://www.googleapis.com/youtube/v3/playlistItems` +
      `?part=snippet,contentDetails&maxResults=50` +
      `&playlistId=${encodeURIComponent(playlistId)}` +
      `&key=${encodeURIComponent(apiKey)}`

    const res = await fetch(endpoint)
    if (!res.ok) {
      if (res.status === 403 || res.status === 429) {
        markQuotaExhausted()
        return { playlistId, items: [], source: 'iframe-fallback', fallbackReason: 'quota-exceeded' }
      }
      return { playlistId, items: [], source: 'iframe-fallback', fallbackReason: 'request-failed' }
    }

    const data = (await res.json()) as {
      items?: Array<{
        snippet?: {
          title?: string
          position?: number
          videoOwnerChannelTitle?: string
          channelTitle?: string
          resourceId?: { videoId?: string }
          thumbnails?: {
            medium?: { url?: string }
            default?: { url?: string }
          }
        }
        contentDetails?: { videoId?: string }
      }>
    }

    const items: YouTubePlaylistItem[] = (data.items || [])
      .map((entry, idx): YouTubePlaylistItem | null => {
        const videoId = entry.contentDetails?.videoId || entry.snippet?.resourceId?.videoId || ''
        const title = entry.snippet?.title || `Track ${idx + 1}`
        if (!videoId || title === 'Deleted video' || title === 'Private video') {
          return null
        }
        const thumbnailUrl =
          entry.snippet?.thumbnails?.medium?.url ||
          entry.snippet?.thumbnails?.default?.url ||
          `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
        return {
          videoId,
          title,
          thumbnailUrl,
          channelTitle: entry.snippet?.videoOwnerChannelTitle || entry.snippet?.channelTitle,
          position: entry.snippet?.position ?? idx,
        }
      })
      .filter((item): item is YouTubePlaylistItem => item !== null)

    const result: YouTubePlaylistResult = {
      playlistId,
      items,
      source: 'data-api',
    }
    playlistCache.set(playlistId, result)
    return result
  } catch {
    return { playlistId, items: [], source: 'iframe-fallback', fallbackReason: 'request-failed' }
  }
}

/**
 * Builds playlist items directly from the YouTube IFrame Player API's getPlaylist() array
 * when Data API v3 is unavailable or quota-limited.
 */
export function buildFallbackPlaylistItems(videoIds: string[]): YouTubePlaylistItem[] {
  return videoIds.map((videoId, idx) => ({
    videoId,
    title: `Video ${idx + 1}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    position: idx,
  }))
}
