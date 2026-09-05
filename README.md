# 洛谷自动打卡

使用 Playwright 登录洛谷并完成每日自动打卡。验证码使用本地 ONNX 模型识别，图片不会发送到远程 OCR 服务。

## 功能

- 自动打开洛谷、登录并点击“点击打卡”
- 从浏览器当前已加载的验证码图片读取像素，不重新请求验证码
- 使用本地 ONNX 模型识别 4 位验证码
- 验证码错误时自动刷新并重试，最多 8 次
- 识别失败时支持终端手动输入
- 支持 GitHub Actions 定时执行
- 只在异常时保存页面截图

## 环境要求

- Node.js 20 或更高版本
- 可访问洛谷的网络环境
- 洛谷账号和密码

## 本地运行

在项目根目录创建 `.env`：

```env
LUOGU_USERNAME=你的洛谷账号
LUOGU_PASSWORD=你的洛谷密码
```

安装依赖并运行：

```bash
npm install
npx playwright install chromium
npm run checkin
```

项目只有一个运行入口：

```bash
npm run checkin
```

## 验证码模型

模型文件位于 [models/luogu-captcha-int8.onnx](models/luogu-captcha-int8.onnx)。模型输入为 `90x35` 的 RGB 图片，输出 4 位字母或数字。

脚本的处理流程如下：

1. Playwright 找到页面中已经加载的验证码图片。
2. 在页面内通过 Canvas 读取原始图片像素。
3. Node.js 使用 `sharp` 调整为 `90x35 RGB`。
4. `onnxruntime-node` 在本地运行模型。
5. 识别结果填写回验证码输入框。

模型来源于 [langningchen/luoguCaptcha](https://github.com/langningchen/luoguCaptcha)，模型文件使用 AGPL-3.0 许可证。再次发布或分发项目时，请遵守对应许可证要求。

## GitHub Actions

工作流文件为 `.github/workflows/daily-checkin.yml`，默认每天 `00:00 UTC` 运行，也可以在 Actions 页面手动运行。

在仓库的 `Settings -> Secrets and variables -> Actions` 中配置：

- `LUOGU_USERNAME`：洛谷账号
- `LUOGU_PASSWORD`：洛谷密码

工作流会安装 Chromium、执行 `npm run checkin`，并在失败时上传 `screenshots/` 目录作为调试附件。

## 故障排查

验证码或登录失败时：

1. 查看终端输出中的识别结果和重试次数。
2. 检查 `models/luogu-captcha-int8.onnx` 是否存在。
3. 确认 `LUOGU_USERNAME` 和 `LUOGU_PASSWORD` 正确。
4. 检查网络是否能访问洛谷。
5. 查看 `screenshots/` 中的异常截图。

不要把 `.env`、账号密码或包含登录状态的截图提交到仓库。
