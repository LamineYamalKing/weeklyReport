import { NextRequest, NextResponse } from 'next/server'
import { getDb, saveDb, queryOne, run } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, color } = body

    await getDb()
    const existing = queryOne('SELECT id FROM tags WHERE id = ?', [id])
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Tag not found' },
        { status: 404 }
      )
    }

    run('UPDATE tags SET name = ?, color = ? WHERE id = ?', [name, color, id])
    const tag = queryOne('SELECT * FROM tags WHERE id = ?', [id])
    return NextResponse.json({ success: true, data: tag })
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update tag' },
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

    const result = run('DELETE FROM tags WHERE id = ?', [id])
    if (result.changes === 0) {
      return NextResponse.json(
        { success: false, error: 'Tag not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete tag' },
      { status: 500 }
    )
  } finally {
    saveDb()
  }
}
