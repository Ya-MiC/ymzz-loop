const state = {
  csrf: "",
  thread: "",
  connector: "",
  order: "",
  eventId: "",
  preset: 7,
  today: "",
  plan: "",
  items: [],
  root: "",
  moveFrom: "",
  moveTo: "",
  pendingPlace: null,
  payStatus: "",
  pageReturn: false,
  amountCents: 100,
  currency: "CNY",
};

const PAGES = [
  ["home", "彙報"],
  ["files", "檔案"],
  ["talk", "對話"],
  ["ocr", "文件"],
  ["review", "復盤"],
  ["links", "連接"],
  ["pay", "沙箱收款"],
  ["device", "這台電腦"],
  ["settings", "設定"],
];

const $ = (id) => document.getElementById(id);
const text = (id, value) => {
  const node = $(id);
  if (node) node.textContent = value == null ? "" : String(value);
};

function baseName(path) {
  const parts = String(path || "").split(/[/\\]/).filter(Boolean);
  return parts[parts.length - 1] || "檔案";
}

function decodePart(value) {
  try {
    return decodeURIComponent(value);
  } catch (err) {
    return value;
  }
}

function bridged() {
  const tauri = window.__TAURI__;
  if (!(tauri && tauri.core && tauri.core.invoke)) return false;
  const host = location.hostname;
  return !((host === "127.0.0.1" || host === "localhost") && location.port === "1413");
}

async function api(path, options = {}) {
  if (bridged()) {
    try {
      const result = await window.__TAURI__.core.invoke("core_http", {
        method: options.method || "GET",
        path,
        body: options.body ? JSON.stringify(options.body) : "",
      });
      const data = JSON.parse(result.body || "{}");
      if (result.status >= 400) throw new Error(plainError(data.error || "沒有完成"));
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err || "");
      if (message && !message.includes("本機核心沒有連上") && !message.includes("本機核心沒有在這台電腦上打開")) {
        throw err instanceof Error ? err : new Error(plainError(message));
      }
      showRecovery("本機核心沒有連上。");
      throw new Error("本機核心沒有連上。");
    }
  }
  const headers = { "content-type": "application/json" };
  if (state.csrf) headers["x-ymzz-csrf"] = state.csrf;
  let res;
  try {
    res = await fetch(path, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (err) {
    showRecovery("本機核心沒有連上。");
    throw new Error("本機核心沒有連上。");
  }
  const data = await res.json().catch(() => ({ ok: false, error: "回應讀不懂" }));
  if (!res.ok) throw new Error(plainError(data.error || res.statusText));
  return data;
}

function plainError(message) {
  const table = {
    "opt_in required": "要先勾同意。",
    "prompt required": "先寫一句話。",
    "document text is not sent without content_consent": "文件要另外勾同意才會送。",
    "nvidia nim is not called": "這個位址不會送。",
    "consent required before an official host is contacted": "要先勾同意。",
    "query length must be 2..=200": "搜尋要寫兩個字以上。",
    "set a date range, then query": "先選日期，再查詢。",
    "select a root first": "先點一個位置。",
    "not paid": "要先有簽名通知，才能交付。",
    "delivery failed; payment kept, retry is safe": "交付失敗。款項還在，可以再交付。",
    "order is not refundable": "這筆沙箱訂單現在不能退。",
    "symlink rejected": "這個位置打不開。",
    "not a directory": "這不是資料夾。",
    "root is not a directory": "這不是資料夾。",
    "refusing filesystem root": "不能選整台磁碟。",
    "download cancelled": "下載已取消。",
    "download timed out": "辨識模型下載逾時。",
    "live_network_disabled": "這次沒有連外。",
    "public_connector_host_blocked_without_explicit_allow": "這個位址不會送。",
    "tls_to_public_hosts_is_not_enabled_in_this_build": "這個位址不會送。",
    "consent required for a live connector call": "要先勾同意。",
    "secret length": "金鑰長度不對。",
    "secret rejected": "這個金鑰不能存。",
    "nothing to send": "沒有可送的內容。",
    "invoke needs a local secret": "要先留下金鑰。",
    "api endpoint must be https, or an explicit loopback http url": "位址要是 https，或這台電腦上的位址。",
  };
  if (table[message]) return table[message];
  if (/^download failed/i.test(message) || /os error|No such file|Permission denied|Not a directory/i.test(message)) {
    return "這一步沒有完成。";
  }
  return message;
}

function showRecovery(message) {
  $("booting").hidden = true;
  document.body.dataset.app = "off";
  $("workspace").hidden = true;
  $("onboard").hidden = true;
  $("recovery").hidden = false;
  text("recoveryReason", message || "還沒連上。");
}

function go(panel, rest = []) {
  const hash = `#/${[panel, ...rest].filter(Boolean).map((part) => encodeURIComponent(part)).join("/")}`;
  if (location.hash === hash) renderRoute();
  else location.hash = hash;
}

function parseHash() {
  const parts = (location.hash || "#/home").replace(/^#\/?/, "").split("/").filter(Boolean).map(decodePart);
  const panel = PAGES.some(([id]) => id === parts[0]) ? parts[0] : "home";
  return { panel, rest: parts.slice(1) };
}

function paintCrumbs(panel, rest) {
  const crumbs = $("crumbs");
  crumbs.replaceChildren();
  const add = (label, target, extra) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => go(target, extra || []));
    crumbs.appendChild(button);
  };
  add("彙報", "home");
  if (panel !== "home") {
    const label = (PAGES.find(([id]) => id === panel) || ["", panel])[1];
    add(label, panel);
  }
  if (panel === "files" && rest[0] === "item") {
    const item = state.items.find((row) => row.id === rest[1]);
    const name = document.createElement("span");
    name.textContent = item ? baseName(item.path) : "這份檔案";
    crumbs.appendChild(name);
  }
  if (panel === "talk" && rest[0]) {
    const name = document.createElement("span");
    name.id = "crumbTalk";
    name.textContent = "這則對話";
    crumbs.appendChild(name);
  }
}

function drawerApplies() {
  return window.matchMedia("(max-width: 860px)").matches;
}

function closeDrawer() {
  document.body.dataset.drawer = "closed";
  const menu = $("menuBtn");
  if (menu) menu.setAttribute("aria-expanded", "false");
  const scrim = $("scrim");
  if (scrim) scrim.hidden = true;
  const side = document.querySelector(".side");
  if (!side) return;
  if (drawerApplies()) side.setAttribute("aria-hidden", "true");
  else side.removeAttribute("aria-hidden");
}

