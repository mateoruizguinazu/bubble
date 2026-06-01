import React from 'react'
import type { ScreenSource } from '../types/electron'

interface SourcePickerProps {
  sources: ScreenSource[]
  error: string
  onSelect: (source: ScreenSource) => void
  onRefresh: () => void
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

export default function SourcePicker({
  sources,
  error,
  onSelect,
  onRefresh,
}: SourcePickerProps): JSX.Element {
  const screenSources = sources.filter((s) => s.id.startsWith('screen:'))
  const windowSources = sources.filter((s) => !s.id.startsWith('screen:'))

  return (
    <div className="flex flex-col h-full overflow-hidden px-4 pt-3 pb-4 gap-3">
      <div className="flex items-center justify-between flex-shrink-0">
        <h1 className="text-sm font-semibold">Choose a source</h1>
        <button
          onClick={onRefresh}
          className="text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 px-2.5 py-1 rounded-md transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="overflow-y-auto flex-1 flex flex-col gap-5">
        {/* Full screens — single column, large thumbnails */}
        {screenSources.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-600">Screens</p>
            {screenSources.map((source) => (
              <button
                key={source.id}
                onClick={() => onSelect(source)}
                className="flex flex-col rounded-lg border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/50 active:scale-[0.98] overflow-hidden transition-all text-left"
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
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-600">Windows</p>
            <div className="grid grid-cols-2 gap-2">
              {windowSources.map((source) => (
                <button
                  key={source.id}
                  onClick={() => onSelect(source)}
                  className="flex flex-col rounded-lg border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/50 active:scale-[0.98] overflow-hidden transition-all text-left"
                >
                  <img
                    src={source.thumbnailDataUrl}
                    alt={source.name}
                    className="w-full aspect-video object-cover bg-zinc-900"
                  />
                  <p className="text-xs text-zinc-300 px-2 py-1.5 truncate">{source.name}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {sources.length === 0 && !error && (
          <div className="flex flex-col items-center gap-3 py-10">
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
    </div>
  )
}
