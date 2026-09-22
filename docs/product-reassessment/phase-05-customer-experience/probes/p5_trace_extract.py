"""Phase 5 allowlisted trace extraction (redacted).

Reads the decisive network traces and exports only selected request/response
fields for the booking and management submissions. Response/request headers,
cookies, session ids and booking-management tokens are never written; the
`event_token` query value is replaced with [REDACTED].
"""

from __future__ import annotations

import glob
import json
import os
import re
import zipfile

A = "/tmp/agent_browser_qa/appointment/appointment-p5-a1-public-booking-20260922T082612Z/trace.zip"
D = "/tmp/agent_browser_qa/appointment/appointment-p5-d2-management-link-behavior-20260922T084048Z/trace.zip"
OUT = "/home/minte/projects/training-apps/.worktrees/frappe-appointment-phase-05/docs/product-reassessment/phase-05-customer-experience/probes/outputs/p5-trace-summary.json"


def resource(zf, sha):
    name = f"resources/{sha}"
    try:
        return json.loads(zf.read(name).decode("utf-8", "replace"))
    except Exception:
        return None


def redact(text):
    if not text:
        return text
    return re.sub(r"(event_token=)[^&\"']+", r"\1[REDACTED]", text)


def extract(zip_path, label):
    rows = []
    with zipfile.ZipFile(zip_path) as zf:
        if "trace.network" not in zf.namelist():
            return rows
        for line in zf.read("trace.network").decode("utf-8", "replace").splitlines():
            if "book_time_slot" not in line or '"method":"POST"' not in line:
                continue
            snap = json.loads(line)["snapshot"]
            req, resp = snap["request"], snap["response"]
            req_sha = (req.get("postData") or {}).get("_sha1")
            resp_sha = (resp.get("content") or {}).get("_sha1")
            req_body = resource(zf, req_sha) if req_sha else None
            resp_body = resource(zf, resp_sha) if resp_sha else None
            rows.append({
                "label": label,
                "url": req.get("url"),
                "status": resp.get("status"),
                "request_body": req_body,
                "response_body": (None if resp_body is None else {
                    "message": (resp_body.get("message") or {}),
                }),
            })
    return rows


def main():
    out = {
        "note": "Allowlisted fields only; cookies, headers, event_token redacted.",
        "public_booking": extract(A, "BQA-2026-00106 p5_a1_public_booking"),
        "management_link_submit": extract(D, "BQA-2026-00109 p5_d2_management_link_behavior"),
    }
    # Redact any token in reschedule_url inside response bodies.
    def walk(v):
        if isinstance(v, dict):
            return {k: ("[REDACTED]" if k == "event_token" else walk(x)) for k, x in v.items()}
        if isinstance(v, list):
            return [walk(x) for x in v]
        if isinstance(v, str):
            return redact(v)
        return v
    out = walk(out)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as fh:
        json.dump(out, fh, indent=2)
    print("wrote", OUT)
    print(json.dumps(out, indent=2)[:2000])


if __name__ == "__main__":
    main()