function openDrawer() {
  if (!drawerApplies()) return;
  document.body.dataset.drawer = "open";
  $("menuBtn").setAttribute("aria-expanded", "true");
  $("scrim").hidden = false;
  const side = document.querySelector(".side");
  if (side) side.removeAttribute("aria-hidden");
}

function renderRoute() {
  if ($("workspace").hidden) return;
  closeDrawer();
  const route = parseHash();
  document.querySelectorAll(".panel").forEach((node) => node.classList.remove("active"));
  const page = $(route.panel);
  if (page) page.classList.add("active");
  document.querySelectorAll("[data-panel]").forEach((node) => {
    if (node.dataset.panel === route.panel) node.setAttribute("aria-current", "page");
    else node.removeAttribute("aria-current");
  });
  paintCrumbs(route.panel, route.rest);
  if (route.panel === "home") loadHome().catch((err) => text("homeMeta", err.message));
  if (route.panel === "files") {
    loadPlaces("placeList", (place) => chooseRoot(place).catch((err) => text("placeStatus", err.message)));
    loadPlaces("movePlaces", (place) => {
      state.moveTo = place.path;
      text("moveOut", `目的是「${place.label}」。可以預覽。`);
    });
    if (route.rest[0] === "group" && route.rest[1]) showDrawer(route.rest[1]);
    if (route.rest[0] === "item" && route.rest[1]) showFile(route.rest[1]);
  }
  if (route.panel === "ocr") loadOcr().catch((err) => text("ocrResult", err.message));
  if (route.panel === "talk") {
    loadThreads().catch((err) => text("talkStatus", err.message));
    if (route.rest[0]) openThread(route.rest[0]).catch((err) => text("talkStatus", err.message));
  }
  if (route.panel === "review") loadReview().catch((err) => text("gateOut", err.message));
  if (route.panel === "device") loadDevice().catch((err) => fillDevice({ error: err.message }));
  if (route.panel === "pay") paintPay();
}

function onPreset(days) {
  state.preset = days;
  text("draftState", `已選 ${days} 日。尚未查詢。`);
}

async function loadGroups() {
  const data = await api("/api/panel1/groups");
  const sel = $("typeGroup");
  const current = sel.value;
  sel.replaceChildren();
  const all = document.createElement("option");
  all.value = "";
  all.textContent = "全部類型";
  sel.appendChild(all);
  Object.keys(data.groups || {}).sort().forEach((key) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = `${key}（${data.groups[key]}）`;
    sel.appendChild(opt);
  });
  if ([...sel.options].some((opt) => opt.value === current)) sel.value = current;
}

async function runQuery() {
  const today = state.today || new Date().toISOString().slice(0, 10);
  await api("/api/panel1/draft", {
    method: "POST",
    body: {
      today,
      preset: state.preset,
      start: $("start").value,
      end: $("end").value,
      group: $("typeGroup").value,
      more_enabled: false,
    },
  });
  const snap = await api("/api/panel1/query", { method: "POST", body: {} });
  const full = await api("/api/panel1/snapshot");
  const cmp = await api("/api/panel1/compare");
  const sem = await api("/api/panel1/semantic", { method: "POST", body: { opt_in: false } });
  draw(full, cmp, sem, snap);
}

function draw(full, cmp, sem, snap) {
  text("draftState", snap.select_all_label || "查詢完成。");
  text("semantic", sem.reason ? "這次沒有做語意整理。" : "");
  state.items = full.items || [];
  const graph = $("graph");
  graph.replaceChildren();
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "220");
  const groups = full.groups || {};
  Object.keys(groups).forEach((name, i) => {
    const count = Math.min(groups[name], 12);
    const col = i % 4;
    const row = Math.floor(i / 4);
    for (let n = 0; n < count; n += 1) {
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", 24 + col * 150 + (n % 4) * 12);
      dot.setAttribute("cy", 36 + row * 64 + Math.floor(n / 4) * 12);
      dot.setAttribute("r", "4");
      dot.setAttribute("fill", "currentColor");
      svg.appendChild(dot);
    }
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", 16 + col * 150);
    label.setAttribute("y", 18 + row * 64);
    label.setAttribute("fill", "currentColor");
    label.setAttribute("class", "graph-hit");
    label.textContent = name.length > 18 ? `${name.slice(0, 16)}…` : name;
    label.addEventListener("click", () => go("files", ["group", name]));
    svg.appendChild(label);
  });
  graph.appendChild(svg);
  showDrawer("");
  const heat = $("heat");
  heat.replaceChildren();
  Object.keys(full.per_day || {}).sort().forEach((day) => {
    const row = document.createElement("div");
    row.className = "mono";
    row.textContent = `${day}  ${full.per_day[day]}`;
    heat.appendChild(row);
  });
  const chart = $("compare");
  chart.replaceChildren();
  const line = (points, opacity) => {
    if (!points.length) return;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    path.setAttribute("points", points.map((p, i) => {
      const x = 10 + i * (260 / Math.max(points.length - 1, 1));
      const y = 80 - (p.ratio || 0) * 60;
      return `${x},${y}`;
    }).join(" "));
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-opacity", String(opacity));
    chart.appendChild(path);
  };
  line((cmp.previous && cmp.previous.points) || [], 0.35);
  line((cmp.current && cmp.current.points) || [], 1);
}

function showDrawer(group) {
  const drawer = $("drawer");
  drawer.replaceChildren();
  const title = document.createElement("p");
  title.textContent = group ? `這一組：${group}` : "查詢結果。點一份檔案就打開。";
  drawer.appendChild(title);
  const rows = state.items.filter((item) => !group || item.group === group);
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "quiet";
    empty.textContent = "這組沒有檔案。";
    drawer.appendChild(empty);
    return;
  }
  rows.forEach((item) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "drawer-row";
    row.textContent = `${item.modified || ""}  ${baseName(item.path)}`;
    row.addEventListener("click", () => go("files", ["item", item.id]));
    drawer.appendChild(row);
  });
}

