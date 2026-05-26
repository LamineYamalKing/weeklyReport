import initSqlJs, { Database, SqlJsStatic } from 'sql.js'
import fs from 'fs'
import path from 'path'

// 使用一个临时路径存储测试用数据库
const testDbPath = path.join(__dirname, '../../database', 'weekly-report-test.sqlite')

beforeAll(() => {
  // 确保测试目录存在
  const dbDir = path.dirname(testDbPath)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }
  // 清除旧测试数据库
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath)
  }
})

afterAll(() => {
  // 清理测试数据库
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath)
  }
})

// 创建一个独立的数据库实例用于测试
async function createTestDb(): Promise<Database> {
  const SQL = await initSqlJs()
  const db = new SQL.Database()
  // 启用外键约束（SQLite 默认关闭）
  db.run('PRAGMA foreign_keys = ON')
  db.run(`
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
  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(50) NOT NULL UNIQUE,
      color VARCHAR(7) DEFAULT '#3B82F6',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS work_log_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_log_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      FOREIGN KEY (work_log_id) REFERENCES work_logs(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
  `)
  return db
}

// 辅助函数：执行 SQL 查询获取所有行
function queryAllDb(db: Database, sql: string, params?: unknown[]): Record<string, unknown>[] {
  const stmt = db.prepare(sql)
  if (params) stmt.bind(params)
  const rows: Record<string, unknown>[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
}

// 辅助函数：执行 SQL 查询获取单行
function queryOneDb(db: Database, sql: string, params?: unknown[]): Record<string, unknown> | undefined {
  const stmt = db.prepare(sql)
  if (params) stmt.bind(params)
  const row = stmt.step() ? stmt.getAsObject() : undefined
  stmt.free()
  return row
}

// 辅助函数：执行 SQL 写入
function runDb(db: Database, sql: string, params?: unknown[]): { lastInsertRowid: number; changes: number } {
  if (params) {
    db.run(sql, params)
  } else {
    db.run(sql)
  }
  const lastId = queryOneDb(db, 'SELECT last_insert_rowid() as id')
  return {
    lastInsertRowid: (lastId?.id as number) ?? 0,
    changes: db.getRowsModified(),
  }
}

describe('数据库操作测试', () => {
  let db: Database

  beforeEach(async () => {
    db = await createTestDb()
  })

  afterEach(() => {
    if (db) db.close()
  })

  describe('work_logs CRUD', () => {
    test('应该能插入一条工作日志', () => {
      const result = runDb(db,
        'INSERT INTO work_logs (date, title, description, estimated_hours, actual_hours) VALUES (?, ?, ?, ?, ?)',
        ['2026-05-26', '测试任务', '测试描述', 2.5, 3.0]
      )
      expect(result.lastInsertRowid).toBeGreaterThan(0)
      expect(result.changes).toBeGreaterThan(0)
    })

    test('应该能查询所有工作日志', () => {
      runDb(db, 'INSERT INTO work_logs (date, title) VALUES (?, ?)', ['2026-05-26', '任务一'])
      runDb(db, 'INSERT INTO work_logs (date, title) VALUES (?, ?)', ['2026-05-25', '任务二'])

      const logs = queryAllDb(db, 'SELECT * FROM work_logs ORDER BY date DESC')
      expect(logs.length).toBe(2)
      expect(logs[0].title).toBe('任务一')
    })

    test('应该能更新工作日志', () => {
      const insert = runDb(db, 'INSERT INTO work_logs (date, title, actual_hours) VALUES (?, ?, ?)', ['2026-05-26', '原始标题', 1.0])
      const logId = insert.lastInsertRowid

      runDb(db, 'UPDATE work_logs SET title = ?, actual_hours = ? WHERE id = ?', ['修改后标题', 5.0, logId])

      const log = queryOneDb(db, 'SELECT * FROM work_logs WHERE id = ?', [logId])
      expect(log?.title).toBe('修改后标题')
      expect(log?.actual_hours).toBe(5.0)
    })

    test('应该能删除工作日志', () => {
      const insert = runDb(db, 'INSERT INTO work_logs (date, title) VALUES (?, ?)', ['2026-05-26', '待删除任务'])
      const logId = insert.lastInsertRowid

      const del = runDb(db, 'DELETE FROM work_logs WHERE id = ?', [logId])
      expect(del.changes).toBe(1)

      const log = queryOneDb(db, 'SELECT * FROM work_logs WHERE id = ?', [logId])
      expect(log).toBeUndefined()
    })

    test('应该能根据日期范围筛选', () => {
      runDb(db, 'INSERT INTO work_logs (date, title) VALUES (?, ?)', ['2026-05-20', '旧任务'])
      runDb(db, 'INSERT INTO work_logs (date, title) VALUES (?, ?)', ['2026-05-25', '新任务一'])
      runDb(db, 'INSERT INTO work_logs (date, title) VALUES (?, ?)', ['2026-05-26', '新任务二'])

      const logs = queryAllDb(db,
        'SELECT * FROM work_logs WHERE date >= ? AND date <= ? ORDER BY date',
        ['2026-05-25', '2026-05-26']
      )
      expect(logs.length).toBe(2)
    })

    test('插入时默认值应该生效', () => {
      const result = runDb(db, 'INSERT INTO work_logs (date, title) VALUES (?, ?)', ['2026-05-26', '默认值任务'])
      const log = queryOneDb(db, 'SELECT * FROM work_logs WHERE id = ?', [result.lastInsertRowid])
      expect(log?.estimated_hours).toBe(0)
      expect(log?.actual_hours).toBe(0)
    })
  })

  describe('tags CRUD', () => {
    test('应该能插入标签', () => {
      const result = runDb(db, 'INSERT INTO tags (name, color) VALUES (?, ?)', ['前端开发', '#3B82F6'])
      expect(result.lastInsertRowid).toBeGreaterThan(0)

      const tag = queryOneDb(db, 'SELECT * FROM tags WHERE id = ?', [result.lastInsertRowid])
      expect(tag?.name).toBe('前端开发')
      expect(tag?.color).toBe('#3B82F6')
    })

    test('标签名称应该唯一', () => {
      runDb(db, 'INSERT INTO tags (name) VALUES (?)', ['重复标签'])

      expect(() => {
        runDb(db, 'INSERT INTO tags (name) VALUES (?)', ['重复标签'])
      }).toThrow('UNIQUE constraint')
    })

    test('应该能更新标签', () => {
      const insert = runDb(db, 'INSERT INTO tags (name, color) VALUES (?, ?)', ['旧名称', '#000000'])
      const tagId = insert.lastInsertRowid

      runDb(db, 'UPDATE tags SET name = ?, color = ? WHERE id = ?', ['新名称', '#FFFFFF', tagId])

      const tag = queryOneDb(db, 'SELECT * FROM tags WHERE id = ?', [tagId])
      expect(tag?.name).toBe('新名称')
      expect(tag?.color).toBe('#FFFFFF')
    })

    test('应该能删除标签', () => {
      const insert = runDb(db, 'INSERT INTO tags (name) VALUES (?)', ['待删除标签'])
      const tagId = insert.lastInsertRowid

      const del = runDb(db, 'DELETE FROM tags WHERE id = ?', [tagId])
      expect(del.changes).toBe(1)
    })
  })

  describe('work_log_tags 关联', () => {
    test('应该能关联工作日志和标签', () => {
      const log = runDb(db, 'INSERT INTO work_logs (date, title) VALUES (?, ?)', ['2026-05-26', '关联任务'])
      const tag = runDb(db, 'INSERT INTO tags (name) VALUES (?)', ['测试标签'])

      runDb(db, 'INSERT INTO work_log_tags (work_log_id, tag_id) VALUES (?, ?)', [log.lastInsertRowid, tag.lastInsertRowid])

      const associations = queryAllDb(db, 'SELECT * FROM work_log_tags')
      expect(associations.length).toBe(1)
    })

    test('关联应该在删除日志时级联', () => {
      const log = runDb(db, 'INSERT INTO work_logs (date, title) VALUES (?, ?)', ['2026-05-26', '级联删除测试'])
      const tag = runDb(db, 'INSERT INTO tags (name) VALUES (?)', ['级联标签'])

      runDb(db, 'INSERT INTO work_log_tags (work_log_id, tag_id) VALUES (?, ?)', [log.lastInsertRowid, tag.lastInsertRowid])

      // 删除日志
      runDb(db, 'DELETE FROM work_logs WHERE id = ?', [log.lastInsertRowid])

      const associations = queryAllDb(db, 'SELECT * FROM work_log_tags WHERE work_log_id = ?', [log.lastInsertRowid])
      expect(associations.length).toBe(0)
    })

    test('一个日志可以关联多个标签', () => {
      const log = runDb(db, 'INSERT INTO work_logs (date, title) VALUES (?, ?)', ['2026-05-26', '多标签任务'])
      const tag1 = runDb(db, 'INSERT INTO tags (name) VALUES (?)', ['标签一'])
      const tag2 = runDb(db, 'INSERT INTO tags (name) VALUES (?)', ['标签二'])

      runDb(db, 'INSERT INTO work_log_tags (work_log_id, tag_id) VALUES (?, ?)', [log.lastInsertRowid, tag1.lastInsertRowid])
      runDb(db, 'INSERT INTO work_log_tags (work_log_id, tag_id) VALUES (?, ?)', [log.lastInsertRowid, tag2.lastInsertRowid])

      const associations = queryAllDb(db, 'SELECT * FROM work_log_tags WHERE work_log_id = ?', [log.lastInsertRowid])
      expect(associations.length).toBe(2)
    })
  })

  describe('聚合查询', () => {
    test('GROUP_CONCAT 应该正确合并标签', () => {
      const log = runDb(db, 'INSERT INTO work_logs (date, title) VALUES (?, ?)', ['2026-05-26', '带标签任务'])
      const tag1 = runDb(db, 'INSERT INTO tags (name) VALUES (?)', ['前端'])
      const tag2 = runDb(db, 'INSERT INTO tags (name) VALUES (?)', ['紧急'])

      runDb(db, 'INSERT INTO work_log_tags (work_log_id, tag_id) VALUES (?, ?)', [log.lastInsertRowid, tag1.lastInsertRowid])
      runDb(db, 'INSERT INTO work_log_tags (work_log_id, tag_id) VALUES (?, ?)', [log.lastInsertRowid, tag2.lastInsertRowid])

      const result = queryOneDb(db, `
        SELECT wl.*, GROUP_CONCAT(t.name) as tag_names
        FROM work_logs wl
        LEFT JOIN work_log_tags wlt ON wl.id = wlt.work_log_id
        LEFT JOIN tags t ON wlt.tag_id = t.id
        WHERE wl.id = ?
        GROUP BY wl.id
      `, [log.lastInsertRowid])

      expect(result?.tag_names).toContain('前端')
      expect(result?.tag_names).toContain('紧急')
    })

    test('应该能计算总时长', () => {
      runDb(db, 'INSERT INTO work_logs (date, title, actual_hours) VALUES (?, ?, ?)', ['2026-05-26', '任务一', 2.0])
      runDb(db, 'INSERT INTO work_logs (date, title, actual_hours) VALUES (?, ?, ?)', ['2026-05-26', '任务二', 3.5])
      runDb(db, 'INSERT INTO work_logs (date, title, actual_hours) VALUES (?, ?, ?)', ['2026-05-25', '任务三', 1.5])

      const total = queryOneDb(db, 'SELECT SUM(actual_hours) as total FROM work_logs WHERE date = ?', ['2026-05-26'])
      expect(total?.total).toBe(5.5)
    })

    test('应该能按日期分组统计', () => {
      runDb(db, 'INSERT INTO work_logs (date, title, actual_hours) VALUES (?, ?, ?)', ['2026-05-26', '任务一', 2.0])
      runDb(db, 'INSERT INTO work_logs (date, title, actual_hours) VALUES (?, ?, ?)', ['2026-05-26', '任务二', 3.0])
      runDb(db, 'INSERT INTO work_logs (date, title, actual_hours) VALUES (?, ?, ?)', ['2026-05-25', '任务三', 1.5])

      const stats = queryAllDb(db, `
        SELECT date, SUM(actual_hours) as total_hours, COUNT(*) as log_count
        FROM work_logs
        GROUP BY date
        ORDER BY date DESC
      `)
      expect(stats.length).toBe(2)
      expect(stats[0].total_hours).toBe(5.0)
      expect(stats[0].log_count).toBe(2)
      expect(stats[1].total_hours).toBe(1.5)
    })
  })

  describe('数据库持久化', () => {
    test('数据库应该能正确导出和重新加载', async () => {
      runDb(db, 'INSERT INTO work_logs (date, title) VALUES (?, ?)', ['2026-05-26', '持久化测试'])

      const data = db.export()
      expect(data.length).toBeGreaterThan(0)

      // 重新加载数据库
      const SQL = await initSqlJs()
      const newDb = new SQL.Database(new Uint8Array(data))

      const logs = queryAllDb(newDb, 'SELECT * FROM work_logs')
      expect(logs.length).toBe(1)
      expect(logs[0].title).toBe('持久化测试')

      newDb.close()
    })
  })
})
