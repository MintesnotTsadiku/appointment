"""Extract the edit-modal aria snapshot region for Start Time and Duration.

usage: python3 p3b_extract_report.py /abs/path/report.json
"""

import json
import re
import sys

data = json.load(open(sys.argv[1], encoding="utf-8"))
for action in data.get("actions", []):
    snap = action.get("aria_snapshot") or ""
    if "Start Time" in snap or "Duration" in snap:
        for line in snap.splitlines():
            if any(token in line for token in ("Start Time", "Duration", "Date", "Status", "min")):
                print(re.sub(r"\s+", " ", line).strip())
        print("---")
        break
