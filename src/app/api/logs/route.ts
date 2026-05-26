import { NextRequest, NextResponse } from 'next/server'
import { getDb, saveDb, queryAll, queryOne, run } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '30')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const tagId = searchParams.get('tagId')

    await getDb()
    const offset = (page - 1) * limit

    let query = `
      SELECT wl.*, GROUP_CONCAT(json_object('id', t.id, 'name', t.name, 'color', t.color, 'created_at', t.created_at)) as tags_json
      FROM work_logs wl
      LEFT JOIN work_log_tags wlt ON wl.id = wlt.work_log_id
      LEFT JOIN tags t ON wlt.tag_id = t.id
    `
    const conditions: string[] = []
    const params: unknown[] = []

    if (startDate) {
      conditions.push('wl.date >= ?')
      params.push(startDate)
    }
    if (endDate) {
      conditions.push('wl.date <= ?')
      params.push(endDate)
    }
    if (tagId) {
      conditions.push('wlt.tag_id = ?')
      params.push(tagId)
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    query += ' GROUP BY wl.id ORDER BY wl.date DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const logs = queryAll(query, params)
    const result = logs.map(log => ({
      ...log,
      tags: log.tags_json ? JSON.parse(`[${log.tags_json}]`) : [],
      tags_json: undefined,
    }))

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error fetching logs:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch logs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, title, description, estimated_hours, actual_hours, tagIds } = body

    if (!date || !title) {
      return NextResponse.json(
        { success: false, error: 'Date and title are required' },
        { status: 400 }
      )
    }

    await getDb()
    const result = run(
      'INSERT INTO work_logs (date, title, description, estimated_hours, actual_hours) VALUES (?, ?, ?, ?, ?)',
      [date, title, description || '', estimated_hours || 0, actual_hours || 0]
    )

    if (tagIds && tagIds.length > 0) {
      for (const tagId of tagIds) {
        run('INSERT INTO work_log_tags (work_log_id, tag_id) VALUES (?, ?)', [result.lastInsertRowid, tagId])
      }
    }

    const log = queryOne('SELECT * FROM work_logs WHERE id = ?', [result.lastInsertRowid])

    return NextResponse.json({ success: true, data: log }, { status: 201 })
  } catch (error) {
    console.error('Error creating log:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create log' },
      { status: 500 }
    )
  } finally {
    saveDb()
  }
}
