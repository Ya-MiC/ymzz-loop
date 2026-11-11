/** Local steward helpers. No network. */

export function digitsOnly(value) {
  return String(value ?? "").replace(/\D/g, "");
}

/** Default nickname: 用戶 plus the last four phone digits, or 用戶 when there is no phone. */
export function suggestedNickname(phone) {
  const digits = digitsOnly(phone);
  if (digits.length < 4) return "用戶";
  return `用戶${digits.slice(-4)}`;
}

export function validatePhone(phone) {
  const raw = String(phone ?? "").trim();
  if (!raw) return { ok: true, skipped: true, phone: "" };
  if (/[A-Za-z]/.test(raw)) return { ok: false, error: "電話只留數字，或先跳過" };
  const digits = digitsOnly(raw);
  if (digits.length < 8 || digits.length > 15) {
    return { ok: false, error: "電話要有 8 到 15 個數字，或先跳過" };
  }
  return { ok: true, skipped: false, phone: raw.startsWith("+") ? `+${digits}` : digits };
}

/** Inclusive calendar days from the chapter start through today. */
export function chapterDay(started, today) {
  if (!started || !today) return 0;
  const a = Date.parse(`${started}T12:00:00Z`);
  const b = Date.parse(`${today}T12:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.floor((b - a) / 864e5) + 1;
}

export function chapterRemaining(started, today, maxDays = 600) {
  const day = chapterDay(started, today);
  if (!day) return maxDays;
  return Math.max(0, maxDays - day + 1);
}
