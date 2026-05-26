'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

interface TimerState {
  logId: number | null
  logTitle: string
  seconds: number
  running: boolean
}

interface TimerContextType {
  logId: number | null
  logTitle: string
  seconds: number
  running: boolean
  startTimer: (logId: number, logTitle: string) => void
  stopTimer: () => void
  commitAndReset: (extraHours: number) => Promise<boolean>
}

const TimerContext = createContext<TimerContextType | null>(null)

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TimerState>({
    logId: null,
    logTitle: '',
    seconds: 0,
    running: false,
  })

  // 用 ref 保存最新 state，方便异步操作读取
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // 计时器 tick
  useEffect(() => {
    if (!state.running) return
    const interval = setInterval(() => {
      setState(prev => ({ ...prev, seconds: prev.seconds + 1 }))
    }, 1000)
    return () => clearInterval(interval)
  }, [state.running])

  const startTimer = useCallback((logId: number, logTitle: string) => {
    setState({ logId, logTitle, seconds: 0, running: true })
  }, [])

  const stopTimer = useCallback(() => {
    setState(prev => ({ ...prev, running: false }))
  }, [])

  const commitAndReset = useCallback(async (extraHours: number): Promise<boolean> => {
    const { logId, seconds } = stateRef.current
    if (!logId) return false

    const timerHours = Math.round((seconds / 3600) * 100) / 100
    const totalExtra = Math.round((timerHours + extraHours) * 100) / 100

    try {
      // 获取当前日志信息用于 PUT 请求
      const res = await fetch(`/api/logs/${logId}`)
      const json = await res.json()
      if (!json.success) return false

      const log = json.data
      const newActualHours = Math.round(((log.actual_hours || 0) + totalExtra) * 100) / 100

      await fetch(`/api/logs/${logId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: log.date,
          title: log.title,
          description: log.description,
          estimated_hours: log.estimated_hours,
          actual_hours: newActualHours,
          tagIds: log.tags?.map((t: { id: number }) => t.id) || [],
        }),
      })

      setState({ logId: null, logTitle: '', seconds: 0, running: false })
      return true
    } catch {
      return false
    }
  }, [])

  return (
    <TimerContext.Provider value={{
      logId: state.logId,
      logTitle: state.logTitle,
      seconds: state.seconds,
      running: state.running,
      startTimer,
      stopTimer,
      commitAndReset,
    }}>
      {children}
    </TimerContext.Provider>
  )
}

export function useTimer() {
  const ctx = useContext(TimerContext)
  if (!ctx) {
    throw new Error('useTimer must be used within TimerProvider')
  }
  return ctx
}
