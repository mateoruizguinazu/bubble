import React, { useState, useEffect, useCallback } from 'react'
import type { ScreenSource } from './types/electron'
import { useRecording } from './hooks/useRecording'
import SourcePicker from './components/SourcePicker'
import PreviewTrim from './components/PreviewTrim'

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

function Spinner(): JSX.Element {
  return (
    <svg className="w-4 h-4 animate-spin text-zinc-500" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

export default function App(): JSX.Element {
  const [status, setStatus] = useState<Status>('loading')
  const [sources, setSources] = useState<ScreenSource[]>([])
  const [tempWebmPath, setTempWebmPath] = useState('')
  const [recordedElapsed, setRecordedElapsed] = useState(0)
  const [savedPath, setSavedPath] = useState('')
  const [error, setError] = useState('')

  const loadSources = useCallback(async (): Promise<void> => {
    window.electronAPI.setSessionActive(false)
    setTempWebmPath('')
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
  }, [])

  const { elapsed, beginCapture, stopRecording } = useRecording({
    onRecordingStart: () => {
      window.electronAPI.setSessionActive(true)
      setStatus('recording')
    },
    onSaving: () => setStatus('saving'),
    onPreview: (webmPath, finalElapsed) => {
      setTempWebmPath(webmPath)
      setRecordedElapsed(finalElapsed)
      setStatus('previewing')
    },
    onError: (message, resetToSources) => {
      if (resetToSources) {
        loadSources()
      } else {
        setError(message)
        setStatus('sources')
      }
    },
  })

  useEffect(() => { loadSources() }, [loadSources])

  const handleSaveAndCompress = async (opts: { startTime?: number; endTime?: number }): Promise<void> => {
    setStatus('compressing')
    setError('')
    try {
      const mp4Path = await window.electronAPI.transcodeRecording({
        inputPath: tempWebmPath,
        ...opts,
      })
      window.electronAPI.setSessionActive(false)
      setSavedPath(mp4Path)
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcoding failed — try again')
      setStatus('previewing')
    }
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white select-none">

      {/* ── Loading / Saving ─────────────────────────────────── */}
      {(status === 'loading' || status === 'saving') && (
        <div className="flex flex-col items-center justify-center h-full gap-2.5">
          <Spinner />
          <p className="text-xs text-zinc-600">
            {status === 'loading' ? 'Loading sources…' : 'Saving clip…'}
          </p>
        </div>
      )}

      {/* ── Source Picker ─────────────────────────────────────── */}
      {status === 'sources' && (
        <SourcePicker
          sources={sources}
          error={error}
          onSelect={beginCapture}
          onRefresh={loadSources}
        />
      )}

      {/* ── Recording ─────────────────────────────────────────── */}
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

      {/* ── Preview & Trim ─────────────────────────────────────── */}
      {status === 'previewing' && (
        <PreviewTrim
          webmPath={tempWebmPath}
          elapsed={recordedElapsed}
          error={error}
          onSave={handleSaveAndCompress}
          onDiscard={loadSources}
        />
      )}

      {/* ── Compressing ─────────────────────────────────────────── */}
      {status === 'compressing' && (
        <div className="flex flex-col items-center justify-center h-full gap-2.5">
          <Spinner />
          <p className="text-sm text-zinc-400">Compressing…</p>
          <p className="text-xs text-zinc-600">Optimizing video quality…</p>
        </div>
      )}

      {/* ── Done ────────────────────────────────────────────────── */}
      {status === 'done' && (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
          <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-white">Saved to Downloads</p>
            <p className="font-mono text-[11px] text-zinc-500 break-all max-w-[260px] leading-relaxed mt-1">
              {savedPath}
            </p>
          </div>
          <button
            onClick={() => { setSavedPath(''); loadSources() }}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-medium transition-colors"
          >
            New Recording
          </button>
        </div>
      )}

    </div>
  )
}
