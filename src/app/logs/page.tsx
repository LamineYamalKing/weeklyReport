'use client'

import { useState, useEffect, useCallback } from 'react'
import { WorkLog, Tag } from '@/types'
import { useTimer } from '@/components/TimerProvider'

export default function LogsPage() {
  const [logs, setLogs] = useState<WorkLog[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [editingLog, setEditingLog] = useState<WorkLog | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedTagId, setSelectedTagId] = useState<number | ''>('')
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    title: '',
    description: '',
    estimated_hours: 0,
    actual_hours: 0,
    tagIds: [] as number[],
  })
  const { startTimer, running: timerRunning } = useTimer()

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/tags')
      const json = await res.json()
      if (json.success) setTags(json.data)
    } catch (e) {
      console.error('Failed to fetch tags:', e)
    }
  }

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      if (selectedTagId) params.set('tagId', String(selectedTagId))

      const res = await fetch(`/api/logs?${params}`)
      const json = await res.json()
      if (json.success) setLogs(json.data)
    } catch (e) {
      console.error('Failed to fetch logs:', e)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, selectedTagId])

  useEffect(() => {
    fetchTags()
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [startDate, endDate, selectedTagId, fetchLogs])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const method = editingLog ? 'PUT' : 'POST'
      const url = editingLog ? `/api/logs/${editingLog.id}` : '/api/logs'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const json = await res.json()
      if (json.success) {
        resetForm()
        fetchLogs()
      } else {
        alert(json.error || '操作失败')
      }
    } catch {
      alert('请求失败')
    }
  }

  const handleEdit = (log: WorkLog) => {
    setEditingLog(log)
    setFormData({
      date: log.date,
      title: log.title,
      description: log.description,
      estimated_hours: log.estimated_hours,
      actual_hours: log.actual_hours,
      tagIds: log.tags?.map(t => t.id) || [],
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条日志吗？')) return
    try {
      const res = await fetch(`/api/logs/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) fetchLogs()
    } catch {
      alert('删除失败')
    }
  }

  const resetForm = () => {
    setEditingLog(null)
    setShowForm(false)
    setFormData({
      date: new Date().toISOString().split('T')[0],
      title: '',
      description: '',
      estimated_hours: 0,
      actual_hours: 0,
      tagIds: [],
    })
  }

  const toggleTag = (tagId: number) => {
    setFormData(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)
        : [...prev.tagIds, tagId],
    }))
  }

  const totalHours = logs.reduce((sum, log) => sum + (log.actual_hours || 0), 0)
  const totalEstimated = logs.reduce((sum, log) => sum + (log.estimated_hours || 0), 0)

  // 筛选栏快捷按钮
  const setTodayRange = () => {
    const today = new Date().toISOString().split('T')[0]
    setStartDate(today)
    setEndDate(today)
  }
  const setWeekRange = () => {
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    const today = new Date()
    setStartDate(monday.toISOString().split('T')[0])
    setEndDate(today.toISOString().split('T')[0])
  }
  const clearFilters = () => {
    setStartDate('')
    setEndDate('')
    setSelectedTagId('')
  }

  return (
    <div>
      {/* 页面标题 + 操作 */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">工作日志</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            共 {logs.length} 条 · 总时长 {totalHours.toFixed(1)}h · 预计 {totalEstimated.toFixed(1)}h
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" /></svg>
          新建日志
        </button>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-5 animate-fade-in">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">开始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">结束日期</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">标签</label>
            <select
              value={selectedTagId}
              onChange={e => setSelectedTagId(e.target.value ? Number(e.target.value) : '')}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">全部标签</option>
              {tags.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-1.5">
            <button onClick={setTodayRange} className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">今天</button>
            <button onClick={setWeekRange} className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">本周</button>
            {(startDate || endDate || selectedTagId) && (
              <button onClick={clearFilters} className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors">清除筛选</button>
            )}
          </div>
        </div>
      </div>

      {/* 新建/编辑表单 */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-5 animate-slide-down">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingLog ? '编辑日志' : '新建日志'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">日期 <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入工作标题"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                placeholder="详细描述工作内容..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">预计时长（小时）</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.estimated_hours}
                  onChange={e => setFormData({ ...formData, estimated_hours: parseFloat(e.target.value) || 0 })}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">实际时长（小时）</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.actual_hours}
                  onChange={e => setFormData({ ...formData, actual_hours: parseFloat(e.target.value) || 0 })}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">标签</label>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                      formData.tagIds.includes(tag.id)
                        ? 'text-white shadow-sm scale-105'
                        : 'text-gray-600 hover:opacity-80 border-gray-200'
                    }`}
                    style={{
                      backgroundColor: formData.tagIds.includes(tag.id) ? tag.color : 'transparent',
                      borderColor: formData.tagIds.includes(tag.id) ? tag.color : undefined,
                    }}
                  >
                    {tag.name}
                  </button>
                ))}
                {tags.length === 0 && (
                  <span className="text-sm text-gray-400">请先在「标签管理」中创建标签</span>
                )}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                {editingLog ? '保存修改' : '创建'}
              </button>
              <button type="button" onClick={resetForm} className="bg-gray-100 text-gray-600 px-5 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 日志列表 */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-500 mt-3 text-sm">加载中...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-5xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">暂无工作日志</h3>
          <p className="text-sm text-gray-500 mb-4">点击上方「新建日志」按钮创建第一条记录</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log, index) => (
            <div
              key={log.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow animate-fade-in"
              style={{ animationDelay: `${Math.min(index * 40, 200)}ms`, animationFillMode: 'backwards' }}
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{log.date}</span>
                    <h3 className="font-semibold text-gray-900 truncate">{log.title}</h3>
                  </div>
                  {log.description && (
                    <p className="text-gray-600 text-sm leading-relaxed mb-2 line-clamp-3">{log.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" /></svg>
                      实际 {log.actual_hours}h
                    </span>
                    <span>预计 {log.estimated_hours}h</span>
                    {log.estimated_hours > 0 && log.actual_hours > 0 && (
                      <span className={`px-1.5 py-0.5 rounded ${
                        log.actual_hours <= log.estimated_hours
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {log.actual_hours <= log.estimated_hours ? '按时' : '超时'}
                      </span>
                    )}
                    {log.tags && log.tags.length > 0 && (
                      <div className="flex gap-1">
                        {log.tags.map(tag => (
                          <span
                            key={tag.id}
                            className="px-2 py-0.5 rounded-full text-xs text-white font-medium"
                            style={{ backgroundColor: tag.color }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {/* 操作按钮 */}
                <div className="flex items-center gap-1 shrink-0">
                  {!timerRunning && (
                    <button
                      onClick={() => startTimer(log.id, log.title)}
                      className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                      title="开始计时"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" /></svg>
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(log)}
                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                    title="编辑"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                  </button>
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="删除"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}