"""Print failed actions, console and network errors from an Agent Harness report.json.

usage: python3 report_actions.py /abs/path/report.json
"""

import json
import sys

path = sys.argv[1]
data = json.load(open(path, encoding="utf-8"))
print("report_ok:", data.get("ok"))
print("scenario:", data.get("scenario_id"))
print("run_error:", data.get("error"))
for action in data.get("actions", []):
    if not action.get("ok"):
        print("FAILED ACTION:", action.get("action"), "| selector:", action.get("selector"), "| error:", action.get("error"))
print("console_errors:", json.dumps(data.get("console_errors"), indent=2)[:2000])
print("network_errors:", json.dumps(data.get("network_errors"), indent=2)[:2000])