function showFile(id) {
  const item = state.items.find((row) => row.id === id);
  const box = $("fileDetail");
  box.hidden = false;
  box.replaceChildren();
  if (!item) {
    const missing = document.createElement("p");
    missing.textContent = "這份檔案不在這次查詢裡。先按查詢。";
    box.appendChild(missing);
    return;
  }
  const name = baseName(item.path);
  const title = document.createElement("h2");
  title.textContent = name;
  box.appendChild(title);
  const meta = document.createElement("p");
  meta.className = "quiet";
  meta.textContent = `${item.modified || ""} · ${item.ext || "檔案"}`;
  box.appendChild(meta);
  const row = document.createElement("div");
  row.className = "row";
  const organize = document.createElement("button");
  organize.type = "button";
  organize.textContent = "用這份來整理";
  organize.addEventListener("click", () => {
    state.moveFrom = item.path;
    text("moveOut", `來源是「${name}」。再點一個目的位置。`);
  });
  const open = document.createElement("button");
  open.type = "button";
  open.textContent = "用系統打開";
  open.addEventListener("click", () => handOff(item.path, "open").then((line) => text("moveOut", line)).catch((err) => text("moveOut", err.message)));
  const reveal = document.createElement("button");
  reveal.type = "button";
  reveal.textContent = "在檔案總管顯示";
  reveal.addEventListener("click", () => handOff(item.path, "reveal").then((line) => text("moveOut", line)).catch((err) => text("moveOut", err.message)));
  row.append(organize, open, reveal);
  box.appendChild(row);
}

async function handOff(path, mode) {
  const name = baseName(path);
  const verb = mode === "reveal" ? "在檔案總管顯示" : "用系統打開";
  const tauri = window.__TAURI__;
  if (tauri && tauri.core && tauri.core.invoke) {
    try {
      const command = mode === "reveal" ? "plugin:opener|reveal_item_in_dir" : "plugin:opener|open_path";
      const args = mode === "reveal" ? { paths: [path] } : { path };
      await tauri.core.invoke(command, args);
      return `已請系統${verb}「${name}」。`;
    } catch (err) {
      /* The core can still hand the file to the system. */
    }
  }
  try {
    const data = await api("/api/reveal", { method: "POST", body: { path } });
    return data.handed_off
      ? `已請系統${verb}「${data.name || name}」。`
      : `這台環境沒有檔案總管，沒有${verb}「${data.name || name}」。`;
  } catch (err) {
    throw new Error(`沒能${verb}「${name}」。${err.message}`);
  }
}

function setSurface(id) {
  const root = document.documentElement;
  root.removeAttribute("data-theme");
  root.removeAttribute("data-palette");
  if (id === "earth") root.setAttribute("data-palette", "earth");
  if (id === "dusk") root.setAttribute("data-theme", "dark");
  if (id === "wood") {
    root.setAttribute("data-theme", "dark");
    root.setAttribute("data-palette", "wood");
  }
}

async function loadHome() {
  const data = await api("/api/dashboard");
  text("statFilesN", String(data.files_indexed ?? 0));
  text("statFilesHint", data.source_label || "還沒掃描");
  text("statTalkN", String(data.threads ?? 0));
  text("statOrderN", String(data.orders ?? 0));
  const notes = data.v020 && Array.isArray(data.v020.markdown_files) ? data.v020.markdown_files.length : 0;
  text("statReviewN", String(notes));
  text("homeMeta", `${data.clock_label || "本機"} · ${data.nickname || "晏銘湛箴"}`);
  try {
    const ocr = await api("/api/ocr/catalog");
    const status = ocr.runtime && ocr.runtime.status ? ocr.runtime.status : "";
    text("statOcrN", runtimeWords(status));
  } catch (err) {
    text("statOcrN", "還沒準備好");
  }
}

async function loadReview() {
  const data = await api("/api/v020");
  const card = $("reviewCard");
  card.replaceChildren();
  const files = Array.isArray(data.markdown_files) ? data.markdown_files : [];
  const summary = document.createElement("p");
  summary.textContent = files.length
    ? `已有 ${files.length} 篇復盤。這一章最多 ${data.max_days || 600} 日。`
    : `還沒有復盤紀錄。這一章最多 ${data.max_days || 600} 日。`;
  card.appendChild(summary);
  const clock = document.createElement("p");
  clock.className = "quiet";
  clock.textContent = `時區 ${data.clock_label || "本機"}，提醒 ${data.remind_time || "07:00"}。`;
  card.appendChild(clock);
  files.slice(0, 12).forEach((name) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = baseName(name);
    button.addEventListener("click", () => text("gateOut", `這篇是「${baseName(name)}」。`));
    card.appendChild(button);
  });
}

function runtimeWords(status) {
  const words = {
    ready: "已準備好",
    running: "正在準備",
    failed: "沒能準備好",
    cancelled: "已取消",
    absent: "還沒準備",
    runtime_ready: "已準備好",
    runtime_not_bundled: "還沒準備好",
    probe_failed: "還沒準備好",
  };
  return words[status] || "還沒準備好";
}

async function loadOcr() {
  const data = await api("/api/ocr/catalog");
  const status = data.runtime && data.runtime.status ? data.runtime.status : "";
  text("ocrStatus", `辨識${runtimeWords(status)}。`);
  const last = await api("/api/ocr/last");
  if (last && last.text) showDoc(last);
}

function showDoc(data) {
  if (!data) return;
  if (data.searchable) {
    text("ocrResult", `已讀取${data.name ? ` ${data.name}` : ""}。${data.how || ""}：${data.text || ""}。可以在對話裡搜尋。`);
    return;
  }
  text("ocrResult", data.how || data.text || "");
}

function fillDevice(data) {
  const card = $("deviceCard");
  card.replaceChildren();
  if (data.error) {
    card.textContent = data.error;
    return;
  }
  const device = data.device || {};
  const os = data.os || {};
  const cpu = data.cpu || {};
  const rows = [
    ["電腦", device.name && device.name !== "unknown" ? device.name : "沒有讀到"],
    ["系統", os.pretty || os.family || "沒有讀到"],
    ["處理器", cpu.model || "沒有讀到"],
  ];
  const list = document.createElement("dl");
  list.className = "kv";
  rows.forEach(([k, v]) => {
    const dt = document.createElement("dt");
    dt.textContent = k;
    const dd = document.createElement("dd");
    dd.textContent = String(v);
    list.append(dt, dd);
  });
  card.appendChild(list);
}

async function loadDevice() {
  fillDevice(await api("/api/inventory"));
}

function enableNotes() {
  ["mdBody", "mdSave"].forEach((id) => { $(id).disabled = false; });
  text("mdHint", "可以寫今天的筆記。不會蓋掉舊檔。");
}

async function chooseRoot(place) {
  await api("/api/root", { method: "POST", body: { path: place.path } });
  state.root = place.path;
  enableNotes();
  text("placeStatus", `已選「${place.label}」。可以掃描。`);
}

