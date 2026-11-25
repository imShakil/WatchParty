import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Trash2, Send, AlertCircle } from 'lucide-react'

interface VoiceRecorderProps {
  onSendVoice: (audioDataUrl: string, durationSeconds: number) => void
  onCancel: () => void
  autoStart?: boolean
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onSendVoice,
  onCancel,
  autoStart = true,
}) => {
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0)
  const [micError, setMicError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const secondsElapsedRef = useRef<number>(0)
  const isStartedRef = useRef<boolean>(false)

  useEffect(() => {
    secondsElapsedRef.current = secondsElapsed
  }, [secondsElapsed])

  // Stop recording stream and clear timers
  const cleanupStream = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => cleanupStream()
  }, [cleanupStream])

  const stopAndFinish = useCallback((shouldSend: boolean) => {
    cleanupStream()

    const recorder = mediaRecorderRef.current
    if (!recorder) {
      onCancel()
      return
    }

    if (recorder.state !== 'inactive') {
      recorder.onstop = () => {
        if (!shouldSend) {
          audioChunksRef.current = []
          onCancel()
          return
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })
        audioChunksRef.current = []

        const finalDuration = Math.max(1, secondsElapsedRef.current)
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64Audio = reader.result as string
          if (base64Audio) {
            onSendVoice(base64Audio, finalDuration)
          }
          onCancel()
        }
        reader.readAsDataURL(audioBlob)
      }
      recorder.stop()
    } else {
      onCancel()
    }
  }, [cleanupStream, onSendVoice, onCancel])

  const startRecording = useCallback(async () => {
    if (isStartedRef.current) return
    isStartedRef.current = true

    audioChunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Pick best supported mimeType
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : ''

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.start(250) // slice every 250ms

      timerRef.current = setInterval(() => {
        setSecondsElapsed((prev) => {
          const next = prev + 1
          if (next >= 30) {
            stopAndFinish(true)
          }
          return next
        })
      }, 1000)
    } catch {
      setMicError('Microphone permission required')
      setTimeout(() => {
        onCancel()
      }, 2000)
    }
  }, [stopAndFinish, onCancel])

  // Automatically start recording on mount if requested
  useEffect(() => {
    if (!autoStart) return
    const timer = setTimeout(() => {
      void startRecording()
    }, 0)
    return () => clearTimeout(timer)
  }, [autoStart, startRecording])

  const formatted = `0:${secondsElapsed.toString().padStart(2, '0')} / 0:30`

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        padding: '0.35rem 0.75rem',
        borderRadius: '24px',
        background: 'rgba(234, 56, 62, 0.14)',
        border: '1px solid rgba(234, 56, 62, 0.4)',
        width: '100%',
        boxSizing: 'border-box',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      {/* Pulsing Red Dot */}
      <div
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: '#ea383e',
          boxShadow: '0 0 10px #ea383e',
          flexShrink: 0,
          animation: 'pulse 1s infinite alternate',
        }}
      />

      {/* Live Timer (single-line) */}
      <span
        style={{
          fontSize: '0.82rem',
          fontWeight: 700,
          color: '#ff6b6b',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          letterSpacing: '0.02em',
        }}
      >
        {formatted}
      </span>

      {/* Dynamic visual audio waves */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          overflow: 'hidden',
          padding: '0 0.35rem',
        }}
      >
        {[10, 20, 14, 26, 12, 18, 24, 16, 22, 12, 18, 24, 14, 20].map((h, i) => (
          <div
            key={i}
            style={{
              width: '3px',
              height: `${Math.min(22, Math.max(5, (h * ((secondsElapsed % 4) + 1)) / 2))}px`,
              background: '#ff6b6b',
              borderRadius: '2px',
              flexShrink: 0,
              transition: 'height 0.15s ease',
            }}
          />
        ))}
      </div>

      {/* Actions: Discard & Send */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        {/* Discard Button */}
        <button
          type="button"
          onClick={() => stopAndFinish(false)}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '0.45rem',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
          }}
          title="Discard recording"
        >
          <Trash2 size={16} />
        </button>

        {/* Send Button */}
        <button
          type="button"
          onClick={() => stopAndFinish(true)}
          style={{
            background: 'var(--primary-red, #ea383e)',
            border: 'none',
            color: '#fff',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(234, 56, 62, 0.45)',
          }}
          title="Send voice note"
        >
          <Send size={15} style={{ marginLeft: '1px' }} />
        </button>
      </div>

      {micError && (
        <div
          style={{
            position: 'absolute',
            bottom: '120%',
            left: 0,
            whiteSpace: 'nowrap',
            background: 'rgba(239, 68, 68, 0.95)',
            color: '#fff',
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '0.4rem 0.7rem',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            zIndex: 10,
          }}
        >
          <AlertCircle size={13} />
          {micError}
        </div>
      )}
    </div>
  )
}
