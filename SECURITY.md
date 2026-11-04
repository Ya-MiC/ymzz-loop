# 安全政策 Security Policy

- **請勿**在 Issue 公開金鑰或漏洞。Never post tokens or vulnerabilities in public issues.
- 回報方式 Report: 使用 GitHub [Private vulnerability reporting](https://github.com/Ya-MiC/ymzz-notion/security/advisories/new)。
- 所有金鑰只存在你自己的 GitHub Secrets；本專案不會把任何資料送往第三方伺服器（只連 Notion、Google、你的 SMTP）。
  All credentials live only in your own GitHub Secrets; data goes only to Notion, Google and your SMTP server.
- 若金鑰外洩：立即在 Notion / Google Cloud / Google 帳戶撤銷並重建，再更新 Secrets。If leaked, revoke and rotate immediately.

支援版本 Supported: 最新 `main`。
