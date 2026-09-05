const { chromium } = require("playwright");
const ort = require("onnxruntime-node");
const sharp = require("sharp");
const path = require("path");
require("dotenv").config();

const CAPTCHA_ALPHABET = "abcdefghijklmnopqrstuvwxyz123456789";
const CAPTCHA_WIDTH = 90;
const CAPTCHA_HEIGHT = 35;
const CAPTCHA_MODEL_PATH = path.join(
  __dirname,
  "models",
  "luogu-captcha-int8.onnx",
);
let captchaSessionPromise;

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required env: ${name}`);
  }
  return value.trim();
}

async function getCaptchaSession() {
  if (!captchaSessionPromise) {
    captchaSessionPromise = ort.InferenceSession.create(CAPTCHA_MODEL_PATH);
  }
  return captchaSessionPromise;
}

// 使用本地 ONNX 模型识别验证码
async function recognizeCaptcha(base64Image) {
  console.log("开始使用本地模型识别验证码...");

  try {
    const imageBuffer = Buffer.from(base64Image, "base64");
    const { data } = await sharp(imageBuffer)
      .resize(CAPTCHA_WIDTH, CAPTCHA_HEIGHT, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const input = new ort.Tensor(
      "float32",
      Float32Array.from(data, (value) => value / 255),
      [1, CAPTCHA_HEIGHT, CAPTCHA_WIDTH, 3],
    );

    const session = await getCaptchaSession();
    const inputName = session.inputNames[0];
    const outputName = session.outputNames[0];
    const output = (await session.run({ [inputName]: input }))[outputName];
    const [batchSize, characterCount, classCount] = output.dims;

    if (
      batchSize !== 1 ||
      characterCount !== 4 ||
      classCount !== CAPTCHA_ALPHABET.length
    ) {
      throw new Error(`模型输出尺寸异常: ${output.dims.join("x")}`);
    }

    const prediction = [];
    for (let position = 0; position < characterCount; position++) {
      const offset = position * classCount;
      let bestClass = 0;
      for (let classIndex = 1; classIndex < classCount; classIndex++) {
        if (output.data[offset + classIndex] > output.data[offset + bestClass]) {
          bestClass = classIndex;
        }
      }
      prediction.push(CAPTCHA_ALPHABET[bestClass]);
    }

    const captchaText = prediction.join("");
    console.log(`本地模型识别结果: "${captchaText}"`);
    return captchaText;
  } catch (error) {
    console.error("本地验证码识别失败:", error.message);
    throw new Error(`本地验证码识别失败: ${error.message}`);
  }
}

async function readLoadedCaptchaImage(imageElement) {
  return imageElement.evaluate(async (image) => {
    if (!image.complete || image.naturalWidth === 0) {
      await image.decode();
    }

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("无法创建Canvas上下文");
    }

    context.drawImage(image, 0, 0);
    return canvas.toDataURL("image/jpeg").replace(/^data:image\/jpeg;base64,/, "");
  });
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    viewport: { width: 1280, height: 720 },
    extraHTTPHeaders: {
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      DNT: "1",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Cache-Control": "max-age=0",
    },
  });

  const page = await context.newPage();

  // 随机延迟函数
  const randomDelay = (min, max) => {
    return new Promise((resolve) => {
      const delay = Math.floor(Math.random() * (max - min + 1)) + min;
      setTimeout(resolve, delay);
    });
  };

  const randomTypingDelay = (min = 70, max = 160) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  // 仅在流程异常时保存页面截图
  const screenshot = async (name) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `screenshots/${name}-${timestamp}.png`;
    await page.screenshot({ path: filename });
    console.log(`Screenshot saved: ${filename}`);
    return filename;
  };

  try {
    console.log("开始洛谷自动签到流程...");

    // 1. 打开洛谷首页
    console.log("步骤1: 打开洛谷首页");
    await page.goto("https://www.luogu.com.cn", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await randomDelay(1000, 3000);

    // 2. 打开登录页
    console.log("步骤2: 打开登录页");
    const usernameInput = page
      .locator(
        'input[placeholder*="用户名"], input[placeholder*="UID"], input[placeholder*="电子邮箱"]',
      )
      .first();

    if (!(await usernameInput.isVisible().catch(() => false))) {
      const loginButton = page
        .locator('a[href*="login"], a:has-text("登录"), button:has-text("登录")')
        .first();

      if (await loginButton.isVisible().catch(() => false)) {
        await randomDelay(500, 1500);
        await loginButton.click();
      } else {
        console.log("未找到登录入口，直接访问登录页");
        await page.goto("https://www.luogu.com.cn/auth/login", {
          waitUntil: "networkidle",
          timeout: 30000,
        });
      }

      await usernameInput.waitFor({ state: "visible", timeout: 15000 });
      await randomDelay(1000, 2000);
    }

    // 3. 输入账号
    console.log("步骤3: 输入账号");
    const username = getRequiredEnv("LUOGU_USERNAME");
    if (await usernameInput.isVisible()) {
      await usernameInput.click();
      await randomDelay(200, 500);
      await usernameInput.type(username, { delay: randomTypingDelay() });
      await randomDelay(500, 1000);
    } else {
      throw new Error("未找到用户名输入框");
    }

    // 4. 点击下一步
    console.log("步骤4: 点击下一步");
    const nextButton = page.locator('button:has-text("下一步")').first();
    if (await nextButton.isVisible()) {
      await randomDelay(500, 1200);
      await nextButton.click();
      await page.waitForLoadState("networkidle");
      await randomDelay(1000, 2000);
    } else {
      throw new Error("未找到下一步按钮");
    }

    // 5. 输入密码
    console.log("步骤5: 输入密码");
    const password = getRequiredEnv("LUOGU_PASSWORD");
    const passwordInput = page.locator('input[placeholder="输入密码"]').first();

    if (await passwordInput.isVisible()) {
      await passwordInput.click();
      await randomDelay(200, 500);
      await passwordInput.type(password, { delay: randomTypingDelay() });
      await randomDelay(500, 1000);
    } else {
      throw new Error("未找到密码输入框");
    }

    // 6. 自动识别并填写验证码
    console.log("步骤6: 自动识别验证码");
    const captchaInput = page
      .locator('input[placeholder="请输入图形验证码"]')
      .first();

    if (await captchaInput.isVisible()) {
      console.log("发现验证码，开始自动识别");

      // 查找验证码图片 - 使用多种选择器
      const captchaImageSelectors = [
        'img[alt*="验证码"]',
        'img[alt*="captcha"]',
        'img[src*="captcha"]',
        'img[src*="code"]',
        "img.lform-captcha",
        "img.captcha",
        'img[title*="验证码"]',
      ];

      let captchaImage = null;
      for (const selector of captchaImageSelectors) {
        captchaImage = page.locator(selector).first();
        if (await captchaImage.isVisible()) {
          console.log(`找到验证码图片: ${selector}`);
          break;
        }
      }

      if (!captchaImage) {
        throw new Error("未找到验证码图片");
      }

      // 直接读取页面中已加载的验证码图片，避免重新请求验证码
      console.log("读取当前页面验证码图片进行识别");

      try {
        await captchaImage.waitFor({ state: "visible", timeout: 5000 });
        const captchaImageData = await readLoadedCaptchaImage(captchaImage);
        console.log("已读取当前页面验证码图片");

        // 使用当前页面图片的Base64数据进行识别
        const captchaCode = await recognizeCaptcha(captchaImageData);

        // 填写验证码
        await captchaInput.fill(captchaCode);
        await randomDelay(500, 1000);

        console.log(`✅ 验证码识别并填写成功: ${captchaCode}`);

      } catch (error) {
        console.error("验证码识别失败，尝试手动处理");
        console.error(error.message);

        // 等待用户手动输入验证码
        const readline = require("readline").createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const manualCaptchaCode = await new Promise((resolve) => {
          readline.question("请手动输入验证码: ", (answer) => {
            readline.close();
            resolve(answer);
          });
        });

        await captchaInput.click();
        await randomDelay(200, 500);
        await captchaInput.type(manualCaptchaCode, { delay: randomTypingDelay() });
        await randomDelay(500, 1000);
      }
    } else {
      console.log("未发现验证码，继续登录流程");
    }

    // 7. 点击登录
    console.log("步骤7: 点击登录");
    const loginButton2 = page
      .locator('button:has-text("使用账户密码登录")')
      .first();
    if (await loginButton2.isVisible()) {
      await randomDelay(700, 1600);
      await loginButton2.click();
      await page.waitForLoadState("networkidle");
      await randomDelay(1000, 2000);

      const maxRetries = 8;
      for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
        const errorTitle = page
          .locator('.swal2-title:visible')
          .filter({ hasText: "图形验证码错误" })
          .first();

        try {
          await errorTitle.waitFor({ state: "visible", timeout: 1500 });
        } catch {
          console.log("未检测到验证码错误弹窗，登录提交完成");
          break;
        }

        console.log(`检测到验证码错误弹窗，准备第 ${retryCount + 1} 次重试`);
        await page.locator(".swal2-confirm:visible").click();
        await randomDelay(800, 1500);

        const retryImage = page.locator('img[src*="captcha"]:visible').first();
        const previousCaptchaSrc = await retryImage.getAttribute("src");
        await retryImage.waitFor({ state: "visible", timeout: 5000 });
        await page.waitForFunction(
          (oldSrc) => {
            const image = document.querySelector('img[src*="captcha"]');
            return image && image.src !== oldSrc && image.complete && image.naturalWidth > 0;
          },
          previousCaptchaSrc,
          { timeout: 5000 },
        );
        const retryImageData = await readLoadedCaptchaImage(retryImage);
        const retryCode = await recognizeCaptcha(retryImageData);
        await randomDelay(300, 900);
        await captchaInput.fill(retryCode);
        console.log(`重新填写验证码: ${retryCode}`);
        await randomDelay(700, 1600);
        await loginButton2.click();
        await randomDelay(1000, 2000);
      }

      const remainingCaptchaError = page
        .locator('.swal2-title:visible')
        .filter({ hasText: "图形验证码错误" })
        .first();
      if (await remainingCaptchaError.isVisible().catch(() => false)) {
        throw new Error(`验证码连续 ${maxRetries} 次识别错误，停止签到`);
      }

      if (await loginButton2.isVisible().catch(() => false)) {
        throw new Error("登录未成功，仍停留在登录页面");
      }
    } else {
      throw new Error("未找到登录按钮");
    }

    // 8. 等待登录完成
    console.log("步骤8: 等待登录完成");
    await page.waitForLoadState("networkidle");
    await randomDelay(2000, 4000);

    // 9. 查找打卡按钮
    console.log("步骤9: 查找打卡按钮");
    const checkinButton = page.getByText("点击打卡", { exact: true }).first();

    if (await checkinButton.isVisible()) {
      console.log("找到点击打卡按钮，开始打卡");
      await randomDelay(700, 1800);
      await checkinButton.click();
      await randomDelay(1000, 2000);
      const checkinResult = await page.textContent("body");
      if (
        checkinResult.includes("打卡成功") ||
        checkinResult.includes("今日已打卡") ||
        checkinResult.includes("已完成打卡") ||
        checkinResult.includes("连续打卡")
      ) {
        console.log("✅ 自动打卡成功");
      } else {
        console.log("⚠️ 已点击打卡，但页面没有返回明确成功提示");
      }
    } else {
      console.log("未找到点击打卡按钮，检查是否已经打卡");

      // 检查页面内容
      const pageContent = await page.textContent("body");
      if (
        pageContent.includes("今日已签到") ||
        pageContent.includes("签到成功") ||
        pageContent.includes("今日已打卡") ||
        pageContent.includes("已完成打卡") ||
        pageContent.includes("连续打卡")
      ) {
        console.log("✅ 确认今天已经打卡");
      } else {
        console.log("⚠️ 打卡状态不确定");
      }
    }

    console.log("✅ 签到流程完成");
  } catch (error) {
    console.error("签到过程中出现错误:", error);
    await screenshot("error");
    throw error;
  } finally {
    await browser.close();
  }
}

// 运行主函数
main().catch((error) => {
  console.error("签到失败:", error);
  process.exit(1);
});
