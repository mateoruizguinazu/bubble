import React, { useState } from 'react'
import type { QualityProfile } from '../types/electron'

interface PreviewTrimProps {
  webmPath: string
  /** Final recording duration in seconds — used to seed trimEnd before video metadata loads */
  elapsed: number
  error: string
  onSave: (opts: { startTime?: number; endTime?: number; qualityProfile: QualityProfile }) => void
  onDiscard: () => void
}

function ErrorBanner({ message }: { message: string }): JSX.Element {
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 flex-shrink-0">
      <svg className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <p className="text-xs text-red-400 leading-relaxed">{message}</p>
    </div>
  )
}

const fmtSec = (s: number): string => {
  if (s < 60) return `${s.toFixed(1)}s`
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`
}

// Tailwind classes shared by both range thumbs.
// The track is hidden (h-0, transparent) so only our custom orange fill bar shows.
const THUMB_CLS = [
  'absolute inset-0 w-full h-full appearance-none bg-transparent pointer-events-none',
  '[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-runnable-track]:rounded-full',
  '[&::-webkit-slider-thumb]:pointer-events-auto',
  '[&::-webkit-slider-thumb]:appearance-none',
  '[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4',
  '[&::-webkit-slider-thumb]:rounded-full',
  '[&::-webkit-slider-thumb]:bg-white',
  '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-zinc-900',
  '[&::-webkit-slider-thumb]:shadow-sm',
  '[&::-webkit-slider-thumb]:cursor-pointer',
  '[&::-webkit-slider-thumb]:transition-transform',
  '[&::-webkit-slider-thumb]:active:scale-110',
].join(' ')

export default function PreviewTrim({
  webmPath,
  elapsed,
  error,
  onSave,
  onDiscard,
}: PreviewTrimProps): JSX.Element {
  const [videoDuration, setVideoDuration] = useState(0)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(elapsed)
  // String state lets the user clear/retype without the field resetting to 0.
  const [startRaw, setStartRaw] = useState('0')
  const [endRaw, setEndRaw] = useState(elapsed > 0 ? elapsed.toFixed(1) : '')
  const [qualityProfile, setQualityProfile] = useState<QualityProfile>(
    () => (localStorage.getItem('bubble.qualityProfile') as QualityProfile | null) ?? 'medium'
  )

  const handleQualityChange = (val: QualityProfile): void => {
    setQualityProfile(val)
    localStorage.setItem('bubble.qualityProfile', val)
  }

  const displayDuration = videoDuration > 0 ? videoDuration : elapsed
  const isDisabled = videoDuration === 0 && elapsed === 0

  const applyDuration = (dur: number): void => {
    if (isFinite(dur) && dur > 0) {
      setVideoDuration(dur)
      setTrimEnd(dur)
      setEndRaw(dur.toFixed(1))
    }
  }

  const handleSave = (): void => {
    const effectiveDuration = videoDuration > 0 ? videoDuration : elapsed
    const effectiveTrimEnd = trimEnd > 0 ? trimEnd : effectiveDuration
    const clampedStart = Math.max(0, trimStart)
    const clampedEnd = Math.min(effectiveTrimEnd, effectiveDuration)
    const opts: { startTime?: number; endTime?: number; qualityProfile: QualityProfile } = { qualityProfile }
    if (clampedStart > 0) opts.startTime = clampedStart
    if (clampedEnd < effectiveDuration) opts.endTime = clampedEnd
    onSave(opts)
  }

  // Slider handlers — update both the numeric value and the raw display string together.
  const handleStartSlide = (v: number): void => {
    const val = Math.min(v, trimEnd - 0.1)
    setTrimStart(val)
    setStartRaw(val.toFixed(1))
  }

  const handleEndSlide = (v: number): void => {
    const val = Math.max(v, trimStart + 0.1)
    setTrimEnd(val)
    setEndRaw(val.toFixed(1))
  }

  // Text input handlers — always update the raw string; only push to numeric state
  // when the parsed value is already valid (never resets mid-type).
  const handleStartRaw = (s: string): void => {
    setStartRaw(s)
    const n = parseFloat(s)
    if (!isNaN(n) && n >= 0 && n < trimEnd - 0.05) setTrimStart(n)
  }

  const handleEndRaw = (s: string): void => {
    setEndRaw(s)
    const n = parseFloat(s)
    if (!isNaN(n) && n > trimStart + 0.05 && n <= displayDuration) setTrimEnd(n)
  }

  // Blur handlers — clamp and normalise so the display string matches the actual value.
  const commitStart = (): void => {
    const n = parseFloat(startRaw)
    const val = isNaN(n) ? 0 : Math.max(0, Math.min(n, trimEnd - 0.1))
    setTrimStart(val)
    setStartRaw(val.toFixed(1))
  }

  const commitEnd = (): void => {
    const n = parseFloat(endRaw)
    const val = isNaN(n)
      ? displayDuration
      : Math.min(displayDuration, Math.max(n, trimStart + 0.1))
    setTrimEnd(val)
    setEndRaw(val.toFixed(1))
  }

  const pct = (v: number): number =>
    displayDuration > 0 ? (v / displayDuration) * 100 : 0

  // When the start thumb is near the right edge both thumbs overlap; give start
  // the higher z-index so it can still be dragged leftward.
  const startOnTop = displayDuration > 0 && trimStart / displayDuration >= 0.9

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
          if (trimEnd === 0 || videoDuration === 0) {
            const dur = e.currentTarget.duration
            const fallback = isFinite(dur) && dur > 0 ? dur : elapsed
            if (fallback > 0) {
              if (videoDuration === 0) setVideoDuration(fallback)
              if (trimEnd === 0) {
                setTrimEnd(fallback)
                setEndRaw(fallback.toFixed(1))
              }
            }
          }
        }}
        className="w-full rounded-xl bg-zinc-900 max-h-48 flex-shrink-0"
      />

      <div className="flex flex-col gap-3 flex-shrink-0 bg-zinc-900 rounded-xl p-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-widest text-zinc-600">Trim</span>
          <span className="text-xs font-mono text-zinc-500">
            {displayDuration > 0 ? `${displayDuration.toFixed(1)}s total` : '—'}
          </span>
        </div>

        {/* Live timestamps — update as the thumbs move */}
        <div className="flex items-center justify-between px-0.5">
          <span className="text-xs font-mono text-orange-400">{fmtSec(trimStart)}</span>
          <span className="text-xs font-mono text-orange-400">{fmtSec(trimEnd)}</span>
        </div>

        {/* Dual-range slider */}
        <div className="relative h-5">
          {/* Dark background track — vertically centered */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-zinc-700 pointer-events-none" />
          {/* Orange selected-range fill — same axis */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-orange-500 pointer-events-none"
            style={{
              left: `${pct(trimStart)}%`,
              width: `${Math.max(0, pct(trimEnd) - pct(trimStart))}%`,
            }}
          />
          {/* Start thumb */}
          <input
            type="range"
            min={0}
            max={displayDuration || 1}
            step={0.1}
            value={trimStart}
            onChange={(e) => handleStartSlide(parseFloat(e.target.value))}
            className={`${THUMB_CLS} ${startOnTop ? 'z-10' : 'z-0'}`}
          />
          {/* End thumb */}
          <input
            type="range"
            min={0}
            max={displayDuration || 1}
            step={0.1}
            value={trimEnd}
            onChange={(e) => handleEndSlide(parseFloat(e.target.value))}
            className={`${THUMB_CLS} ${startOnTop ? 'z-0' : 'z-10'}`}
          />
        </div>

        {/* Fine-tune text inputs — string state allows empty string mid-type */}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-600 uppercase tracking-wider">Start (s)</span>
            <input
              type="text"
              inputMode="decimal"
              value={startRaw}
              onChange={(e) => handleStartRaw(e.target.value)}
              onBlur={commitStart}
              className="bg-zinc-950 border border-zinc-700 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 rounded-lg px-2 py-1.5 text-xs font-mono text-zinc-200 w-full outline-none transition-all"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-600 uppercase tracking-wider">End (s)</span>
            <input
              type="text"
              inputMode="decimal"
              value={endRaw}
              onChange={(e) => handleEndRaw(e.target.value)}
              onBlur={commitEnd}
              className="bg-zinc-950 border border-zinc-700 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 rounded-lg px-2 py-1.5 text-xs font-mono text-zinc-200 w-full outline-none transition-all"
            />
          </label>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="mt-auto flex flex-col gap-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 flex-shrink-0">Quality</span>
          <select
            value={qualityProfile}
            onChange={(e) => handleQualityChange(e.target.value as QualityProfile)}
            className="flex-1 bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-2 py-1 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 cursor-pointer transition-colors"
          >
            <option value="high">High — Crisp Text</option>
            <option value="medium">Medium — Balanced</option>
            <option value="low">Low — Small File</option>
          </select>
        </div>
        <button
          onClick={handleSave}
          disabled={isDisabled}
          className="w-full px-6 py-2.5 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-xl text-sm font-medium transition-colors"
        >
          Save & Compress
        </button>
      </div>
    </div>
  )
}
