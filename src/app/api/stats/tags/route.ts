import { NextRequest, NextResponse } from 'next/server'
import { getDb, queryAll } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    await getDb()

    let query = `
      SELECT t.name, t.color, COUNT(wlt.work_log_id) as log_count, SUM(wl.actual_hours) as total_hours
      FROM tags t
      LEFT JOIN work_log_tags wlt ON t.id = wlt.tag_id
      LEFT JOIN work_logs wl ON wlt.work_log_id = wl.id
    `
    const params: unknown[] = []

    if (startDate && endDate) {
      query += ' WHERE wl.date BETWEEN ? AND ?'
      params.push(startDate, endDate)
    }

    query += ' GROUP BY t.id ORDER BY total_hours DESC'

    const stats = queryAll(query, params)
    return NextResponse.json({ success: true, data: stats })
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tag stats' },
      { status: 500 }
    )
  }
}
