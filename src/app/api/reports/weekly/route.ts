import { NextRequest, NextResponse } from 'next/server'
import { getDb, queryAll } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    await getDb()
    const logs = queryAll(
      `SELECT wl.*, GROUP_CONCAT(json_object('id', t.id, 'name', t.name, 'color', t.color, 'created_at', t.created_at)) as tags_json
       FROM work_logs wl
       LEFT JOIN work_log_tags wlt ON wl.id = wlt.work_log_id
       LEFT JOIN tags t ON wlt.tag_id = t.id
       WHERE wl.date BETWEEN ? AND ?
       GROUP BY wl.id
       ORDER BY wl.date ASC`,
      [startDate, endDate]
    )

    const formattedLogs = logs.map((log) => {
      const { tags_json, ...rest } = log
      return {
        ...rest,
        tags: tags_json ? JSON.parse(`[${tags_json}]`) : [],
      } as Record<string, unknown> & { tags: unknown[] }
    })

    const totalHours = formattedLogs.reduce(
      (sum, log) => sum + ((log.actual_hours as number) || 0),
      0
    )
    const totalEstimatedHours = formattedLogs.reduce(
      (sum, log) => sum + ((log.estimated_hours as number) || 0),
      0
    )

    return NextResponse.json({
      success: true,
      data: {
        dateRange: { start: startDate, end: endDate },
        logs: formattedLogs,
        totalHours,
        totalEstimatedHours,
      },
    })
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to generate weekly report' },
      { status: 500 }
    )
  }
}
