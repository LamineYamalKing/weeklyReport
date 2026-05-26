# CLAUDE.md

## 项目概述
AI-powered weekly report generator. 个人使用的周报工具，记录每日工作内容、追踪时间、自动生成周报并支持导出。

## Tech Stack
- Next.js 15 (App Router) + TypeScript
- Tailwind CSS for styling
- SQLite (better-sqlite3) for local database
- API Routes (Route Handlers) for backend

## Code Style
- Use server components by default, 'use client' only when needed
- API routes in src/app/api/, use Route Handlers
- Prefer named exports
- Error handling: always use try-catch in API routes
- 所有人类可读内容使用简体中文

## Database
- SQLite via better-sqlite3
- Database file stored in ./database/weekly-report.sqlite
- See SPEC.md for schema details

## Testing
- Run `npm run lint` before committing
