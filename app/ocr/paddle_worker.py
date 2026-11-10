#!/usr/bin/env python3
"""Isolated PaddleOCR probe. Does not pip install, download weights, or infer."""
import json
import sys

out = {
    "ok": False,
    "bundled": False,
    "inference": "not_run",
    "model_loaded": False,
}
try:
    import paddleocr  # noqa: F401
except Exception:
    out["status"] = "runtime_not_bundled"
    json.dump(out, sys.stdout)
    sys.exit(3)
out["status"] = "runtime_importable_model_not_downloaded"
out["bundled"] = False
json.dump(out, sys.stdout)
sys.exit(4)
