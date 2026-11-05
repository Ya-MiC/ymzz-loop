// 寄提醒信（含今日 Notion 連結）/ email reminder with today's Notion link
import fs from "node:fs";
import { emailEnabled, sendMail } from "./sinks/email.mjs";
import { REMIND_TIME, zoneLabel } from "./time.mjs";
const { date, url } = JSON.parse(fs.readFileSync("/tmp/today.json", "utf8"));
if (!emailEnabled(process.env)) { console.log("未設 SMTP，略過寄信 / SMTP not set, skip"); process.exit(0); }
const when = `${zoneLabel()} ${REMIND_TIME}`;
await sendMail({ subject: `📓 ${date} 每日復盤 Daily Review`,
  text: `今天的復盤頁已建好，10 分鐘寫完 / Today's review page is ready:\n${url}\n\n${when} 自動寄出 / sent automatically`,
  html: `<div style="font-family:system-ui;background:#F8F6EF;padding:24px;border-radius:16px;color:#221F14"><p>今天的復盤頁已建好，10 分鐘寫完 / Today's review page is ready.</p><p><a style="background:#CDBFE0;color:#221F14;padding:10px 16px;border-radius:999px;text-decoration:none" href="${url}">👉 打開 ${date} 復盤 Open review</a></p><p style="color:#6b6455">${when} 自動寄出 · ymzz-loop</p></div>` });
console.log("mail sent");
