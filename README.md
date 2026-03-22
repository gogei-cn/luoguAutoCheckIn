# Gogei's luogu-auto-checkin

提取自 `vscode-luogu` 插件的打卡逻辑，使用 GitHub Actions 每天自动打卡洛谷。

## 使用步骤

1. 新建一个 GitHub 仓库并推送本项目。
2. 在仓库 `Settings -> Secrets and variables -> Actions` 中新增两个 secret：
   - `_uid`：洛谷 Cookie 里的 `_uid`
   - `__client_id`：洛谷 Cookie 里的 `__client_id`
3. 确保 Actions 已启用。
4. 在 Actions 页面手动运行一次 `Luogu Daily Check-in` 验证。

## 如何获取 Cookie

1. 浏览器登录洛谷后，打开开发者工具。
2. 在 Cookie 中找到：
   - `_uid`
   - `__client_id`
3. 将它们添加到 GitHub Secrets 中。

## 定时说明

- 工作流文件：`.github/workflows/daily-checkin.yml`
- 当前 cron：`0 0 * * *`（每天 00:00 UTC，即北京时间 08:00）

如需调整时间，可修改 cron 表达式。
