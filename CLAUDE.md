# CLAUDE.md

## 项目概述
个人使用的周报工具，记录每日工作内容、追踪时间、自动生成周报并支持导出。

## Tech Stack
- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4 for styling
- sql.js (WASM SQLite) for local database
- API Routes (Route Handlers) for backend
- Jest + Testing Library for testing

## Code Style
- Use server components by default, 'use client' only when needed
- API routes in src/app/api/, use Route Handlers
- Prefer named exports
- Error handling: always use try-catch in API routes
- 所有人类可读内容使用简体中文

## Database
- SQLite via sql.js (WASM-based)
- Database file: ./database/weekly-report.sqlite
- Tables: work_logs, tags, work_log_tags (many-to-many)
- See src/lib/db.ts for DB utilities
- See SPEC.md for full schema

## Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── logs/              # 工作日志 CRUD
│   │   ├── tags/              # 标签 CRUD
│   │   ├── reports/weekly/    # 周报生成
│   │   └── stats/             # 统计（每日/每周/标签）
│   ├── logs/page.tsx          # 工作日志页（含表单+计时器）
│   ├── tags/page.tsx          # 标签管理页
│   ├── report/page.tsx        # 周报页
│   ├── stats/page.tsx         # 统计页
│   ├── page.tsx               # 首页（重定向到 /logs）
│   └── layout.tsx             # 根布局（含导航）
├── lib/db.ts                  # 数据库初始化、查询工具、保存
└── types/index.ts             # TypeScript 类型定义
```

## Testing
- `npm run lint` — ESLint 检查
- `npm test` — Jest 测试
- 测试文件位于 __tests__/
