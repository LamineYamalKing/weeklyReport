# 项目约定与指令

## 代码修改后自动提交

每次 Claude Code 修改代码后，**必须**自动运行以下命令提交并推送：

```bash
cd D:\ai-project\weeklyReport
git add -A
git commit -m "描述本次修改的简要说明"
git push
```

### 提交规则

1. 修改完成后先 `git add -A` 暂存所有变更
2. `git commit` 提交信息用中文，简洁描述修改内容
3. `git push` 推送到远程仓库
4. 如果提交失败（网络问题），提示用户手动推送

### 前置检查

- 提交前确保 `npm run lint` 通过
- 如果修改了测试或相关代码，确保 `npm test` 通过
- **不要**提交 `.env`、`database/` 等敏感/本地文件
