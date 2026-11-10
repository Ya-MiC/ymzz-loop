const state = { csrf: "", thread: "", connector: "", order: "", preset: 7, today: "", plan: "", checkpoint: "" };

const $ = (id) => document.getElementById(id);
const text = (id, value) => { $(id).textContent = value == null ? "" : String(value); };

async function api(path, options = {}) {
  const headers = { "content-type": "application/json" };
  if (state.csrf) headers["x-ymzz-csrf"] = state.csrf;
  const res = await fetch(path, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({ ok: false, error: "bad json" }));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function onPreset(days) {
  state.preset = days;
  $("draftState").textContent = `已選 ${days} 日。尚未查詢。`;
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
      drive: $("drive").value,
      ext: $("ext").value,
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
  text("draftState", snap.select_all_label || "");
  text("semantic", sem.reason || "");
  const graph = $("graph");
  graph.replaceChildren();
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "280");
  const groups = full.groups || {};
  const names = Object.keys(groups);
  names.forEach((name, i) => {
    const count = Math.min(groups[name], 12);
    const col = i % 4;
    const row = Math.floor(i / 4);
    for (let n = 0; n < count; n += 1) {
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", 24 + col * 160 + (n % 4) * 12);
      dot.setAttribute("cy", 36 + row * 72 + Math.floor(n / 4) * 12);
      dot.setAttribute("r", "4");
      dot.setAttribute("fill", "currentColor");
      svg.appendChild(dot);
    }
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", 16 + col * 160);
    label.setAttribute("y", 18 + row * 72);
    label.setAttribute("fill", "currentColor");
    const short = name.length > 22 ? `${name.slice(0, 20)}…` : name;
    label.textContent = short;
    svg.appendChild(label);
  });
  graph.appendChild(svg);
  const list = document.createElement("div");
  names.forEach((name) => {
    const row = document.createElement("div");
    row.className = "mono";
    row.textContent = `${name}  ${groups[name]}`;
    list.appendChild(row);
  });
  graph.appendChild(list);
  const heat = $("heat");
  heat.replaceChildren();
  const days = full.per_day || {};
  Object.keys(days).sort().forEach((day) => {
    const row = document.createElement("div");
    row.className = "mono";
    row.textContent = `${day}  ${days[day]}`;
    heat.appendChild(row);
  });
  const chart = $("compare");
  chart.replaceChildren();
  const cur = (cmp.current && cmp.current.points) || [];
  const prev = (cmp.previous && cmp.previous.points) || [];
  const line = (points, opacity) => {
    if (!points.length) return;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    const coords = points.map((p, i) => {
      const x = 10 + i * (260 / Math.max(points.length - 1, 1));
      const y = 100 - (p.ratio || 0) * 80;
      return `${x},${y}`;
    }).join(" ");
    path.setAttribute("points", coords);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-opacity", String(opacity));
    chart.appendChild(path);
  };
  line(prev, 0.35);
  line(cur, 1);
  const note = document.createElementNS("http://www.w3.org/2000/svg", "text");
  note.setAttribute("x", "8");
  note.setAttribute("y", "16");
  note.setAttribute("fill", "currentColor");
  note.textContent = cmp.formula || "";
  chart.appendChild(note);
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

function show(panel) {
  document.querySelectorAll(".panel").forEach((node) => node.classList.remove("active"));
  document.querySelectorAll("[data-panel]").forEach((node) => node.removeAttribute("aria-current"));
  $(panel).classList.add("active");
  document.querySelectorAll(`[data-panel="${panel}"]`).forEach((node) => node.setAttribute("aria-current", "page"));
  if (panel === "report") loadReport().catch((err) => text("reportOut", err.message));
  if (panel === "ocr") loadOcr().catch((err) => text("ocrResult", err.message));
}

function fillReport(data) {
  const card = $("reportCard");
  card.replaceChildren();
  const rows = [
    ["本機檔案", data.files_indexed],
    ["資料來源", data.source || "尚未掃描"],
    ["這次查詢", data.snapshot == null ? "還沒查" : `${data.snapshot} 筆`],
    ["對話", data.threads],
    ["沙箱訂單", data.orders],
    ["遙測", data.telemetry ? "開" : "關"],
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
  const v020 = data.v020 || {};
  const note = document.createElement("p");
  note.className = "quiet";
  const files = Array.isArray(v020.markdown_files) ? v020.markdown_files.length : 0;
  note.textContent = `既有復盤仍由 Node 撰寫。時區 ${v020.timezone || "未設"}，提醒 ${v020.remind_time || "未設"}，Markdown ${files} 份，章節上限 ${v020.max_days || 600} 日。沒有代管信箱。`;
  card.appendChild(note);
}

async function loadReport() {
  const data = await api("/api/dashboard");
  fillReport(data);
  text("reportOut", "");
}

async function loadOcr() {
  const data = await api("/api/ocr/catalog");
  text("ocrRuntime", `Python 後端狀態：${data.runtime && data.runtime.status ? data.runtime.status : "未知"}。推論：${data.runtime && data.runtime.inference ? data.runtime.inference : "未跑"}。`);
  text("ocrCatalog", JSON.stringify(data.models || [], null, 2));
}

async function boot() {
  state.today = new Date().toISOString().slice(0, 10);
  $("fontNote").textContent = "正文字體指定 Noto Sans SC Variable，此包未嵌入字檔。代碼用 JetBrains Mono。深藤紫仍是提案，沒有當成預設。";
  const session = await api("/api/session");
  state.csrf = session.csrf;
  text("deviceOut", JSON.stringify(await api("/api/inventory"), null, 2));
  await loadReport();
  text("semantic", "尚未查詢。");
}

document.querySelectorAll("[data-panel]").forEach((button) => {
  button.addEventListener("click", () => show(button.dataset.panel));
});
document.querySelectorAll("[data-preset]").forEach((button) => {
  button.addEventListener("click", () => onPreset(Number(button.dataset.preset)));
});
$("runQuery").addEventListener("click", () => runQuery().catch((err) => text("draftState", err.message)));
$("surface").addEventListener("change", () => setSurface($("surface").value));
$("loadSample").addEventListener("click", async () => {
  await api("/api/fixtures/synthetic", { method: "POST", body: {} });
  $("sampleBanner").hidden = false;
  text("draftState", "合成樣本已載入。按查詢才會出結果。");
});
$("useRoot").addEventListener("click", async () => {
  try {
    await api("/api/root", { method: "POST", body: { path: $("rootPath").value } });
    ["mdBody", "mdPath", "mdSave"].forEach((id) => { $(id).disabled = false; });
    text("mdHint", "可以寫新的 .md。不會覆蓋舊檔。");
  } catch (err) { text("mdHint", err.message); }
});
$("scanRoot").addEventListener("click", async () => {
  try {
    const data = await api("/api/scan", { method: "POST", body: { timezone: "Asia/Seoul" } });
    $("sampleBanner").hidden = true;
    text("draftState", `掃描 ${data.count} 筆中繼資料，略過 ${data.skipped}。按查詢才篩選。`);
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
    const data = await api("/api/md", { method: "POST", body: { path: $("mdPath").value, body: $("mdBody").value, dry_run: false } });
    text("mdHint", `已寫入 ${data.wrote}`);
  } catch (err) { text("mdHint", err.message); }
});
$("saveLink").addEventListener("click", async () => {
  try {
    const data = await api("/api/connectors", { method: "POST", body: {
      kind: $("kind").value,
      label: "我的連接",
      resource_id: $("resource").value || "synthetic-resource",
      secret_ref: $("secretRef").value || "env:NOT_SET",
      mapping: { mapping: [
        { logical_field: "title", source_type: "title", required: true },
        { logical_field: "date", source_type: "date", required: true },
        { logical_field: "record_id", source_type: "rich_text", required: true },
      ] },
    } });
    state.connector = data.id;
    text("linkOut", `已儲存 ${data.id}，狀態 ${data.status}。尚未連外。`);
  } catch (err) { text("linkOut", err.message); }
});
$("syncLink").addEventListener("click", async () => {
  try {
    const data = await api("/api/connectors/sync", { method: "POST", body: {
      id: state.connector,
      transport: "inproc",
      records: [{ title: "合成復盤", date: "2026-11-07", record_id: "SYN-UI", version: "1" }],
    } });
    text("linkOut", JSON.stringify(data, null, 2));
  } catch (err) { text("linkOut", err.message); }
});
$("dropLink").addEventListener("click", async () => {
  try {
    const data = await api("/api/connectors/disconnect", { method: "POST", body: { id: state.connector } });
    text("linkOut", `已中斷。狀態 ${data.status}`);
  } catch (err) { text("linkOut", err.message); }
});
$("newThread").addEventListener("click", async () => {
  const data = await api("/api/threads", { method: "POST", body: { title: $("threadTitle").value || "合成對話" } });
  state.thread = data.id;
  text("talkOut", `對話 ${data.id}`);
});
$("sendUtterance").addEventListener("click", async () => {
  const data = await api("/api/threads/message", { method: "POST", body: { thread: state.thread, role: "user", content: $("utterance").value } });
  text("talkOut", `已留下 ${data.id}。內容視為不可信資料。`);
});
$("findBtn").addEventListener("click", async () => {
  try {
    const data = await api("/api/search", { method: "POST", body: { q: $("findText").value } });
    text("talkOut", JSON.stringify(data, null, 2));
  } catch (err) { text("talkOut", err.message); }
});
$("checkPoint").addEventListener("click", async () => {
  try {
    const data = await api("/api/threads/checkpoint", { method: "POST", body: { thread: state.thread } });
    state.checkpoint = data.id;
    text("talkOut", `檢查點 ${data.id}`);
  } catch (err) { text("talkOut", err.message); }
});
$("exportThread").addEventListener("click", async () => {
  try {
    const data = await api("/api/threads/export", { method: "POST", body: { thread: state.thread } });
    text("talkOut", JSON.stringify(data, null, 2));
  } catch (err) { text("talkOut", err.message); }
});
$("archiveThread").addEventListener("click", async () => {
  try {
    const data = await api("/api/threads/archive", { method: "POST", body: { thread: state.thread, archived: true } });
    text("talkOut", `已封存 ${data.id}`);
  } catch (err) { text("talkOut", err.message); }
});
$("planMove").addEventListener("click", async () => {
  try {
    const data = await api("/api/organize/plan", { method: "POST", body: { from: $("moveFrom").value, to: $("moveTo").value } });
    state.plan = data.id;
    text("moveOut", `預覽 ${data.id}。確認詞必須是 CONFIRM。`);
  } catch (err) { text("moveOut", err.message); }
});
$("confirmMove").addEventListener("click", async () => {
  try {
    const data = await api("/api/organize/confirm", { method: "POST", body: { id: state.plan, confirm: "CONFIRM" } });
    text("moveOut", `已搬動 ${data.moved}。可撤銷。`);
  } catch (err) { text("moveOut", err.message); }
});
$("undoMove").addEventListener("click", async () => {
  try {
    const data = await api("/api/organize/undo", { method: "POST", body: { id: state.plan } });
    text("moveOut", `已撤銷 ${data.undone}`);
  } catch (err) { text("moveOut", err.message); }
});
$("ocrRefresh").addEventListener("click", () => loadOcr().catch((err) => text("ocrResult", err.message)));
$("ocrDownload").addEventListener("click", async () => {
  try {
    await api("/api/ocr/download", { method: "POST", body: {} });
    text("ocrResult", "下載不該成功。");
  } catch (err) { text("ocrResult", `已拒絕下載：${err.message}`); }
});
$("ocrSample").addEventListener("click", async () => {
  try {
    const data = await api("/api/ocr/sample", { method: "POST", body: {} });
    text("ocrResult", `${data.label || ""} 文字層：${data.text || ""}`);
  } catch (err) { text("ocrResult", err.message); }
});
$("ocrSaveApi").addEventListener("click", async () => {
  try {
    const data = await api("/api/ocr/api", { method: "POST", body: {
      opt_in: $("ocrOpt").checked,
      endpoint: $("ocrEndpoint").value,
      secret_ref: $("ocrRef").value,
    } });
    text("ocrResult", data.called ? "不該發出請求。" : "已登記或未勾選。沒有呼叫 API。");
  } catch (err) { text("ocrResult", err.message); }
});
$("ocrRemove").addEventListener("click", async () => {
  try {
    await api("/api/ocr/remove", { method: "POST", body: {} });
    text("ocrResult", "已清除本機 OCR 快取與 API 登記。");
  } catch (err) { text("ocrResult", err.message); }
});
$("decideBtn").addEventListener("click", async () => {
  try {
    const data = await api("/api/decisions", { method: "POST", body: {
      evidence: [{ id: "note", kind: "file", quote: $("evidence").value, confidence: 1 }],
    } });
    text("decideOut", JSON.stringify(data, null, 2));
  } catch (err) { text("decideOut", err.message); }
});
async function pay(path, body) {
  const data = await api(path, { method: "POST", body });
  text("payOut", JSON.stringify(data, null, 2));
  return data;
}
$("newOrder").addEventListener("click", async () => {
  const data = await pay("/api/pay/orders", { sku: "connector-automation-sandbox" });
  state.order = data.id;
});
$("settleOrder").addEventListener("click", () => pay("/api/pay/settle", { id: state.order }));
$("deliverOrder").addEventListener("click", () => pay("/api/pay/deliver", { id: state.order, fail_next: false }));
$("refundOrder").addEventListener("click", () => pay("/api/pay/refund", { id: state.order, amount_cents: 40 }));

document.addEventListener("keydown", (event) => {
  if (event.target.matches("input, textarea")) return;
  if (event.key === "1") show("files");
  if (event.key === "2") show("links");
  if (event.key === "3") show("device");
  if (event.key === "/") { event.preventDefault(); $("runQuery").focus(); }
});

boot().catch((err) => { text("draftState", err.message); });
