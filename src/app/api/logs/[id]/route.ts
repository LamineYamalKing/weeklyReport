import { NextRequest, NextResponse } from 'next/server'
import { getDb, saveDb, queryOne, run } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await getDb()

    const log = queryOne(
      `SELECT wl.*, GROUP_CONCAT(json_object('id', t.id, 'name', t.name, 'color', t.color, 'created_at', t.created_at)) as tags_json
       FROM work_logs wl
       LEFT JOIN work_log_tags wlt ON wl.id = wlt.work_log_id
       LEFT JOIN tags t ON wlt.tag_id = t.id
       WHERE wl.id = ?
       GROUP BY wl.id`,
      [id]
    )

    if (!log) {
      return NextResponse.json(
        { success: false, error: 'Log not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: log })
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch log' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { date, title, description, estimated_hours, actual_hours, tagIds } = body

    await getDb()
    const existing = queryOne('SELECT id FROM work_logs WHERE id = ?', [id])
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Log not found' },
        { status: 404 }
      )
    }

    run(
      'UPDATE work_logs SET date = ?, title = ?, description = ?, estimated_hours = ?, actual_hours = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [date, title, description, estimated_hours, actual_hours, id]
    )

    if (tagIds !== undefined) {
      run('DELETE FROM work_log_tags WHERE work_log_id = ?', [id])
      if (tagIds.length > 0) {
        for (const tagId of tagIds) {
          run('INSERT INTO work_log_tags (work_log_id, tag_id) VALUES (?, ?)', [id, tagId])
        }
      }
    }

    const log = queryOne('SELECT * FROM work_logs WHERE id = ?', [id])
    return NextResponse.json({ success: true, data: log })
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update log' },
      { status: 500 }
    )
  } finally {
    saveDb()
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await getDb()

    const result = run('DELETE FROM work_logs WHERE id = ?', [id])
    if (result.changes === 0) {
      return NextResponse.json(
        { success: false, error: 'Log not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete log' },
      { status: 500 }
    )
  } finally {
    saveDb()
  }
}
