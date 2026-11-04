// SPDX-License-Identifier: MIT · ymzz-notion site — vanilla JS, no dependencies, no network except same-origin i18n JSON
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
  const pre = s => `<pre dir="ltr"><button class="copy" type="button">${icon("copy")}<span>${t("ui.copy")}</span></button><code>${esc(s)}</code></pre>`;
  const load = async l => { const r = await fetch(`i18n/${l}.json`); return r.json(); };

  // features / flow / faq built from keys
  const FEATS = [["notebook", "c1"], ["briefcase", "c2"], ["mail", "c3"], ["table", "c4"], ["world", "c5"], ["puzzle", "c6"]];
  const renderStatic = () => {
    $("#feats").innerHTML = FEATS.map(([ic, c], i) => `<article class="card ${c} reveal in">${icon(ic)}<h3>${t(`f${i + 1}.t`)}</h3><p class="meta">${t(`f${i + 1}.m`)}</p><p>${t(`f${i + 1}.p`)}</p></article>`).join("");
    $("#flowList").innerHTML = ["⓪", "①", "②", "③", "④"].map((n, i) => `<li class="reveal in"><span class="n" aria-hidden="true">${n}</span><h3><span class="vh">${i}. </span>${t(`s${i}.t`)}</h3><p>${t(`s${i}.p`)}</p></li>`).join("");
    $("#faqList").innerHTML = [1, 2, 3, 4, 5].map(i => `<details><summary>${t("q" + i)}</summary><p>${t("a" + i)}</p></details>`).join("");
  };

  const apply = async () => {
    if (!Object.keys(en).length) en = await load("en");
    dict = lang === "en" ? en : await load(lang).catch(() => en);
    const h = document.documentElement; h.lang = dict._lang || lang; h.dir = dict._dir || "ltr";
    $$("[data-i18n]").forEach(el => { el.innerHTML = t(el.dataset.i18n); });
    document.title = t("meta.title"); $('meta[name=description]').content = t("meta.desc");
    $("#lang").value = lang; renderStatic(); renderSteps(); renderPanel(); setTheme(document.documentElement.dataset.theme);
  };
  $("#lang").onchange = e => { lang = e.target.value; store.set("lang", lang); apply(); };

  // theme (View Transitions when available)
  function setTheme(th) { document.documentElement.dataset.theme = th; $("#themeIc").setAttribute("href", `icons.svg#i-${th === "dark" ? "sun" : "moon"}`); $("#themeTx").textContent = th === "dark" ? t("ui.light") : t("ui.dark"); $('meta[name=theme-color]').content = th === "dark" ? "#191C29" : "#F8F6EF"; }
  $("#theme").onclick = () => { const th = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; store.set("theme", th);
    if (document.startViewTransition && !reduce) document.startViewTransition(() => setTheme(th)); else setTheme(th); };

  // live data in mockups
  const d = new Date(), y = new Date(d - 864e5), md = x => `${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  $$(".today").forEach(e => e.textContent = d.toISOString().slice(0, 10)); $$(".yday").forEach(e => e.textContent = md(y));
  $(".fname").textContent = `${md(y).replace("-", "")}_0700_utc.md`;
  if (Intl.supportedValuesOf) $("#tzCount").dataset.to = String(Math.floor(Intl.supportedValuesOf("timeZone").length / 10) * 10);

  // reveal + count up
  const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; e.target.classList.add("in"); io.unobserve(e.target);
    $$(".count", e.target).forEach(c => { const to = +c.dataset.to, t0 = performance.now(), dur = reduce ? 0 : 1200; const tick = n => { const p = dur ? Math.min(1, (n - t0) / dur) : 1; c.textContent = Math.round(to * (1 - Math.pow(1 - p, 4))); if (p < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  }), { threshold: .12 });
  $$(".reveal").forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 60}ms`; io.observe(el); });

  // guided setup
  const SECRETS = ["NOTION_TOKEN", "GOOGLE_SERVICE_ACCOUNT_JSON", "SHEET_ID", "SMTP_USER", "SMTP_PASS", "MAIL_TO"];
  const EXTRA = {
    3: () => pre(`git clone https://github.com/<you>/ymzz-notion && cd ymzz-notion\nNOTION_TOKEN=<token> ./setup.sh "<Notion page URL>"\ngit add sync.config.json && git commit -m "setup ids" && git push`) + pre(`# Windows PowerShell\n$env:NOTION_TOKEN="<token>"; npm install; node scripts/setup-notion.mjs "<Notion page URL>"`),
    6: () => SECRETS.map(s => pre(s)).join(""),
    7: () => tzPanel(),
  };
  const N = 8; const ID = i => "t" + (i + 1);
  let done = new Set(store.get("done", [])), cur = Math.min(store.get("cur", 0), N - 1);
  function renderSteps() {
    $("#steps").innerHTML = Array.from({ length: N }, (_, i) => `<li class="${done.has(ID(i)) ? "done" : ""}"><button type="button" data-i="${i}" ${i === cur ? 'aria-current="step"' : ""}><span class="dot" aria-hidden="true">${done.has(ID(i)) ? icon("check") : `<bdi>${i + 1}</bdi>`}</span><span>${t(ID(i) + ".t")}${done.has(ID(i)) ? `<span class="vh"> ✓</span>` : ""}</span></button></li>`).join("");
    const p = Math.round(done.size / N * 100); $(".progress i").style.inlineSize = p + "%"; $("#pct").textContent = p + "%"; $(".progress").setAttribute("aria-valuenow", p);
  }
  function renderPanel() {
    const id = ID(cur), isDone = done.has(id);
    $("#panel").innerHTML = `<p class="note">${t("setup.step")} <bdi>${cur + 1} / ${N}</bdi></p><h3>${t(id + ".t")}</h3>${t(id + ".b")}${EXTRA[cur + 1] ? EXTRA[cur + 1]() : ""}
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
