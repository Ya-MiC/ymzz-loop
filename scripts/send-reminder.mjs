// 寄提醒信（含今日 Notion 連結）/ email reminder with today's Notion link
import fs from "node:fs"; import nodemailer from "nodemailer";
const { date, url } = JSON.parse(fs.readFileSync("/tmp/today.json", "utf8"));
const e = process.env;
if (!e.SMTP_USER || !e.SMTP_PASS || !e.MAIL_TO) { console.log("未設 SMTP，略過寄信 / SMTP not set, skip"); process.exit(0); }
await nodemailer.createTransport({ host: e.SMTP_HOST || "smtp.gmail.com", port: +(e.SMTP_PORT || 465), secure: true, auth: { user: e.SMTP_USER, pass: e.SMTP_PASS } })
  .sendMail({ from: e.SMTP_USER, to: e.MAIL_TO, subject: `📓 ${date} 每日復盤 Daily Review`,
    text: `今天的復盤頁已建好，10 分鐘寫完 / Today's review page is ready:\n${url}\n\n首爾時間 (UTC+9) 07:00 自動寄出 / sent automatically`,
    html: `<p>今天的復盤頁已建好，10 分鐘寫完 / Today's review page is ready.</p><p><a href="${url}">👉 打開 ${date} 復盤 Open review</a></p><p style="color:#888">首爾時間 (UTC+9) 07:00 自動寄出</p>` });
console.log("mail sent");
