const state = { csrf: "", thread: "", connector: "", order: "", eventId: "", preset: 7, today: "", plan: "", items: [] };

const $ = (id) => document.getElementById(id);
const text = (id, value) => {
  const node = $(id);
  if (node) node.textContent = value == null ? "" : String(value);
};

async function api(path, options = {}) {
  const headers = { "content-type": "application/json" };
  if (state.csrf) headers["x-ymzz-csrf"] = state.csrf;
  const res = await fetch(path, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
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
  };
  return table[message] || message;
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
  const names = Object.keys(groups);
  names.forEach((name, i) => {
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
    label.addEventListener("click", () => showDrawer(name));
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
  title.textContent = group ? `這一組：${group}` : "查詢結果。點上面的類型可以只看那一組。";
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
    row.textContent = `${item.modified || ""}  ${item.path}`;
    drawer.appendChild(row);
  });
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
  if (panel === "report") loadReport().catch((err) => text("gateOut", err.message));
  if (panel === "ocr") loadOcr().catch((err) => text("ocrResult", err.message));
  if (panel === "talk") loadThreads().catch((err) => showTalk(err.message));
  if (panel === "device") loadDevice().catch((err) => fillDevice({ error: err.message }));
}

function fillReport(data) {
  const card = $("reportCard");
  card.replaceChildren();
  const rows = [
    ["檔案", data.files_indexed],
    ["來自", data.source_label || "還沒掃描"],
    ["這次查詢", data.snapshot == null ? "還沒查" : `${data.snapshot} 筆`],
    ["對話", data.threads],
    ["沙箱訂單", data.orders],
    ["時區", data.clock_label || "本機"],
    ["使用統計", data.telemetry ? "開" : "關"],
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
  note.textContent = `每日復盤 ${files} 篇，提醒 ${v020.remind_time || "07:00"}，一章最多 ${v020.max_days || 600} 日。`;
  card.appendChild(note);
}

async function loadReport() {
  fillReport(await api("/api/dashboard"));
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

function showTalk(message) {
  const card = $("talkCard");
  card.replaceChildren();
  const p = document.createElement("p");
  p.textContent = message;
  card.appendChild(p);
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
    const p = document.createElement("p");
    p.textContent = hit.snippet || "";
    card.appendChild(p);
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
    button.textContent = item.title || "未命名";
    button.addEventListener("click", () => {
      state.thread = item.id;
      showTalk(`正在看「${item.title || "未命名"}」。`);
    });
    box.appendChild(button);
  });
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

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      resolve(text.slice(text.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("這份檔案讀不到"));
    reader.readAsDataURL(file);
  });
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
  $("onboard").hidden = false;
  $("workspace").hidden = true;
}

function enterApp(nickname) {
  $("onboard").hidden = true;
  $("workspace").hidden = false;
  text("brandNick", nickname || "晏銘湛箴");
  show("report");
}

