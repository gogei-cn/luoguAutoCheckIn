# Gogei's luogu-auto-checkin

使用 GitHub Actions 和 Playwright 浏览器自动化实现洛谷自动签到，包含反反爬虫措施。

## 功能特点

- 🚀 使用 Playwright 浏览器自动化
- 🛡️ 内置反反爬虫措施
- 📸 自动截图记录过程
- 🔐 **自动验证码识别**（OCR）
- 🔐 支持验证码手动处理（备用）
- ⏰ 支持定时自动执行

## 使用步骤

### 本地测试

#### 手动验证码处理版本
1. 复制 `.env.example` 为 `.env`
2. 编辑 `.env` 文件，填入你的洛谷账号密码
3. 运行 `npm install` 安装依赖
4. 运行 `node index.js` 测试签到

#### 自动验证码识别版本
1. 复制 `.env.example` 为 `.env`
2. 编辑 `.env` 文件，填入你的洛谷账号密码
3. 运行 `npm install` 安装依赖
4. 运行 `npm run checkin-auto` 测试自动验证码识别签到

### GitHub Actions 部署

1. 新建一个 GitHub 仓库并推送本项目。
2. 在仓库 `Settings -> Secrets and variables -> Actions` 中新增两个 secret：
   - `LUOGU_USERNAME`：洛谷账号
   - `LUOGU_PASSWORD`：洛谷密码
3. 确保 Actions 已启用。
4. 在 Actions 页面手动运行一次 `Luogu Daily Check-in` 验证。

## 反反爬虫措施

本脚本包含以下反反爬虫措施：

1. **随机延迟**：模拟人类操作间隔
2. **随机鼠标移动**：模拟真实用户行为
3. **真实浏览器头**：使用完整的浏览器请求头
4. **渐进式操作**：避免机械化操作
5. **截图记录**：便于调试和问题排查

## 验证码处理

当遇到图形验证码时：

1. 脚本会自动截图保存验证码
2. 在终端提示输入验证码
3. 手动输入后继续自动流程

## 定时说明

- 工作流文件：`.github/workflows/daily-checkin.yml`
- 当前 cron：`0 0 * * *`（每天 00:00 UTC，即北京时间 08:00）

如需调整时间，可修改 cron 表达式。

## 故障排除

如果签到失败，请检查：

1. 截图文件了解具体失败环节
2. 网络连接是否正常
3. 账号密码是否正确
4. 是否需要手动处理验证码
