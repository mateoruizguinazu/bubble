import { useState, useRef, useCallback, useEffect } from 'react'
import type { ScreenSource } from '../types/electron'

interface RecordingCallbacks {
  onRecordingStart: () => void
  onSaving: () => void
  /** Called with the temp .webm path and the final elapsed-seconds value */
  onPreview: (webmPath: string, finalElapsed: number) => void
  /**
   * Called on any capture or save error.
   * resetToSources = true  → failed after recording began; caller should call loadSources()
   * resetToSources = false → failed before recording began; caller should show error on sources
   */
  onError: (message: string, resetToSources: boolean) => void
}

export interface UseRecordingReturn {
  elapsed: number
  beginCapture: (source: ScreenSource) => Promise<void>
  stopRecording: () => void
}

export function useRecording(callbacks: RecordingCallbacks): UseRecordingReturn {
  const [elapsed, setElapsed] = useState(0)

  // Always call the latest version of each callback even from stale async closures
  const cbRef = useRef(callbacks)
  useEffect(() => { cbRef.current = callbacks })

  const recorderRef = useRef<MediaRecorder | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const pendingChunks = useRef<Promise<void>[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedRef = useRef(0)

  const releaseStreams = useCallback((): void => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop())
    micStreamRef.current?.getTracks().forEach((t) => t.stop())
    screenStreamRef.current = null
    micStreamRef.current = null
  }, [])

  const stopRecording = useCallback((): void => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    cbRef.current.onSaving()
    recorderRef.current?.stop()
  }, [])

  const beginCapture = useCallback(async (source: ScreenSource): Promise<void> => {
    try {
      const screenStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: source.id,
          },
        } as unknown as MediaTrackConstraints,
      })

      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      })

      screenStreamRef.current = screenStream
      micStreamRef.current = micStream
      // If the user ends screen sharing externally, treat it as stopping the recording
      screenStream.getVideoTracks()[0].onended = stopRecording

      const combined = new MediaStream([
        ...screenStream.getVideoTracks(),
        ...micStream.getAudioTracks(),
      ])

      await window.electronAPI.startRecording()

      const recorder = new MediaRecorder(combined, { mimeType: 'video/webm' })

      recorder.ondataavailable = (e): void => {
        if (e.data.size > 0) {
          const p = e.data.arrayBuffer().then((buf) => window.electronAPI.sendChunk(buf))
          pendingChunks.current.push(p)
        }
      }

      recorder.onstop = async (): Promise<void> => {
        // Drain all in-flight arrayBuffer() promises before closing the write stream.
        // IPC ordering guarantees these arrive before recording:stop.
        await Promise.all(pendingChunks.current)
        pendingChunks.current = []
        try {
          const webmPath = await window.electronAPI.stopRecording()
          releaseStreams()
          cbRef.current.onPreview(webmPath, elapsedRef.current)
        } catch (err) {
          releaseStreams()
          cbRef.current.onError(
            err instanceof Error ? err.message : 'Failed to save clip',
            true,
          )
        }
      }

      recorderRef.current = recorder
      recorder.start(1000)
      setElapsed(0)
      elapsedRef.current = 0
      timerRef.current = setInterval(() => {
        setElapsed((s) => {
          elapsedRef.current = s + 1
          return s + 1
        })
      }, 1000)
      cbRef.current.onRecordingStart()
    } catch (err) {
      releaseStreams()
      cbRef.current.onError(
        err instanceof Error ? err.message : 'Failed to start capture',
        false,
      )
    }
  }, [releaseStreams, stopRecording])

  return { elapsed, beginCapture, stopRecording }
}
