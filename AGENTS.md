<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 项目特定指引

## 数据库
- 使用 sql.js（WASM SQLite），非 better-sqlite3
- 数据库文件位于 `./database/weekly-report.sqlite`
- 每次写操作后必须调用 `saveDb()` 持久化
- `getDb()` 是异步初始化，调用前需 `await`

## API 约定
- 所有 API 路由返回 `{ success: boolean, data?: T, error?: string }` 格式
- 错误处理使用 try-catch，返回 500 + error 字段
- 参数校验：缺少必填字段返回 400

## 前端约定
- 页面组件默认 Server Component，需要状态/交互时用 `'use client'`
- 数据获取统一通过 fetch 调用 API 路由
- 计时器仅在工作日志页实现
