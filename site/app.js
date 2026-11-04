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
  const pre = (s) => `<pre dir="ltr"><button class="copy" type="button">${icon("copy")}<span>${t("ui.copy")}</span></button><code>${esc(s)}</code></pre>`;
  const load = async l => { const r = await fetch(`i18n/${l}.json`); return r.json(); };

  // story / faq built from keys
  const renderStatic = () => {
    $("#flowList").innerHTML = ["⓪", "①", "②", "③", "④"].map((n, i) => `<li data-n="${n}" data-i="${i}"><span class="n" aria-hidden="true">${n}</span><h3><span class="vh">${i}. </span>${t(`s${i}.t`)}</h3><p>${t(`s${i}.p`)}</p></li>`).join("");
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

  // live 24h dial (visitor's own zone) — reminder default 07:00 UTC
  const NS = "http://www.w3.org/2000/svg";
  function drawDial() {
    const svg = $("#dialSvg"), now = new Date(), localMin = now.getHours() * 60 + now.getMinutes();
    const remUTC = 7 * 60, remLocal = ((remUTC - now.getTimezoneOffset()) % 1440 + 1440) % 1440;
    const ang = m => (m / 1440) * 360 - 90, pt = (a, r) => [Math.cos(a * Math.PI / 180) * r, Math.sin(a * Math.PI / 180) * r];
    let h = `<defs><linearGradient id="arcg" x1="0" x2="1"><stop offset="0" stop-color="#B9DDF1"/><stop offset=".5" stop-color="#CDBFE0"/><stop offset="1" stop-color="#F4DDE7"/></linearGradient></defs>`;
    for (let i = 0; i < 96; i++) { const m = i * 15, a = ang(m), hour = i % 4 === 0, [x1, y1] = pt(a, hour ? 70 : 76), [x2, y2] = pt(a, 84); h += `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" class="${hour ? "h" : ""}"/>`;
      if (hour && (i / 4) % 3 === 0) { const [tx, ty] = pt(a, 94); h += `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}">${String(i / 4).padStart(2, "0")}</text>`; } }
    // arc from now to next reminder
    let span = (remLocal - localMin + 1440) % 1440 || 1440; const a0 = ang(localMin), a1 = ang(localMin + span), [sx, sy] = pt(a0, 58), [ex, ey] = pt(a1, 58);
    h += `<path class="arc" d="M${sx.toFixed(2)} ${sy.toFixed(2)} A58 58 0 ${span > 720 ? 1 : 0} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}"/>`;
    const [nx, ny] = pt(a0, 100), [rx, ry] = pt(ang(remLocal), 100), [rt, rty] = pt(ang(remLocal), 106);
    h += `<line class="now" x1="${(nx*.62).toFixed(2)}" y1="${(ny*.62).toFixed(2)}" x2="${nx.toFixed(2)}" y2="${ny.toFixed(2)}"/><line class="rem" x1="${(rx * .66).toFixed(2)}" y1="${(ry * .66).toFixed(2)}" x2="${rx.toFixed(2)}" y2="${ry.toFixed(2)}"/><text class="rem" x="${rt.toFixed(1)}" y="${rty.toFixed(1)}">●</text>`;
    svg.innerHTML = h;
    $("#clock").textContent = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    $("#tzName").textContent = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";
    $("#nextIn").textContent = `${Math.floor(span / 60)}h ${String(span % 60).padStart(2, "0")}m`;
    // cities tile
    const zones = [["UTC", "UTC"], ["America/Los_Angeles", "Los Angeles"], ["Asia/Seoul", "Seoul"], [Intl.DateTimeFormat().resolvedOptions().timeZone, "You"]];
    $("#cities").innerHTML = zones.map(([z, n], i) => `<li class="${i === 3 ? "me" : ""}"><span>${n}</span><b>${new Intl.DateTimeFormat("en-GB", { timeZone: z, hour: "2-digit", minute: "2-digit" }).format(now)}</b></li>`).join("");
  }
  drawDial(); setInterval(drawDial, 30000);

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
  $$(".reveal, .tile").forEach((el, i) => { el.style.setProperty("--i", i % 4); io.observe(el); });

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
