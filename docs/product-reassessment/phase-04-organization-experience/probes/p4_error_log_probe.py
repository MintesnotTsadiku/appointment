"""Read recent Error Log entries related to Phase 4 desk actions (redacted)."""

import frappe

SITE = "meet-beta-fix-appointment-beta-readiness-01dea7.localhost"
frappe.init(site=SITE)
frappe.connect()
frappe.set_user("Administrator")

rows = frappe.get_all(
    "Error Log",
    fields=["name", "creation", "method", "error"],
    order_by="creation desc",
    limit_page_length=12,
)
for r in rows:
    print("=" * 100)
    print(r["creation"], "|", r["method"])
    err = (r["error"] or "")
    print(err[:2500])
print("total_recent", len(rows))
