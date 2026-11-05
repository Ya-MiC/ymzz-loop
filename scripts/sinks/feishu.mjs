// Sink: Feishu / Lark Bitable — upsert yesterday's review row; optional holdings table + docx snapshot.
// Off unless FEISHU_APP_ID + FEISHU_APP_SECRET (+ bitable tokens) are set. No secrets in the repo.
// Docs: docs/feishu.md · Official Open API: open.feishu.cn / open.larksuite.com
const BASE = () => (process.env.FEISHU_BASE_URL || "https://open.feishu.cn").replace(/\/$/, "");

async function api(path, { method = "GET", token, body } = {}) {
  const r = await fetch(`${BASE()}${path}`, {
    method,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || (j.code != null && j.code !== 0)) {
    const msg = j.msg || j.error || r.statusText || "feishu api error";
    throw new Error(`[feishu] ${method} ${path} → ${j.code ?? r.status}: ${msg}`);
  }
  return j;
}

/** Classic internal tenant token (custom apps). Cached for this process. */
let cached;
export async function tenantToken(env = process.env) {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const app_id = env.FEISHU_APP_ID, app_secret = env.FEISHU_APP_SECRET;
  if (!app_id || !app_secret) throw new Error("[feishu] FEISHU_APP_ID / FEISHU_APP_SECRET required");
  const j = await api("/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    body: { app_id, app_secret },
  });
  const token = j.tenant_access_token || j.access_token;
  if (!token) throw new Error("[feishu] no tenant_access_token in response");
  cached = { token, exp: Date.now() + (j.expire || 7200) * 1000 };
  return token;
}

export function feishuEnabled(env = process.env) {
  return !!(env.FEISHU_APP_ID && env.FEISHU_APP_SECRET && env.FEISHU_BITABLE_APP_TOKEN && env.FEISHU_BITABLE_TABLE_ID);
}

/** Map SyncContext review row → Bitable fields object (all text / url). */
export function reviewFields(ctx) {
  if (!ctx.reviewRow) return null;
  const fields = {};
  const cols = [...ctx.reviewCols, "Notion"];
  cols.forEach((name, i) => {
    const v = ctx.reviewRow[i] ?? "";
    if (name === "Notion" && /^https?:\/\//.test(v)) fields[name] = { link: v, text: "Notion" };
    else fields[name] = String(v);
  });
  return fields;
}

export function holdingsRows(ctx) {
  return ctx.holdings.map(row => {
    const fields = {};
    ctx.holdingCols.forEach((name, i) => { fields[name] = String(row[i] ?? ""); });
    fields["同步 Sync"] = ctx.time.human;
    return { fields };
  });
}

async function findByDate(token, app, table, date, dateField) {
  const j = await api(`/open-apis/bitable/v1/apps/${app}/tables/${table}/records/search`, {
    method: "POST",
    token,
    body: {
      filter: {
        conjunction: "and",
        conditions: [{ field_name: dateField, operator: "is", value: [date] }],
      },
      page_size: 10,
    },
  });
  const items = j.data?.items || j.data?.records || [];
  return items[0] || null;
}

async function upsertReview(token, env, ctx) {
  const app = env.FEISHU_BITABLE_APP_TOKEN, table = env.FEISHU_BITABLE_TABLE_ID;
  const dateField = env.FEISHU_DATE_FIELD || "日期 Date";
  const fields = reviewFields(ctx);
  if (!fields) { console.log("[feishu] no review row yesterday, skip review upsert"); return; }
  let existing = null;
  try { existing = await findByDate(token, app, table, ctx.date, dateField); }
  catch (e) { console.warn("[feishu] search failed, will try create:", e.message); }
  if (existing?.record_id || existing?.id) {
    const id = existing.record_id || existing.id;
    await api(`/open-apis/bitable/v1/apps/${app}/tables/${table}/records/${id}`, {
      method: "PUT", token, body: { fields },
    });
    console.log("[feishu] review updated", id);
  } else {
    const j = await api(`/open-apis/bitable/v1/apps/${app}/tables/${table}/records`, {
      method: "POST", token, body: { fields },
    });
    console.log("[feishu] review created", j.data?.record?.record_id || j.data?.record?.id || "ok");
  }
}

async function writeHoldings(token, env, ctx) {
  const app = env.FEISHU_BITABLE_APP_TOKEN, table = env.FEISHU_HOLDINGS_TABLE_ID;
  if (!table) { console.log("[feishu] FEISHU_HOLDINGS_TABLE_ID unset, skip holdings"); return; }
  // list + delete existing (best-effort), then batch create
  const listed = await api(`/open-apis/bitable/v1/apps/${app}/tables/${table}/records?page_size=500`, { token });
  const ids = (listed.data?.items || []).map(r => r.record_id || r.id).filter(Boolean);
  for (const id of ids) {
    await api(`/open-apis/bitable/v1/apps/${app}/tables/${table}/records/${id}`, { method: "DELETE", token });
  }
  const rows = holdingsRows(ctx);
  if (!rows.length) return;
  // Feishu batch create: POST .../records/batch_create
  await api(`/open-apis/bitable/v1/apps/${app}/tables/${table}/records/batch_create`, {
    method: "POST", token, body: { records: rows },
  });
  console.log("[feishu] holdings snapshot", rows.length);
}

/** Optional: create a Feishu docx titled with the date and paste body as one text block. */
async function writeDoc(token, env, ctx) {
  if (env.FEISHU_WRITE_DOC !== "1" && env.FEISHU_WRITE_DOC !== "true") return;
  const folder = env.FEISHU_FOLDER_TOKEN || "";
  const title = `${ctx.date} 每日復盤 Daily Review`;
  const created = await api("/open-apis/docx/v1/documents", {
    method: "POST", token, body: { title, ...(folder ? { folder_token: folder } : {}) },
  });
  const docId = created.data?.document?.document_id;
  if (!docId) { console.warn("[feishu] doc created but no document_id"); return; }
  // Append a text block under the document root (block_id === document_id for docx)
  const text = [
    ctx.time.human,
    "",
    ctx.reviewRow ? ctx.reviewCols.map((c, i) => `${c}: ${ctx.reviewRow[i] ?? ""}`).join("\n") : "(no review)",
    "",
    ctx.bodyMarkdown || "",
  ].join("\n").slice(0, 100_000);
  try {
    await api(`/open-apis/docx/v1/documents/${docId}/blocks/${docId}/children`, {
      method: "POST",
      token,
      body: {
        children: [{
          block_type: 2, // text
          text: { elements: [{ text_run: { content: text } }] },
        }],
      },
    });
  } catch (e) {
    console.warn("[feishu] doc body append failed (title-only doc kept):", e.message);
  }
  console.log("[feishu] doc", docId);
}

export default {
  name: "feishu",
  enabled: feishuEnabled,
  async write(ctx) {
    const env = process.env;
    const token = await tenantToken(env);
    await upsertReview(token, env, ctx);
    await writeHoldings(token, env, ctx);
    await writeDoc(token, env, ctx);
  },
};
