import { NextResponse } from 'next/server'
import { getDb, queryAll } from '@/lib/db'

export async function GET() {
  try {
    await getDb()
    const stats = queryAll(
      `SELECT
        date('start', strftime('%w', date), '-6 days') as week_start,
        SUM(actual_hours) as total_hours,
        COUNT(*) as log_count
       FROM work_logs
       GROUP BY week_start
       ORDER BY week_start DESC
       LIMIT 12`
    )
    return NextResponse.json({ success: true, data: stats })
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch weekly stats' },
      { status: 500 }
    )
  }
}
