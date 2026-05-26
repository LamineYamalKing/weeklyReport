# 周报工具

个人使用的周报工具，记录每日工作内容、追踪时间、自动生成周报。

## 技术栈

- [Next.js 16](https://nextjs.org/) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) v4
- [sql.js](https://sql.js.org/) — WASM SQLite，本地数据库
- [Jest](https://jestjs.io/) + Testing Library

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm test

# Lint 检查
npm run lint
```

启动后访问 http://localhost:3000 使用。

## 功能

- **工作日志**：创建、编辑、删除每日工作记录
- **标签管理**：自定义标签分类，支持按标签筛选
- **时间追踪**：手动输入或计时器记录实际工作时长
- **周报生成**：按日期范围自动汇总工作内容
- **数据统计**：每日/每周/标签维度的时长统计

## 数据库

数据存储在本地 SQLite 文件 `./database/weekly-report.sqlite`，无需额外服务。
包含三张表：`work_logs`（工作日志）、`tags`（标签）、`work_log_tags`（关联表）。
详见 [SPEC.md](./SPEC.md)。

## 目录结构

```
src/
├── app/                    # Next.js App Router 页面与 API
│   ├── api/                # API 路由（日志、标签、周报、统计）
│   ├── logs/               # 工作日志页面
│   ├── tags/               # 标签管理页面
│   ├── report/             # 周报页面
│   └── stats/              # 统计页面
├── lib/db.ts               # 数据库工具
└── types/index.ts          # TypeScript 类型
```