async function boot() {
  state.today = new Date().toISOString().slice(0, 10);
  const session = await api("/api/session");
  state.csrf = session.csrf;
  const profile = await api("/api/onboarding");
  if (!profile.onboarding_done) {
    if (profile.nickname && profile.nickname !== "用戶") $("nickInput").value = profile.nickname;
    showOnboard(Number(profile.step) || 1);
    return;
  }
  text("brandNick", profile.nickname || "晏銘湛箴");
  const root = await api("/api/root");
  if (root.root) {
    $("rootPath").value = root.root;
    ["mdBody", "mdPath", "mdSave"].forEach((id) => { $(id).disabled = false; });
    text("mdHint", "可以寫新的筆記。不會蓋掉舊檔。");
  }
  await loadReport();
  text("semantic", "尚未查詢。");
  await loadGroups();
  const last = await api("/api/ocr/last");
  if (last && last.text) show("ocr");
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
  await loadGroups();
  text("draftState", "樣本已載入。按查詢才會出結果。");
});
$("browseRoot").addEventListener("click", () => browse($("rootPath").value, "browser").catch((err) => text("draftState", err.message)));
$("useRoot").addEventListener("click", async () => {
  try {
    await api("/api/root", { method: "POST", body: { path: $("rootPath").value } });
    ["mdBody", "mdPath", "mdSave"].forEach((id) => { $(id).disabled = false; });
    text("mdHint", "可以寫新的筆記。不會蓋掉舊檔。");
  } catch (err) { text("mdHint", err.message); }
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
    const data = await api("/api/md", { method: "POST", body: { path: $("mdPath").value, body: $("mdBody").value, dry_run: false } });
    text("mdHint", `已寫入 ${data.wrote}`);
  } catch (err) { text("mdHint", err.message); }
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
  const data = await api("/api/threads", { method: "POST", body: { title: $("threadTitle").value || "新對話" } });
  state.thread = data.id;
  showTalk(`已開「${data.title || "新對話"}」。`);
  await loadThreads();
});
$("sendUtterance").addEventListener("click", async () => {
  const data = await api("/api/threads/message", { method: "POST", body: { thread: state.thread, role: "user", content: $("utterance").value } });
  showTalk(`已留下。編號 ${data.id}。`);
});
$("findBtn").addEventListener("click", async () => {
  try { showHits(await api("/api/search", { method: "POST", body: { q: $("findText").value } })); }
  catch (err) { showTalk(err.message); }
});
$("checkPoint").addEventListener("click", async () => {
  try {
    const data = await api("/api/threads/checkpoint", { method: "POST", body: { thread: state.thread } });
    showTalk(`已留下檢查點 ${data.id}。`);
  } catch (err) { showTalk(err.message); }
});
$("exportThread").addEventListener("click", async () => {
  try {
    const data = await api("/api/threads/export", { method: "POST", body: { thread: state.thread } });
    const count = (data.messages || []).length;
    showTalk(`已匯出 ${count} 則。內容留在這台電腦。`);
  } catch (err) { showTalk(err.message); }
});
$("archiveThread").addEventListener("click", async () => {
  try {
    await api("/api/threads/archive", { method: "POST", body: { thread: state.thread, archived: true } });
    showTalk("已封存。");
    await loadThreads();
  } catch (err) { showTalk(err.message); }
});
$("keepRecent").addEventListener("click", async () => {
  try {
    const data = await api("/api/threads/retention", { method: "POST", body: { days: 30 } });
    showTalk(`已清掉 ${data.deleted_messages} 則更早的內容。`);
  } catch (err) { showTalk(err.message); }
});
$("importThread").addEventListener("click", async () => {
  try {
    const body = JSON.parse($("importJson").value || "{}");
    const data = await api("/api/threads/import", { method: "POST", body });
    state.thread = data.id;
    showTalk("已匯入。可以搜尋這段。");
    await loadThreads();
  } catch (err) { showTalk(err.message); }
});
$("modelSend").addEventListener("click", async () => {
  try {
    if (!state.thread) {
      const created = await api("/api/threads", { method: "POST", body: { title: $("threadTitle").value || "模型對話" } });
      state.thread = created.id;
    }
    const data = await api("/api/provider", { method: "POST", body: {
      opt_in: $("modelOpt").checked,
      protocol: $("modelProtocol").value,
      base_url: $("modelBase").value,
      model: $("modelName").value,
      prompt: $("utterance").value || "你好",
      thread: state.thread,
      include_document: $("modelDoc").checked,
      content_consent: $("modelDoc").checked,
      probe: $("modelProtocol").value === "codex" || $("modelProtocol").value === "claude",
    } });
    showTalk(data.note || (data.called ? "已送出，回覆留在這段對話。" : "沒有送出。"));
  } catch (err) { showTalk(err.message); }
});

