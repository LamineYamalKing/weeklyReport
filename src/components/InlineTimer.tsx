'use client'

import { useTimer } from './TimerProvider'

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function InlineTimer({ logId }: { logId: number }) {
  const { logId: activeLogId, seconds, running, commitAndReset } = useTimer()

  if (!running || activeLogId !== logId) {
    // 显示启动按钮
    return null
  }

  return (
    <span className="inline-flex items-center gap-1.5 ml-1 px-2 py-0.5 rounded-md bg-green-50 text-green-700 text-xs font-mono font-semibold">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      {formatTime(seconds)}
      <button
        onClick={() => commitAndReset(0)}
        className="ml-1 px-1.5 py-0.5 rounded bg-green-200 hover:bg-green-300 text-green-800 text-xs transition-colors"
      >
        停止
      </button>
    </span>
  )
}
