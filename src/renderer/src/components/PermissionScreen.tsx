import React from 'react'

const STEPS = [
  { n: 1, text: <>Click <span className="font-medium text-zinc-200">"Open System Settings"</span> below to open macOS Privacy settings.</> },
  { n: 2, text: <>Locate <span className="font-medium text-zinc-200">Bubble</span> in the Screen Recording list and toggle the switch ON.</> },
  { n: 3, text: <>Return here and click <span className="font-medium text-zinc-200">"Check Permissions Again"</span> — or relaunch Bubble if the toggle was already on.</> },
]

export default function PermissionScreen({ onRetry }: { onRetry: () => void }): JSX.Element {
  return (
    <div className="flex flex-col h-full px-5 pt-6 pb-5 gap-5">
      <div className="flex flex-col gap-2">
        <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" className="text-orange-400">
            <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-semibold text-white">Screen Recording Permission Needed</h1>
          <p className="text-xs text-zinc-500 leading-relaxed mt-0.5">
            Bubble needs access to record your screen. Grant it in macOS Privacy settings.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {STEPS.map(({ n, text }) => (
          <div key={n} className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 text-[10px] font-semibold text-zinc-400 flex items-center justify-center flex-shrink-0 mt-px">
              {n}
            </span>
            <p className="text-xs text-zinc-400 leading-relaxed">{text}</p>
          </div>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <button
          onClick={() => window.electronAPI.openScreenRecordingSettings()}
          className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          Open System Settings
        </button>
        <button
          onClick={onRetry}
          className="w-full py-2 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-xl text-xs font-medium transition-colors"
        >
          Check Permissions Again
        </button>
      </div>
    </div>
  )
}
