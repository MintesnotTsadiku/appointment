"""Summarize a run_manifest output file: run ids, statuses, scenario results.

usage: python3 summarize_run.py /abs/path/run.txt
"""

import json
import re
import sys

text = open(sys.argv[1], encoding="utf-8").read()

print("== run ids ==")
for rid in sorted(set(re.findall(r"BQA-2026-\d+", text))):
    print(rid)

print("== top-level print / summaries ==")
for m in re.findall(r'"summary": "([^"]*)"', text):
    print("SUMMARY:", m)
for m in re.findall(r'"status": "(Passed|Failed|Error|Running|Queued)"', text):
    print("STATUS:", m)

# Parse the first emitted JSON object (qa_runner prints json.dumps(result, indent=2)).
start = text.find("{")
try:
    obj, _ = json.JSONDecoder().raw_decode(text[start:])
except Exception as exc:
    print("could not parse leading json:", exc)
    obj = None

if isinstance(obj, dict):
    print("== parsed result ==")
    print("run:", obj.get("name"), "status:", obj.get("status"), "video_file:", obj.get("video_file"))
    report = obj.get("report") or {}
    for scen in report.get("reports", []):
        print("scenario:", scen.get("scenario_id"), "ok:", scen.get("ok"), "error:", scen.get("error"))
        for action in scen.get("actions", []):
            if not action.get("ok"):
                print("   FAILED", action.get("action"), "selector=", action.get("selector"), "error=", action.get("error"))
        print("   console_errors:", len(scen.get("console_errors") or []), "network_errors:", len(scen.get("network_errors") or []))
