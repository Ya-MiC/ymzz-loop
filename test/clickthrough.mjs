import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const shotDir = join(root, "docs", "clickthrough");
mkdirSync(shotDir, { recursive: true });
const port = 1421;
const data = mkdtempSync(join(tmpdir(), "ymzz-click-"));
const bin = join(root, "app", "target", "debug", "ymzz-vibe");
const child = spawn(bin, ["serve", "--port", String(port), "--data", data], {
  stdio: "ignore",
});
const clicked = [];
const shots = [];

function fail(message) {
  child.kill();
  throw new Error(message);
}

async function waitForCore() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (res.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  fail("core did not start");
}

async function signature(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const bits = [
      location.hash,
      document.querySelector(".panel.active")?.id || "",
      document.getElementById("onboard")?.hidden ? "" : document.getElementById("onboardProgress")?.textContent || "",
      document.getElementById("palette")?.hidden ? "palette-off" : "palette-on",
      root.getAttribute("data-theme") || "",
      root.getAttribute("data-palette") || "",
      document.body.dataset.drawer || "",
    ];
    for (const id of ["draftState", "placeStatus", "moveOut", "ocrResult", "payOut", "linkOut", "gateOut", "decideOut", "talkStatus", "navStatus", "settingsOut", "mdHint", "selection", "fileDetail", "payDetail", "homeMeta", "threadHeading", "messages", "folderError", "nickError", "browser", "docBrowser", "reviewCard", "threadList"]) {
      const node = document.getElementById(id);
      if (!node || node.hidden) continue;
      bits.push(`${id}:${(node.innerText || "").slice(0, 160)}`);
    }
    document.querySelectorAll("input[type=checkbox], select").forEach((box) => {
      bits.push(`${box.id}:${box.type === "checkbox" ? box.checked : box.value}`);
    });
    return bits.join("\n");
  });
}

async function shot(page, name) {
  const file = join(shotDir, name);
  await page.screenshot({ path: file, fullPage: true });
  shots.push(name);
}

async function react(page, locator, label) {
  const before = await signature(page);
  await locator.waitFor({ state: "visible", timeout: 5000 });
  await locator.evaluate((node) => node.click());
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    if (await signature(page) !== before) {
      clicked.push(label);
      return;
    }
    await page.waitForTimeout(150);
  }
  fail(`dead control: ${label}`);
}

async function clickNamed(page, name) {
  const button = page.getByRole("button", { name, exact: true });
  await react(page, button, name);
}

