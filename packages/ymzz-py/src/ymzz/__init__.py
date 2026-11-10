"""Local steward helpers. No network and no package installs."""

from __future__ import annotations


def digits_only(value: str) -> str:
    return "".join(ch for ch in str(value or "") if ch.isdigit())


def suggested_nickname(phone: str) -> str:
    digits = digits_only(phone)
    if len(digits) < 4:
        return "用戶"
    return f"用戶{digits[-4:]}"


def validate_phone(phone: str) -> dict:
    raw = str(phone or "").strip()
    if not raw:
        return {"ok": True, "skipped": True, "phone": ""}
    if any(ch.isalpha() and ch.isascii() for ch in raw):
        return {"ok": False, "error": "電話只留數字，或先跳過"}
    digits = digits_only(raw)
    if not 8 <= len(digits) <= 15:
        return {"ok": False, "error": "電話要有 8 到 15 個數字，或先跳過"}
    stored = f"+{digits}" if raw.startswith("+") else digits
    return {"ok": True, "skipped": False, "phone": stored}


def archive_name_rejected(name: str) -> bool:
    """True when a tar member must not be extracted. Mirrors the OCR archive guard."""
    text = str(name or "").strip()
    if not text:
        return False
    if text.startswith("/") or text.startswith("l") or " -> " in text:
        return True
    parts = text.split("/")
    return any(part == ".." for part in parts) or "\x00" in text
