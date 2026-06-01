import React, { useState, useEffect, useCallback } from 'react'
import type { ScreenSource, QualityProfile } from './types/electron'
import { useRecording } from './hooks/useRecording'
import type { RecordingConfig } from './components/SourcePicker'
import SourcePicker from './components/SourcePicker'
import PreviewTrim from './components/PreviewTrim'
import PermissionScreen from './components/PermissionScreen'

// loading          → sources | permission-denied  (getSources resolves on mount)
// permission-denied → loading                    (user clicks Check Again)
// sources          → recording                   (user clicks Start Recording)
// recording        → saving                      (Stop clicked — draining write stream)
// saving           → previewing                  (webm path received, video ready to preview)
// previewing       → compressing                 (Save & Compress clicked)
// compressing      → done                        (FFmpeg resolves)
// any error        → sources                     (with inline error message)
type Status = 'loading' | 'sources' | 'permission-denied' | 'recording' | 'saving' | 'previewing' | 'compressing' | 'done'

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
  // Persisted from the pre-flight panel for use during the transcode step
  const [savePath, setSavePath] = useState('')

  const loadSources = useCallback(async (): Promise<void> => {
    window.electronAPI.setSessionActive(false)
    setTempWebmPath('')
    setSavedPath('')
    setError('')
    setStatus('loading')
    try {
      const list = await window.electronAPI.getSources()
      setSources(list)
      setStatus('sources')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load screen sources'
      if (message.includes('permission denied') || message.includes('denied')) {
        setStatus('permission-denied')
      } else {
        setError(message)
        setSources([])
        setStatus('sources')
      }
    }
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

  const handleStart = (config: RecordingConfig): void => {
    window.electronAPI.setCameraConfig(config.cameraDeviceId)
    setSavePath(config.savePath)
    beginCapture({ source: config.source, micDeviceId: config.micDeviceId })
  }

  const handleSaveAndCompress = async (opts: { startTime?: number; endTime?: number; qualityProfile: QualityProfile }): Promise<void> => {
    setStatus('compressing')
    setError('')
    try {
      const mp4Path = await window.electronAPI.transcodeRecording({
        inputPath: tempWebmPath,
        startTime: opts.startTime,
        endTime: opts.endTime,
        savePath: savePath || undefined,
        qualityProfile: opts.qualityProfile,
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

      {/* ── Permission Denied ────────────────────────────────── */}
      {status === 'permission-denied' && (
        <PermissionScreen onRetry={loadSources} />
      )}

      {/* ── Pre-flight Panel ──────────────────────────────────── */}
      {status === 'sources' && (
        <SourcePicker
          sources={sources}
          error={error}
          onStart={handleStart}
          onRefresh={loadSources}
        />
      )}

      {/* ── Recording ─────────────────────────────────────────── */}
      {status === 'recording' && (
        <div className="flex flex-col items-center justify-center h-full gap-6">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-medium text-red-400 tabular-nums">
              REC · {formatTime(elapsed)}
            </span>
          </div>
          <button
            onClick={stopRecording}
            className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 rounded-xl text-sm font-medium transition-colors"
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
          <div className="w-10 h-10 rounded-full bg-orange-500/15 flex items-center justify-center">
            <svg className="w-5 h-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-white">Saved successfully</p>
            <p className="font-mono text-[11px] text-zinc-500 max-w-[260px] leading-relaxed mt-1">
              {savedPath.split('/').pop()}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setSavedPath(''); loadSources() }}
              className="px-4 py-2 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-xl text-xs font-medium transition-colors"
            >
              New Recording
            </button>
            <button
              onClick={() => window.electronAPI.showInFinder(savedPath)}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-medium transition-colors"
            >
              Open in Finder
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
