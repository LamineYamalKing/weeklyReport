export interface WorkLog {
  id: number
  date: string
  title: string
  description: string
  estimated_hours: number
  actual_hours: number
  created_at: string
  updated_at: string
  tags?: Tag[]
}

export interface Tag {
  id: number
  name: string
  color: string
  created_at: string
}

export interface WorkLogTag {
  id: number
  work_log_id: number
  tag_id: number
}

export interface WeeklyReport {
  dateRange: { start: string; end: string }
  logs: WorkLog[]
  totalHours: number
  totalEstimatedHours: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
