# /weekly-report

生成最近7天的工作周报。

# 步骤

1. 如果 dev server 没有运行，运行 `npm run dev`
2. 调用 GET `/api/reports/weekly?startDate=上周一&endDate=今天` 获取周报数据
3. 将数据展示在终端（Markdown 格式）
4. 提示用户访问 http://localhost:3000/report 查看完整周报