async function loadPlaces(boxId, onPick) {
  const box = $(boxId);
  if (!box) return;
  const data = await api("/api/places");
  box.replaceChildren();
  const places = data.places || [];
  if (!places.length) {
    const empty = document.createElement("p");
    empty.className = "quiet";
    empty.textContent = "這台電腦上還沒有可選的位置。";
    box.appendChild(empty);
    return;
  }
  places.forEach((place) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "place";
    button.textContent = place.label;
    button.addEventListener("click", () => onPick(place));
    box.appendChild(button);
  });
}

function pickOnboardPlace(place) {
  state.pendingPlace = place;
  document.querySelectorAll("#onboardPlaces button").forEach((button) => {
    button.setAttribute("aria-pressed", button.textContent === place.label ? "true" : "false");
  });
  text("folderError", "");
}

async function nativeFolder() {
  const tauri = window.__TAURI__;
  if (!(tauri && tauri.core && tauri.core.invoke)) return "";
  try {
    const picked = await tauri.core.invoke("plugin:dialog|open", {
      options: { directory: true, multiple: false, title: "選資料夾" },
    });
    return typeof picked === "string" ? picked : "";
  } catch (err) {
    return "";
  }
}

function bindTauriDrop() {
  const tauri = window.__TAURI__;
  if (!(tauri && tauri.event && tauri.event.listen)) return;
  tauri.event.listen("tauri://drag-drop", (event) => {
    const path = event.payload && event.payload.paths && event.payload.paths[0];
    if (!path) return;
    chooseRoot({ path, label: baseName(path) }).catch((err) => text("placeStatus", err.message));
  });
}

async function browse(path, boxId) {
  const data = await api("/api/browse", { method: "POST", body: { path } });
  const box = $(boxId);
  box.hidden = false;
  box.replaceChildren();
  const here = document.createElement("p");
  here.textContent = baseName(data.path);
  box.appendChild(here);
  const parent = String(data.path || "").replace(/[/\\][^/\\]+$/, "");
  if (parent && parent !== data.path) {
    const up = document.createElement("button");
    up.type = "button";
    up.textContent = "上一層";
    up.addEventListener("click", () => browse(parent, boxId).catch((err) => text(boxId === "docBrowser" ? "ocrResult" : "placeStatus", err.message)));
    box.appendChild(up);
  }
  const use = document.createElement("button");
  use.type = "button";
  use.className = "primary";
  use.textContent = "用這個資料夾";
  use.addEventListener("click", () => {
    const place = { path: data.path, label: baseName(data.path) };
    if (boxId === "onboardBrowser") pickOnboardPlace(place);
    else chooseRoot(place).catch((err) => text("placeStatus", err.message));
  });
  box.appendChild(use);
  (data.directories || []).forEach((dir) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = dir.name;
    button.addEventListener("click", () => browse(dir.path, boxId).catch((err) => text(boxId === "docBrowser" ? "ocrResult" : "placeStatus", err.message)));
    box.appendChild(button);
  });
  if (!(data.directories || []).length && !(data.files || []).length) {
    const empty = document.createElement("p");
    empty.className = "quiet";
    empty.textContent = "這裡沒有子資料夾。";
    box.appendChild(empty);
  }
  (data.files || []).forEach((file) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `讀取 ${file.name}`;
    button.addEventListener("click", () => readPicked(file.path).catch((err) => text("ocrResult", err.message)));
    box.appendChild(button);
  });
}

async function readPicked(path) {
  const data = await api("/api/ocr/path", { method: "POST", body: { path } });
  go("ocr");
  showDoc(data);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || "");
      resolve(raw.slice(raw.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("這份檔案讀不到"));
    reader.readAsDataURL(file);
  });
}

async function loadThreads() {
  const data = await api("/api/threads");
  const box = $("threadList");
  box.replaceChildren();
  const items = data.threads || [];
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "quiet";
    empty.textContent = "還沒有對話。";
    box.appendChild(empty);
    return;
  }
  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.id = item.id;
    button.textContent = item.title || "未命名";
    if (item.id === state.thread) button.setAttribute("aria-current", "true");
    button.addEventListener("click", () => go("talk", [item.id]));
    box.appendChild(button);
  });
}

async function openThread(id) {
  state.thread = id;
  text("threadHeading", "正在打開。");
  const data = await api("/api/threads/export", { method: "POST", body: { thread: id } });
  text("threadHeading", data.title || "對話");
  const crumb = $("crumbTalk");
  if (crumb) crumb.textContent = data.title || "這則對話";
  const box = $("messages");
  box.replaceChildren();
  const messages = data.messages || [];
  if (!messages.length) {
    const empty = document.createElement("p");
    empty.className = "quiet";
    empty.textContent = "這則對話還沒有內容。在下面寫一句，會留在這台電腦。";
    box.appendChild(empty);
  } else {
    messages.forEach((msg) => {
      const bubble = document.createElement("p");
      bubble.className = "bubble";
      bubble.dataset.role = msg.role || "user";
      const who = msg.role === "assistant" ? "回覆" : "你";
      bubble.textContent = `${who}：${msg.content || ""}`;
      box.appendChild(bubble);
    });
  }
  document.querySelectorAll("#threadList button").forEach((button) => {
    if (button.dataset.id === id) button.setAttribute("aria-current", "true");
    else button.removeAttribute("aria-current");
  });
}

async function ensureThread() {
  if (state.thread) return state.thread;
  const data = await api("/api/threads", { method: "POST", body: { title: $("threadTitle").value.trim() || "新對話" } });
  state.thread = data.id;
  go("talk", [data.id]);
  return data.id;
}

function showHits(data) {
  const card = $("talkCard");
  card.replaceChildren();
  const hits = data.hits || [];
  if (!hits.length) {
    const empty = document.createElement("p");
    empty.textContent = "沒有找到。";
    card.appendChild(empty);
    return;
  }
  hits.forEach((hit) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = hit.snippet || "打開這則";
    button.addEventListener("click", () => {
      if (hit.thread_id) go("talk", [hit.thread_id]);
    });
    card.appendChild(button);
  });
}

function paintPay() {
  const box = $("payDetail");
  box.replaceChildren();
  if (!state.order) {
    const empty = document.createElement("p");
    empty.id = "payEmpty";
    empty.textContent = "還沒有沙箱訂單。建立一筆之後，狀態會留在這台電腦。";
    box.appendChild(empty);
    return;
  }
  const title = document.createElement("p");
  const amount = ((state.amountCents || 100) / 100).toFixed(2);
  title.textContent = `沙箱狀態：${state.payStatus || "Pending"} · ${amount} ${state.currency || "CNY"}`;
  box.appendChild(title);
  const note = document.createElement("p");
  note.className = "quiet";
  note.textContent = state.pageReturn
    ? "頁面曾經說已付。簽名通知才算數，這不算付款。"
    : "簽名通知才算數。頁面說已付不會改成已付款。";
  box.appendChild(note);
}

