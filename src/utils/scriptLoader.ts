const loadedScripts = new Map<string, Promise<void>>()

/**
 * Loads an external script tag once and caches the resulting promise.
 */
export function loadExternalScript(src: string): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window is not defined'))
  }

  const existing = loadedScripts.get(src)
  if (existing) return existing

  const promise = new Promise<void>((resolve, reject) => {
    const domMatch = document.querySelector(`script[src="${src}"]`)
    if (domMatch) {
      resolve()
      return
    }

    const tag = document.createElement('script')
    tag.src = src
    tag.async = true
    tag.onload = () => resolve()
    tag.onerror = () => {
      loadedScripts.delete(src)
      reject(new Error(`Failed to load script: ${src}`))
    }
    document.head.appendChild(tag)
  })

  loadedScripts.set(src, promise)
  return promise
}

