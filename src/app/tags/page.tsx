'use client'

import { useState, useEffect } from 'react'
import { Tag } from '@/types'

const PRESET_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6',
  '#84CC16', '#F43F5E',
]

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [formData, setFormData] = useState({ name: '', color: '#3B82F6' })

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/tags')
      const json = await res.json()
      if (json.success) setTags(json.data)
    } catch (e) {
      console.error('Failed to fetch tags:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTags()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    try {
      const method = editingTag ? 'PUT' : 'POST'
      const url = editingTag ? `/api/tags/${editingTag.id}` : '/api/tags'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const json = await res.json()
      if (json.success) {
        resetForm()
        fetchTags()
      } else {
        alert(json.error || '操作失败')
      }
    } catch {
      alert('请求失败')
    }
  }

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag)
    setFormData({ name: tag.name, color: tag.color })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个标签吗？关联的日志标签也会被移除。')) return
    try {
      const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) fetchTags()
    } catch {
      alert('删除失败')
    }
  }

  const resetForm = () => {
    setEditingTag(null)
    setShowForm(false)
    setFormData({ name: '', color: '#3B82F6' })
  }

  return (
    <div>
      {/* 页面标题 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">标签管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">共 {tags.length} 个标签</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" /></svg>
          新建标签
        </button>
      </div>

      {/* 新建/编辑表单 */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-5 animate-slide-down">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingTag ? '编辑标签' : '新建标签'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">标签名称 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="例如：前端开发"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">标签颜色</label>
              <div className="flex flex-wrap gap-2 items-center">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === color
                        ? 'border-gray-900 scale-110 shadow-sm'
                        : 'border-gray-200 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <div className="flex items-center gap-2 ml-1 pl-3 border-l border-gray-200">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border-0"
                  />
                  <span className="text-xs text-gray-400">自定义</span>
                </div>
              </div>
              {/* 预览 */}
              <div className="mt-3 p-2 bg-gray-50 rounded-lg inline-flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs text-white font-medium" style={{ backgroundColor: formData.color }}>
                  {formData.name || '预览'}
                </span>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                {editingTag ? '保存修改' : '创建'}
              </button>
              <button type="button" onClick={resetForm} className="bg-gray-100 text-gray-600 px-5 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 标签列表 */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-500 mt-3 text-sm">加载中...</p>
        </div>
      ) : tags.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-5xl mb-4">🏷️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">暂无标签</h3>
          <p className="text-sm text-gray-500">点击上方「新建标签」创建第一个标签</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {tags.map(tag => (
            <div
              key={tag.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full shadow-sm" style={{ backgroundColor: tag.color }} />
                  <span className="font-medium text-gray-900">{tag.name}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(tag)}
                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                    title="编辑"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                  </button>
                  <button
                    onClick={() => handleDelete(tag.id)}
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