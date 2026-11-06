// 資料庫欄位 + 每日頁面骨架（單一來源）/ Database schemas + daily page body (single source of truth)
// Frameworks: KPT (Keep/Problem/Try), 曾國藩「日課・三省」, Lyubishchev time log, trading-journal daily review (Steenbarger).
const sel = names => ({ select: { options: names.map(name => ({ name })) } });
const multi = names => ({ multi_select: { options: names.map(name => ({ name })) } });
const text = { rich_text: {} };

export const REVIEW_DB = "每日復盤 Daily Review";
export const reviewProps = {
  "標題 Title": { title: {} },
  "日期 Date": { date: {} },
  "評分 Rating": sel(["5 ⭐⭐⭐⭐⭐", "4 ⭐⭐⭐⭐", "3 ⭐⭐⭐", "2 ⭐⭐", "1 ⭐"]),
  "心情 Mood": sel(["😄", "🙂", "😐", "😟", "😫"]),
  "精力 Energy": { number: {} },
  "Keep 做得好 Wins": text,
  "Problem 問題 Problems": text,
  "Try 教訓/改進 Lessons": text,
  "決策 Decisions": text,
  "明日三件事 Tomorrow Top-3": text,
  "資訊輸入 Info Intake": text,
  "平台 Platforms": multi(["X", "YouTube", "Notion", "微信 WeChat", "Telegram", "Slack", "Gmail", "IBKR", "新聞 News", "Podcast"]),
  "市場/持倉筆記 Market Notes": text,
  "深度工作時數 Deep Work h": { number: {} },
  "完成 Done": { checkbox: {} },
};

export const HOLDINGS_DB = "持倉 Holdings";
export const holdingsProps = {
  "代號 Ticker": { title: {} },
  "平台 Platform": sel(["IBKR", "Futu 富途", "Tiger 老虎", "Binance", "OKX", "銀行 Bank", "其他 Other"]),
  "類別 Asset Class": sel(["股票 Stock", "ETF", "期權 Option", "債券 Bond", "加密 Crypto", "現金 Cash"]),
  "數量 Quantity": { number: {} },
  "成本價 Avg Cost": { number: {} },
  "現價 Price": { number: {} },
  "市值 Value": { number: {} },
  "幣別 Currency": sel(["USD", "KRW", "HKD", "TWD", "CNY", "JPY", "USDT"]),
  "佔比 % Weight": { number: { format: "percent" } },
  "論點 Thesis": text,
  "停損/目標 Stop/Target": text,
  "更新日期 Updated": { date: {} },
  "備註 Note": text,
};

const h2 = t => ({ object: "block", type: "heading_2", heading_2: { rich_text: [{ text: { content: t } }] } });
const todo = t => ({ object: "block", type: "to_do", to_do: { rich_text: [{ text: { content: t } }], checked: false } });
const bullet = t => ({ object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: t } }] } });
const callout = t => ({ object: "block", type: "callout", callout: { icon: { emoji: "🧭" }, rich_text: [{ text: { content: t } }] } });

// 今日頁面內文 / body of each day's page (≈10 分鐘填完 / ~10 min to fill)
export const dailyBody = () => [
  callout("10 分鐘復盤：先填上方欄位（評分/心情/精力），再寫下面。寫不完就寫一行。 / 10-min review: fill properties first, then the sections below. One line is fine."),
  h2("① 回顧目標 Review goals（昨天的明日三件事完成了嗎？）"), todo(""), todo(""), todo(""),
  h2("② Keep 做得好 Wins"), bullet(""),
  h2("③ Problem 問題 / 卡點"), bullet(""),
  h2("④ Try 教訓與改進 Lessons → 明天怎麼做"), bullet(""),
  h2("⑤ 決策 Decisions（做了什麼決定、依據、可否撤回）"), bullet(""),
  h2("⑥ 資訊輸入 Info intake（平台・重點・可行動嗎？）"), bullet(""),
  h2("⑦ 市場與持倉 Market & holdings（大盤、異動、是否按計劃）"), bullet(""),
  h2("⑧ 時間帳 Time log（柳比歇爾：深度工作／雜事／娛樂 各幾小時）"), bullet(""),
  h2("⑨ 三省 Reflect（為人謀而不忠乎？與朋友交而不信乎？傳不習乎？）"), bullet(""),
  h2("⑩ 明日三件事 Tomorrow Top-3"), todo(""), todo(""), todo(""),
];

export const homeGuide = () => [
  callout("晏銘湛箴 每日復盤空間 / Daily review space — 每天 07:00 首爾時間 (UTC+9) 自動建今日頁並寄信提醒；隔天自動同步到 Google Sheet 與 GitHub。"),
  h2("怎麼用 How to use"),
  bullet("1. 收到提醒信 → 點連結 → 打開今天的頁面 / Open today's page from the email."),
  bullet("2. 填上方欄位（評分、心情、精力），再按 ①–⑩ 寫，10 分鐘即可 / Fill properties, then sections ①–⑩."),
  bullet("3. 寫完勾「完成 Done」/ Tick Done when finished."),
  bullet("4. 持倉有變動就改「持倉 Holdings」那一行並更新日期 / Edit Holdings rows when positions change."),
  bullet("5. 週日看本週評分趨勢，挑一個 Try 下週專注 / Sunday: review the week, pick one Try to focus on."),
  h2("方法來源 Frameworks"),
  bullet("KPT（Keep / Problem / Try）・曾國藩日課與三省・柳比歇爾時間統計法・交易日誌每日復盤（Brett Steenbarger）"),
];