try {
  await waitForCore();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 780 } });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "怎麼稱呼你" }).waitFor();
  if (await page.locator("#rootPath, #onboardPath, #moveFrom, #moveTo").count()) {
    fail("a typed path field is still on the page");
  }
  await shot(page, "01-nickname.png");
  await clickNamed(page, "先不填電話");
  await page.getByRole("heading", { name: "選一個位置" }).waitFor();
  await shot(page, "02-places.png");
  await clickNamed(page, "先跳過");
  await clickNamed(page, "我知道了");
  await clickNamed(page, "先跳過");
  await clickNamed(page, "先跳過");
  await clickNamed(page, "看彙報");
  await page.waitForFunction(() => location.hash === "#/home");
  await page.getByRole("heading", { name: "彙報" }).waitFor();
  const filesN = await page.locator("#statFilesN").innerText();
  const talkN = await page.locator("#statTalkN").innerText();
  if (filesN === "…" || filesN === "0") fail(`dashboard files were not populated: ${filesN}`);
  if (talkN === "…" || talkN === "0") fail(`dashboard conversations were not populated: ${talkN}`);
  await shot(page, "03-home.png");

  const paper = await page.evaluate(() => getComputedStyle(document.querySelector(".onboard")).backgroundColor);
  if (!paper || paper === "rgba(0, 0, 0, 0)" || paper === "transparent") {
    fail(`onboarding paper color is missing: ${paper}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const covered = await page.evaluate(() => {
    const heading = document.querySelector("#home h1");
    const rect = heading.getBoundingClientRect();
    const x = Math.min(window.innerWidth - 12, Math.max(12, rect.left + Math.min(rect.width / 2, 80)));
    const y = rect.top + Math.min(18, rect.height / 2);
    const top = document.elementFromPoint(x, y);
    const side = document.querySelector(".side");
    const dock = document.querySelector(".dock");
    const hitsSide = top && (top === side || side.contains(top));
    const hitsDock = top && (top === dock || dock.contains(top));
    return { hitsSide, hitsDock, tag: top ? top.tagName : "", text: top ? (top.innerText || "").slice(0, 40) : "", y: rect.top, h: rect.height };
  });
  if (covered.hitsSide || covered.hitsDock || covered.y < 0 || covered.h < 8) {
    fail(`sidebar covers the work area at 390px: ${JSON.stringify(covered)}`);
  }
  await shot(page, "07-mobile-home.png");
  await page.locator("#menuBtn").click();
  await page.waitForFunction(() => document.body.dataset.drawer === "open");
  const drawerNav = await page.evaluate(() => {
    const button = document.querySelector('#sideNav button[data-panel="review"]');
    const rect = button.getBoundingClientRect();
    return rect.left >= 0 && rect.right <= window.innerWidth && rect.width > 8;
  });
  if (!drawerNav) fail("the menu drawer did not show the rest of the pages");
  await shot(page, "08-mobile-drawer.png");
  await page.locator('#sideNav button[data-panel="review"]').click();
  await page.waitForFunction(() => location.hash === "#/review" && document.body.dataset.drawer !== "open");
  await page.locator("#dockMore").click();
  await page.waitForFunction(() => document.body.dataset.drawer === "open");
  await page.locator("#scrim").click({ position: { x: 360, y: 80 } });
  await page.waitForFunction(() => document.body.dataset.drawer !== "open");
  await page.setViewportSize({ width: 1100, height: 780 });
  await page.locator('.nav button[data-panel="home"]').click();
  await page.waitForFunction(() => location.hash === "#/home");

  const panels = ["home", "files", "talk", "ocr", "review", "links", "pay", "device", "settings"];
  const seen = new Set();
  for (const panel of panels) {
    const nav = page.locator(`.nav button[data-panel="${panel}"]`);
    if ((await nav.getAttribute("aria-current")) !== "page") {
      await react(page, nav, `選單 ${panel}`);
    }
    await shot(page, `page-${panel}.png`);
    if (panel === "files") {
      await react(page, page.locator("#scanRoot"), "掃描");
      seen.add("files::掃描");
    }
    const labels = await page.locator(".panel.active button").evaluateAll((nodes) => nodes.map((node) => ({
      text: (node.innerText || "").trim(),
      disabled: node.disabled,
      id: node.id || "",
      go: node.dataset.go || "",
    })));
    for (const item of labels) {
      if (!item.text || item.disabled) continue;
      const key = `${panel}::${item.text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (item.id === "browseRoot" || item.id === "browseDocs") {
        await react(page, page.locator(`#${item.id}`), item.text);
        const use = page.locator("#browser button, #docBrowser button").filter({ hasText: "用這個資料夾" }).first();
        try {
          await use.waitFor({ state: "visible", timeout: 15000 });
          await react(page, use, "用這個資料夾");
        } catch (err) {
          if (String(err && err.message).startsWith("dead control")) throw err;
        }
        continue;
      }
      const active = await page.evaluate(() => document.querySelector(".panel.active")?.id || "");
      if (active !== panel) {
        await page.locator(`.nav button[data-panel="${panel}"]`).click();
        await page.waitForFunction((id) => document.querySelector(".panel.active")?.id === id, panel);
      }
      const pattern = new RegExp(item.text.trim().split(/\s+/).map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+"));
      const button = item.id
        ? page.locator(`#${item.id}`)
        : item.go
          ? page.locator(`.panel.active [data-go="${item.go}"]`)
          : page.locator(".panel.active button", { hasText: pattern }).first();
      await react(page, button, `${panel}:${item.text.replace(/\s+/g, " ")}`);
      const now = await page.evaluate(() => document.querySelector(".panel.active")?.id || "");
      if (now !== panel) {
        await page.locator(`.nav button[data-panel="${panel}"]`).click();
        await page.waitForFunction((id) => document.querySelector(".panel.active")?.id === id, panel);
      }
    }
    const boxes = page.locator(".panel.active input[type=checkbox]");
    for (let i = 0; i < await boxes.count(); i += 1) {
      const id = await boxes.nth(i).getAttribute("id");
      if (seen.has(`${panel}::box::${id}`)) continue;
      seen.add(`${panel}::box::${id}`);
      await react(page, boxes.nth(i), `${panel}:勾選 ${id}`);
    }
    const selects = page.locator(".panel.active select");
    for (let i = 0; i < await selects.count(); i += 1) {
      const id = await selects.nth(i).getAttribute("id");
      if (seen.has(`${panel}::select::${id}`)) continue;
      seen.add(`${panel}::select::${id}`);
      const before = await signature(page);
      const value = await selects.nth(i).evaluate((node) => {
        const current = node.value;
        const next = [...node.options].find((option) => option.value !== current);
        return next ? next.value : "";
      });
      if (!value) continue;
      await selects.nth(i).selectOption(value);
      if (await signature(page) === before) fail(`dead control: select ${id}`);
      clicked.push(`${panel}:選擇 ${id}`);
    }
  }

  await page.locator('.nav button[data-panel="files"]').click();
  await page.locator("#runQuery").click();
  await page.waitForFunction(() => (document.getElementById("draftState")?.textContent || "").includes("份"));
  const row = page.locator("#drawer button").first();
  if (await row.count()) {
    await react(page, row, "檔案列");
    await shot(page, "04-file.png");
    await react(page, page.getByRole("button", { name: "用這份來整理" }), "用這份來整理");
    await react(page, page.getByRole("button", { name: "用系統打開" }), "用系統打開");
    await react(page, page.getByRole("button", { name: "在檔案總管顯示" }), "在檔案總管顯示");
  }
  await page.locator("#paletteBtn").click();
  await page.locator("#palette").waitFor();
  await shot(page, "05-palette.png");
  await react(page, page.locator("#palette button", { hasText: "對話" }), "跳到對話");
  await page.waitForFunction(() => location.hash.startsWith("#/talk"));
  await shot(page, "06-talk.png");
  const thread = page.locator("#threadList button").first();
  if (await thread.count()) await react(page, thread, "對話清單");
  await page.locator("#goBack").click();
  await page.waitForTimeout(200);
  await page.locator("#surface").selectOption("earth");
  const palette = await page.evaluate(() => document.documentElement.getAttribute("data-palette"));
  if (palette !== "earth") fail("palette select did not change the surface");
  await page.keyboard.press("Control+KeyK");
  if (await page.locator("#palette").isHidden()) fail("Ctrl+K did not open the command palette");
  await page.keyboard.press("Escape");

  writeFileSync(join(shotDir, "clicked.json"), JSON.stringify({ clicked, shots }, null, 2));
  await browser.close();
  child.kill();
  console.log(`clicked ${clicked.length} controls`);
} catch (err) {
  child.kill();
  console.error(err);
  process.exit(1);
}
