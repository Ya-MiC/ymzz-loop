// 首爾時間 (UTC+9) helpers — all dates/filenames use Seoul time.
const pad = n => String(n).padStart(2, "0");
export const seoul = (d = new Date()) => new Date(d.getTime() + 9 * 3600e3); // read with getUTC*
export const isoDate = (d = new Date()) => seoul(d).toISOString().slice(0, 10);          // YYYY-MM-DD
export const yesterday = () => isoDate(new Date(Date.now() - 86400e3));
export const stamp = (d = new Date()) => { const s = seoul(d); return `${pad(s.getUTCMonth() + 1)}${pad(s.getUTCDate())}_${pad(s.getUTCHours())}${pad(s.getUTCMinutes())}_seoul`; }; // MMDD_HHMM_seoul
export const year = (d = new Date()) => String(seoul(d).getUTCFullYear());
export const human = (d = new Date()) => seoul(d).toISOString().slice(0, 16).replace("T", " ") + " 首爾時間 (UTC+9)";
