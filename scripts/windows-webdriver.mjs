// Launch the debug window through tauri-driver and read the nickname screen.
// tauri-driver must already be listening on 127.0.0.1:4444.
const application = process.argv[2];
if (!application) {
  console.error("pass the ymzz-bingce executable");
  process.exit(1);
}

const created = await fetch("http://127.0.0.1:4444/session", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    capabilities: {
      alwaysMatch: {
        browserName: "wry",
        "tauri:options": { application },
      },
    },
  }),
  signal: AbortSignal.timeout(90000),
});
const body = await created.json().catch(() => ({}));
if (!created.ok) {
  console.error(JSON.stringify(body));
  process.exit(1);
}
const id = body.value && body.value.sessionId;
if (!id) {
  console.error(JSON.stringify(body));
  process.exit(1);
}

let source = "";
try {
  const page = await fetch(`http://127.0.0.1:4444/session/${id}/source`, {
    signal: AbortSignal.timeout(30000),
  });
  const payload = await page.json();
  source = (payload.value || "").toString();
} finally {
  await fetch(`http://127.0.0.1:4444/session/${id}`, { method: "DELETE" }).catch(() => {});
}
if (!source.includes("怎麼稱呼你") && !source.includes("稟冊")) {
  console.error(source.slice(0, 800));
  process.exit(1);
}
console.log("YMZZ_SMOKE windows webdriver nickname");
