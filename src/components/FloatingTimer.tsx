'use client'

import { useTimer } from './TimerProvider'

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function FloatingTimer() {
  const { logTitle, seconds, running, stopTimer, commitAndReset } = useTimer()

  if (!running) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg animate-fade-in">
      <div className="flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
        <span className="text-sm font-medium truncate max-w-[160px]" title={logTitle}>{logTitle}</span>
        <span className="text-lg font-mono font-bold tracking-wider">{formatTime(seconds)}</span>
        <button
          onClick={() => {
            stopTimer()
            commitAndReset(0)
          }}
          className="ml-2 bg-green-700 hover:bg-green-800 px-3 py-1 rounded-lg text-sm transition-colors"
        >
          停止
        </button>
      </div>
    </div>
  )
}
