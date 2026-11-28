function getAudioContext(): AudioContext | null {
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  return AudioCtx ? new AudioCtx() : null
}

export function playCompletionChime(): void {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const startAt = ctx.currentTime + idx * 0.12
      gain.gain.setValueAtTime(0.001, startAt)
      gain.gain.exponentialRampToValueAtTime(0.14, startAt + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.45)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(startAt)
      osc.stop(startAt + 0.46)
    })
  } catch {
    // Ignore autoplay-blocked Web Audio errors
  }
}

function playTone(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  startAt: number,
  durationSec: number,
  type: OscillatorType,
  peakGain: number
): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, startAt)
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(peakGain, startAt + Math.min(0.06, durationSec * 0.2))
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec)
  osc.connect(gain)
  gain.connect(dest)
  osc.start(startAt)
  osc.stop(startAt + durationSec + 0.02)
}

function playSoftKick(ctx: AudioContext, dest: AudioNode, startAt: number, peak = 0.16): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(115, startAt)
  osc.frequency.exponentialRampToValueAtTime(42, startAt + 0.14)
  gain.gain.setValueAtTime(peak, startAt)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.18)
  osc.connect(gain)
  gain.connect(dest)
  osc.start(startAt)
  osc.stop(startAt + 0.2)
}

function playSoftHat(ctx: AudioContext, dest: AudioNode, startAt: number, peak = 0.025): void {
  const bufferSize = Math.floor(ctx.sampleRate * 0.04)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = Math.random() * 2 - 1
  }
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 6500
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(peak, startAt)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.04)
  src.connect(hp)
  hp.connect(gain)
  gain.connect(dest)
  src.start(startAt)
}

/**
 * Starts a procedural Web Audio musical loop for built-in countdown presets.
 * Returns a cleanup function that stops scheduling and closes the audio context.
 */
export function startCountdownMusicLoop(presetId: string): () => void {
  const ctx = getAudioContext()
  if (!ctx) return () => {}

  const master = ctx.createGain()
  master.gain.value = 0.65
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = presetId === 'preset://lofi' ? 1400 : presetId === 'preset://ambient' ? 1800 : 4200
  filter.connect(master)
  master.connect(ctx.destination)

  let bar = 0

  const scheduleBar = () => {
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {})
    }
    const now = ctx.currentTime + 0.04

    if (presetId === 'preset://lofi') {
      const chords = [
        [261.63, 311.13, 392.0, 466.16],
        [233.08, 293.66, 349.23, 440.0],
        [174.61, 207.65, 261.63, 311.13],
        [196.0, 246.94, 293.66, 349.23],
      ]
      const chord = chords[bar % chords.length]
      const step = 0.42
      chord.forEach((f, idx) => playTone(ctx, filter, f, now + idx * 0.04, 1.55, 'triangle', 0.042))
      playTone(ctx, filter, chord[0] / 2, now, 1.55, 'sine', 0.08)
      playSoftKick(ctx, master, now, 0.14)
      playSoftKick(ctx, master, now + step * 2.5, 0.1)
      playSoftHat(ctx, master, now + step, 0.022)
      playSoftHat(ctx, master, now + step * 3, 0.022)
      bar += 1
      return 1680
    }

    if (presetId === 'preset://hype') {
      const roots = [110.0, 130.81, 146.83, 164.81]
      const root = roots[bar % roots.length]
      const arp = [root * 2, root * 3, root * 4, root * 3, root * 2, root * 4, root * 3, root * 5]
      const step = 0.19
      arp.forEach((f, i) => {
        playTone(ctx, filter, f, now + i * step, 0.16, 'sawtooth', 0.028)
        if (i % 2 === 0) playTone(ctx, filter, root, now + i * step, 0.16, 'triangle', 0.06)
        if (i % 4 === 0) playSoftKick(ctx, master, now + i * step, 0.16)
        if (i % 2 === 1) playSoftHat(ctx, master, now + i * step, 0.028)
      })
      bar += 1
      return 1520
    }

    if (presetId === 'preset://cinema') {
      const roots = [65.41, 77.78, 58.27, 73.42]
      const root = roots[bar % roots.length]
      playTone(ctx, filter, root, now, 2.3, 'sawtooth', 0.05)
      playTone(ctx, filter, root * 1.5, now + 0.05, 2.2, 'triangle', 0.045)
      playTone(ctx, filter, root * 3, now + 0.1, 2.1, 'sine', 0.04)
      ;[0, 0.6, 1.2, 1.8].forEach((t, i) => {
        playSoftKick(ctx, master, now + t, i === 0 ? 0.18 : 0.1)
        playTone(ctx, filter, root * (4 + (i % 2)), now + t, 0.35, 'triangle', 0.03)
      })
      bar += 1
      return 2400
    }

    if (presetId === 'preset://piano') {
      const progressions = [
        [261.63, 329.63, 392.0, 523.25, 392.0, 329.63],
        [220.0, 261.63, 329.63, 440.0, 329.63, 261.63],
        [174.61, 220.0, 261.63, 349.23, 261.63, 220.0],
        [196.0, 246.94, 293.66, 392.0, 293.66, 246.94],
      ]
      const seq = progressions[bar % progressions.length]
      seq.forEach((f, i) => {
        playTone(ctx, filter, f, now + i * 0.34, 0.95, 'sine', 0.065)
        playTone(ctx, filter, f * 2, now + i * 0.34, 0.45, 'triangle', 0.015)
      })
      playTone(ctx, filter, seq[0] / 2, now, 1.9, 'sine', 0.055)
      bar += 1
      return 2040
    }

    if (presetId === 'preset://retro') {
      const patterns = [
        [261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 392.0, 523.25],
        [293.66, 349.23, 440.0, 587.33, 440.0, 349.23, 440.0, 587.33],
      ]
      const notes = patterns[bar % patterns.length]
      notes.forEach((f, i) => {
        playTone(ctx, filter, f, now + i * 0.16, 0.13, 'square', 0.022)
        if (i % 2 === 0) playTone(ctx, filter, f / 4, now + i * 0.16, 0.15, 'triangle', 0.05)
      })
      bar += 1
      return 1280
    }

    // Default: preset://ambient
    const ambientChords = [
      [130.81, 196.0, 261.63, 311.13, 392.0],
      [146.83, 220.0, 293.66, 349.23, 440.0],
      [116.54, 174.61, 233.08, 293.66, 349.23],
    ]
    const pad = ambientChords[bar % ambientChords.length]
    pad.forEach((f, i) => playTone(ctx, filter, f, now + i * 0.08, 2.8, 'sine', 0.036))
    bar += 1
    return 2800
  }

  let closed = false
  let timer: number | null = null

  const loop = () => {
    if (closed) return
    const nextMs = scheduleBar()
    timer = window.setTimeout(loop, nextMs)
  }

  loop()

  return () => {
    closed = true
    if (timer !== null) window.clearTimeout(timer)
    void ctx.close().catch(() => {})
  }
}

