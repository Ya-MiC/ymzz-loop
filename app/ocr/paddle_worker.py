#!/usr/bin/env python3
"""PaddleOCR 2.7 entrypoint. Does not pip install and does not choose model URLs."""
import json
import sys
from pathlib import Path


def emit(payload, code):
    json.dump(payload, sys.stdout)
    sys.stdout.write("\n")
    raise SystemExit(code)


def status():
    try:
        import paddleocr  # noqa: F401
    except Exception as exc:
        emit({
            "ok": False,
            "bundled": False,
            "status": "runtime_not_bundled",
            "inference": "not_run",
            "model_loaded": False,
            "error": type(exc).__name__,
        }, 3)
    emit({
        "ok": True,
        "bundled": False,
        "status": "runtime_ready",
        "inference": "not_run",
        "model_loaded": False,
        "entrypoint": "paddleocr.PaddleOCR",
        "version": "2.7.3",
    }, 0)


def recognize(image, det, rec, cls_dir, dictionary):
    for label, path in (("image", image), ("det", det), ("rec", rec), ("cls", cls_dir), ("dict", dictionary)):
        p = Path(path)
        if p.is_symlink():
            emit({"ok": False, "status": "symlink_rejected", "which": label}, 2)
        if not p.exists():
            emit({"ok": False, "status": "missing_model", "which": label, "inference": "not_run"}, 2)
    try:
        from paddleocr import PaddleOCR
    except Exception as exc:
        emit({
            "ok": False,
            "bundled": False,
            "status": "runtime_not_bundled",
            "inference": "not_run",
            "error": type(exc).__name__,
        }, 3)
    engine = PaddleOCR(
        use_angle_cls=False,
        lang="en",
        use_gpu=False,
        show_log=False,
        det_model_dir=det,
        rec_model_dir=rec,
        cls_model_dir=cls_dir,
        rec_char_dict_path=dictionary,
    )
    rows = engine.ocr(image, cls=False) or []
    texts = []
    best = 0.0
    for block in rows:
        for item in block or []:
            if len(item) >= 2 and isinstance(item[1], (list, tuple)):
                texts.append(str(item[1][0]))
                try:
                    best = max(best, float(item[1][1]))
                except (TypeError, ValueError):
                    pass
    emit({
        "ok": True,
        "status": "recognized",
        "text": " ".join(texts),
        "confidence": best,
        "untrusted": True,
        "inference": "cpu",
        "entrypoint": "paddleocr.PaddleOCR.ocr",
        "version": "2.7.3",
    }, 0)


def sample(dest, det, rec, cls_dir, dictionary):
    from PIL import Image, ImageDraw, ImageFont
    path = Path(dest)
    if path.is_symlink():
        emit({"ok": False, "status": "symlink_rejected"}, 2)
    image = Image.new("RGB", (520, 140), "white")
    draw = ImageDraw.Draw(image)
    font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    font = ImageFont.truetype(font_path, 72) if Path(font_path).is_file() else ImageFont.load_default()
    draw.text((16, 24), "HELLO", fill="black", font=font)
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path)
    recognize(str(path), det, rec, cls_dir, dictionary)


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    if cmd == "status":
        status()
    if cmd in ("recognize", "sample") and len(sys.argv) == 7:
        image, det, rec, cls_dir, dictionary = sys.argv[2:]
        if cmd == "sample":
            sample(image, det, rec, cls_dir, dictionary)
        recognize(image, det, rec, cls_dir, dictionary)
    emit({"ok": False, "status": "bad_args", "inference": "not_run"}, 2)


if __name__ == "__main__":
    main()