function paySentence(path, data) {
  const status = data.order_status || data.status || "";
  if (path.endsWith("/page-return")) {
    return `頁面說已付，沙箱狀態仍是 ${data.order_status || "Pending"}。這不算付款。`;
  }
  if (path.endsWith("/orders")) return `已建立沙箱訂單，狀態 ${status}。不會扣款。`;
  if (path.endsWith("/settle")) return `已做出簽名通知，狀態 ${status}。`;
  if (path.endsWith("/notify")) {
    if (data.status === "duplicate_ignored") return `同一次通知再送，沙箱狀態仍是 ${data.order_status || status}。`;
    if (data.status === "stale_ignored") return `這次通知沒有改狀態，沙箱狀態仍是 ${data.order_status || status}。`;
    if (data.status === "failed" || data.order_status === "Failed") return `付款失敗已記下，沙箱狀態 ${data.order_status || status}。`;
    return `簽名通知已記下，沙箱狀態 ${data.order_status || status}。`;
  }
  if (path.endsWith("/query")) return `簽名查單：${data.query_result || status}。沙箱狀態 ${data.order_status || ""}。頁面跳回來不算數。`;
  if (path.endsWith("/deliver")) return `交付結果：${status}。`;
  if (path.endsWith("/refund")) return `已退一部分，沙箱狀態 ${status}。`;
  return status ? `沙箱狀態：${status}` : "已記下。這不是正式扣款。";
}

async function pay(path, body) {
  try {
    const data = await api(path, { method: "POST", body });
    const status = data.order_status || data.status || "";
    if (status && path.indexOf("page-return") === -1) state.payStatus = status;
    if (path.endsWith("/page-return")) state.pageReturn = true;
    text("payOut", paySentence(path, data));
    paintPay();
    return data;
  } catch (err) {
    text("payOut", err.message);
    throw err;
  }
}

function showOnboard(step) {
  const current = Math.min(6, Math.max(1, step || 1));
  document.querySelectorAll(".onboard-card").forEach((card) => {
    card.hidden = Number(card.dataset.step) !== current;
  });
  text("onboardProgress", `第 ${current} 步，共 6 步`);
  const dots = $("onboardDots");
  dots.replaceChildren();
  for (let i = 1; i <= 6; i += 1) {
    const li = document.createElement("li");
    if (i <= current) li.dataset.on = "1";
    dots.appendChild(li);
  }
  $("booting").hidden = true;
  document.body.dataset.app = "off";
  $("recovery").hidden = true;
  $("onboard").hidden = false;
  $("workspace").hidden = true;
  if (current === 2) {
    loadPlaces("onboardPlaces", pickOnboardPlace).catch((err) => text("folderError", err.message));
  }
}

function enterApp(nickname) {
  $("booting").hidden = true;
  $("onboard").hidden = true;
  $("recovery").hidden = true;
  document.body.dataset.app = "on";
  $("workspace").hidden = false;
  text("brandNick", nickname || "晏銘湛箴");
  if (location.hash !== "#/home") location.hash = "#/home";
  else renderRoute();
}

function openPalette() {
  $("palette").hidden = false;
  renderPalette($("paletteQuery").value);
  $("paletteQuery").focus();
}

function renderPalette(query) {
  const list = $("paletteList");
  list.replaceChildren();
  const q = query.trim();
  PAGES.filter(([, label]) => !q || label.includes(q)).forEach(([id, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => {
      $("palette").hidden = true;
      go(id);
    });
    list.appendChild(button);
  });
}

async function boot() {
  state.today = new Date().toISOString().slice(0, 10);
  const session = await api("/api/session");
  state.csrf = session.csrf;
  bindTauriDrop();
  const profile = await api("/api/onboarding");
  if (!profile.onboarding_done) {
    if (profile.nickname && profile.nickname !== "用戶") $("nickInput").value = profile.nickname;
    showOnboard(Number(profile.step) || 1);
    return;
  }
  text("brandNick", profile.nickname || "晏銘湛箴");
  const root = await api("/api/root");
  if (root.root) {
    state.root = root.root;
    enableNotes();
  }
  $("booting").hidden = true;
  document.body.dataset.app = "on";
  $("workspace").hidden = false;
  await loadGroups();
  if (!location.hash) location.replace("#/home");
  else renderRoute();
}

document.querySelectorAll("[data-panel]").forEach((button) => {
  button.addEventListener("click", () => go(button.dataset.panel));
});
$("menuBtn").addEventListener("click", () => {
  if (document.body.dataset.drawer === "open") closeDrawer();
  else openDrawer();
});
$("dockMore").addEventListener("click", () => openDrawer());
$("scrim").addEventListener("click", () => closeDrawer());
document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", () => go(button.dataset.go));
});
document.querySelectorAll("[data-preset]").forEach((button) => {
  button.addEventListener("click", () => onPreset(Number(button.dataset.preset)));
});
$("surface").addEventListener("change", () => setSurface($("surface").value));
$("goBack").addEventListener("click", () => {
  if (history.length > 1) {
    history.back();
    text("navStatus", "已回到上一頁。");
  } else {
    go("home");
    text("navStatus", "已經在彙報。");
  }
});
$("paletteBtn").addEventListener("click", () => {
  if ($("palette").hidden) openPalette();
  else $("palette").hidden = true;
});
$("paletteQuery").addEventListener("input", () => renderPalette($("paletteQuery").value));
$("retryCore").addEventListener("click", () => location.reload());

