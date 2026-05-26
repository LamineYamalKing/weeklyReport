'use client'

import { useState, useEffect } from 'react'

interface DailyStat {
  date: string
  total_hours: number
  log_count: number
}

interface WeeklyStat {
  week_start: string
  total_hours: number
  log_count: number
}

interface TagStat {
  name: string
  color: string
  log_count: number
  total_hours: number
}

type TabKey = 'daily' | 'weekly' | 'tags'

export default function StatsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('daily')
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([])
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStat[]>([])
  const [tagStats, setTagStats] = useState<TagStat[]>([])
  const [loading, setLoading] = useState(false)

  const fetchDailyStats = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stats/daily')
      const json = await res.json()
      if (json.success) setDailyStats(json.data)
    } catch (e) {
      console.error('Failed to fetch daily stats:', e)
    } finally {
      setLoading(false)
    }
  }

  const fetchWeeklyStats = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stats/weekly')
      const json = await res.json()
      if (json.success) setWeeklyStats(json.data)
    } catch (e) {
      console.error('Failed to fetch weekly stats:', e)
    } finally {
      setLoading(false)
    }
  }

  const fetchTagStats = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stats/tags')
      const json = await res.json()
      if (json.success) setTagStats(json.data.filter((t: TagStat) => t.log_count > 0))
    } catch (e) {
      console.error('Failed to fetch tag stats:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'daily') fetchDailyStats()
    else if (activeTab === 'weekly') fetchWeeklyStats()
    else fetchTagStats()
  }, [activeTab])

  // 统计数据
  const totalHours = dailyStats.reduce((s, d) => s + d.total_hours, 0)
  const totalLogs = dailyStats.reduce((s, d) => s + d.log_count, 0)
  const avgDaily = dailyStats.length > 0 ? totalHours / dailyStats.length : 0

  // 柱状图最大宽度
  const maxDailyHours = Math.max(...dailyStats.map(s => s.total_hours), 1)
  const maxWeeklyHours = Math.max(...weeklyStats.map(s => s.total_hours), 1)
  const maxTagHours = Math.max(...tagStats.map(s => s.total_hours), 1)

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'daily', label: '每日统计', icon: '📅' },
    { key: 'weekly', label: '每周统计', icon: '📆' },
    { key: 'tags', label: '标签统计', icon: '🏷️' },
  ]

  return (
    <div>
      {/* 页面标题 */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">数据统计</h1>

      {/* 概览卡片 */}
      {!loading && dailyStats.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{totalHours.toFixed(1)}h</p>
            <p className="text-xs text-gray-500 mt-1">累计工作时长</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{totalLogs}</p>
            <p className="text-xs text-gray-500 mt-1">总记录数</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
            <p className="text-3xl font-bold text-amber-600">{avgDaily.toFixed(1)}h</p>
            <p className="text-xs text-gray-500 mt-1">日均工作时长</p>
          </div>
        </div>
      )}

      {/* Tab 切换 */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit print:hidden">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-500 mt-3 text-sm">加载中...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          {/* 每日统计 */}
          {activeTab === 'daily' && (
            dailyStats.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">📅</div>
                <p className="text-gray-500">暂无数据，请先创建工作日志</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {dailyStats.map(stat => (
                  <div key={stat.date} className="flex items-center gap-3 group">
                    <span className="w-24 text-sm text-gray-600 font-mono">{stat.date}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-7 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all flex items-center justify-end pr-2"
                        style={{ width: `${Math.max((stat.total_hours / maxDailyHours) * 100, stat.total_hours > 0 ? 12 : 0)}%` }}
                      >
                        {stat.total_hours > 0 && (
                          <span className="text-xs text-white font-medium drop-shadow">{stat.total_hours}h</span>
                        )}
                      </div>
                    </div>
                    <span className="w-14 text-xs text-gray-400 text-right">{stat.log_count} 条</span>
                  </div>
                ))}
                <div className="pt-3 border-t border-gray-100 text-right text-sm text-gray-500">
                  合计 <span className="font-semibold text-gray-700">{totalHours.toFixed(1)}h</span>，<span className="font-semibold text-gray-700">{totalLogs}</span> 条记录
                </div>
              </div>
            )
          )}

          {/* 每周统计 */}
          {activeTab === 'weekly' && (
            weeklyStats.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">📆</div>
                <p className="text-gray-500">暂无数据</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {weeklyStats.map(stat => (
                  <div key={stat.week_start} className="flex items-center gap-3">
                    <span className="w-24 text-sm text-gray-600 font-mono">{stat.week_start}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-7 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all flex items-center justify-end pr-2"
                        style={{ width: `${Math.max((stat.total_hours / maxWeeklyHours) * 100, stat.total_hours > 0 ? 12 : 0)}%` }}
                      >
                        {stat.total_hours > 0 && (
                          <span className="text-xs text-white font-medium drop-shadow">{stat.total_hours}h</span>
                        )}
                      </div>
                    </div>
                    <span className="w-14 text-xs text-gray-400 text-right">{stat.log_count} 条</span>
                  </div>
                ))}
                <div className="pt-3 border-t border-gray-100 text-right text-sm text-gray-500">
                  合计 <span className="font-semibold text-gray-700">{weeklyStats.reduce((sum, s) => sum + s.total_hours, 0).toFixed(1)}h</span>，<span className="font-semibold text-gray-700">{weeklyStats.reduce((sum, s) => sum + s.log_count, 0)}</span> 条记录
                </div>
              </div>
            )
          )}

          {/* 标签统计 */}
          {activeTab === 'tags' && (
            tagStats.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">🏷️</div>
                <p className="text-gray-500">暂无数据</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {tagStats.map(stat => (
                  <div key={stat.name} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-28">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: stat.color }} />
                      <span className="text-sm font-medium truncate">{stat.name}</span>
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-full h-7 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all flex items-center justify-end pr-2"
                        style={{
                          width: `${Math.max((stat.total_hours / maxTagHours) * 100, stat.total_hours > 0 ? 12 : 0)}%`,
                          backgroundColor: stat.color,
                        }}
                      >
                        {stat.total_hours > 0 && (
                          <span className="text-xs text-white font-medium drop-shadow">{stat.total_hours}h</span>
                        )}
                      </div>
                    </div>
                    <span className="w-14 text-xs text-gray-400 text-right">{stat.log_count} 条</span>
                  </div>
                ))}
                <div className="pt-3 border-t border-gray-100 text-right text-sm text-gray-500">
                  合计 <span className="font-semibold text-gray-700">{tagStats.reduce((sum, s) => sum + s.total_hours, 0).toFixed(1)}h</span>，<span className="font-semibold text-gray-700">{tagStats.reduce((sum, s) => sum + s.log_count, 0)}</span> 条记录
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}