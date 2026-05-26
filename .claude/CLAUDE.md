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

## Testing
- `npm run lint` before committing
- `npm test` for Jest tests
- Tests in src/__tests__/

## 代码修改后自动提交

每次修改代码后，**必须**自动执行以下流程：

```bash
git add -A
git commit -m "描述本次修改的简要说明"
git push
```

### 规则
1. 提交信息用中文，简洁描述修改内容
2. 提交前确保 `npm run lint` 通过
3. 修改了测试或核心代码时，确保 `npm test` 通过
4. **不要**提交 `.env`、`database/` 等敏感/本地文件（已在 .gitignore）
5. 如果 push 失败（网络问题），提示用户手动推送