$("runQuery").addEventListener("click", () => runQuery().catch((err) => text("draftState", err.message)));
$("loadSample").addEventListener("click", async () => {
  await api("/api/fixtures/synthetic", { method: "POST", body: {} });
  $("sampleBanner").hidden = false;
  await loadGroups();
  text("draftState", "樣本已載入。按查詢才會出結果。");
});
$("browseRoot").addEventListener("click", async () => {
  text("placeStatus", "正在看這個資料夾。");
  try {
    const picked = await nativeFolder();
    if (picked) {
      await chooseRoot({ path: picked, label: baseName(picked) });
      return;
    }
    await browse(state.root || "", "browser");
    text("placeStatus", "點一個資料夾，或用這一層。");
  } catch (err) {
    text("placeStatus", err.message);
  }
});
$("scanRoot").addEventListener("click", async () => {
  try {
    const data = await api("/api/scan", { method: "POST", body: {} });
    $("sampleBanner").hidden = true;
    await loadGroups();
    text("draftState", `看到 ${data.count} 份，略過 ${data.skipped}。按查詢才篩選。`);
  } catch (err) { text("draftState", err.message); }
});
$("selectAll").addEventListener("click", async () => {
  try {
    const data = await api("/api/panel1/select-all", { method: "POST", body: { dynamic: false } });
    text("selection", data.label);
  } catch (err) { text("selection", err.message); }
});
$("mdSave").addEventListener("click", async () => {
  try {
    await api("/api/md", { method: "POST", body: { path: "notes/today.md", body: $("mdBody").value, dry_run: false } });
    text("mdHint", "已寫下今天的筆記。");
  } catch (err) { text("mdHint", err.message); }
});
$("planMove").addEventListener("click", async () => {
  try {
    if (!state.moveFrom || !state.moveTo) {
      text("moveOut", state.moveFrom ? "再點一個目的位置。" : "先點一份檔案，再點目的位置。");
      return;
    }
    const data = await api("/api/organize/plan", { method: "POST", body: { from: state.moveFrom, to: state.moveTo } });
    state.plan = data.id;
    text("moveOut", "預覽好了。確認後才會搬。");
  } catch (err) { text("moveOut", err.message); }
});
$("confirmMove").addEventListener("click", async () => {
  try {
    const data = await api("/api/organize/confirm", { method: "POST", body: { id: state.plan, confirm: "CONFIRM" } });
    text("moveOut", `已搬動 ${data.moved}。可以撤銷。`);
  } catch (err) { text("moveOut", err.message); }
});
$("undoMove").addEventListener("click", async () => {
  try {
    const data = await api("/api/organize/undo", { method: "POST", body: { id: state.plan } });
    text("moveOut", `已撤銷 ${data.undone}。`);
  } catch (err) { text("moveOut", err.message); }
});

const dropZone = $("dropZone");
dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.dataset.hot = "1";
});
dropZone.addEventListener("dragleave", () => { dropZone.dataset.hot = "0"; });
dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.dataset.hot = "0";
  const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
  const path = file && file.path;
  if (!path) {
    text("placeStatus", "沒有拿到資料夾。請改點下面的位置。");
    return;
  }
  chooseRoot({ path, label: file.name || baseName(path) }).catch((err) => text("placeStatus", err.message));
});

async function saveLink() {
  const stored = $("secretValue").value
    ? await api("/api/secrets", { method: "POST", body: { value: $("secretValue").value } })
    : null;
  if (stored) $("secretValue").value = "";
  const data = await api("/api/connectors", { method: "POST", body: {
    kind: $("kind").value,
    label: "我的連接",
    resource_id: $("resource").value || "synthetic-resource",
    secret_ref: stored ? stored.secret_ref : "",
    consent: $("linkConsent").checked,
    approve_target: $("linkApprove").checked,
    base_url: $("baseUrl").value,
    mapping: { mapping: [
      { logical_field: "title", source_type: "title", required: true },
      { logical_field: "date", source_type: "date", required: true },
      { logical_field: "record_id", source_type: "rich_text", required: true },
    ] },
  } });
  state.connector = data.id;
  const where = stored && stored.store === "keyring" ? "系統鑰匙圈" : "這台電腦的私人檔案";
  text("linkOut", stored ? `已儲存。金鑰在${where}。還沒送出。` : "已儲存。還沒送出。");
}
$("saveLink").addEventListener("click", () => saveLink().catch((err) => text("linkOut", err.message)));
$("previewLink").addEventListener("click", async () => {
  try {
    const data = await api("/api/connectors/preview", { method: "POST", body: { id: state.connector } });
    text("linkOut", `${data.method || ""} ${data.url || ""}\n還沒送出。`);
  } catch (err) { text("linkOut", err.message); }
});
$("syncLink").addEventListener("click", async () => {
  try {
    const data = await api("/api/connectors/sync", { method: "POST", body: {
      id: state.connector,
      transport: $("baseUrl").value ? "live" : "inproc",
      records: [{ title: "合成復盤", date: "2026-11-07", record_id: "SYN-UI", version: "1" }],
    } });
    text("linkOut", data.live_called ? "已送到你填的位址。這不是正式帳號。" : "已在這台電腦上記下一筆，沒有連外。");
  } catch (err) { text("linkOut", err.message); }
});
$("logLink").addEventListener("click", async () => {
  try {
    const data = await api("/api/connectors/logs", { method: "POST", body: { id: state.connector } });
    const lines = (data.logs || []).map((row) => `${row.ok ? "完成" : "沒完成"} ${row.created_at || ""}`);
    text("linkOut", lines.length ? lines.join("\n") : "還沒有紀錄。");
  } catch (err) { text("linkOut", err.message); }
});
$("exportLink").addEventListener("click", async () => {
  try {
    const data = await api("/api/connectors/export", { method: "POST", body: { id: state.connector } });
    text("linkOut", `已匯出 ${data.kind || ""}。金鑰不會出現在這裡。`);
  } catch (err) { text("linkOut", err.message); }
});
$("dropLink").addEventListener("click", async () => {
  try {
    await api("/api/connectors/disconnect", { method: "POST", body: { id: state.connector } });
    text("linkOut", "已中斷，金鑰已清掉。");
  } catch (err) { text("linkOut", err.message); }
});