$("planMove").addEventListener("click", async () => {
  try {
    const data = await api("/api/organize/plan", { method: "POST", body: { from: $("moveFrom").value, to: $("moveTo").value } });
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

$("browseDocs").addEventListener("click", () => browse($("rootPath").value || "/tmp", "docBrowser").catch((err) => text("ocrResult", err.message)));
$("readDoc").addEventListener("click", async () => {
  try {
    const file = $("docFile").files && $("docFile").files[0];
    if (!file) {
      text("ocrResult", "先選一份 PDF 或圖片。");
      return;
    }
    text("ocrResult", "正在讀取。");
    const pdf_base64 = await fileToBase64(file);
    showDoc(await api("/api/ocr/ingest", { method: "POST", body: { name: file.name, pdf_base64 } }));
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
    const line = (data.summary || data.decision || data.status || "已記下這條證據。");
    text("decideOut", typeof line === "string" ? line : "已記下這條證據。");
  } catch (err) { text("decideOut", err.message); }
});
$("runGate").addEventListener("click", async () => {
  try {
    const data = await api("/api/v020/gate", { method: "POST", body: {} });
    text("gateOut", data.note || "每日檢查跑完了。");
  } catch (err) { text("gateOut", err.message); }
});

async function pay(path, body) {
  const data = await api(path, { method: "POST", body });
  const status = data.order_status || data.status || "";
  text("payOut", status ? `沙箱狀態：${status}` : "已記下。這不是正式扣款。");
  return data;
}
$("newOrder").addEventListener("click", async () => {
  const data = await pay("/api/pay/orders", { sku: "connector-automation-sandbox" });
  state.order = data.id;
  state.eventId = "";
});
$("pageReturn").addEventListener("click", () => pay("/api/pay/page-return", { id: state.order, claimed: "paid" }));
$("settleOrder").addEventListener("click", async () => {
  const data = await pay("/api/pay/settle", { id: state.order });
  state.eventId = data.event_id || "";
});
$("repeatNotify").addEventListener("click", () => pay("/api/pay/notify", { id: state.order, event_id: state.eventId, status: "paid" }));
$("queryOrder").addEventListener("click", () => pay("/api/pay/query", { id: state.order }));
$("failDeliver").addEventListener("click", () => pay("/api/pay/deliver", { id: state.order, fail_next: true }));
$("deliverOrder").addEventListener("click", () => pay("/api/pay/deliver", { id: state.order, fail_next: false }));
$("refundOrder").addEventListener("click", () => pay("/api/pay/refund", { id: state.order, amount_cents: 40 }));
$("failPay").addEventListener("click", () => pay("/api/pay/notify", { id: state.order, event_id: `fail-${Date.now()}`, status: "failed" }));

async function readPicked(path) {
  const data = await api("/api/ocr/path", { method: "POST", body: { path } });
  show("ocr");
  showDoc(data);
}

async function browse(path, boxId) {
  const data = await api("/api/browse", { method: "POST", body: { path } });
  const box = $(boxId);
  box.hidden = false;
  box.replaceChildren();
  const here = document.createElement("p");
  here.textContent = data.path;
  box.appendChild(here);
  if (boxId === "browser") {
    const use = document.createElement("button");
    use.type = "button";
    use.textContent = "用這個資料夾";
    use.addEventListener("click", () => { $("rootPath").value = data.path; });
    box.appendChild(use);
  }
  (data.directories || []).forEach((dir) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = dir.name;
    button.addEventListener("click", () => browse(dir.path, boxId).catch((err) => text(boxId === "browser" ? "draftState" : "ocrResult", err.message)));
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

document.addEventListener("keydown", (event) => {
  if (event.target.matches("input, textarea, select")) return;
  if (event.key === "1") show("files");
  if (event.key === "2") show("links");
  if (event.key === "3") show("device");
  if (event.key === "/") { event.preventDefault(); $("runQuery").focus(); }
});

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
$("onboardBrowse").addEventListener("click", () => browse($("onboardPath").value || "", "onboardBrowser").catch((err) => text("folderError", err.message)));
$("folderBack").addEventListener("click", () => showOnboard(1));
$("folderSkip").addEventListener("click", async () => {
  await api("/api/onboarding", { method: "POST", body: { step: 3 } });
  showOnboard(3);
});
$("folderNext").addEventListener("click", async () => {
  try {
    const path = $("onboardPath").value.trim();
    if (!path) {
      text("folderError", "先選一個資料夾，或按先跳過。");
      return;
    }
    await api("/api/root", { method: "POST", body: { path } });
    $("rootPath").value = path;
    ["mdBody", "mdPath", "mdSave"].forEach((id) => { $(id).disabled = false; });
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
    const status = runtimeWords(data.status || data.state || "");
    text("onboardOcr", `${status}。可以按下一步離開，或先跳過。`);
    $("ocrNext").textContent = "下一步";
    $("ocrNext").dataset.started = "1";
  } catch (err) {
    text("onboardOcr", err.message);
  }
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
  enterApp(data.nickname);
  await loadReport();
});

boot().catch((err) => { text("draftState", err.message); });
