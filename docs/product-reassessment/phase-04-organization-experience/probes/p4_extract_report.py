"""Extract a compact, redacted summary from a p4_run_manifest.sh output file.

The output contains a human header, then one or more JSON documents. This prints
the Browser QA Run identity and per-scenario pass/fail plus failed assertions and
any action errors, without dumping full report bodies.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


def iter_json(text: str):
    dec = json.JSONDecoder()
    i = text.find("{")
    while i != -1:
        try:
            obj, end = dec.raw_decode(text[i:])
        except json.JSONDecodeError:
            i = text.find("{", i + 1)
            continue
        yield obj
        nxt = text.find("{", i + end)
        i = nxt


def summarize(path: str) -> None:
    text = Path(path).read_text(encoding="utf-8", errors="replace")
    docs = list(iter_json(text))
    run = None
    report = None
    for d in docs:
        if isinstance(d, dict) and d.get("name", "").startswith("BQA-"):
            run = d
        if isinstance(d, dict) and "reports" in d and "app" in d:
            report = d
    if run and isinstance(run.get("report"), dict) and "reports" in run["report"]:
        report = run["report"]
    print("== file:", path)
    if run:
        print("run:", run.get("name"), "status:", run.get("status"),
              "duration_ms:", run.get("duration_ms"), "capture:", run.get("capture"),
              "video_file:", run.get("video_file"))
    if report:
        print("overall ok:", report.get("ok"))
        for rep in report.get("reports", []):
            failed = []
            assertions = []
            for a in rep.get("actions", []):
                act = a.get("action") or ""
                if act.startswith("assert:"):
                    val = a.get("value") or {}
                    assertions.append((act, val.get("value"), a.get("ok")))
                if a.get("ok") is False or (isinstance(a.get("value"), dict) and a["value"].get("ok") is False):
                    failed.append((act, a.get("selector"), a.get("error")))
            print("- scenario %s ok=%s error=%s" % (rep.get("scenario_id"), rep.get("ok"), rep.get("error")))
            print("  console_errors=%s network_errors=%s" % (
                len(rep.get("console_errors") or []), len(rep.get("network_errors") or [])))
            for name, value, ok in assertions:
                print("  ASSERT %s %s -> %s" % (name, "ok" if ok else "FAIL", value))
            for f in failed:
                print("  FAILED_ACTION:", f)
            for key in ("assertions",):
                pass
    print()


if __name__ == "__main__":
    for p in sys.argv[1:]:
        summarize(p)
