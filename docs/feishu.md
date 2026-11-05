# 飛書 / Lark 目的地 · Feishu / Lark sink

把昨天的復盤（與可選持倉）寫進飛書**多維表格 Bitable**；也可選再建一份 Docx。  
Secrets 由你自己在 GitHub 設定；**未設定時自動略過**，不影響 Notion / Sheets / Markdown。  
600 天壽命上限仍由 `scripts/gate.mjs` 執行，與此 sink 無關。

Official API: [Feishu Open Platform](https://open.feishu.cn/) · [Lark (intl)](https://open.larksuite.com/)

## 你需要什麼

| Secret / Variable | 必填？ | 說明 |
|---|---|---|
| `FEISHU_APP_ID` | ✅ | 企業自建應用 App ID（`cli_…`） |
| `FEISHU_APP_SECRET` | ✅ | App Secret（只放 GitHub Secrets，絕不進倉庫） |
| `FEISHU_BITABLE_APP_TOKEN` | ✅ | 目標多維表格的 `app_token` |
| `FEISHU_BITABLE_TABLE_ID` | ✅ | 「每日復盤」資料表 `table_id` |
| `FEISHU_HOLDINGS_TABLE_ID` | 可選 | 「持倉」資料表；省略則不同步持倉 |
| `FEISHU_FOLDER_TOKEN` | 可選 | 寫 Docx 時的資料夾；`FEISHU_WRITE_DOC=1` 時用 |
| `FEISHU_WRITE_DOC` (Variable) | 可選 | 設 `1` 時額外建 Docx 快照 |
| `FEISHU_BASE_URL` (Variable) | 可選 | 預設 `https://open.feishu.cn`；國際版用 `https://open.larksuite.com` |
| `FEISHU_DATE_FIELD` (Variable) | 可選 | 日期欄名，預設 `日期 Date` |

`sync.config.json` 的 `"sinks"` 已含 `"feishu"`；缺密鑰時 `[sink] feishu: 未設定，略過`。

## 設定步驟（約 10 分鐘）

### 1. 建立自建應用
1. 打開 [飛書開放平台 · 開發者後台](https://open.feishu.cn/app)（Lark: [open.larksuite.com](https://open.larksuite.com/app)）。
2. **創建企業自建應用** → 取名 `ymzz-loop`。
3. **憑證與基礎資訊** → 複製 **App ID**、**App Secret**。
4. **權限管理** 開啟（至少）：
   - `bitable:app`（查看、評論、編輯和管理多維表格）或更細的 `base:record:create` / `base:record:update` / `base:record:read` / `base:record:delete`
   - 若要寫 Docx：`docx:document` / `docx:document:create` / `docx:document:write`
5. **版本管理與發布** → 創建版本 → 申請發布（企業管理員審核）。
6. 在多維表格頁：**… → 更多 → 添加文檔應用 / 添加應用** → 選 `ymzz-loop`，並給予可編輯權限。

### 2. 準備多維表格
1. 新建一個 Base（多維表格）。
2. 資料表一改名為「每日復盤」，欄位名與 Notion 復盤屬性對齊（建議直接用 schema 裡的中英欄名，例如 `日期 Date`、`評分 Score`、`心情 Mood`…），最後一欄可叫 `Notion`（超連結類型，或文字亦可）。
3. （可選）再建「持倉」表，欄位對齊持倉屬性，並加文字欄 `同步 Sync`。
4. 從瀏覽器網址取得：
   - `app_token`：`…/base/<app_token>…`
   - `table_id`：打開表後 URL 或「… → 複製連結」中的 `tbl…`

### 3. 寫入 GitHub Secrets
Repo → **Settings → Secrets and variables → Actions**：

```
FEISHU_APP_ID=cli_xxxxxxxx
FEISHU_APP_SECRET=xxxxxxxx
FEISHU_BITABLE_APP_TOKEN=bascnxxxxxxxx
FEISHU_BITABLE_TABLE_ID=tblxxxxxxxx
# optional:
FEISHU_HOLDINGS_TABLE_ID=tblxxxxxxxx
FEISHU_FOLDER_TOKEN=fldxxxxxxxx
```

Variables（可選）：`FEISHU_WRITE_DOC=1`、`FEISHU_BASE_URL=https://open.larksuite.com`。

### 4. 試跑
Actions → **ymzz-loop · daily-review** → **Run workflow**。  
日誌應出現 `[sink] feishu: ✓`。若看到 `未設定，略過`，檢查四個必填 Secret 是否齊。

## 行為說明
- **復盤**：依 `日期 Date`（或 `FEISHU_DATE_FIELD`）搜尋；有則更新、無則新建。
- **持倉**：若設了 `FEISHU_HOLDINGS_TABLE_ID`，先刪光再寫入當日快照（與 Sheets sink 相同策略）。
- **Docx**：僅在 `FEISHU_WRITE_DOC=1` 時；標題為 `{date} 每日復盤 Daily Review`，內文為欄位摘要 + markdown（API 失敗時至少保留空文件）。
- **國際版 Lark**：設 `FEISHU_BASE_URL=https://open.larksuite.com`，其餘相同。

## 安全
- App Secret 只放 GitHub Secrets / 本機環境變數。
- 不要把 token 寫進 `sync.config.json` 或網站 `config.js`。
- 倉庫 MIT 開源；你的飛書租戶資料始終在你自己的飛書裡。

## 參考
- [获取 tenant_access_token（自建应用）](https://open.feishu.cn/document/server-docs/authentication-management/access-token/tenant_access_token_internal)
- [新增记录](https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-record/create)
- [更新记录](https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-record/update)
- [创建文档 docx](https://open.feishu.cn/document/server-docs/docs/docs/docx-v1/document/create)
