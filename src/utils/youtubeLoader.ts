import type { YouTubeNamespace } from '@/types/player.types'

let ytApiPromise: Promise<YouTubeNamespace> | null = null

/**
 * Loads the YouTube IFrame Player API script asynchronously.
 * Returns a cached promise so multiple components can safely call it.
 */
export function loadYouTubeIframeApi(): Promise<YouTubeNamespace> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window is not defined'))
  }

  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT)
  }

  if (ytApiPromise) {
    return ytApiPromise
  }

  ytApiPromise = new Promise((resolve, reject) => {
    // If tag already exists in document
    const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]')
    if (!existingScript) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      tag.async = true
      tag.onerror = () => {
        ytApiPromise = null
        reject(new Error('Failed to load YouTube IFrame API script'))
      }
      document.head.appendChild(tag)
    }

    const previousOnReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (previousOnReady) previousOnReady()
      if (window.YT) {
        resolve(window.YT)
      } else {
        reject(new Error('YouTube API loaded but window.YT is not present'))
      }
    }
  })

  return ytApiPromise
}

/**
 * Extract YouTube video ID from various YouTube URL formats
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null
  const ytMatch = url.match(
    /(?:youtu\.be\/|(?:www\.|m\.|music\.)?youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/
  )
  return ytMatch && ytMatch[1] ? ytMatch[1] : null
}

