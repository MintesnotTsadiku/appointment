"""Phase 5 cleanup audit (read-only).

Reports business-table counts, any leftover qa-browser fixtures/orphans, and the
presence of the four retained QA users plus their Browser Accounts/Sessions. Does
not delete anything.
"""

from __future__ import annotations

import json

import frappe

SITE = "meet-beta-fix-appointment-beta-readiness-01dea7.localhost"
BENCH_SITES = "/home/minte/projects/appointment-worktree-runtimes/fix-appointment-beta-readiness-01dea7/bench/sites"

BUSINESS = [
    "Appointment", "Walk In", "Booking Event", "Appointment Group", "EventType",
    "Service", "User Appointment Availability", "Location", "Provider",
    "Organization", "Policy",
]
RETAINED_USERS = [
    "appointment-review-manager@example.test", "appointment-review-provider@example.test",
    "appointment-review-reception@example.test", "appointment-review-customer@example.test",
]


def main():
    import os

    if not getattr(frappe.local, "site", None):
        os.chdir(BENCH_SITES)
        frappe.init(site=SITE, sites_path=".")
        frappe.connect()
    frappe.set_user("Administrator")

    out = {}
    out["business_counts"] = {
        dt: frappe.db.count(dt) for dt in BUSINESS if frappe.db.exists("DocType", dt)
    }

    # Any leftover disposeable users from any phase.
    out["qa_browser_users"] = frappe.get_all(
        "User", filters={"email": ["like", "qa-browser-%@qa.local"]}, pluck="name"
    )

    def safe(fn, default="error"):
        try:
            return fn()
        except Exception as exc:  # noqa: BLE001
            return {"error": str(exc)[:200]}

    out["qa_browser_defaults"] = safe(lambda: frappe.get_all(
        "DefaultValue", filters={"parent": ["like", "qa-browser-%"]},
        fields=["name", "parent", "defkey", "defvalue"],
    ))
    out["qa_browser_has_role"] = safe(lambda: frappe.get_all(
        "Has Role", filters={"parent": ["like", "qa-browser-%"]}, fields=["name", "parent", "role"]
    ))
    out["qa_browser_sessions"] = safe(lambda: frappe.db.sql(
        "select count(*) as n from `tabSessions` where user like 'qa-browser-%%'", as_dict=True
    ))
    out["marker_booking_events"] = safe(lambda: frappe.get_all(
        "Booking Event", filters={"subject": ["like", "%QA-BROWSER%"]}, fields=["name", "subject"]
    ))
    out["marker_appointment_groups"] = safe(lambda: frappe.get_all(
        "Appointment Group", filters={"linked_doctype": ["like", "qa-browser-%"]}, fields=["name"]
    ))
    # Generic sweep for user-like names containing qa-browser across common tables.
    out["misc_user_tables"] = {}
    for dt in ["Activity Log", "Access Log", "Comment", "File", "Notification Log", "Email Queue"]:
        if frappe.db.exists("DocType", dt):
            cols = [c for c in ("owner", "modified_by", "reference_name", "attached_to_name", "for_user") if frappe.db.has_column(dt, c)]
            if not cols:
                continue
            cond = " or ".join([f"`{c}` like 'qa-browser-%%'" for c in cols])
            out["misc_user_tables"][dt] = frappe.db.sql(f"select count(*) as n from `tab{dt}` where {cond}", as_dict=True)[0]["n"]

    out["retained_users"] = {}
    for u in RETAINED_USERS:
        out["retained_users"][u] = {
            "exists": bool(frappe.db.exists("User", u)),
            "enabled": frappe.db.get_value("User", u, "enabled") if frappe.db.exists("User", u) else None,
        }
    out["browser_accounts"] = frappe.get_all("Browser Account", pluck="name") if frappe.db.exists("DocType", "Browser Account") else "n/a"
    out["browser_sessions"] = frappe.get_all("Browser Session", pluck="name") if frappe.db.exists("DocType", "Browser Session") else "n/a"
    out["mute_emails"] = frappe.conf.get("mute_emails")
    out["pause_scheduler"] = frappe.conf.get("pause_scheduler")
    out["enable_scheduler"] = frappe.db.get_single_value("System Settings", "enable_scheduler")
    print(json.dumps(out, indent=2, default=str))


if __name__ == "__main__":
    main()
