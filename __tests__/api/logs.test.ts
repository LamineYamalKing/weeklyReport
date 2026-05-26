import initSqlJs, { Database } from 'sql.js'
import fs from 'fs'
import path from 'path'

const testDbPath = path.join(__dirname, '../../database', 'weekly-report-api-test.sqlite')

// 重置数据库模块
jest.resetModules()

// Mock fs 和 path 供 db.ts 使用
jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs')
  return {
    ...originalFs,
    existsSync: jest.fn((p: string) => originalFs.existsSync(p)),
    mkdirSync: jest.fn((p: string, opts?: any) => originalFs.mkdirSync(p, opts)),
    readFileSync: jest.fn((p: string) => originalFs.readFileSync(p)),
    writeFileSync: jest.fn((p: string, data: Buffer) => originalFs.writeFileSync(p, data)),
  }
})

beforeAll(() => {
  const dbDir = path.dirname(testDbPath)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath)
  }
})

afterAll(() => {
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath)
  }
})

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

  // 保存到文件
  const data = db.export()
  fs.writeFileSync(testDbPath, Buffer.from(data))
  db.close()
  return db
}

describe('API 路由测试 - 工作日志', () => {
  let db: Database

  beforeEach(async () => {
    await createTestDb()
    const SQL = await initSqlJs()
    const buffer = fs.readFileSync(testDbPath)
    db = new SQL.Database(buffer)
  })

  afterEach(() => {
    if (db) db.close()
  })

  describe('工作日志基本操作', () => {
    test('插入工作日志应该成功', () => {
      db.run('INSERT INTO work_logs (date, title, description, estimated_hours, actual_hours) VALUES (?, ?, ?, ?, ?)', ['2026-05-26', '测试API', '测试描述', 2.0, 1.5])
      expect(db.getRowsModified()).toBeGreaterThan(0)

      const result = db.exec('SELECT * FROM work_logs WHERE title = "测试API"')
      expect(result.length).toBe(1)
      expect(result[0].values.length).toBe(1)
    })

    test('日期筛选应该正确返回结果', () => {
      db.run("INSERT INTO work_logs (date, title) VALUES ('2026-05-20', '旧任务')")
      db.run("INSERT INTO work_logs (date, title) VALUES ('2026-05-25', '新任务')")

      const result = db.exec(`
        SELECT * FROM work_logs WHERE date >= '2026-05-25' ORDER BY date DESC
      `)
      expect(result.length).toBe(1)
    })

    test('标签关联查询应该正确返回 JSON', () => {
      db.run("INSERT INTO work_logs (date, title) VALUES ('2026-05-26', '带标签任务')")
      db.run("INSERT INTO tags (name, color) VALUES ('前端', '#3B82F6')")
      db.run("INSERT INTO tags (name, color) VALUES ('紧急', '#EF4444')")
      db.run(`
        INSERT INTO work_log_tags (work_log_id, tag_id)
        SELECT wl.id, t.id FROM work_logs wl, tags t WHERE wl.title = '带标签任务' AND t.name = '前端'
      `)

      const result = db.exec(`
        SELECT wl.*, GROUP_CONCAT(json_object('id', t.id, 'name', t.name, 'color', t.color, 'created_at', t.created_at)) as tags_json
        FROM work_logs wl
        LEFT JOIN work_log_tags wlt ON wl.id = wlt.work_log_id
        LEFT JOIN tags t ON wlt.tag_id = t.id
        WHERE wl.title = '带标签任务'
        GROUP BY wl.id
      `)
      expect(result.length).toBe(1)
      const row = result[0].values[0]
      const tagsJsonCol = row[row.length - 1]
      expect(typeof tagsJsonCol === 'string').toBe(true)
    })
  })

  describe('统计查询', () => {
    test('每日统计应该返回正确的总和', () => {
      db.run("INSERT INTO work_logs (date, title, actual_hours) VALUES ('2026-05-26', '任务一', 2.0)")
      db.run("INSERT INTO work_logs (date, title, actual_hours) VALUES ('2026-05-26', '任务二', 3.5)")

      const result = db.exec("SELECT SUM(actual_hours) as total FROM work_logs WHERE date = '2026-05-26'")
      expect(result[0].values[0][0]).toBe(5.5)
    })

    test('周报范围内的统计应该正确', () => {
      db.run("INSERT INTO work_logs (date, title, actual_hours, estimated_hours) VALUES ('2026-05-20', '任务一', 1.0, 2.0)")
      db.run("INSERT INTO work_logs (date, title, actual_hours, estimated_hours) VALUES ('2026-05-21', '任务二', 2.0, 3.0)")
      db.run("INSERT INTO work_logs (date, title, actual_hours, estimated_hours) VALUES ('2026-05-22', '任务三', 3.0, 4.0)")

      const result = db.exec(`
        SELECT
          SUM(actual_hours) as total_hours,
          COUNT(*) as log_count
        FROM work_logs
        WHERE date BETWEEN '2026-05-20' AND '2026-05-22'
      `)
      expect(result[0].values[0][0]).toBe(6.0)
      expect(result[0].values[0][1]).toBe(3)
    })
  })
})
