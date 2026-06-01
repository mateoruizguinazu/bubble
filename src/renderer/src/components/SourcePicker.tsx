import React, { useState, useEffect } from 'react'
import type { ScreenSource } from '../types/electron'

export interface RecordingConfig {
  source: ScreenSource
  /** null = camera off; '' = system default; string = specific deviceId */
  cameraDeviceId: string | null
  /** null = mic off; '' = system default; string = specific deviceId */
  micDeviceId: string | null
  /** '' = use ~/Downloads */
  savePath: string
}

interface SourcePickerProps {
  sources: ScreenSource[]
  error: string
  onStart: (config: RecordingConfig) => void
  onRefresh: () => void
}

const SELECT_CLS =
  'flex-1 min-w-0 bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-2 py-1 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 cursor-pointer transition-colors'

function ErrorBanner({ message }: { message: string }): JSX.Element {
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
      <svg className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <p className="text-xs text-red-400 leading-relaxed">{message}</p>
    </div>
  )
}

function SettingRow({ icon, label, children }: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <div className="flex items-center gap-2.5 h-7">
      <span className="w-3.5 h-3.5 flex-shrink-0 text-zinc-500">{icon}</span>
      <span className="text-xs text-zinc-500 flex-shrink-0 w-[76px]">{label}</span>
      <div className="flex-1 min-w-0 flex items-center">{children}</div>
    </div>
  )
}

function CameraIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-full h-full">
      <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
    </svg>
  )
}

function MicIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-full h-full">
      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
    </svg>
  )
}

function FolderIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-full h-full">
      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
    </svg>
  )
}

