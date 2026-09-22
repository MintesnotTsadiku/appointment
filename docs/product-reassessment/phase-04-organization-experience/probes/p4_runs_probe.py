"""List recent Browser QA Runs for Phase 4 (identity + status + duration)."""

import frappe

SITE = "meet-beta-fix-appointment-beta-readiness-01dea7.localhost"
frappe.init(site=SITE)
frappe.connect()
frappe.set_user("Administrator")

rows = frappe.get_all(
    "Browser QA Run",
    filters={"name": [">=", "BQA-2026-00096"]},
    fields=["name", "manifest_name", "scenario", "status", "duration_ms", "creation", "video_file"],
    order_by="name asc",
    limit_page_length=0,
)
for r in rows:
    print(r["name"], "|", r["status"], "|", r["duration_ms"], "|", r["scenario"], "|", (r["manifest_name"] or "")[-45:], "| video=", r["video_file"])
print("count", len(rows))
