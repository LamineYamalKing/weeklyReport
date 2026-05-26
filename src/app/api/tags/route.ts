import { NextRequest, NextResponse } from 'next/server'
import { getDb, saveDb, queryAll, queryOne, run } from '@/lib/db'

export async function GET() {
  try {
    await getDb()
    const tags = queryAll('SELECT * FROM tags ORDER BY created_at DESC')
    return NextResponse.json({ success: true, data: tags })
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tags' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, color } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Tag name is required' },
        { status: 400 }
      )
    }

    await getDb()
    const result = run(
      'INSERT INTO tags (name, color) VALUES (?, ?)',
      [name, color || '#3B82F6']
    )

    const tag = queryOne('SELECT * FROM tags WHERE id = ?', [result.lastInsertRowid])
    return NextResponse.json({ success: true, data: tag }, { status: 201 })
  } catch (err) {
    const message = (err as Error)?.message || ''
    if (message.includes('UNIQUE constraint')) {
      return NextResponse.json(
        { success: false, error: 'Tag name already exists' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create tag' },
      { status: 500 }
    )
  } finally {
    saveDb()
  }
}
