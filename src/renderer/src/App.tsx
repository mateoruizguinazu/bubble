import React, { useEffect, useRef, useState } from 'react'
import type { ScreenSource, TranscodeOptions } from './types/electron'

// loading  → sources      (getSources resolves on mount)
// sources  → recording    (user selects a source)
// recording → saving      (Stop clicked — draining write stream)
// saving   → previewing   (webm path received, video ready to preview)
// previewing → compressing (Save & Compress clicked)
// compressing → done      (FFmpeg resolves)
// any error → sources     (with inline error message)
type Status = 'loading' | 'sources' | 'recording' | 'saving' | 'previewing' | 'compressing' | 'done'

const formatTime = (s: number): string =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

export default function App(): JSX.Element {
  const [status, setStatus] = useState<Status>('loading')
  const [sources, setSources] = useState<ScreenSource[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [tempWebmPath, setTempWebmPath] = useState('')
  const [videoDuration, setVideoDuration] = useState(0)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const [savedPath, setSavedPath] = useState('')
  const [error, setError] = useState('')

  const recorderRef = useRef<MediaRecorder | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const pendingChunks = useRef<Promise<void>[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedRef = useRef(0)

  const releaseStreams = (): void => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop())
    micStreamRef.current?.getTracks().forEach((t) => t.stop())
    screenStreamRef.current = null
    micStreamRef.current = null
  }

  const loadSources = async (): Promise<void> => {
    // Always wipe previous session state before re-entering the source picker
    // so a failed/abandoned recording never leaves stale paths or locked UI.
    setTempWebmPath('')
    setTrimStart(0)
    setTrimEnd(0)
    setVideoDuration(0)
    setSavedPath('')
    setError('')
    setStatus('loading')
    try {
      const list = await window.electronAPI.getSources()
      setSources(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load screen sources')
      setSources([])
    }
    setStatus('sources')
  }

  useEffect(() => {
    loadSources()
  }, [])

  const stopRecording = (): void => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setStatus('saving')
    recorderRef.current?.stop()
  }

  const beginCapture = async (source: ScreenSource): Promise<void> => {
    setError('')
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
        await Promise.all(pendingChunks.current)
        pendingChunks.current = []
        try {
          const webmPath = await window.electronAPI.stopRecording()
          releaseStreams()
          setTempWebmPath(webmPath)
          setTrimStart(0)
          // MediaRecorder WebM often has Infinity/NaN duration metadata.
          // Seed trimEnd and videoDuration with the recorded elapsed time so
          // the "Save & Compress" button is never permanently locked.
          // onLoadedMetadata will refine these values if the browser can parse
          // a valid duration from the file.
          setTrimEnd(elapsedRef.current)
          setVideoDuration(elapsedRef.current)
          setStatus('previewing')
        } catch (err) {
          releaseStreams()
          setError(err instanceof Error ? err.message : 'Failed to save clip')
          loadSources()
        }
      }

      recorderRef.current = recorder
      recorder.start(1000)
      setStatus('recording')
      setElapsed(0)
      elapsedRef.current = 0
      timerRef.current = setInterval(() => setElapsed((s) => { elapsedRef.current = s + 1; return s + 1 }), 1000)
    } catch (err) {
      releaseStreams()
      setError(err instanceof Error ? err.message : 'Failed to start capture')
      setStatus('sources')
    }
  }

  const handleSaveAndCompress = async (): Promise<void> => {
    setStatus('compressing')
    setError('')
    try {
      const effectiveDuration = videoDuration > 0 ? videoDuration : elapsed
      const effectiveTrimEnd = trimEnd > 0 ? trimEnd : effectiveDuration
      const clampedStart = Math.max(0, trimStart)
      const clampedEnd = Math.min(effectiveTrimEnd, effectiveDuration)
      const opts: TranscodeOptions = { inputPath: tempWebmPath }
      if (clampedStart > 0) opts.startTime = clampedStart
      if (clampedEnd < effectiveDuration) opts.endTime = clampedEnd
      const mp4Path = await window.electronAPI.transcodeRecording(opts)
      setSavedPath(mp4Path)
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcoding failed — try again')
      setStatus('previewing')
    }
  }

  const screenSources = sources.filter((s) => s.id.startsWith('screen:'))
  const windowSources = sources.filter((s) => !s.id.startsWith('screen:'))

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white select-none">

      {/* ── Loading ─────────────────────────────────────────── */}
      {status === 'loading' && (
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-zinc-500">Loading sources…</p>
        </div>
      )}

      {/* ── Sources ─────────────────────────────────────────── */}
      {status === 'sources' && (
        <div className="flex flex-col h-full overflow-hidden px-4 pt-3 pb-4 gap-3">
          {/* pl-20: push past the macOS traffic-light buttons (~76 px) in hiddenInset mode */}
          <div className="flex items-center justify-between flex-shrink-0 pl-20">
            <h1 className="text-sm font-semibold">Choose a source</h1>
            <button
              onClick={loadSources}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Refresh
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-400 leading-relaxed flex-shrink-0">{error}</p>
          )}

          <div className="overflow-y-auto flex-1 flex flex-col gap-5">
            {/* Full screens — single column with large thumbnails for clear distinction */}
            {screenSources.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">
                  Screens
                </p>
                {screenSources.map((source) => (
                  <button
                    key={source.id}
                    onClick={() => beginCapture(source)}
                    className="flex flex-col rounded-lg border border-zinc-800 hover:border-zinc-500 overflow-hidden transition-colors text-left"
                  >
                    <img
                      src={source.thumbnailDataUrl}
                      alt={source.name}
                      className="w-full aspect-video object-cover bg-zinc-900"
                    />
                    <p className="text-xs text-zinc-300 px-3 py-2 truncate">{source.name}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Windows — two-column grid */}
            {windowSources.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">
                  Windows
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {windowSources.map((source) => (
                    <button
                      key={source.id}
                      onClick={() => beginCapture(source)}
                      className="flex flex-col rounded-lg border border-zinc-800 hover:border-zinc-500 overflow-hidden transition-colors text-left"
                    >
                      <img
                        src={source.thumbnailDataUrl}
                        alt={source.name}
                        className="w-full aspect-video object-cover bg-zinc-900"
                      />
                      <p className="text-xs text-zinc-400 px-2 py-1.5 truncate">{source.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sources.length === 0 && !error && (
              <p className="text-xs text-zinc-600 text-center py-8">No sources found</p>
            )}
          </div>
        </div>
      )}

      {/* ── Recording ───────────────────────────────────────── */}
      {status === 'recording' && (
        <div className="flex flex-col items-center justify-center h-full gap-6">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-mono tabular-nums text-zinc-200">
              {formatTime(elapsed)}
            </span>
          </div>
          <button
            onClick={stopRecording}
            className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 rounded-lg text-sm font-medium transition-colors"
          >
            Stop Recording
          </button>
        </div>
      )}

      {/* ── Saving (write stream draining) ──────────────────── */}
      {status === 'saving' && (
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-zinc-500">Saving clip…</p>
        </div>
      )}

      {/* ── Preview & Trim ──────────────────────────────────── */}
      {status === 'previewing' && (
        <div className="flex flex-col h-full overflow-hidden px-4 pt-3 pb-4 gap-3">
          {/* pl-20: push past the macOS traffic-light buttons (~76 px) in hiddenInset mode */}
          <div className="flex items-center justify-between flex-shrink-0 pl-20">
            <h2 className="text-sm font-semibold">Preview & Trim</h2>
            <button
              onClick={loadSources}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Discard
            </button>
          </div>

          {/* local-file:// protocol serves the temp .webm with range-request support */}
          <video
            src={`local-file://localhost${tempWebmPath}`}
            controls
            preload="auto"
            onLoadedMetadata={(e) => {
              const dur = e.currentTarget.duration
              if (isFinite(dur) && dur > 0) {
                setVideoDuration(dur)
                setTrimEnd(dur)
              }
            }}
            onDurationChange={(e) => {
              const dur = e.currentTarget.duration
              if (isFinite(dur) && dur > 0) {
                setVideoDuration(dur)
                setTrimEnd(dur)
              }
            }}
            onCanPlay={(e) => {
              if (trimEnd === 0 || videoDuration === 0) {
                const dur = e.currentTarget.duration
                const fallback = isFinite(dur) && dur > 0 ? dur : elapsed
                if (fallback > 0) {
                  setVideoDuration((v) => (v > 0 ? v : fallback))
                  setTrimEnd((t) => (t > 0 ? t : fallback))
                }
              }
            }}
            className="w-full rounded-lg bg-zinc-900 max-h-48 flex-shrink-0"
          />

          <div className="flex flex-col gap-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">
                Trim
              </span>
              <span className="text-xs font-mono text-zinc-500">
                {videoDuration > 0 ? `${videoDuration.toFixed(1)} s total` : '—'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                  Start (s)
                </span>
                <input
                  type="number"
                  min={0}
                  max={trimEnd - 0.1}
                  step={0.1}
                  value={trimStart}
                  onChange={(e) => setTrimStart(parseFloat(e.target.value) || 0)}
                  className="bg-zinc-900 border border-zinc-700 focus:border-zinc-500 rounded px-2 py-1.5 text-xs font-mono text-zinc-200 w-full outline-none transition-colors"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                  End (s)
                </span>
                <input
                  type="number"
                  min={trimStart + 0.1}
                  max={videoDuration}
                  step={0.1}
                  value={trimEnd}
                  onChange={(e) =>
                    setTrimEnd(parseFloat(e.target.value) || videoDuration)
                  }
                  className="bg-zinc-900 border border-zinc-700 focus:border-zinc-500 rounded px-2 py-1.5 text-xs font-mono text-zinc-200 w-full outline-none transition-colors"
                />
              </label>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 flex-shrink-0">{error}</p>
          )}

          <button
            onClick={handleSaveAndCompress}
            disabled={videoDuration === 0 && elapsed === 0}
            className="mt-auto px-6 py-2.5 bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
          >
            Save & Compress
          </button>
        </div>
      )}

      {/* ── Compressing ─────────────────────────────────────── */}
      {status === 'compressing' && (
        <div className="flex flex-col items-center justify-center h-full gap-1.5">
          <p className="text-sm text-zinc-400">Compressing…</p>
          <p className="text-xs text-zinc-600">libx264 · CRF 18</p>
        </div>
      )}

      {/* ── Done ────────────────────────────────────────────── */}
      {status === 'done' && (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
          <p className="text-sm font-medium text-green-400">Saved to Downloads</p>
          <p className="font-mono text-[11px] text-zinc-500 break-all max-w-[280px] leading-relaxed">
            {savedPath}
          </p>
          <button
            onClick={() => {
              setSavedPath('')
              setElapsed(0)
              loadSources()
            }}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-medium transition-colors mt-1"
          >
            New Recording
          </button>
        </div>
      )}

    </div>
  )
}