export default function SourcePicker({
  sources,
  error,
  onStart,
  onRefresh,
}: SourcePickerProps): JSX.Element {
  const [selectedSourceId, setSelectedSourceId] = useState<string>(
    () => localStorage.getItem('bubble.sourceId') ?? ''
  )
  // Lazy initializers seed from localStorage so settings survive restarts
  const [cameraValue, setCameraValue] = useState<string>(
    () => localStorage.getItem('bubble.cameraValue') ?? ''
  )
  const [micValue, setMicValue] = useState<string>(
    () => localStorage.getItem('bubble.micValue') ?? ''
  )
  const [savePath, setSavePath] = useState<string>(
    () => localStorage.getItem('bubble.savePath') ?? ''
  )
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])

  useEffect(() => {
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        setVideoDevices(devices.filter((d) => d.kind === 'videoinput'))
        setAudioDevices(devices.filter((d) => d.kind === 'audioinput'))
      })
      .catch(() => {})
  }, [])

  const handleSourceSelect = (id: string): void => {
    setSelectedSourceId(id)
    localStorage.setItem('bubble.sourceId', id)
  }

  // Auto-select the first available source; fall back when a persisted ID disappears
  useEffect(() => {
    if (sources.length === 0) return
    const stillValid = sources.some((s) => s.id === selectedSourceId)
    if (!stillValid) handleSourceSelect(sources[0].id)
  }, [sources, selectedSourceId])

  const handleCameraChange = (val: string): void => {
    setCameraValue(val)
    localStorage.setItem('bubble.cameraValue', val)
  }

  const handleMicChange = (val: string): void => {
    setMicValue(val)
    localStorage.setItem('bubble.micValue', val)
  }

  const handleChangeSavePath = async (): Promise<void> => {
    const dir = await window.electronAPI.selectDirectory()
    if (dir) {
      setSavePath(dir)
      localStorage.setItem('bubble.savePath', dir)
    }
  }

  const handleStart = (): void => {
    const source = sources.find((s) => s.id === selectedSourceId)
    if (!source) return
    onStart({
      source,
      cameraDeviceId: cameraValue === '__off__' ? null : cameraValue,
      micDeviceId: micValue === '__off__' ? null : micValue,
      savePath,
    })
  }

  const deviceLabel = (d: MediaDeviceInfo, idx: number, kind: string): string =>
    d.label || `${kind} ${idx + 1}`

  const screenSources = sources.filter((s) => s.id.startsWith('screen:'))
  const windowSources = sources.filter((s) => !s.id.startsWith('screen:'))

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0">
        <h1 className="text-sm font-semibold">New Recording</h1>
        <button
          onClick={onRefresh}
          className="text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 px-2.5 py-1 rounded-md transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="px-4 mb-1 flex-shrink-0">
          <ErrorBanner message={error} />
        </div>
      )}

      {/* ── Source List — scrollable ─────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 flex flex-col gap-3 pb-2">
        {screenSources.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">Screens</p>
            {screenSources.map((source) => (
              <button
                key={source.id}
                onClick={() => handleSourceSelect(source.id)}
                className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all text-left w-full ${
                  selectedSourceId === source.id
                    ? 'border-orange-500/40 bg-orange-500/10 ring-1 ring-orange-500/20'
                    : 'border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/50 active:scale-[0.99]'
                }`}
              >
                <img
                  src={source.thumbnailDataUrl}
                  alt={source.name}
                  className="w-[72px] aspect-video object-cover rounded-lg bg-zinc-900 flex-shrink-0"
                />
                <p className="text-xs text-zinc-300 truncate flex-1">{source.name}</p>
                {selectedSourceId === source.id && (
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {windowSources.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">Windows</p>
            <div className="grid grid-cols-2 gap-2">
              {windowSources.map((source) => (
                <button
                  key={source.id}
                  onClick={() => handleSourceSelect(source.id)}
                  className={`flex flex-col rounded-xl border transition-all text-left overflow-hidden ${
                    selectedSourceId === source.id
                      ? 'border-orange-500/40 ring-1 ring-orange-500/20'
                      : 'border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/50 active:scale-[0.98]'
                  }`}
                >
                  <div className="relative">
                    <img
                      src={source.thumbnailDataUrl}
                      alt={source.name}
                      className="w-full aspect-video object-cover bg-zinc-900"
                    />
                    {selectedSourceId === source.id && (
                      <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-orange-500 flex items-center justify-center">
                        <svg className="w-2 h-2 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-300 px-2 py-1.5 truncate">{source.name}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {sources.length === 0 && !error && (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-xs text-zinc-600">No sources found</p>
            <button
              onClick={onRefresh}
              className="text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 px-3 py-1.5 rounded-md transition-colors"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* ── Settings + CTA ──────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-zinc-800/80 px-4 pt-3 pb-4 flex flex-col gap-2">

        <SettingRow icon={<CameraIcon />} label="Camera">
          <select
            value={cameraValue}
            onChange={(e) => handleCameraChange(e.target.value)}
            className={SELECT_CLS}
          >
            <option value="">Default Camera</option>
            <option value="__off__">Camera Off</option>
            {videoDevices.map((d, i) => (
              <option key={d.deviceId} value={d.deviceId}>
                {deviceLabel(d, i, 'Camera')}
              </option>
            ))}
          </select>
        </SettingRow>

        <SettingRow icon={<MicIcon />} label="Microphone">
          <select
            value={micValue}
            onChange={(e) => handleMicChange(e.target.value)}
            className={SELECT_CLS}
          >
            <option value="">Default Mic</option>
            <option value="__off__">Microphone Off</option>
            {audioDevices.map((d, i) => (
              <option key={d.deviceId} value={d.deviceId}>
                {deviceLabel(d, i, 'Mic')}
              </option>
            ))}
          </select>
        </SettingRow>

        <SettingRow icon={<FolderIcon />} label="Save to">
          <span className="text-xs text-zinc-400 truncate flex-1 min-w-0">
            {savePath ? savePath.split('/').slice(-2).join('/') : '~/Downloads'}
          </span>
          <button
            onClick={handleChangeSavePath}
            className="flex-shrink-0 ml-1.5 text-[10px] text-zinc-500 hover:text-orange-400 hover:bg-orange-500/10 px-1.5 py-0.5 rounded transition-colors"
          >
            Change
          </button>
        </SettingRow>

        <button
          onClick={handleStart}
          disabled={!selectedSourceId}
          className="w-full mt-1 py-2.5 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-xl text-sm font-semibold transition-colors"
        >
          Start Recording
        </button>
      </div>
    </div>
  )
}