$("newThread").addEventListener("click", async () => {
  const data = await api("/api/threads", { method: "POST", body: { title: $("threadTitle").value.trim() || "新對話" } });
  state.thread = data.id;
  text("talkStatus", "已開一則新對話。");
  go("talk", [data.id]);
});
$("sendUtterance").addEventListener("click", async () => {
  try {
    const content = $("utterance").value.trim();
    if (!content) {
      text("talkStatus", "先寫一句話。");
      return;
    }
    const id = await ensureThread();
    await api("/api/threads/message", { method: "POST", body: { thread: id, role: "user", content } });
    $("utterance").value = "";
    text("talkStatus", "已留下。");
    await openThread(id);
    await loadThreads();
  } catch (err) { text("talkStatus", err.message); }
});
$("findBtn").addEventListener("click", async () => {
  try { showHits(await api("/api/search", { method: "POST", body: { q: $("findText").value } })); text("talkStatus", "搜尋完成。點一則就打開。"); }
  catch (err) { text("talkStatus", err.message); }
});
$("checkPoint").addEventListener("click", async () => {
  try {
    const data = await api("/api/threads/checkpoint", { method: "POST", body: { thread: state.thread } });
    text("talkStatus", `已留下檢查點。`);
    if (data.id) text("talkStatus", "已留下檢查點。");
  } catch (err) { text("talkStatus", err.message); }
});
$("exportThread").addEventListener("click", async () => {
  try {
    const data = await api("/api/threads/export", { method: "POST", body: { thread: state.thread } });
    text("talkStatus", `已匯出 ${(data.messages || []).length} 則。內容留在這台電腦。`);
  } catch (err) { text("talkStatus", err.message); }
});
$("archiveThread").addEventListener("click", async () => {
  try {
    await api("/api/threads/archive", { method: "POST", body: { thread: state.thread, archived: true } });
    text("talkStatus", "已封存。");
    state.thread = "";
    await loadThreads();
    go("talk");
  } catch (err) { text("talkStatus", err.message); }
});
$("keepRecent").addEventListener("click", async () => {
  try {
    const data = await api("/api/threads/retention", { method: "POST", body: { days: 30 } });
    text("talkStatus", `已清掉 ${data.deleted_messages} 則更早的內容。`);
  } catch (err) { text("talkStatus", err.message); }
});
$("importThread").addEventListener("click", async () => {
  try {
    const body = JSON.parse($("importJson").value || "{}");
    if (!body.title) body.title = "匯入的對話";
    const data = await api("/api/threads/import", { method: "POST", body });
    state.thread = data.id;
    text("talkStatus", "已匯入。");
    go("talk", [data.id]);
  } catch (err) { text("talkStatus", err.message); }
});
$("modelSend").addEventListener("click", async () => {
  try {
    if (!state.thread) {
      const created = await api("/api/threads", { method: "POST", body: { title: "模型對話" } });
      state.thread = created.id;
    }
    const data = await api("/api/provider", { method: "POST", body: {
      opt_in: $("modelOpt").checked,
      protocol: $("modelProtocol").value,
      base_url: $("modelBase").value,
      model: $("modelName").value,
      prompt: $("modelPrompt").value.trim() || "你好",
      thread: state.thread,
      include_document: $("modelDoc").checked,
      content_consent: $("modelDoc").checked,
      probe: $("modelProtocol").value === "codex" || $("modelProtocol").value === "claude",
    } });
    const line = data.called ? "已送出，回覆留在這段對話。" : plainError(data.reason || "") || "沒有送出。";
    text("settingsOut", line === "要先勾同意。" ? line : (data.called ? line : "沒有送出。要先勾同意，或這台電腦上沒有這個模型。"));
    $("openModelThread").hidden = false;
  } catch (err) { text("settingsOut", err.message); }
});
$("openModelThread").addEventListener("click", () => {
  if (state.thread) go("talk", [state.thread]);
});

