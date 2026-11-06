// Notifier: SMTP email (Gmail app password by default)
import nodemailer from "nodemailer";
export const emailEnabled = e => !!(e.SMTP_USER && e.SMTP_PASS && e.MAIL_TO);
export async function sendMail({ subject, text, html }) {
  const e = process.env;
  await nodemailer.createTransport({ host: e.SMTP_HOST || "smtp.gmail.com", port: +(e.SMTP_PORT || 465), secure: +(e.SMTP_PORT || 465) === 465, auth: { user: e.SMTP_USER, pass: e.SMTP_PASS } })
    .sendMail({ from: e.SMTP_USER, to: e.MAIL_TO, subject, text, html });
}
