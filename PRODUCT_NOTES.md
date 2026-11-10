# Product notes

The daily reminder is `scripts/send-reminder.mjs`. It sends only when the environment already has `SMTP_USER`, `SMTP_PASS`, and `MAIL_TO`. Those belong to the owner's mail account. This repository does not operate a hosted inbox.

The Rust app reads the same review config. It does not replace the Node writer and it does not send mail.
