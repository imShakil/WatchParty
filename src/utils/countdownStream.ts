export interface CountdownConfig {
  targetMs: number
  startMs: number
  text: string
  doneText: string
  chime: boolean
  musicUrl?: string
  musicTitle?: string
  nextUrl?: string
  nextTitle?: string
}

export interface CountdownParts {
  days: number
  hours: number
  minutes: number
  seconds: number
  isFinished: boolean
}

export const COUNTDOWN_MUSIC_PRESETS = [
  { id: '', label: 'No Background Music', kind: 'none' as const },
  { id: 'preset://lofi', label: 'Lo-Fi Chill Beats', kind: 'synth' as const },
  { id: 'preset://piano', label: 'Soft Midnight Piano', kind: 'synth' as const },
  { id: 'preset://ambient', label: 'Deep Space Ambient', kind: 'synth' as const },
  { id: 'preset://hype', label: 'Upbeat Synthwave', kind: 'synth' as const },
  { id: 'preset://cinema', label: 'Epic Cinema Tension', kind: 'synth' as const },
  { id: 'preset://retro', label: 'Retro Arcade 8-Bit', kind: 'synth' as const },
] as const

const COUNTDOWN_PREFIX = 'countdown://'

export function isCountdownStreamUrl(url: string): boolean {
  return typeof url === 'string' && url.startsWith(COUNTDOWN_PREFIX)
}

export function buildCountdownUrl(config: CountdownConfig): string {
  const params = new URLSearchParams()
  params.set('target', String(Math.round(config.targetMs)))
  params.set('start', String(Math.round(config.startMs)))
  if (config.text.trim()) params.set('text', config.text.trim())
  if (config.doneText.trim()) params.set('done', config.doneText.trim())
  params.set('chime', config.chime ? '1' : '0')
  if (config.musicUrl?.trim()) params.set('music', config.musicUrl.trim())
  if (config.musicTitle?.trim()) params.set('musicTitle', config.musicTitle.trim())
  if (config.nextUrl?.trim()) params.set('next', config.nextUrl.trim())
  if (config.nextTitle?.trim()) params.set('nextTitle', config.nextTitle.trim())
  return `${COUNTDOWN_PREFIX}?${params.toString()}`
}

export function parseCountdownUrl(url: string): CountdownConfig | null {
  if (!isCountdownStreamUrl(url)) return null
  const queryStart = url.indexOf('?')
  const rawQuery = queryStart >= 0 ? url.slice(queryStart + 1) : ''
  const params = new URLSearchParams(rawQuery)

  const targetMs = Number(params.get('target'))
  if (!Number.isFinite(targetMs) || targetMs <= 0) return null

  const startRaw = Number(params.get('start'))
  const startMs = Number.isFinite(startRaw) && startRaw > 0 ? startRaw : targetMs

  return {
    targetMs,
    startMs,
    text: params.get('text') || 'Starting Soon',
    doneText: params.get('done') || "It's Time!",
    chime: params.get('chime') !== '0',
    musicUrl: params.get('music') || undefined,
    musicTitle: params.get('musicTitle') || undefined,
    nextUrl: params.get('next') || undefined,
    nextTitle: params.get('nextTitle') || undefined,
  }
}

export function formatCountdownParts(remainingMs: number): CountdownParts {
  if (remainingMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isFinished: true }
  }
  const totalSeconds = Math.ceil(remainingMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return { days, hours, minutes, seconds, isFinished: false }
}
