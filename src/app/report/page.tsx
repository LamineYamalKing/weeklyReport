'use client'

import { useState, useEffect, useCallback } from 'react'
import { WorkLog } from '@/types'

interface ReportData {
  dateRange: { start: string; end: string }
  logs: WorkLog[]
  totalHours: number
  totalEstimatedHours: number
}

export default function ReportPage() {
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const getThisWeekDatesOnly = () => {
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    return {
      start: monday.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0],
    }
  }

  const groupByDate = (logs: WorkLog[]) => {
    const groups: Record<string, WorkLog[]> = {}
    for (const log of logs) {
      if (!groups[log.date]) groups[log.date] = []
      groups[log.date].push(log)
    }
    return groups
  }

  const [postingSlack, setPostingSlack] = useState(false)
  const [slackStatus, setSlackStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handlePostToSlack = async () => {
    if (!report) return
    setPostingSlack(true)
    setSlackStatus('idle')
    try {
      const res = await fetch('/api/slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report }),
      })
      const json = await res.json()
      if (json.success) {
        setSlackStatus('success')
      } else {
        setSlackStatus('error')
      }
    } catch {
      setSlackStatus('error')
    } finally {
      setPostingSlack(false)
      setTimeout(() => setSlackStatus('idle'), 3000)
    }
  }

  const exportMarkdown = () => {
    if (!report) return
    let md = `# 工作周报\n\n`
    md += `**时间范围：** ${report.dateRange.start} ~ ${report.dateRange.end}\n\n`
    md += `---\n\n`

    const groups = groupByDate(report.logs)
    for (const [date, logs] of Object.entries(groups)) {
      md += `## ${date}\n\n`
      const dayHours = logs.reduce((sum, l) => sum + (l.actual_hours || 0), 0)
      for (const log of logs) {
        md += `### ${log.title}\n\n`
        if (log.description) md += `${log.description}\n\n`
        md += `- 预计时长: ${log.estimated_hours}h\n`
        md += `- 实际时长: ${log.actual_hours}h\n`
        if (log.tags && log.tags.length > 0) {
          md += `- 标签: ${log.tags.map(t => t.name).join(', ')}\n`
        }
        md += `\n`
      }
      md += `**当日小计：** ${dayHours.toFixed(1)} 小时\n\n`
    }

    md += `---\n\n`
    md += `**本周总计：** ${report.totalHours.toFixed(1)} 小时\n`
    md += `**预计总计：** ${report.totalEstimatedHours.toFixed(1)} 小时\n`

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `周报_${report.dateRange.start}_${report.dateRange.end}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportText = () => {
    if (!report) return
    let text = `工作周报 (${report.dateRange.start} ~ ${report.dateRange.end})\n`
    text += '='.repeat(50) + '\n\n'

    const groups = groupByDate(report.logs)
    for (const [date, logs] of Object.entries(groups)) {
      const dayHours = logs.reduce((sum, l) => sum + (l.actual_hours || 0), 0)
      text += `[${date}] (小计: ${dayHours.toFixed(1)}h)\n`
      for (const log of logs) {
        text += `  - ${log.title} | ${log.actual_hours}h`
        if (log.tags && log.tags.length > 0) {
          text += ` [${log.tags.map(t => t.name).join(', ')}]`
        }
        text += '\n'
        if (log.description) text += `    ${log.description}\n`
      }
      text += '\n'
    }

    text += '='.repeat(50) + '\n'
    text += `总计: ${report.totalHours.toFixed(1)} 小时\n`

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `周报_${report.dateRange.start}_${report.dateRange.end}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleGenerate = useCallback(async () => {
    if (!startDate || !endDate) {
      alert('请选择日期范围')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/weekly?startDate=${startDate}&endDate=${endDate}`)
      const json = await res.json()
      if (json.success) setReport(json.data)
    } catch {
      alert('生成周报失败')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  const handleThisWeek = () => {
    const { start, end } = getThisWeekDatesOnly()
    setStartDate(start)
    setEndDate(end)
  }

  const handleLastWeek = () => {
    const now = new Date()
    const day = now.getDay()
    const thisMonday = new Date(now)
    thisMonday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    const lastMonday = new Date(thisMonday)
    lastMonday.setDate(thisMonday.getDate() - 7)
    const lastSunday = new Date(lastMonday)
    lastSunday.setDate(lastMonday.getDate() + 6)
    setStartDate(lastMonday.toISOString().split('T')[0])
    setEndDate(lastSunday.toISOString().split('T')[0])
  }

  // 打印报告
  const handlePrint = () => {
    window.print()
  }

  // 当报告生成后，重置 loading
  useEffect(() => {
    // 空 effect，仅用于依赖追踪
  }, [report])

  return (
    <div>
      {/* 页面标题 */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">周报生成</h1>

      {/* 日期选择 */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-5 print:hidden">
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
          <div className="flex gap-1.5">
            <button onClick={handleThisWeek} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">本周一至今</button>
            <button onClick={handleLastWeek} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">上周</button>
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="ml-auto bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                生成中...
              </span>
            ) : '生成周报'}
          </button>
        </div>
      </div>

      {/* 导出按钮 + 操作 */}
      {report && !loading && (
        <div className="flex gap-2 mb-4 print:hidden">
          <button onClick={exportMarkdown} className="inline-flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" /></svg>
            导出 Markdown
          </button>
          <button onClick={exportText} className="inline-flex items-center gap-1.5 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" /></svg>
            导出文本
          </button>
          <button
            onClick={handlePostToSlack}
            disabled={postingSlack}
            className="inline-flex items-center gap-1.5 bg-[#4A154B] text-white px-4 py-2 rounded-lg hover:bg-[#611f69] transition-colors text-sm font-medium disabled:opacity-50"
          >
            {postingSlack ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                发送中...
              </span>
            ) : slackStatus === 'success' ? (
              '✓ 已发送'
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.124 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.52 2.521h-2.522V8.834zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.165 0a2.528 2.528 0 0 1 2.522 2.522v6.312zm-2.522 10.124a2.528 2.528 0 0 1 2.522 2.52A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.271a2.527 2.527 0 0 1-2.52-2.521 2.526 2.526 0 0 1 2.52-2.521h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.521h-6.313z"/></svg>
                发送到 Slack
              </>
            )}
          </button>
          <button onClick={handlePrint} className="inline-flex items-center gap-1.5 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium ml-auto">
            打印
          </button>
        </div>
      )}

      {/* 周报内容 */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-500 mt-3 text-sm">生成中...</p>
        </div>
      ) : report ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border-none print:p-0">
          {/* 报告头部 */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-gray-900">工作周报</h2>
              <p className="text-sm text-gray-500 mt-0.5">{report.dateRange.start} ~ {report.dateRange.end}</p>
            </div>
            <div className="mt-2 sm:mt-0 flex gap-6 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{report.totalHours.toFixed(1)}h</p>
                <p className="text-xs text-gray-500">实际时长</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-400">{report.totalEstimatedHours.toFixed(1)}h</p>
                <p className="text-xs text-gray-500">预计时长</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{report.logs.length}</p>
                <p className="text-xs text-gray-500">记录数</p>
              </div>
            </div>
          </div>

          {report.logs.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-gray-500">该日期范围内暂无工作记录</p>
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(groupByDate(report.logs)).map(([date, logs]) => {
                const dayHours = logs.reduce((sum, l) => sum + (l.actual_hours || 0), 0)
                return (
                  <div key={date}>
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 011 1v3a1 1 0 11-2 0V8a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        {date}
                      </h3>
                      <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">{dayHours.toFixed(1)}h</span>
                    </div>
                    <div className="space-y-2 ml-1">
                      {logs.map(log => (
                        <div key={log.id} className="border-l-3 border-blue-400 pl-4 py-2 hover:bg-gray-50 rounded-r-lg transition-colors">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900">{log.title}</span>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{log.actual_hours}h</span>
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
                          {log.description && (
                            <p className="text-sm text-gray-600 mt-1.5 leading-relaxed whitespace-pre-wrap">{log.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">生成周报</h3>
          <p className="text-sm text-gray-500">选择日期范围后点击「生成周报」查看汇总</p>
          <div className="mt-4 flex justify-center gap-2">
            <button onClick={handleThisWeek} className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">查看本周</button>
            <button onClick={handleLastWeek} className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">查看上周</button>
          </div>
        </div>
      )}
    </div>
  )
}