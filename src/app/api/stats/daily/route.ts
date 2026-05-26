import { NextRequest, NextResponse } from 'next/server'
import { getDb, queryAll, queryOne } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const date = searchParams.get('date')

    await getDb()

    if (date) {
      const stats = queryOne(
        'SELECT date, SUM(actual_hours) as total_hours, COUNT(*) as log_count FROM work_logs WHERE date = ? GROUP BY date',
        [date]
      )
      return NextResponse.json({ success: true, data: stats || { total_hours: 0, log_count: 0 } })
    }

    const stats = queryAll(
      'SELECT date, SUM(actual_hours) as total_hours, COUNT(*) as log_count FROM work_logs GROUP BY date ORDER BY date DESC LIMIT 30'
    )
    return NextResponse.json({ success: true, data: stats })
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch daily stats' },
      { status: 500 }
    )
  }
}
