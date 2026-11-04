// ymzz-notion site — vanilla JS, no dependencies
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem("ymzz:" + k)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem("ymzz:" + k, JSON.stringify(v)); } catch {} } };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let lang = store.get("lang", navigator.language.startsWith("zh") ? "zh" : "en");
  const T = (zh, en) => (lang === "en" ? en : zh);

  // ── headline: split into words for blur‑in (React Bits "Blur Text", vanilla)
  const h1 = $("h1"); h1.dataset.zh = h1.textContent;
  const renderH1 = () => {
    const [a, b] = (lang === "en" ? h1.dataset.en : h1.dataset.zh).split("|");
    const words = (s, off) => [...(lang === "en" ? s.split(/(\s+)/) : [...s])].map((w, i) => /^\s+$/.test(w) ? w : `<span class="w" style="animation-delay:${(off + i) * 45}ms">${w}</span>`).join("");
    h1.innerHTML = `${words(a, 0)}<br><span class="line2">${words(b, 6)}</span>`;
  };

  // ── i18n via data-en; zh cached in data-zh
  const applyLang = () => {
    document.documentElement.lang = lang === "en" ? "en" : "zh-Hant";
    $$("[data-en]").forEach(el => { if (el === h1) return; if (!el.dataset.zh) el.dataset.zh = el.textContent; el.textContent = lang === "en" ? el.dataset.en : el.dataset.zh; });
    $("#lang").textContent = lang === "en" ? "中文" : "EN";
    renderH1(); renderSteps(); renderPanel();
  };
  $("#lang").onclick = () => { lang = lang === "en" ? "zh" : "en"; store.set("lang", lang); applyLang(); };

  // ── theme (家族 A 淺色 / 莫蘭蒂暗色)
  const setTheme = t => { document.documentElement.dataset.theme = t; $("#theme").dataset.en = t === "dark" ? "Light" : "Dark"; $("#theme").dataset.zh = t === "dark" ? "淺色" : "暗色"; $("#theme").textContent = lang === "en" ? $("#theme").dataset.en : $("#theme").dataset.zh; $('meta[name=theme-color]').content = t === "dark" ? "#191C29" : "#F8F6EF"; };
  $("#theme").onclick = () => { const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; store.set("theme", t); setTheme(t); };

  // ── scroll reveal + count up
  const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; e.target.classList.add("in"); io.unobserve(e.target);
    $$(".count", e.target).forEach(c => { const to = +c.dataset.to, t0 = performance.now(), d = reduce ? 0 : 1400; const tick = t => { const p = d ? Math.min(1, (t - t0) / d) : 1; c.textContent = Math.round(to * (1 - Math.pow(1 - p, 4))); if (p < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  }), { threshold: .15 });
  $$(".reveal").forEach((el, i) => { el.style.transitionDelay = `${(i % 6) * 70}ms`; io.observe(el); });

  // ── tutorial
  const REPO = "https://github.com/Ya-MiC/ymzz-notion";
  const pre = s => `<pre><button class="copy" type="button">${T("複製", "Copy")}</button><code>${s.replace(/</g, "&lt;")}</code></pre>`;
  const STEPS = [
    { id: "repo", t: ["建立你的倉庫", "Create your repo"], b: () => T(
      `<ol><li>打開 <a href="${REPO}">ymzz-notion</a>，按 <b>Use this template → Create a new repository</b>（或 Fork）。</li><li>建議設為 <b>Private</b>，你的復盤會存進這個倉庫。</li></ol><p class="note">公開倉庫 Actions 免費無限；私人倉庫每月約 720 分鐘，在 2,000 分鐘免費額度內。</p>`,
      `<ol><li>Open <a href="${REPO}">ymzz-notion</a> → <b>Use this template → Create a new repository</b> (or Fork).</li><li>Make it <b>Private</b> — your reviews are stored there.</li></ol><p class="note">Public repos get unlimited Actions; private uses ~720 min/month, inside the 2,000 free minutes.</p>`) },
    { id: "notion", t: ["Notion 整合", "Notion integration"], b: () => T(
      `<ol><li>到 <a href="https://www.notion.so/profile/integrations">Notion Integrations</a> → <b>New integration</b>（Internal），名稱 <code>ymzz</code>，複製 token。</li><li>打開要放復盤的 Notion 頁面 → 右上 <b>⋯ → Connections</b> → 加入 <code>ymzz</code>。</li></ol>`,
      `<ol><li>Go to <a href="https://www.notion.so/profile/integrations">Notion Integrations</a> → <b>New integration</b> (Internal), name it <code>ymzz</code>, copy the token.</li><li>Open the Notion page for your reviews → <b>⋯ → Connections</b> → add <code>ymzz</code>.</li></ol>`) },
    { id: "setup", t: ["執行 setup.sh", "Run setup.sh"], b: () => T(`<p>在電腦上（需 Node.js 20+）建立兩個空白資料庫：</p>`, `<p>On your computer (Node.js 20+), create the two blank databases:</p>`) +
      pre(`git clone https://github.com/<你/you>/ymzz-notion && cd ymzz-notion\nNOTION_TOKEN=<token> ./setup.sh "<Notion 頁面網址 page URL>"\ngit add sync.config.json && git commit -m "setup ids" && git push`) +
      `<p class="note">Windows PowerShell：</p>` + pre(`$env:NOTION_TOKEN="<token>"; npm install; node scripts/setup-notion.mjs "<page URL>"`) },
    { id: "google", t: ["Google 服務帳戶", "Google service account"], b: () => T(
      `<ol><li><a href="https://console.cloud.google.com">Google Cloud Console</a> → 新專案 → 啟用 <b>Google Sheets API</b>。</li><li>IAM → Service accounts → 建立 → Keys → Add key → <b>JSON</b>（下載）。</li><li>建一個 Google Sheet，<b>共用</b>給服務帳戶 email（編輯者）。網址 <code>/d/&lt;SHEET_ID&gt;/edit</code> 中間那段就是 SHEET_ID。</li></ol>`,
      `<ol><li><a href="https://console.cloud.google.com">Google Cloud Console</a> → new project → enable <b>Google Sheets API</b>.</li><li>IAM → Service accounts → create → Keys → Add key → <b>JSON</b> (download).</li><li>Create a Google Sheet and <b>share</b> it with the service‑account email (Editor). The part in <code>/d/&lt;SHEET_ID&gt;/edit</code> is your SHEET_ID.</li></ol>`) },
    { id: "gmail", t: ["Gmail 應用程式密碼", "Gmail app password"], b: () => T(
      `<ol><li>先開啟 Google 帳戶兩步驟驗證。</li><li>到 <a href="https://myaccount.google.com/apppasswords">App passwords</a> 建立，得到 16 位密碼。</li></ol>`,
      `<ol><li>Turn on 2‑Step Verification for your Google account.</li><li>Create one at <a href="https://myaccount.google.com/apppasswords">App passwords</a> — you get a 16‑character password.</li></ol>`) },
    { id: "secrets", t: ["GitHub Secrets", "GitHub Secrets"], b: () => T(`<p>倉庫 → Settings → Secrets and variables → Actions → <b>New repository secret</b>：</p>`, `<p>Repo → Settings → Secrets and variables → Actions → <b>New repository secret</b>:</p>`) +
      `<ul><li><code>NOTION_TOKEN</code></li><li><code>GOOGLE_SERVICE_ACCOUNT_JSON</code> — ${T("整個 JSON 內容", "whole JSON file")}</li><li><code>SHEET_ID</code></li><li><code>SMTP_USER</code> — ${T("你的 Gmail", "your Gmail")}</li><li><code>SMTP_PASS</code> — ${T("16 位應用程式密碼", "16‑char app password")}</li><li><code>MAIL_TO</code> — ${T("收提醒的信箱", "where reminders go")}</li></ul><p class="note">${T("金鑰只存在你的 GitHub，不會經過任何第三方。", "Secrets stay in your GitHub only.")}</p>` },
    { id: "tz", t: ["時區與提醒時間", "Time zone & time"], b: tzPanel },
    { id: "run", t: ["第一次執行", "First run"], b: () => T(
      `<ol><li>Actions → <b>daily-review</b> → <b>Run workflow</b>。</li><li>成功的樣子：收到信、Notion 出現今天的頁、Sheet 出現「每日復盤」「持倉」兩個分頁。</li><li>之後每天自動，600 天免維護。🎉</li></ol>`,
      `<ol><li>Actions → <b>daily-review</b> → <b>Run workflow</b>.</li><li>Success looks like: an email, today's page in Notion, and two tabs in your Sheet.</li><li>From now on it's automatic. 🎉</li></ol>`) },
  ];
  let done = new Set(store.get("done", [])), cur = store.get("cur", 0);
  const steps = $("#steps"), panel = $("#panel");
  function renderSteps() {
    steps.innerHTML = STEPS.map((s, i) => `<li class="${done.has(s.id) ? "done" : ""}"><button type="button" data-i="${i}" ${i === cur ? 'aria-current="step"' : ""}><span class="dot">${done.has(s.id) ? "✓" : i + 1}</span>${T(...s.t)}</button></li>`).join("");
    const p = Math.round(done.size / STEPS.length * 100);
    $(".progress i").style.width = p + "%"; $("#pct").textContent = p + "%"; $(".progress").setAttribute("aria-valuenow", p);
  }
  function renderPanel() {
    const s = STEPS[cur], d = done.has(s.id);
    panel.innerHTML = `<p class="note">${T("步驟", "Step")} ${cur + 1} / ${STEPS.length}</p><h3>${T(...s.t)}</h3>${s.b()}<div class="acts"><button type="button" class="mark">${d ? T("↺ 標為未完成", "↺ Mark undone") : T("✓ 完成這一步", "✓ Mark done")}</button>${cur < STEPS.length - 1 ? `<button type="button" class="next">${T("下一步 →", "Next →")}</button>` : ""}</div>`;
    if (s.id === "tz") bindTz();
  }
  steps.onclick = e => { const b = e.target.closest("button"); if (!b) return; cur = +b.dataset.i; store.set("cur", cur); renderSteps(); renderPanel(); panel.focus({ preventScroll: true }); };
  panel.onclick = e => {
    const id = STEPS[cur].id;
    if (e.target.closest(".copy")) { const c = e.target.closest("pre").querySelector("code").textContent; navigator.clipboard?.writeText(c); e.target.textContent = T("已複製 ✓", "Copied ✓"); return; }
    if (e.target.closest(".mark")) { done.has(id) ? done.delete(id) : (done.add(id), cur < STEPS.length - 1 && (cur++)); }
    else if (e.target.closest(".next")) cur++;
    else return;
    store.set("done", [...done]); store.set("cur", cur); renderSteps(); renderPanel();
  };

  // ── time zone picker → generated config
  function tzPanel() {
    const zones = Intl.supportedValuesOf ? Intl.supportedValuesOf("timeZone") : ["Asia/Seoul", "Asia/Taipei", "Asia/Shanghai", "Asia/Tokyo", "America/New_York", "Europe/London", "UTC"];
    const tz = store.get("tz", "Asia/Seoul"), tm = store.get("tm", "07:00");
    return T(`<p>預設 <b>Asia/Seoul 07:00</b>。選你的時區與時間，下方會產生要填的設定：</p>`, `<p>Default is <b>Asia/Seoul 07:00</b>. Pick yours and copy the generated settings:</p>`) +
      `<div class="row"><label>${T("時區", "Time zone")}<select id="tzSel">${zones.map(z => `<option${z === tz ? " selected" : ""}>${z}</option>`).join("")}</select></label><label>${T("提醒時間", "Reminder time")}<input id="tmIn" type="time" value="${tm}" step="300"></label><label>&nbsp;<button type="button" class="next" id="tzMine">${T("用我的時區", "Use my zone")}</button></label></div><div id="tzOut"></div>`;
  }
  function bindTz() {
    const out = () => {
      const tz = $("#tzSel").value, tm = $("#tmIn").value || "07:00"; store.set("tz", tz); store.set("tm", tm);
      const slug = tz.split("/").pop().toLowerCase().replace(/[^a-z0-9]+/g, "_");
      const now = new Date(), f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, month: "2-digit", day: "2-digit", timeZoneName: "longOffset" }).formatToParts(now);
      const g = k => f.find(p => p.type === k)?.value;
      const off = g("timeZoneName").replace("GMT", "UTC").replace(/([+-])0?(\d+):00$/, "$1$2") || "UTC+0";
      const m = off.match(/([+-])(\d+)(?::(\d+))?/); const mins = m ? (m[1] === "-" ? -1 : 1) * (+m[2] * 60 + +(m[3] || 0)) : 0;
      const [h, mi] = tm.split(":").map(Number); let u = ((h * 60 + mi - mins) % 1440 + 1440) % 1440; const uh = Math.ceil((u - 5) / 60) % 24; const utc = `${String((uh + 24) % 24).padStart(2, "0")}:05 UTC`;
      $("#tzOut").innerHTML = `<p>${T("① GitHub → Settings → Secrets and variables → Actions → <b>Variables</b>：", "① GitHub → Settings → Secrets and variables → Actions → <b>Variables</b>:")}</p>` +
        pre(`YMZZ_TZ = ${tz}\nYMZZ_REMIND_TIME = ${tm}`) +
        `<p>${T("② 或寫進 <code>sync.config.json</code>：", "② Or put it in <code>sync.config.json</code>:")}</p>` + pre(`"timezone": "${tz}",\n"remind_time": "${tm}"`) +
        `<p class="note">${T("時區偏移", "Offset")} ${off} · ${T("檔名範例", "Filename")} <code>notion/${now.getFullYear()}/${g("month")}${g("day")}_${tm.replace(":", "")}_${slug}.md</code> · ${T("約於", "Runs at about")} ${utc} ${T("的整點閘門執行（GitHub 可能延遲數分鐘）", "hourly gate (GitHub may delay a few minutes)")}</p>`;
    };
    $("#tzSel").onchange = $("#tmIn").oninput = out;
    $("#tzMine").onclick = () => { $("#tzSel").value = Intl.DateTimeFormat().resolvedOptions().timeZone; out(); };
    out();
  }

  setTheme(store.get("theme", matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  applyLang();
})();
