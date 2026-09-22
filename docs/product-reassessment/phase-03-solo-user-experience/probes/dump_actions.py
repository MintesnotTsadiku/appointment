"""Dump every action of an Agent Harness report.json.

usage: python3 dump_actions.py /abs/path/report.json
"""

import json
import sys

data = json.load(open(sys.argv[1], encoding="utf-8"))
for action in data.get("actions", []):
    seq = action.get("sequence")
    print(
        "- seq=%s action=%s ok=%s selector=%s after_url=%s error=%s"
        % (
            seq,
            action.get("action"),
            action.get("ok"),
            action.get("selector"),
            action.get("after_url"),
            (action.get("error") or "")[:120],
        )
    )
    value = action.get("value")
    if isinstance(value, dict) and value.get("type") in {"visible_text", "text_contains", "network_request"}:
        print("      assertion:", json.dumps(value)[:200])
    net = action.get("network_delta") or []
    if net:
        for item in net:
            print("      net:", item.get("method"), item.get("status"), item.get("url"))
