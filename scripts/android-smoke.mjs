// Boot the debug x86_64 APK, open onboarding, then the briefing.
// Proof is the page text plus docs/mobile/01-nickname.png and 02-dashboard.png.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.argv[2] || "src-tauri/gen/android";
const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(repo, "docs", "mobile");

function adb(args, timeout = 30000) {
  return execFileSync("adb", args, { encoding: "utf8", timeout });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function walk(dir, found = []) {
  let names = [];
  try {
    names = readdirSync(dir);
  } catch (err) {
    return found;
  }
  for (const name of names) {
    const path = join(dir, name);
    let info;
    try {
      info = statSync(path);
    } catch (err) {
      continue;
    }
    if (info.isDirectory()) walk(path, found);
    else found.push(path);
  }
  return found;
}

function apk() {
  const files = walk(root).filter((path) => path.endsWith(".apk"));
  const debug = files.find((path) => /x86_64/.test(path) && /debug/i.test(path))
    || files.find((path) => /debug/i.test(path) && !/aarch64|arm64/i.test(path));
  if (!debug) {
    throw new Error(`no x86_64 debug apk under ${root}:\n${files.join("\n")}`);
  }
  return debug;
}

async function cdpSend(ws, method, params = {}) {
  const id = (cdpSend.next = (cdpSend.next || 0) + 1);
  const reply = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${method} timed out`)), 20000);
    cdpSend.wait.set(id, (message) => {
      clearTimeout(timer);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result || {});
    });
  });
  ws.send(JSON.stringify({ id, method, params }));
  return reply;
}
cdpSend.wait = new Map();

async function bodyText(ws) {
  const result = await cdpSend(ws, "Runtime.evaluate", {
    expression: "document.body ? document.body.innerText : ''",
    returnByValue: true,
  });
  return result.result && result.result.value ? result.result.value : "";
}

async function waitFor(ws, text, ms) {
  const start = Date.now();
  let last = "";
  while (Date.now() - start < ms) {
    last = await bodyText(ws);
    if (last.includes(text)) return last;
    await sleep(500);
  }
  throw new Error(`page did not show ${text}\n${last.slice(0, 800)}`);
}

async function click(ws, text) {
  const result = await cdpSend(ws, "Runtime.evaluate", {
    expression: `(() => {
      const el = [...document.querySelectorAll("button")].find((node) => {
        if (node.hidden || node.offsetParent === null) return false;
        return (node.innerText || "").includes(${JSON.stringify(text)});
      });
      if (!el) return false;
      el.click();
      return true;
    })()`,
    returnByValue: true,
  });
  if (!result.result || result.result.value !== true) {
    throw new Error(`no visible button ${text}\n${(await bodyText(ws)).slice(0, 800)}`);
  }
}

async function shot(ws, path) {
  const result = await cdpSend(ws, "Page.captureScreenshot", { format: "png" });
  writeFileSync(path, Buffer.from(result.data, "base64"));
}

async function pageSocket() {
  const start = Date.now();
  while (Date.now() - start < 90000) {
    let sockets = "";
    try {
      sockets = adb(["shell", "cat /proc/net/unix"]);
    } catch (err) {
      sockets = "";
    }
    try {
      const pid = adb(["shell", "pidof dev.ymzz.bingce"]).trim();
      if (pid) sockets += `\nwebview_devtools_remote_${pid.split(/\s+/)[0]}`;
    } catch (err) {
      // The process is not up yet.
    }
    const line = sockets.split("\n").find((row) => row.includes("webview_devtools_remote_"));
    if (line) {
      const name = line.trim().split(/\s+/).pop().replace(/^@/, "");
      try {
        adb(["forward", "--remove", "tcp:9222"]);
      } catch (err) {
        // The forward is absent on the first try.
      }
      adb(["forward", "tcp:9222", `localabstract:${name}`]);
      try {
        const listed = await fetch("http://127.0.0.1:9222/json/list");
        if (listed.ok) {
          const pages = await listed.json();
          const page = pages.find((item) => item.webSocketDebuggerUrl) || pages[0];
          if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
        }
      } catch (err) {
        // The socket exists before the devtools server answers.
      }
    }
    await sleep(1000);
  }
  throw new Error("webview devtools socket did not appear");
}

const file = apk();
console.log(`install ${file}`);
adb(["install", "-r", "-t", file], 120000);
adb(["shell", "monkey", "-p", "dev.ymzz.bingce", "-c", "android.intent.category.LAUNCHER", "1"]);
const debuggerUrl = await pageSocket();
const ws = new WebSocket(debuggerUrl.replace(/^ws:\/\/[^/]+/, "ws://127.0.0.1:9222"));
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", () => reject(new Error("devtools websocket failed")), { once: true });
});
ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && cdpSend.wait.has(message.id)) {
    const done = cdpSend.wait.get(message.id);
    cdpSend.wait.delete(message.id);
    done(message);
  }
});
await cdpSend(ws, "Runtime.enable");
await cdpSend(ws, "Page.enable");
mkdirSync(outDir, { recursive: true });
try {
  await waitFor(ws, "怎麼稱呼你", 30000);
  await shot(ws, join(outDir, "01-nickname.png"));
  const steps = [
    ["先不填電話", "選一個位置"],
    ["先跳過", "東西留在這台電腦"],
    ["我知道了", "文件辨識可以以後再裝"],
    ["先跳過", "連接可以以後再設"],
    ["先跳過", "準備好了"],
    ["看彙報", "檔案"],
  ];
  for (const [label, next] of steps) {
    await click(ws, label);
    await waitFor(ws, next, 20000);
  }
  const home = await bodyText(ws);
  if (home.includes("怎麼稱呼你")) throw new Error("still on the nickname screen");
  await shot(ws, join(outDir, "02-dashboard.png"));
  console.log("YMZZ_SMOKE android onboarding and dashboard");
  ws.close();
} catch (err) {
  try {
    writeFileSync(join(repo, "android-logcat.txt"), adb(["logcat", "-d", "-t", "400"]));
  } catch (logErr) {
    writeFileSync(join(repo, "android-logcat.txt"), String(logErr));
  }
  throw err;
}
