'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const MAX_HOURS = 10
const TIMER_STORAGE_KEY = 'weekly_report_timer_v3'

interface TimerState {
  logId: number | null
  logTitle: string
  seconds: number
  running: boolean
  startTime: number | null
  baseHours: number
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
  const [state, setState] = useState<TimerState>(() => {
    // 初始化时同步从 localStorage 读取
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(TIMER_STORAGE_KEY)
        if (saved) {
          const data = JSON.parse(saved)
          if (data.logId && data.running && data.startTime) {
            const elapsedSeconds = Math.floor((Date.now() - data.startTime) / 1000)
            const newSeconds = data.seconds + elapsedSeconds
            const totalHours = data.baseHours + Math.round((newSeconds / 3600) * 100) / 100
            if (totalHours < MAX_HOURS) {
              console.log('[TimerProvider] 从 localStorage 恢复计时器:', data.logTitle, '已运行', elapsedSeconds, '秒')
              return {
                logId: data.logId,
                logTitle: data.logTitle || '',
                seconds: newSeconds,
                running: true,
                startTime: data.startTime,
                baseHours: data.baseHours,
              }
            }
          }
        }
      } catch (e) {
        console.error('[TimerProvider] 恢复计时器失败:', e)
      }
    }
    return {
      logId: null,
      logTitle: '',
      seconds: 0,
      running: false,
      startTime: null,
      baseHours: 0,
    }
  })

  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  const baseHoursRef = useRef(state.baseHours)
  useEffect(() => {
    baseHoursRef.current = state.baseHours
  }, [state.baseHours])

  const submitAsync = useCallback(async () => {
    const { logId, seconds, baseHours } = stateRef.current
    if (!logId) return false
    const timerHours = Math.round((seconds / 3600) * 100) / 100
    const totalExtra = Math.round((baseHours + timerHours) * 100) / 100
    try {
      const res = await fetch(`/api/logs/${logId}`)
      const json = await res.json()
      if (!json.success) return false
      const log = json.data
      await fetch(`/api/logs/${logId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: log.date,
          title: log.title,
          description: log.description,
          estimated_hours: log.estimated_hours,
          actual_hours: totalExtra,
          tagIds: log.tags?.map((t: { id: number }) => t.id) || [],
        }),
      })
      setState({ logId: null, logTitle: '', seconds: 0, running: false, startTime: null, baseHours: 0 })
      baseHoursRef.current = 0
      localStorage.removeItem(TIMER_STORAGE_KEY)
      return true
    } catch {
      return false
    }
  }, [])

  // 页面关闭前自动保存计时
  useEffect(() => {
    const handleBeforeUnload = (_e: BeforeUnloadEvent) => {
      if (state.running && state.logId) {
        const timerHours = Math.round((state.seconds / 3600) * 100) / 100
        const total = baseHoursRef.current + timerHours
        navigator.sendBeacon(
          '/api/logs/' + state.logId,
          JSON.stringify({ action: 'auto_commit', actual_hours: total })
        )
        localStorage.removeItem(TIMER_STORAGE_KEY)
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [state])

  // 计时器 tick + 10h上限检查
  useEffect(() => {
    if (!state.running || !state.startTime) return
    const interval = setInterval(() => {
      setState(prev => {
        if (!prev.running || !prev.startTime) return prev
        const nextSeconds = Math.floor((Date.now() - prev.startTime) / 1000)
        const timerHours = Math.round((nextSeconds / 3600) * 100) / 100
        const totalHours = prev.baseHours + timerHours
        if (totalHours >= MAX_HOURS) {
          submitAsync()
          return prev
        }
        return { ...prev, seconds: nextSeconds }
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [state.running, state.startTime, submitAsync])

  // 状态变化时保存到 localStorage
  useEffect(() => {
    if (state.running && state.logId) {
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({
        logId: state.logId,
        logTitle: state.logTitle,
        seconds: state.seconds,
        running: state.running,
        startTime: state.startTime,
        baseHours: state.baseHours,
      }))
    } else if (!state.running) {
      localStorage.removeItem(TIMER_STORAGE_KEY)
    }
  }, [state])

  const startTimer = useCallback(async (logId: number, logTitle: string) => {
    let baseHours = 0
    try {
      const res = await fetch(`/api/logs/${logId}`)
      const json = await res.json()
      if (json.success) {
        baseHours = json.data.actual_hours || 0
      }
    } catch {
      baseHours = 0
    }
    const startTime = Date.now()
    setState({ logId, logTitle, seconds: 0, running: true, startTime, baseHours })
  }, [])

  const stopTimer = useCallback(() => {
    setState(prev => {
      if (!prev.startTime) return prev
      const finalSeconds = Math.floor((Date.now() - prev.startTime) / 1000)
      return { ...prev, seconds: finalSeconds, running: false }
    })
  }, [])

  const commitAndReset = useCallback(async (extraHours: number): Promise<boolean> => {
    const { logId, seconds, baseHours } = stateRef.current
    if (!logId) return false
    const timerHours = Math.round((seconds / 3600) * 100) / 100
    const totalExtra = Math.round((baseHours + timerHours + extraHours) * 100) / 100
    try {
      const res = await fetch(`/api/logs/${logId}`)
      const json = await res.json()
      if (!json.success) return false
      const log = json.data
      await fetch(`/api/logs/${logId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: log.date,
          title: log.title,
          description: log.description,
          estimated_hours: log.estimated_hours,
          actual_hours: totalExtra,
          tagIds: log.tags?.map((t: { id: number }) => t.id) || [],
        }),
      })
      setState({ logId: null, logTitle: '', seconds: 0, running: false, startTime: null, baseHours: 0 })
      baseHoursRef.current = 0
      localStorage.removeItem(TIMER_STORAGE_KEY)
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
