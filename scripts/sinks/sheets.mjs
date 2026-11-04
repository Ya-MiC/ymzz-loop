// Sink: Google Sheets — tabs 每日復盤 (one row per date, upsert) + 持倉 (full snapshot)
import { google } from "googleapis";
export default {
  name: "sheets",
  enabled: e => !!(e.GOOGLE_SERVICE_ACCOUNT_JSON && e.SHEET_ID),
  async write(ctx) {
    const auth = new google.auth.GoogleAuth({ credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON), scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
    const sheets = google.sheets({ version: "v4", auth }), id = process.env.SHEET_ID, V = sheets.spreadsheets.values;
    const meta = await sheets.spreadsheets.get({ spreadsheetId: id });
    const have = new Set(meta.data.sheets.map(s => s.properties.title));
    const need = ["每日復盤", "持倉"].filter(t => !have.has(t));
    if (need.length) await sheets.spreadsheets.batchUpdate({ spreadsheetId: id, requestBody: { requests: need.map(title => ({ addSheet: { properties: { title } } })) } });
    await V.update({ spreadsheetId: id, range: "每日復盤!A1", valueInputOption: "RAW", requestBody: { values: [[...ctx.reviewCols, "Notion"]] } });
    if (ctx.reviewRow) {
      const colL = String.fromCharCode(65 + ctx.reviewCols.indexOf("日期 Date"));
      const col = (await V.get({ spreadsheetId: id, range: `每日復盤!${colL}:${colL}` })).data.values || [];
      const at = col.findIndex(r => r[0] === ctx.date);
      if (at > 0) await V.update({ spreadsheetId: id, range: `每日復盤!A${at + 1}`, valueInputOption: "RAW", requestBody: { values: [ctx.reviewRow] } });
      else await V.append({ spreadsheetId: id, range: "每日復盤!A1", valueInputOption: "RAW", insertDataOption: "INSERT_ROWS", requestBody: { values: [ctx.reviewRow] } });
    }
    await V.clear({ spreadsheetId: id, range: "持倉" });
    await V.update({ spreadsheetId: id, range: "持倉!A1", valueInputOption: "RAW", requestBody: { values: [[...ctx.holdingCols, `同步 ${ctx.time.human}`], ...ctx.holdings] } });
  },
};
