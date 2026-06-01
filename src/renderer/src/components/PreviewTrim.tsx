import React, { useState } from 'react'

interface PreviewTrimProps {
  webmPath: string
  /** Final recording duration in seconds — used to seed trimEnd before video metadata loads */
  elapsed: number
  error: string
  onSave: (opts: { startTime?: number; endTime?: number }) => void
  onDiscard: () => void
}

function ErrorBanner({ message }: { message: string }): JSX.Element {
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 flex-shrink-0">
      <svg
        className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      <p className="text-xs text-red-400 leading-relaxed">{message}</p>
    </div>
  )
}

export default function PreviewTrim({
  webmPath,
  elapsed,
  error,
  onSave,
  onDiscard,
}: PreviewTrimProps): JSX.Element {
  // Seed from elapsed so the Save button is enabled immediately on mount.
  // onLoadedMetadata / onDurationChange will refine these if the WebM carries valid duration metadata.
  const [videoDuration, setVideoDuration] = useState(0)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(elapsed)

  const applyDuration = (dur: number): void => {
    if (isFinite(dur) && dur > 0) {
      setVideoDuration(dur)
      setTrimEnd(dur)
    }
  }

  const handleSave = (): void => {
    const effectiveDuration = videoDuration > 0 ? videoDuration : elapsed
    const effectiveTrimEnd = trimEnd > 0 ? trimEnd : effectiveDuration
    const clampedStart = Math.max(0, trimStart)
    const clampedEnd = Math.min(effectiveTrimEnd, effectiveDuration)
    const opts: { startTime?: number; endTime?: number } = {}
    if (clampedStart > 0) opts.startTime = clampedStart
    if (clampedEnd < effectiveDuration) opts.endTime = clampedEnd
    onSave(opts)
  }

  const displayDuration = videoDuration > 0 ? videoDuration : elapsed
  const isDisabled = videoDuration === 0 && elapsed === 0

  return (
    <div className="flex flex-col h-full overflow-hidden px-4 pt-3 pb-4 gap-3">
      <div className="flex items-center justify-between flex-shrink-0">
        <h2 className="text-sm font-semibold">Preview & Trim</h2>
        <button
          onClick={onDiscard}
          className="text-xs text-zinc-500 hover:text-red-400 hover:bg-red-500/10 px-2.5 py-1 rounded-md transition-colors"
        >
          Discard
        </button>
      </div>

      {/* local-file:// protocol serves the temp .webm with range-request support */}
      <video
        src={`local-file://localhost${webmPath}`}
        controls
        preload="auto"
        onLoadedMetadata={(e) => applyDuration(e.currentTarget.duration)}
        onDurationChange={(e) => applyDuration(e.currentTarget.duration)}
        onCanPlay={(e) => {
          // Safety net: if metadata events haven't fired yet, seed from the video element
          // or fall back to elapsed so the Save button is never permanently stuck disabled.
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
          <span className="text-xs font-medium uppercase tracking-widest text-zinc-600">Trim</span>
          <span className="text-xs font-mono text-zinc-500">
            {displayDuration > 0 ? `${displayDuration.toFixed(1)} s total` : '—'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-600 uppercase tracking-wider">Start (s)</span>
            <input
              type="number"
              min={0}
              max={trimEnd - 0.1}
              step={0.1}
              value={trimStart}
              onChange={(e) => setTrimStart(parseFloat(e.target.value) || 0)}
              className="bg-zinc-900 border border-zinc-700 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/20 rounded-lg px-2 py-1.5 text-xs font-mono text-zinc-200 w-full outline-none transition-all"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-600 uppercase tracking-wider">End (s)</span>
            <input
              type="number"
              min={trimStart + 0.1}
              max={displayDuration || undefined}
              step={0.1}
              value={trimEnd}
              onChange={(e) => setTrimEnd(parseFloat(e.target.value) || displayDuration)}
              className="bg-zinc-900 border border-zinc-700 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/20 rounded-lg px-2 py-1.5 text-xs font-mono text-zinc-200 w-full outline-none transition-all"
            />
          </label>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      <button
        onClick={handleSave}
        disabled={isDisabled}
        className="mt-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
      >
        Save & Compress
      </button>
    </div>
  )
}
