// SPDX-License-Identifier: MIT · ymzz-loop shared chrome for start.html / support.html
// Lang, palette, theme use the same ymzz:* keys as app.js so preferences carry across pages.
(() => {
  document.documentElement.classList.add("js", "ready");
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get: (k, d) => { try { return JSON.parse(localStorage.getItem("ymzz:" + k)) ?? d; } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem("ymzz:" + k, JSON.stringify(v)); } catch { /* private mode */ } }
  };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const LANGS = ["en", "zh-Hant", "zh-CN", "ko", "ar"];
  const pick = () => {
    const q = new URLSearchParams(location.search).get("lang");
    if (LANGS.includes(q)) return q;
    const s = store.get("lang");
    if (LANGS.includes(s)) return s;
    const n = (navigator.language || "en").toLowerCase();
    return n.startsWith("zh") ? (/(tw|hk|mo|hant)/.test(n) ? "zh-Hant" : "zh-CN") : n.startsWith("ko") ? "ko" : "en";
  };
  let lang = pick(), dict = {}, en = {};
  const t = k => dict[k] ?? en[k] ?? k;
  const load = async l => { const r = await fetch(`i18n/${l}.json`); return r.json(); };

  function setTheme(th) {
    document.documentElement.dataset.theme = th;
    const ic = $("#themeIc"), tx = $("#themeTx");
    if (ic) ic.setAttribute("href", `icons.svg#i-${th === "dark" ? "sun" : "moon"}`);
    if (tx) tx.textContent = th === "dark" ? t("ui.light") : t("ui.dark");
    paintThemeColor();
  }
  function setPalette(pal) {
    document.documentElement.dataset.palette = pal === "earth" ? "earth" : "cloud";
    const sel = $("#palette");
    if (sel) sel.value = document.documentElement.dataset.palette;
    paintThemeColor();
  }
  function paintThemeColor() {
    const pal = document.documentElement.dataset.palette === "earth" ? "earth" : "cloud";
    const th = document.documentElement.dataset.theme || "light";
    const meta = $('meta[name=theme-color]');
    if (meta) meta.content = th === "dark" ? (pal === "earth" ? "#2F2A22" : "#2A241D") : (pal === "earth" ? "#E8E3CC" : "#F8F6EF");
  }

  const apply = async () => {
    if (!Object.keys(en).length) en = await load("en");
    dict = lang === "en" ? en : await load(lang).catch(() => en);
    const h = document.documentElement;
    h.lang = dict._lang || lang;
    h.dir = dict._dir || "ltr";
    $$("[data-i18n]").forEach(el => { el.innerHTML = t(el.dataset.i18n); });
    $$("[data-i18n-placeholder]").forEach(el => { el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder)); });
    $$("[data-i18n-title]").forEach(el => { el.setAttribute("title", t(el.dataset.i18nTitle)); });
    $$("[data-i18n-aria]").forEach(el => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
    const page = document.body.dataset.page;
    const titleKey = page === "support" ? "meta.supportTitle" : page === "start" ? "meta.startTitle" : "meta.title";
    const descKey = page === "support" ? "meta.supportDesc" : page === "start" ? "meta.startDesc" : "meta.desc";
    document.title = t(titleKey);
    const desc = $('meta[name=description]');
    if (desc) desc.content = t(descKey);
    if ($("#lang")) $("#lang").value = lang;
    if ($("#palette")) {
      const o = $("#palette").options;
      if (o[0]) o[0].text = t("ui.cloud");
      if (o[1]) o[1].text = t("ui.earth");
    }
    setTheme(document.documentElement.dataset.theme || "light");
  };

  if ($("#lang")) $("#lang").onchange = e => { lang = e.target.value; store.set("lang", lang); apply(); };
  if ($("#theme")) $("#theme").onclick = () => {
    const th = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    store.set("theme", th);
    if (document.startViewTransition && !reduce) document.startViewTransition(() => setTheme(th));
    else setTheme(th);
  };
  setPalette(store.get("palette", "cloud") === "earth" ? "earth" : "cloud");
  if ($("#palette")) $("#palette").onchange = e => { store.set("palette", e.target.value); setPalette(e.target.value); };
  setTheme(store.get("theme", matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

  document.addEventListener("click", e => {
    const c = e.target.closest("pre .copy");
    if (!c) return;
    const code = c.parentElement.querySelector("code");
    if (!code) return;
    navigator.clipboard?.writeText(code.textContent).then(() => {
      const span = c.querySelector("span");
      if (span) { span.textContent = t("ui.copied"); setTimeout(() => { span.textContent = t("ui.copy"); }, 1600); }
    }).catch(() => {});
  });

  const DONATE_ADDR = "0x9C4345b0a652D063a79321fe099C65a7Dc5a9C3A";
  const btn = $("#donateCopy"), msg = $("#donateMsg"), code = $("#donateAddr");
  if (btn && code) {
    if (code.textContent.trim() !== DONATE_ADDR) code.textContent = DONATE_ADDR;
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard?.writeText(DONATE_ADDR);
        if (msg) { msg.textContent = t("donate.copied"); msg.dataset.ok = "1"; }
        const span = btn.querySelector("span");
        if (span) { span.textContent = t("ui.copied"); setTimeout(() => { span.textContent = t("ui.copy"); }, 1600); }
      } catch { if (msg) { msg.textContent = t("donate.copyfail"); msg.dataset.ok = "0"; } }
    });
  }

  apply();
})();
