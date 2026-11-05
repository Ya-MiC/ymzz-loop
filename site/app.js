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

  // story / faq built from keys
  const renderStatic = () => {
    $("#flowList").innerHTML = ["01", "02", "03", "04", "05"].map((n, i) => `<li data-n="${n}" data-i="${i}"><span class="n" aria-hidden="true">${n}</span><h3><span class="vh">${i}. </span>${t(`s${i}.t`)}</h3><p>${t(`s${i}.p`)}</p></li>`).join("");
    $("#faqList").innerHTML = [1, 2, 3, 4, 5].map(i => `<details><summary>${t("q" + i)}</summary><p>${t("a" + i)}</p></details>`).join("");
    observeStory();
  };
  // sticky story: active step
  let sio;
  function observeStory() {
    sio?.disconnect();
    sio = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; const li = e.target, i = +li.dataset.i;
      $$("#flowList li").forEach(x => x.classList.toggle("on", x === li)); $("#bigN").textContent = li.dataset.n; $("#sprog").style.inlineSize = ((i + 1) / 5 * 100) + "%"; }), { rootMargin: "-45% 0px -45% 0px" });
    $$("#flowList li").forEach(li => sio.observe(li));
    if (reduce) $$("#flowList li").forEach(li => li.classList.add("on"));
  }

  // world-clock tile (feature demo only; no hero clock)
  function drawCities() {
    const now = new Date(), zones = [["America/Los_Angeles", "LA"], ["Etc/UTC", "UTC"], ["Europe/London", "London"], ["Asia/Seoul", "Seoul"], ["Asia/Taipei", "Taipei"]];
    $("#cities").innerHTML = zones.map(([z, n], i) => `<li class="${i === 1 ? "me" : ""}"><span>${n}</span><b>${new Intl.DateTimeFormat("en-GB", { timeZone: z, hour: "2-digit", minute: "2-digit" }).format(now)}</b></li>`).join("");
  }
  drawCities(); setInterval(drawCities, 60000);

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
    document.title = t("meta.title"); $('meta[name=description]').content = t("meta.desc");
    $("#lang").value = lang; renderDates(); renderMarquee(); renderTags(); $$("[data-i18n-aria]").forEach(el => el.setAttribute("aria-label", t(el.dataset.i18nAria))); renderStatic(); renderSteps(); renderPanel(); setTheme(document.documentElement.dataset.theme);
  };
  $("#lang").onchange = e => { lang = e.target.value; store.set("lang", lang); apply(); };

  // theme (View Transitions when available)
  function setTheme(th) { document.documentElement.dataset.theme = th; $("#themeIc").setAttribute("href", `icons.svg#i-${th === "dark" ? "sun" : "moon"}`); $("#themeTx").textContent = th === "dark" ? t("ui.light") : t("ui.dark"); $('meta[name=theme-color]').content = th === "dark" ? "#191C29" : "#F8F6EF"; }
  $("#theme").onclick = () => { const th = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; store.set("theme", th);
    if (document.startViewTransition && !reduce) document.startViewTransition(() => setTheme(th)); else setTheme(th); };

  // live data in mockups — all relative to the visitor's browser-local "today"
  const loc = () => dict._lang || lang;
  const day = off => { const x = new Date(); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() + off); return x; };
  const iso = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  const md = x => `${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  function renderDates() {
    const L = loc(), d = day(0), y = day(-1);
    $$(".today").forEach(e => e.textContent = iso(d)); $$(".yday").forEach(e => e.textContent = md(y));
    $(".fname").textContent = `${md(y).replace("-", "")}_0700_utc.md`;
    const f = o => new Intl.DateTimeFormat(L, o);
    $$("#sheetRows .rd").forEach(e => { const x = day(+e.dataset.off); e.textContent = f({ month: "2-digit", day: "2-digit" }).format(x); e.parentElement.title = iso(x); });
    $("#dWk").textContent = f({ weekday: "long" }).format(d);
    $("#dNum").textContent = String(d.getDate());
    $("#dMo").textContent = f({ year: "numeric", month: "long" }).format(d);
    const wd = f({ weekday: "narrow" });
    $("#week").innerHTML = Array.from({ length: 7 }, (_, i) => { const x = day(i - 6); return `<li class="${i === 6 ? "on" : "done"}"><span>${wd.format(x)}</span><b>${x.getDate()}</b></li>`; }).join("");
  }
  // marquee (duplicated list for a seamless loop)
  function renderMarquee() {
    const items = [1, 2, 3, 4, 5, 6].map(i => `<li><span class="dot" aria-hidden="true"></span>${t("mq." + i)}</li>`).join("");
    $("#mq").innerHTML = items; const clone = $("#mq").cloneNode(true); clone.removeAttribute("id"); clone.setAttribute("aria-hidden", "true");
    $(".mq-track").querySelectorAll(".mq-list:not(#mq)").forEach(n => n.remove()); $(".mq-track").append(clone);
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
  if (Intl.supportedValuesOf) $("#tzCount").dataset.to = String(Math.floor(Intl.supportedValuesOf("timeZone").length / 10) * 10);

  // reveal + count up
  const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; e.target.classList.add("in"); io.unobserve(e.target);
    $$(".count", e.target).forEach(c => { const to = +c.dataset.to, t0 = performance.now(), dur = reduce ? 0 : 1200; const tick = n => { const p = dur ? Math.min(1, (n - t0) / dur) : 1; c.textContent = Math.round(to * (1 - Math.pow(1 - p, 4))); if (p < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  }), { threshold: .12 });
  $$(".reveal, .tile").forEach((el, i) => { el.style.setProperty("--i", i % 4); io.observe(el); });

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

  setTheme(store.get("theme", matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  apply();
})();
