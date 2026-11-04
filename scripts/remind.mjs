// 寄提醒信（SMTP，例如 Gmail 應用程式密碼）/ email reminder via SMTP (e.g. Gmail app password)
import fs from "node:fs"; import nodemailer from "nodemailer";
const { SMTP_HOST = "smtp.gmail.com", SMTP_PORT = "465", SMTP_USER, SMTP_PASS, MAIL_TO } = process.env;
if (!SMTP_USER || !SMTP_PASS || !MAIL_TO) { console.log("skip email: SMTP secrets not set"); process.exit(0); }
const { today, url } = fs.existsSync("/tmp/today.json") ? JSON.parse(fs.readFileSync("/tmp/today.json", "utf8")) : {};
const tx = nodemailer.createTransport({ host: SMTP_HOST, port: +SMTP_PORT, secure: +SMTP_PORT === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
await tx.sendMail({ from: SMTP_USER, to: MAIL_TO, subject: `📝 ${today} 每日復盤提醒 Daily review`,
  text: `今天的復盤頁已建好，打開直接填：\nToday's review page is ready:\n${url}\n\n持倉有變動也請更新「持倉 Holdings」。Update Holdings if positions changed.` });
console.log("email sent");
