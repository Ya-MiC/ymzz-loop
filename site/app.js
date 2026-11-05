// SPDX-License-Identifier: MIT · ymzz-loop site — vanilla JS, no dependencies, network: same-origin i18n JSON + optional signup endpoint from config.js
(() => {
  document.documentElement.classList.add("js");
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem("ymzz:" + k)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem("ymzz:" + k, JSON.stringify(v)); } catch { /* private mode */ } } };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const LANGS = ["en", "zh-Hant", "zh-CN", "ko", "ar"];
  const pick = () => { const q = new URLSearchParams(location.search).get("lang"); if (LANGS.includes(q)) return q; const s = store.get("lang"); if (LANGS.includes(s)) return s;
    const n = (navigator.language || "en").toLowerCase(); return n.startsWith("zh") ? (/(tw|hk|mo|hant)/.test(n) ? "zh-Hant" : "zh-CN") : n.startsWith("ko") ? "ko" : "en"; };
  let lang = pick(), dict = {}, en = {};
  const t = k => dict[k] ?? en[k] ?? k;
  const icon = (n, cls = "") => `<svg class="i ${cls}" aria-hidden="true"><use href="icons.svg#i-${n}"/></svg>`;
  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const pre = (s) => `<pre dir="ltr"><button class="copy" type="button">${icon("copy")}<span>${t("ui.copy")}</span></button><code>${esc(s)}</code></pre>`;
  const load = async l => { const r = await fetch(`i18n/${l}.json`); return r.json(); };

  // faq built from keys
  const renderStatic = () => {
    $("#faqList").innerHTML = [1, 2, 4].map(i => `<details><summary>${t("q" + i)}</summary><p>${t("a" + i)}</p></details>`).join("");
  };

  // world-clock tile (feature demo only; no hero clock)
  function drawCities() {
    const el = $("#cities"); if (!el) return;
    const now = new Date(), zones = [["America/Los_Angeles", "LA"], ["Etc/UTC", "UTC"], ["Europe/London", "London"], ["Asia/Seoul", "Seoul"], ["Asia/Taipei", "Taipei"]];
    el.innerHTML = zones.map(([z, n], i) => `<li class="${i === 1 ? "me" : ""}"><span>${n}</span><b>${new Intl.DateTimeFormat("en-GB", { timeZone: z, hour: "2-digit", minute: "2-digit" }).format(now)}</b></li>`).join("");
  }
  drawCities(); if ($("#cities")) setInterval(drawCities, 60000);

  // live 24h dial (visitor's own zone) — reminder default 07:00 UTC · restored from v1.2
  const NS = "http://www.w3.org/2000/svg";
  function drawDial() {
    const svg = $("#dialSvg"); if (!svg) return;
    const now = new Date(), localMin = now.getHours() * 60 + now.getMinutes();
    const remUTC = 7 * 60, remLocal = ((remUTC - now.getTimezoneOffset()) % 1440 + 1440) % 1440;
    const ang = m => (m / 1440) * 360 - 90, pt = (a, r) => [Math.cos(a * Math.PI / 180) * r, Math.sin(a * Math.PI / 180) * r];
    const cs = getComputedStyle(document.documentElement);
    const c1 = (cs.getPropertyValue("--accent").trim() || "#B9DDF1");
    const c2 = (cs.getPropertyValue("--accent-warm").trim() || "#CDBFE0");
    const c3 = (cs.getPropertyValue("--accent-soft").trim() || "#F4DDE7");
    let h = `<defs><linearGradient id="arcg" x1="0" x2="1"><stop offset="0" stop-color="${c1}"/><stop offset=".5" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></linearGradient></defs>`;
    for (let i = 0; i < 96; i++) {
      const m = i * 15, a = ang(m), hour = i % 4 === 0, [x1, y1] = pt(a, hour ? 70 : 76), [x2, y2] = pt(a, 84);
      h += `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" class="${hour ? "h" : ""}"/>`;
      if (hour && (i / 4) % 3 === 0) { const [tx, ty] = pt(a, 94); h += `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}">${String(i / 4).padStart(2, "0")}</text>`; }
    }
    let span = (remLocal - localMin + 1440) % 1440 || 1440;
    const a0 = ang(localMin), a1 = ang(localMin + span), [sx, sy] = pt(a0, 58), [ex, ey] = pt(a1, 58);
    h += `<path class="arc" d="M${sx.toFixed(2)} ${sy.toFixed(2)} A58 58 0 ${span > 720 ? 1 : 0} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}"/>`;
    const [nx, ny] = pt(a0, 100), [rx, ry] = pt(ang(remLocal), 100), [rt, rty] = pt(ang(remLocal), 106);
    h += `<line class="now" x1="${(nx*.62).toFixed(2)}" y1="${(ny*.62).toFixed(2)}" x2="${nx.toFixed(2)}" y2="${ny.toFixed(2)}"/><line class="rem" x1="${(rx * .66).toFixed(2)}" y1="${(ry * .66).toFixed(2)}" x2="${rx.toFixed(2)}" y2="${ry.toFixed(2)}"/><text class="rem" x="${rt.toFixed(1)}" y="${rty.toFixed(1)}">●</text>`;
    svg.innerHTML = h;
    const clock = $("#clock"), tz = $("#tzName"), next = $("#nextIn");
    if (clock) clock.textContent = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    if (tz) tz.textContent = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";
    if (next) next.textContent = `${Math.floor(span / 60)}h ${String(span % 60).padStart(2, "0")}m`;
  }
  drawDial(); setInterval(drawDial, reduce ? 60000 : 30000);


  // preloader: brief, skippable, reduced-motion aware; content stays in DOM for crawlers / no-JS
  (() => {
    const pre = $("#pre"); if (!pre) return;
    const html = document.documentElement, seen = sessionStorage.getItem("ymzz:pre");
    const end = () => { if (html.classList.contains("ready")) return; html.classList.add("ready"); try { sessionStorage.setItem("ymzz:pre", "1"); } catch {} setTimeout(() => pre.remove(), 900); };
    if (reduce || seen || new URLSearchParams(location.search).has("nopre")) { pre.remove(); html.classList.add("ready"); return; }
    html.classList.add("preloading");
    const n = $("#preN"), t0 = performance.now(), D = 1400;
    const tick = now => { const p = Math.min(1, (now - t0) / D), v = 1 - Math.pow(1 - p, 3); n.textContent = String(Math.round(v * 100)).padStart(2, "0"); pre.style.setProperty("--p", v.toFixed(3)); if (p < 1 && !html.classList.contains("ready")) requestAnimationFrame(tick); else end(); };
    requestAnimationFrame(tick);
    ["pointerdown", "keydown", "wheel", "touchstart"].forEach(ev => addEventListener(ev, end, { once: true, passive: true }));
    setTimeout(end, 2200);
  })();

  // pointer tilt + glow (fine pointers only)
  if (!reduce && matchMedia("(pointer:fine)").matches) {
    $$(".tilt").forEach(el => {
      el.addEventListener("pointermove", e => { const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty("--ry", ((x - .5) * 6).toFixed(2) + "deg"); el.style.setProperty("--rx", ((.5 - y) * 6).toFixed(2) + "deg"); el.style.setProperty("--mx", x * 100 + "%"); el.style.setProperty("--my", y * 100 + "%"); });
      el.addEventListener("pointerleave", () => { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); });
    });
  }

  const apply = async () => {
    if (!Object.keys(en).length) en = await load("en");
    dict = lang === "en" ? en : await load(lang).catch(() => en);
    const h = document.documentElement; h.lang = dict._lang || lang; h.dir = dict._dir || "ltr";
    $$("[data-i18n]").forEach(el => { el.innerHTML = t(el.dataset.i18n); });
    $$("[data-i18n-placeholder]").forEach(el => { el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder)); });
    document.title = t("meta.title"); $('meta[name=description]').content = t("meta.desc");
    $("#lang").value = lang; if ($("#palette")) { const o=$("#palette").options; if(o[0]) o[0].text=t("ui.cloud"); if(o[1]) o[1].text=t("ui.earth"); } renderDates();
    // holdings 彩蛋: zh-CN + UTC+8 → 600519.SH (貴州茅台); else 2330.TW — all .js-hold-ticker
    (() => {
      const els = $$(".js-hold-ticker"); if (!els.length) return;
      const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { return ""; } })();
      const utc8 = /^(Asia\/(Shanghai|Chongqing|Urumqi|Harbin|Kashgar)|Etc\/GMT-8)$/.test(tz)
        || (() => { try { return new Date().getTimezoneOffset() === -480; } catch { return false; } })();
      const ashare = lang === "zh-CN" && utc8;
      const label = ashare ? "600519.SH" : null;
      els.forEach(el => {
        const v = label || (el.dataset.tickerDefault || "2330.TW");
        el.textContent = v;
        el.dataset.egg = ashare ? "ashare" : "tw";
        el.title = ashare ? "贵州茅台 · A-share" : "";
      });
    })();
    renderMarquee(); renderTags(); $$("[data-i18n-aria]").forEach(el => el.setAttribute("aria-label", t(el.dataset.i18nAria))); renderStatic(); renderSteps(); renderPanel(); setTheme(document.documentElement.dataset.theme); if (window.__ymzzTodoRender) window.__ymzzTodoRender();
  };
  $("#lang").onchange = e => { lang = e.target.value; store.set("lang", lang); apply(); };

  // theme (View Transitions when available)
  function setTheme(th) {
    document.documentElement.dataset.theme = th;
    $("#themeIc").setAttribute("href", `icons.svg#i-${th === "dark" ? "sun" : "moon"}`);
    $("#themeTx").textContent = th === "dark" ? t("ui.light") : t("ui.dark");
    const pal = document.documentElement.dataset.palette === "earth" ? "earth" : "cloud";
    // soft Morandi theme-color — never charcoal
    $('meta[name=theme-color]').content = th === "dark"
      ? (pal === "earth" ? "#2F2A22" : "#2A241D")
      : (pal === "earth" ? "#E8E3CC" : "#F8F6EF");
  }
  $("#theme").onclick = () => { const th = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; store.set("theme", th);
    if (document.startViewTransition && !reduce) document.startViewTransition(() => setTheme(th)); else setTheme(th); };

  // palette: cloud (雲箋) | earth (陶土) — dark maps to 暮靄 / 暮林
  function setPalette(pal) {
    document.documentElement.dataset.palette = pal === "earth" ? "earth" : "cloud";
    const sel = $("#palette"); if (sel) sel.value = document.documentElement.dataset.palette;
    const th = document.documentElement.dataset.theme || "light";
    const pal2 = document.documentElement.dataset.palette === "earth" ? "earth" : "cloud";
    $('meta[name=theme-color]').content = th === "dark" ? (pal2 === "earth" ? "#2F2A22" : "#2A241D") : (pal2 === "earth" ? "#E8E3CC" : "#F8F6EF");
  }
  const savedPal = store.get("palette", "cloud");
  setPalette(savedPal === "earth" ? "earth" : "cloud");
  $("#palette") && ($("#palette").onchange = e => { store.set("palette", e.target.value); setPalette(e.target.value); });

  // live data in mockups — all relative to the visitor's browser-local "today"
  const loc = () => dict._lang || lang;
  const day = off => { const x = new Date(); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() + off); return x; };
  const iso = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  const md = x => `${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  function renderDates() {
    const L = loc(), d = day(0), y = day(-1);
    $$(".today").forEach(e => e.textContent = iso(d)); $$(".yday").forEach(e => e.textContent = md(y));
    const fn = $(".fname"); if (fn) fn.textContent = `${md(y).replace("-", "")}_0700_utc.md`;
    const f = o => new Intl.DateTimeFormat(L, o);
    $$("#sheetRows .rd").forEach(e => { const x = day(+e.dataset.off); e.textContent = f({ month: "2-digit", day: "2-digit" }).format(x); e.parentElement.title = iso(x); });
    const dWk = $("#dWk"), dNum = $("#dNum"), dMo = $("#dMo"), week = $("#week");
    if (dWk) dWk.textContent = f({ weekday: "long" }).format(d);
    if (dNum) dNum.textContent = String(d.getDate());
    if (dMo) dMo.textContent = f({ year: "numeric", month: "long" }).format(d);
    if (week) {
      const wd = f({ weekday: "narrow" });
      week.innerHTML = Array.from({ length: 7 }, (_, i) => { const x = day(i - 6); return `<li class="${i === 6 ? "on" : "done"}"><span>${wd.format(x)}</span><b>${x.getDate()}</b></li>`; }).join("");
    }
  }
  // marquee (optional — section may be removed)
  function renderMarquee() {
    const mq = $("#mq"), track = $(".mq-track");
    if (!mq || !track) return;
    const items = [1, 2, 3, 4, 5, 6].map(i => `<li><span class="dot" aria-hidden="true"></span>${t("mq." + i)}</li>`).join("");
    mq.innerHTML = items; const clone = mq.cloneNode(true); clone.removeAttribute("id"); clone.setAttribute("aria-hidden", "true");
    track.querySelectorAll(".mq-list:not(#mq)").forEach(n => n.remove()); track.append(clone);
  }
  // signup
  const CFG = window.YMZZ_CONFIG || {}, TAGS = ["student", "trader", "developer", "creator", "other"];
  let picked = new Set();
  function renderTags() {
    $("#tagRow").innerHTML = TAGS.map(k => `<label class="tag"><input type="checkbox" value="${k}"${picked.has(k) ? " checked" : ""}><span>${t("tag." + k)}</span></label>`).join("");
  }
  $("#tagRow").addEventListener("change", e => { const c = e.target; if (c.checked) picked.add(c.value); else picked.delete(c.value); });
  $("#signup").addEventListener("submit", async e => {
    e.preventDefault(); const msg = $("#suMsg"), say = (k, ok) => { msg.textContent = t(k); msg.dataset.ok = ok ? "1" : "0"; };
    const email = $("#suEmail").value.trim(), custom = $("#suCustom").value.trim().slice(0, 32);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return say("join.bad", false);
    if (!$("#suOk").checked) return say("join.needok", false);
    if ($("#suHp").value) return; // bot
    const tags = [...picked, ...(custom ? [custom] : [])];
    if (!CFG.SIGNUP_ENDPOINT) {
      if (CFG.SIGNUP_MAILTO) { location.href = `mailto:${CFG.SIGNUP_MAILTO}?subject=${encodeURIComponent("ymzz-loop signup")}&body=${encodeURIComponent(`email: ${email}\ntags: ${tags.join(", ")}`)}`; return say("join.mailto", true); }
      return say("join.closed", false);
    }
    const btn = $("#signup button[type=submit]"); btn.disabled = true; say("join.sending", true);
    try {
      const r = await fetch(CFG.SIGNUP_ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, tags, locale: loc(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "", consent: true }) });
      if (r.ok) { say("join.ok", true); $("#signup").reset(); picked.clear(); renderTags(); } else say(r.status === 429 ? "join.slow" : "join.err", false);
    } catch { say("join.err", false); } finally { btn.disabled = false; }
  });

  // reveal + count up
  const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; e.target.classList.add("in"); io.unobserve(e.target);
    $$(".count", e.target).forEach(c => { const to = +c.dataset.to, t0 = performance.now(), dur = reduce ? 0 : 900;
      const tick = n => { const p = dur ? Math.min(1, (n - t0) / dur) : 1; c.textContent = Math.round(to * (1 - Math.pow(1 - p, 4))); if (p < 1) requestAnimationFrame(tick); else c.textContent = String(to); };
      requestAnimationFrame(tick); });
  }), { threshold: .05, rootMargin: "0px 0px -5% 0px" });
  $$(".reveal, .tile, .lp, .fact, .fc").forEach((el, i) => { el.style.setProperty("--i", i % 6); io.observe(el); });
  const secIo = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("sec-in"); secIo.unobserve(e.target); } }), { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  $$(".sec, .hero, .marquee, .foot").forEach(el => secIo.observe(el));

  // guided setup
  const SECRETS = ["NOTION_TOKEN", "GOOGLE_SERVICE_ACCOUNT_JSON", "SHEET_ID", "SMTP_USER", "SMTP_PASS", "MAIL_TO"];
  const EXTRA = {
    3: () => pre(`git clone https://github.com/<you>/ymzz-loop && cd ymzz-loop\nNOTION_TOKEN=<token> ./setup.sh "<Notion page URL>"\ngit add sync.config.json && git commit -m "setup ids" && git push`) + pre(`# Windows PowerShell\n$env:NOTION_TOKEN="<token>"; npm install; node scripts/setup-notion.mjs "<Notion page URL>"`),
    6: () => SECRETS.map(s => pre(s)).join(""),
    7: () => tzPanel(),
  };
  const N = 8; const ID = i => "t" + (i + 1);
  let done = new Set(store.get("done", [])), cur = Math.min(store.get("cur", 0), N - 1);
  function renderSteps() {
    $("#steps").innerHTML = Array.from({ length: N }, (_, i) => `<li class="${done.has(ID(i)) ? "done" : ""}"><button type="button" data-i="${i}" ${i === cur ? 'aria-current="step"' : ""}><span class="dot" aria-hidden="true">${done.has(ID(i)) ? icon("check") : `<bdi dir="ltr">${String(i + 1).padStart(2, "0")}</bdi>`}</span><span>${t(ID(i) + ".t")}${done.has(ID(i)) ? `<span class="vh"> ✓</span>` : ""}</span></button></li>`).join("");
    const p = Math.round(done.size / N * 100); $(".progress i").style.inlineSize = p + "%"; $("#pct").textContent = p + "%"; $(".progress").setAttribute("aria-valuenow", p);
  }
  function renderPanel() {
    const id = ID(cur), isDone = done.has(id);
    $("#panel").innerHTML = `<p class="note">${t("setup.step")} <bdi dir="ltr">${String(cur + 1).padStart(2, "0")} / ${String(N).padStart(2, "0")}</bdi></p><h3>${t(id + ".t")}</h3>${t(id + ".b")}${EXTRA[cur + 1] ? EXTRA[cur + 1]() : ""}
      <p class="trouble">${icon("alert-triangle")}<span><b>${t("setup.trouble")}:</b> ${t(id + ".x")}</span></p>
      <div class="acts"><button type="button" class="mark">${icon("check")}<span>${isDone ? t("setup.undo") : t("setup.done")}</span></button>${cur < N - 1 ? `<button type="button" class="next"><span>${t("setup.next")}</span>${icon("arrow-right", "flip")}</button>` : ""}</div>`;
    if (cur === 6) bindTz();
  }
  $("#steps").onclick = e => { const b = e.target.closest("button"); if (!b) return; cur = +b.dataset.i; store.set("cur", cur); renderSteps(); renderPanel(); $("#panel").focus({ preventScroll: true }); };
  $("#panel").onclick = e => {
    const c = e.target.closest(".copy");
    if (c) { navigator.clipboard?.writeText(c.parentElement.querySelector("code").textContent); c.querySelector("span").textContent = t("ui.copied"); return; }
    if (e.target.closest(".mark")) { const id = ID(cur); if (done.has(id)) done.delete(id); else { done.add(id); if (cur < N - 1) cur++; } }
    else if (e.target.closest(".next")) cur++; else return;
    store.set("done", [...done]); store.set("cur", cur); renderSteps(); renderPanel();
  };

  // time zone picker (default UTC 07:00)
  function tzPanel() {
    const zones = Intl.supportedValuesOf ? ["UTC", ...Intl.supportedValuesOf("timeZone").filter(z => z !== "UTC")] : ["UTC", "America/Los_Angeles", "America/New_York", "Europe/London", "Asia/Seoul", "Asia/Taipei", "Asia/Shanghai"];
    const tz = store.get("tz", "UTC"), tm = store.get("tm", "07:00");
    return `<div class="row"><label>${t("tz.zone")}<select id="tzSel" dir="ltr">${zones.map(z => `<option${z === tz ? " selected" : ""}>${z}</option>`).join("")}</select></label><label>${t("tz.time")}<input id="tmIn" type="time" value="${tm}" step="300" dir="ltr"></label><label><span aria-hidden="true">&nbsp;</span><button type="button" class="next chipbtn" id="tzMine">${icon("world")}<span>${t("tz.mine")}</span></button></label></div><div id="tzOut"></div>`;
  }
  function bindTz() {
    const out = () => {
      const tz = $("#tzSel").value, tm = $("#tmIn").value || "07:00"; store.set("tz", tz); store.set("tm", tm);
      const slug = tz.split("/").pop().toLowerCase().replace(/[^a-z0-9]+/g, "_");
      const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, month: "2-digit", day: "2-digit", timeZoneName: "longOffset" }).formatToParts(new Date()), g = k => f.find(p => p.type === k)?.value;
      const off = (g("timeZoneName") || "GMT").replace("GMT", "UTC").replace(/([+-])0?(\d+):00$/, "$1$2"), offL = off === "UTC" ? "UTC+0" : off;
      const m = off.match(/([+-])(\d+)(?::(\d+))?/), mins = m ? (m[1] === "-" ? -1 : 1) * (+m[2] * 60 + +(m[3] || 0)) : 0;
      const [h, mi] = tm.split(":").map(Number), u = ((h * 60 + mi - mins) % 1440 + 1440) % 1440, uh = (Math.ceil((u - 5) / 60) + 24) % 24;
      $("#tzOut").innerHTML = `<p>${t("tz.vars")}</p>${pre(`YMZZ_TZ = ${tz}\nYMZZ_REMIND_TIME = ${tm}`)}<p>${t("tz.cfg")}</p>${pre(`"timezone": "${tz}",\n"remind_time": "${tm}"`)}
        <p class="note">${t("tz.offset")}: <bdi>${offL}</bdi> · ${t("tz.file")}: <bdi><code>notion/${new Date().getFullYear()}/${g("month")}${g("day")}_${tm.replace(":", "")}_${slug}.md</code></bdi> · ${t("tz.utc")}: <bdi>${String(uh).padStart(2, "0")}:05 UTC</bdi></p>`;
    };
    $("#tzSel").onchange = out; $("#tmIn").oninput = out;
    $("#tzMine").onclick = () => { $("#tzSel").value = Intl.DateTimeFormat().resolvedOptions().timeZone; out(); };
    out();
  }



  // demo to-dos 03–08: unified with Notion preview rows; max 6; browser-only 60h TTL
  (() => {
    const TTL_MS = 60 * 60 * 1000 * 60; // 60 hours
    const MAX = 6;
    const SLOT0 = 3; // first user number → 03
    const LS_KEY = "todos";
    const COOKIE = "ymzz_todos";
    const list = $("#todoList"), form = $("#todoForm"), input = $("#todoInput"), limitMsg = $("#todoLimitMsg");
    if (!list || !form || !input) return;
    const now = () => Date.now();
    const uid = () => "t" + now().toString(36) + Math.random().toString(36).slice(2, 7);
    const pad = n => String(n).padStart(2, "0");
    const readCookie = () => {
      const m = document.cookie.match(/(?:^|;\s*)ymzz_todos=([^;]*)/);
      if (!m) return null;
      try { return JSON.parse(decodeURIComponent(m[1])); } catch { return null; }
    };
    const writeCookie = (payload) => {
      const maxAge = Math.max(0, Math.floor((payload.exp - now()) / 1000));
      document.cookie = COOKIE + "=" + encodeURIComponent(JSON.stringify(payload))
        + "; max-age=" + maxAge + "; path=/; SameSite=Lax";
    };
    const clearCookie = () => { document.cookie = COOKIE + "=; max-age=0; path=/; SameSite=Lax"; };
    const purgeItems = (items, t0 = now()) => (items || []).filter(it => it && typeof it.created === "number" && (t0 - it.created) < TTL_MS).slice(0, MAX);
    const load = () => {
      let payload = null;
      try { payload = store.get(LS_KEY, null); } catch { payload = null; }
      if (!payload) payload = readCookie();
      if (!payload || typeof payload !== "object") return { exp: now() + TTL_MS, items: [] };
      if (typeof payload.exp === "number" && now() >= payload.exp) {
        store.set(LS_KEY, null); clearCookie(); return { exp: now() + TTL_MS, items: [] };
      }
      return { exp: typeof payload.exp === "number" ? payload.exp : now() + TTL_MS, items: purgeItems(payload.items) };
    };
    const save = (payload) => {
      payload.items = purgeItems(payload.items);
      if (!payload.items.length) { store.set(LS_KEY, null); clearCookie(); return; }
      store.set(LS_KEY, payload);
      writeCookie(payload);
    };
    const showLimit = () => {
      if (!limitMsg) return;
      limitMsg.hidden = false;
      limitMsg.textContent = t("todo.limit");
      clearTimeout(showLimit._t);
      showLimit._t = setTimeout(() => { limitMsg.hidden = true; }, 5200);
    };
    let state = load();
    const userRows = () => [...list.querySelectorAll(".todo-user")];
    const render = () => {
      state.items = purgeItems(state.items);
      userRows().forEach(n => n.remove());
      const anchor = list.querySelector('[data-fixed="09"]');
      state.items.forEach((it, i) => {
        const n = SLOT0 + i; // 03..08
        const li = document.createElement("li");
        li.className = "todo-user" + (it.done ? " is-done" : "");
        li.dataset.id = it.id;
        li.innerHTML = `<span class="pn" aria-hidden="true">${pad(n)}</span>`
          + `<label class="todo-check"><input type="checkbox" ${it.done ? "checked" : ""}><span class="todo-text" data-edit="${it.id}" title="${t("todo.add")}">${esc(it.text)}</span></label>`
          + `<button type="button" class="todo-del" aria-label="${t("todo.clear")}" data-del="${it.id}">×</button>`;
        list.insertBefore(li, anchor);
      });
      // keep input enabled so a 7th attempt can show the limit copy
    };
    form.addEventListener("submit", e => {
      e.preventDefault();
      const text = input.value.trim().slice(0, 80);
      if (!text) return;
      state.items = purgeItems(state.items);
      if (state.items.length >= MAX) { showLimit(); input.value = ""; return; }
      state.items.push({ id: uid(), text, done: false, created: now() });
      if (!state.exp || state.exp < now()) state.exp = now() + TTL_MS;
      save(state); input.value = ""; if (limitMsg) limitMsg.hidden = true; render();
    });
    list.addEventListener("change", e => {
      const cb = e.target.closest("input[type=checkbox]"); if (!cb) return;
      const li = cb.closest("[data-id]"); if (!li) return;
      const it = state.items.find(x => x.id === li.dataset.id); if (!it) return;
      it.done = cb.checked; save(state); render();
    });
    list.addEventListener("click", e => {
      const btn = e.target.closest("[data-del]");
      if (btn) {
        state.items = state.items.filter(x => x.id !== btn.getAttribute("data-del"));
        save(state); if (limitMsg) limitMsg.hidden = true; render(); return;
      }
      const tx = e.target.closest("[data-edit]");
      if (!tx || tx.isContentEditable) return;
      const id = tx.getAttribute("data-edit");
      const it = state.items.find(x => x.id === id); if (!it) return;
      tx.contentEditable = "true"; tx.focus();
      const finish = () => {
        tx.contentEditable = "false";
        const next = tx.textContent.trim().slice(0, 80);
        if (next) it.text = next; else state.items = state.items.filter(x => x.id !== id);
        save(state); render();
        tx.removeEventListener("blur", finish);
        tx.removeEventListener("keydown", onKey);
      };
      const onKey = ev => { if (ev.key === "Enter") { ev.preventDefault(); tx.blur(); } if (ev.key === "Escape") { tx.textContent = it.text; tx.blur(); } };
      tx.addEventListener("blur", finish);
      tx.addEventListener("keydown", onKey);
    });
    window.__ymzzTodoRender = render;
    render();
    setInterval(() => { state = load(); render(); }, 600000);
  })();

  // donate: copy receive-only address (never wallet connect / sign / approve)
  const DONATE_ADDR = "0x9C4345b0a652D063a79321fe099C65a7Dc5a9C3A";
  (() => {
    const btn = $("#donateCopy"), msg = $("#donateMsg"), code = $("#donateAddr");
    if (!btn || !code) return;
    if (code.textContent.trim() !== DONATE_ADDR) code.textContent = DONATE_ADDR; // hard guarantee
    btn.addEventListener("click", async () => {
      try { await navigator.clipboard?.writeText(DONATE_ADDR); if (msg) { msg.textContent = t("donate.copied"); msg.dataset.ok = "1"; }
        const span = btn.querySelector("span"); if (span) { span.textContent = t("ui.copied"); setTimeout(() => { span.textContent = t("ui.copy"); }, 1600); }
      } catch { if (msg) { msg.textContent = t("donate.copyfail"); msg.dataset.ok = "0"; } }
    });
  })();


  // reading progress + nav capsule: hero-width → content-width only AFTER hero fully past
  (() => {
    const nav = $(".nav");
    const bar = $(".readbar");
    const hero = $(".hero");
    const root = document.documentElement;
    const spyFill = $("#spyFill"), spyPct = $("#spyPct");
    let ticking = false;
    const measureHeroW = () => {
      if (!hero) return;
      const r = hero.getBoundingClientRect();
      // outer width of the 3-card row (hero already padded)
      const w = Math.round(r.width);
      root.style.setProperty("--nav-hero-w", w + "px");
      if (nav) nav.style.setProperty("--nav-hero-w", w + "px");
    };
    const apply = () => {
      ticking = false;
      measureHeroW();
      const max = Math.max(1, root.scrollHeight - innerHeight);
      const p = Math.min(1, Math.max(0, scrollY / max));
      const v = p.toFixed(4);
      root.style.setProperty("--read-p", v);
      if (bar) {
        bar.style.setProperty("--read-p", v);
        bar.setAttribute("aria-valuenow", String(Math.round(p * 100)));
      }
      // bottom spy 0–100 fill (complements section dots)
      const pct = Math.round(p * 100);
      if (spyFill) spyFill.style.transform = "scaleX(" + v + ")";
      if (spyPct) spyPct.textContent = String(pct);
      if (nav && hero) {
        const hb = hero.getBoundingClientRect().bottom;
        // shrink only after entire first screen has scrolled past (hero bottom ≤ 0)
        let np;
        if (reduce) np = 1;
        else if (hb > 0) np = 0;
        else np = Math.min(1, Math.max(0, (-hb) / 96)); // ease over ~96px after past
        const nv = np.toFixed(4);
        root.style.setProperty("--nav-p", nv);
        nav.style.setProperty("--nav-p", nv);
        const scrolled = np > 0.02;
        nav.classList.toggle("is-scrolled", scrolled);
        root.classList.toggle("nav-scrolled", scrolled);
      }
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(apply); } };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll, { passive: true });
    apply();
  })();


  // section preview strip (what you're looking at) — complements top % readbar
  (() => {
    const list = $("#spyList"), spy = $("#secSpy");
    if (!list || !spy) return;
    const secs = $$("[data-spy]");
    if (!secs.length) { spy.hidden = true; return; }
    list.innerHTML = secs.map((s, i) => {
      const id = s.id || ("spy-" + i);
      const label = s.getAttribute("data-spy") || id;
      return `<li><a href="#${id}" data-spy-link="${id}"><i aria-hidden="true"></i><span>${label}</span></a></li>`;
    }).join("");
    const links = $$("[data-spy-link]", list);
    const setActive = (id) => {
      links.forEach(a => {
        const on = a.getAttribute("data-spy-link") === id;
        a.classList.toggle("is-on", on);
        if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      });
    };
    if ("IntersectionObserver" in window) {
      const ratios = new Map();
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => ratios.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0));
        let best = null, bestR = 0;
        ratios.forEach((r, id) => { if (r > bestR) { bestR = r; best = id; } });
        if (best) setActive(best);
      }, { rootMargin: "-28% 0px -45% 0px", threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] });
      secs.forEach(s => io.observe(s));
    } else {
      setActive(secs[0].id);
    }
    // initial
    setActive(secs[0].id);
  })();

  // mobile nav drawer
  (() => {
    const tog = $("#navToggle"), links = $("#navLinks"), header = $(".nav");
    if (!tog || !links) return;
    const close = () => { header.classList.remove("nav-open"); tog.setAttribute("aria-expanded", "false"); };
    const open = () => { header.classList.add("nav-open"); tog.setAttribute("aria-expanded", "true"); };
    tog.addEventListener("click", () => tog.getAttribute("aria-expanded") === "true" ? close() : open());
    links.querySelectorAll("a").forEach(a => a.addEventListener("click", close));
    addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  })();


  // foldable cards (chevron); secondary tiles start collapsed on phone
  (() => {
    const mq = matchMedia("(max-width: 48rem)");
    const label = (open) => open ? t("fold.less") : t("fold.more");
    const setOpen = (root, open) => {
      root.classList.toggle("is-open", open);
      const btn = root.querySelector(".fold-tog");
      if (btn) {
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        const tx = btn.querySelector(".fold-tx"); if (tx) tx.textContent = label(open);
      }
    };
    const init = () => {
      $$(".foldable").forEach(root => {
        const preferCollapse = root.dataset.foldMobile === "collapse" && mq.matches;
        setOpen(root, preferCollapse ? false : true);
      });
    };
    document.addEventListener("click", e => {
      const btn = e.target.closest(".fold-tog"); if (!btn) return;
      const root = btn.closest(".foldable"); if (!root) return;
      setOpen(root, !root.classList.contains("is-open"));
    });
    mq.addEventListener?.("change", init);
    init();
    window.__ymzzFoldRefresh = () => $$(".foldable").forEach(root => setOpen(root, root.classList.contains("is-open")));
  })();

    setTheme(store.get("theme", matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  apply();
})();