$("browseDocs").addEventListener("click", () => browse(state.root || "", "docBrowser").catch((err) => text("ocrResult", err.message)));
$("readDoc").addEventListener("click", async () => {
  try {
    const file = $("docFile").files && $("docFile").files[0];
    if (!file) {
      text("ocrResult", "先選一份 PDF 或圖片。");
      return;
    }
    text("ocrResult", "正在讀取。");
    const pdfBase64 = await fileToBase64(file);
    showDoc(await api("/api/ocr/ingest", { method: "POST", body: { name: file.name, pdf_base64: pdfBase64 } }));
  } catch (err) { text("ocrResult", err.message); }
});
$("ocrDownload").addEventListener("click", async () => {
  try {
    text("ocrResult", "正在下載辨識模型。");
    await api("/api/ocr/download", { method: "POST", body: {} });
    text("ocrResult", "模型已放在這台電腦。");
  } catch (err) { text("ocrResult", err.message); }
});
$("ocrRecognize").addEventListener("click", async () => {
  try {
    text("ocrResult", "正在辨識內建的掃描範例。");
    const data = await api("/api/ocr/recognize", { method: "POST", body: {} });
    const saved = await api("/api/ocr/ingest", { method: "POST", body: { name: "掃描範例.txt", text: data.text || "" } });
    showDoc(saved.text ? saved : { how: `掃描結果：${data.text || ""}`, searchable: false });
  } catch (err) { text("ocrResult", err.message); }
});
$("ocrSample").addEventListener("click", async () => {
  try {
    const data = await api("/api/ocr/sample", { method: "POST", body: {} });
    const saved = await api("/api/ocr/ingest", { method: "POST", body: { name: "文字範例.pdf", text: data.text || "" } });
    showDoc(saved);
  } catch (err) { text("ocrResult", err.message); }
});
$("ocrRuntime").addEventListener("click", async () => {
  try {
    text("ocrResult", "正在準備辨識，可以取消。");
    await api("/api/ocr/runtime", { method: "POST", body: {} });
    for (let i = 0; i < 120; i += 1) {
      const status = await api("/api/ocr/runtime");
      text("ocrResult", runtimeWords(status.state));
      if (status.state && status.state !== "running") break;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } catch (err) { text("ocrResult", err.message); }
});
$("ocrSaveApi").addEventListener("click", async () => {
  try {
    await api("/api/ocr/api", { method: "POST", body: { opt_in: true, invoke: false, endpoint: $("ocrEndpoint").value } });
    text("ocrResult", "已登記。沒有送出。");
  } catch (err) { text("ocrResult", err.message); }
});
$("ocrInvoke").addEventListener("click", async () => {
  try {
    const data = await api("/api/ocr/api", { method: "POST", body: {
      opt_in: $("ocrOpt").checked,
      invoke: true,
      endpoint: $("ocrEndpoint").value,
      text: $("ocrText").value,
    } });
    text("ocrResult", data.called ? "已送出這段文字。" : "沒有送出。");
  } catch (err) { text("ocrResult", err.message); }
});
$("ocrCancel").addEventListener("click", async () => {
  try {
    await api("/api/ocr/cancel", { method: "POST", body: {} });
    const runtime = await api("/api/ocr/runtime/cancel", { method: "POST", body: {} });
    text("ocrResult", runtimeWords(runtime.state));
  } catch (err) { text("ocrResult", err.message); }
});
$("ocrRemove").addEventListener("click", async () => {
  try {
    await api("/api/ocr/remove", { method: "POST", body: {} });
    text("ocrResult", "已清掉辨識資料。");
  } catch (err) { text("ocrResult", err.message); }
});
$("decideBtn").addEventListener("click", async () => {
  try {
    const data = await api("/api/decisions", { method: "POST", body: {
      evidence: [{ id: "note", kind: "file", quote: $("evidence").value, confidence: 1 }],
    } });
    const line = data.summary || data.decision || data.status || "已記下這條證據。";
    text("decideOut", typeof line === "string" ? line : "已記下這條證據。");
  } catch (err) { text("decideOut", err.message); }
});
$("runGate").addEventListener("click", async () => {
  try {
    const data = await api("/api/v020/gate", { method: "POST", body: {} });
    text("gateOut", data.note || "每日檢查跑完了。");
  } catch (err) { text("gateOut", err.message); }
});

$("newOrder").addEventListener("click", async () => {
  try {
    const data = await pay("/api/pay/orders", { sku: "connector-automation-sandbox" });
    state.order = data.id;
    state.eventId = "";
    state.payStatus = data.status || "Pending";
    state.amountCents = data.amount_cents || 100;
    state.currency = data.currency || "CNY";
    paintPay();
  } catch (err) { text("payOut", err.message); }
});
$("pageReturn").addEventListener("click", () => pay("/api/pay/page-return", { id: state.order, claimed: "paid" }).catch(() => {}));
$("settleOrder").addEventListener("click", async () => {
  try {
    const data = await pay("/api/pay/settle", { id: state.order });
    state.eventId = data.event_id || "";
  } catch (err) { text("payOut", err.message); }
});
$("repeatNotify").addEventListener("click", () => pay("/api/pay/notify", { id: state.order, event_id: state.eventId, status: "paid" }).catch(() => {}));
$("queryOrder").addEventListener("click", () => pay("/api/pay/query", { id: state.order }).catch(() => {}));
$("failDeliver").addEventListener("click", () => pay("/api/pay/deliver", { id: state.order, fail_next: true }).catch(() => {}));
$("deliverOrder").addEventListener("click", () => pay("/api/pay/deliver", { id: state.order, fail_next: false }).catch(() => {}));
$("refundOrder").addEventListener("click", () => pay("/api/pay/refund", { id: state.order, amount_cents: 40 }).catch(() => {}));
$("failPay").addEventListener("click", () => pay("/api/pay/notify", { id: state.order, event_id: `fail-${Date.now()}`, status: "failed" }).catch(() => {}));

$("phoneInput").addEventListener("input", () => {
  const digits = $("phoneInput").value.replace(/\D/g, "");
  text("nickHint", digits.length >= 4 && !$("nickInput").value.trim() ? `沒填稱呼的話，會叫你用戶${digits.slice(-4)}` : "");
  text("nickError", "");
});
$("nickNext").addEventListener("click", async () => {
  try {
    const phone = $("phoneInput").value.trim();
    const data = await api("/api/onboarding", { method: "POST", body: {
      nickname: $("nickInput").value.trim(),
      phone,
      skip_phone: phone === "",
      step: 2,
    } });
    $("nickInput").value = data.nickname || $("nickInput").value;
    showOnboard(2);
  } catch (err) { text("nickError", err.message); }
});
$("nickSkip").addEventListener("click", async () => {
  try {
    const data = await api("/api/onboarding", { method: "POST", body: {
      nickname: $("nickInput").value.trim(),
      skip_phone: true,
      step: 2,
    } });
    $("nickInput").value = data.nickname || "用戶";
    showOnboard(2);
  } catch (err) { text("nickError", err.message); }
});
$("folderBack").addEventListener("click", () => showOnboard(1));
$("folderSkip").addEventListener("click", async () => {
  await api("/api/onboarding", { method: "POST", body: { step: 3 } });
  showOnboard(3);
});
$("folderNext").addEventListener("click", async () => {
  try {
    if (!state.pendingPlace) {
      text("folderError", "先點一個位置，或按先跳過。");
      return;
    }
    await chooseRoot(state.pendingPlace);
    await api("/api/onboarding", { method: "POST", body: { step: 3 } });
    showOnboard(3);
  } catch (err) { text("folderError", err.message); }
});
$("privacyBack").addEventListener("click", () => showOnboard(2));
async function leavePrivacy() {
  await api("/api/onboarding", { method: "POST", body: { step: 4 } });
  text("onboardOcr", "還沒開始準備。");
  showOnboard(4);
}
$("privacyNext").addEventListener("click", () => leavePrivacy());
$("privacySkip").addEventListener("click", () => leavePrivacy());
$("ocrBack").addEventListener("click", () => showOnboard(3));
async function leaveOcrStep() {
  await api("/api/onboarding", { method: "POST", body: { step: 5 } });
  showOnboard(5);
}
$("ocrSkip").addEventListener("click", () => leaveOcrStep().catch((err) => text("onboardOcr", err.message)));
$("ocrNext").addEventListener("click", async () => {
  if ($("ocrNext").dataset.started === "1") {
    await leaveOcrStep();
    return;
  }
  try {
    const data = await api("/api/ocr/runtime", { method: "POST", body: {} });
    text("onboardOcr", `${runtimeWords(data.status || data.state || "")}。可以按下一步離開，或先跳過。`);
    $("ocrNext").textContent = "下一步";
    $("ocrNext").dataset.started = "1";
  } catch (err) { text("onboardOcr", err.message); }
});
$("linkBack").addEventListener("click", () => showOnboard(4));
async function leaveLinkStep() {
  await api("/api/onboarding", { method: "POST", body: { step: 6 } });
  const nick = $("nickInput").value.trim() || "用戶";
  text("doneTitle", `${nick}，準備好了`);
  showOnboard(6);
}
$("linkSkip").addEventListener("click", () => leaveLinkStep());
$("linkNext").addEventListener("click", () => leaveLinkStep());
$("doneBack").addEventListener("click", () => showOnboard(5));
$("doneNext").addEventListener("click", async () => {
  const data = await api("/api/onboarding", { method: "POST", body: { done: true, step: 6 } });
  if (!state.root) {
    await api("/api/fixtures/synthetic", { method: "POST", body: {} });
    $("sampleBanner").hidden = false;
  } else {
    await api("/api/scan", { method: "POST", body: {} }).catch(() => {});
  }
  await api("/api/threads", { method: "POST", body: { title: "歡迎" } }).catch(() => {});
  enterApp(data.nickname);
});

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openPalette();
    return;
  }
  if (event.key === "Escape") {
    if ($("palette")) $("palette").hidden = true;
    closeDrawer();
  }
  if (event.target.matches("input, textarea, select")) return;
  if (event.key === "1") go("files");
  if (event.key === "2") go("links");
  if (event.key === "3") go("device");
  if (event.key === "/") {
    event.preventDefault();
    $("runQuery").focus();
  }
});
window.addEventListener("hashchange", () => {
  if (!$("workspace").hidden) renderRoute();
});

boot().catch((err) => showRecovery(err.message));
