import initSqlJs, { Database } from 'sql.js'
import fs from 'fs'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'database', 'weekly-report.sqlite')

let db: Database | null = null
let initPromise: Promise<void> | null = null

export async function getDb(): Promise<Database> {
  if (!initPromise) {
    initPromise = (async () => {
      const SQL = await initSqlJs({
        locateFile: (file: string) => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
      })

      const dbDir = path.dirname(DB_PATH)
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true })
      }

      if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH)
        db = new SQL.Database(buffer)
      } else {
        db = new SQL.Database()
        db.run('PRAGMA encoding = "UTF-8"')
        initTables()
        saveDb()
      }
    })()
  }

  await initPromise
  return db!
}

export function saveDb() {
  if (!db) return
  const data = db.export()
  fs.writeFileSync(DB_PATH, Buffer.from(data))
}

function initTables() {
  db!.run(`
    CREATE TABLE IF NOT EXISTS work_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE NOT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      estimated_hours DECIMAL(4,2) DEFAULT 0,
      actual_hours DECIMAL(4,2) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
  db!.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(50) NOT NULL UNIQUE,
      color VARCHAR(7) DEFAULT '#3B82F6',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
  db!.run(`
    CREATE TABLE IF NOT EXISTS work_log_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_log_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      FOREIGN KEY (work_log_id) REFERENCES work_logs(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
  `)
}

export function queryAll(sql: string, params?: unknown[]): Record<string, unknown>[] {
  const stmt = db!.prepare(sql)
  if (params) stmt.bind(params)
  const rows: Record<string, unknown>[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
}

export function queryOne(sql: string, params?: unknown[]): Record<string, unknown> | undefined {
  const stmt = db!.prepare(sql)
  if (params) stmt.bind(params)
  const row = stmt.step() ? stmt.getAsObject() : undefined
  stmt.free()
  return row
}

export function run(sql: string, params?: unknown[]): { lastInsertRowid: number; changes: number } {
  if (params) {
    db!.run(sql, params)
  } else {
    db!.run(sql)
  }
  const lastId = queryOne('SELECT last_insert_rowid() as id')
  return {
    lastInsertRowid: (lastId?.id as number) ?? 0,
    changes: db!.getRowsModified(),
  }
}
