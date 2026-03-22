const CHECKIN_URL = "https://www.luogu.com.cn/index/ajax_punch";

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required env: ${name}`);
  }
  return value.trim();
}

async function run() {
  const uid = getRequiredEnv("_uid");
  const clientId = getRequiredEnv("__client_id");
  const cookie = `_uid=${uid};__client_id=${clientId}`;

  const res = await fetch(CHECKIN_URL, {
    method: "GET",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      Referer: "https://www.luogu.com.cn/",
      cookie,
      "User-Agent": "vscode-luogu@extracted",
    },
  });

  const raw = await res.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(
      `Unexpected response: HTTP ${res.status}, body=${raw.slice(0, 300)}`,
    );
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
  }

  const code = data?.code;
  const message = data?.message ?? "";
  if (code === 200 || code === 201) {
    if (message) {
      console.log(`[luogu-checkin] success with message: ${message}`);
    } else {
      console.log("[luogu-checkin] success: punched today.");
    }
    return;
  }

  throw new Error(`[luogu-checkin] failed: ${JSON.stringify(data)}`);
}

run().catch((err) => {
  console.error(
    `[luogu-checkin] error: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
});
