// 時區與時間 helpers / time zone helpers
// 優先順序 priority: env YMZZ_TZ / YMZZ_REMIND_TIME (GitHub repo Variables) → sync.config.json → 預設 default Etc/UTC 07:00
import fs from "node:fs";
const file = (() => { try { return JSON.parse(fs.readFileSync("sync.config.json", "utf8")); } catch { return {}; } })();
export const TZ = process.env.YMZZ_TZ || file.timezone || "Etc/UTC";
export const REMIND_TIME = process.env.YMZZ_REMIND_TIME || file.remind_time || "07:00";
try { new Intl.DateTimeFormat("en", { timeZone: TZ }); } catch { console.error(`無效時區 invalid time zone: ${TZ}`); process.exit(1); }
const parts = (d = new Date()) => Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZoneName: "longOffset" }).formatToParts(d).map(p => [p.type, p.value]));
/** 時區代稱 slug: Asia/Seoul → seoul, America/New_York → new_york */
export const slug = TZ.split("/").pop().toLowerCase().replace(/[^a-z0-9]+/g, "_");
export const offset = (d) => { const o = parts(d).timeZoneName.replace("GMT", "UTC").replace(/([+-])0?(\d+):00$/, "$1$2"); return o === "UTC" ? "UTC+0" : o; };
const LABEL = { "Etc/UTC": "UTC", UTC: "UTC", "Asia/Seoul": "首爾時間", "Asia/Taipei": "台北時間", "Asia/Shanghai": "北京時間", "Asia/Hong_Kong": "香港時間", "Asia/Tokyo": "東京時間" };
export const zoneLabel = (d) => `${LABEL[TZ] || TZ} (${offset(d)})`;
export const isoDate = (d = new Date()) => { const p = parts(d); return `${p.year}-${p.month}-${p.day}`; };      // YYYY-MM-DD local
export const hhmm = (d = new Date()) => { const p = parts(d); return `${p.hour}:${p.minute}`; };
export const yesterday = () => { const t = new Date(isoDate() + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() - 1); return t.toISOString().slice(0, 10); };
export const stamp = (d = new Date()) => { const p = parts(d); return `${p.month}${p.day}_${p.hour}${p.minute}_${slug}`; }; // MMDD_HHMM_<tz>
export const year = (d = new Date()) => parts(d).year;
export const human = (d = new Date()) => `${isoDate(d)} ${hhmm(d)} ${zoneLabel(d)}`;
