// 空白模板 / blank templates — 改這裡就能增減欄位 / edit here to add/remove fields
export const REVIEW = {
  title: "每日復盤 Daily Review",
  properties: {
    "標題 Title": { title: {} },
    "日期 Date": { date: {} },
    "收穫 Wins": { rich_text: {} },
    "問題 Problems": { rich_text: {} },
    "決策 Decisions": { rich_text: {} },
    "明天 Tomorrow": { rich_text: {} },
    "接收資訊 Inputs": { rich_text: {} },
    "平台 Platforms": { multi_select: { options: [] } },
    "心情 Mood": { select: { options: [{ name: "😀" }, { name: "🙂" }, { name: "😐" }, { name: "😟" }, { name: "😫" }] } },
    "精力 Energy (1-5)": { number: {} },
    "已完成 Done": { checkbox: {} },
  },
};
export const HOLDINGS = {
  title: "持倉 Holdings",
  properties: {
    "代號 Ticker": { title: {} },
    "平台 Platform": { select: { options: [] } },
    "數量 Qty": { number: {} },
    "成本 Cost": { number: {} },
    "市值 Value": { number: {} },
    "幣別 Currency": { select: { options: [{ name: "USD" }, { name: "HKD" }, { name: "CNY" }, { name: "KRW" }] } },
    "份額 Share %": { number: { format: "percent" } },
    "更新日 Updated": { date: {} },
    "備註 Note": { rich_text: {} },
  },
};
// 每日頁面內文提示（空白）/ blank prompts inside each daily page
export const REVIEW_BODY = ["今天收到的重要資訊 Key inputs", "做對了什麼 What went well", "問題與原因 Problems & why", "決策 Decisions", "持倉變動 Holdings changes", "明天三件事 Top 3 tomorrow"];
