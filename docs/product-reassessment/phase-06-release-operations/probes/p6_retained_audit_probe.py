"""Phase 6 retained-artifact and cleanup audit (read-only).

Verifies the four retained QA identities/Browser Accounts/Sessions remain, and
audits exact child/default/session/auth leftovers for all disposable fixture
prefixes used in earlier phases. Deletes nothing.
"""

from __future__ import annotations

import json
import os

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
DISPOSABLE_PREFIXES = ["qa-browser-", "p3b-", "p4-", "p5-", "P3B", "P4", "P5"]
RETAINED_ACCOUNTS = ["BACCT-0061", "BACCT-0063", "BACCT-0065", "BACCT-0067"]
RETAINED_SESSIONS = ["BSESS-0062", "BSESS-0064", "BSESS-0066", "BSESS-0068"]


def safe(fn, default="error"):
    try:
        return fn()
    except Exception as exc:  # noqa: BLE001
        return {"error": str(exc)[:200]}


def main():
    if not getattr(frappe.local, "site", None):
        os.chdir(BENCH_SITES)
        frappe.init(site=SITE, sites_path=".")
        frappe.connect()
    frappe.set_user("Administrator")

    out = {}
    out["business_counts"] = {
        dt: frappe.db.count(dt) for dt in BUSINESS if frappe.db.exists("DocType", dt)
    }

    out["disposable_user_counts"] = {}
    for prefix in DISPOSABLE_PREFIXES:
        out["disposable_user_counts"][prefix] = safe(
            lambda p=prefix: frappe.db.count("User", {"name": ["like", p + "%"]})
        )

    # Exact child/default/session/auth leftovers for disposable users.
    out["leftovers"] = {}
    for prefix in ["qa-browser-", "p3b-", "p4-", "p5-"]:
        entry = {}
        entry["defaults"] = safe(lambda p=prefix: frappe.db.count(
            "DefaultValue", {"parent": ["like", p + "%"]}))
        entry["has_role"] = safe(lambda p=prefix: frappe.db.count(
            "Has Role", {"parent": ["like", p + "%"]}))
        entry["sessions"] = safe(lambda p=prefix: frappe.db.sql(
            "select count(*) as n from `tabSessions` where user like %s", (p + "%",), as_dict=True)[0]["n"])
        entry["auth"] = safe(lambda p=prefix: frappe.db.sql(
            "select count(*) as n from `__Auth` where doctype='User' and name like %s", (p + "%",), as_dict=True)[0]["n"])
        entry["comment"] = safe(lambda p=prefix: frappe.db.sql(
            "select count(*) as n from `tabComment` where owner like %s", (p + "%",), as_dict=True)[0]["n"])
        entry["file"] = safe(lambda p=prefix: frappe.db.sql(
            "select count(*) as n from `tabFile` where owner like %s", (p + "%",), as_dict=True)[0]["n"])
        out["leftovers"][prefix] = entry

    out["retained_users"] = {}
    for u in RETAINED_USERS:
        out["retained_users"][u] = {
            "exists": bool(frappe.db.exists("User", u)),
            "enabled": frappe.db.get_value("User", u, "enabled") if frappe.db.exists("User", u) else None,
            "roles": safe(lambda u=u: frappe.get_roles(u)),
        }
    out["browser_accounts_present"] = {
        a: bool(frappe.db.exists("Browser Account", a)) for a in RETAINED_ACCOUNTS
    } if frappe.db.exists("DocType", "Browser Account") else "n/a"
    out["browser_sessions_present"] = {
        s: bool(frappe.db.exists("Browser Session", s)) for s in RETAINED_SESSIONS
    } if frappe.db.exists("DocType", "Browser Session") else "n/a"

    out["residual_synthetic"] = {
        "Comment_total": safe(lambda: frappe.db.count("Comment")),
        "Communication_total": safe(lambda: frappe.db.count("Communication")),
        "Error_Log_total": safe(lambda: frappe.db.count("Error Log")),
        "Email_Queue_total": safe(lambda: frappe.db.count("Email Queue")),
        "File_total": safe(lambda: frappe.db.count("File")),
    }

    out["mute_emails"] = frappe.conf.get("mute_emails")
    out["pause_scheduler"] = frappe.conf.get("pause_scheduler")
    out["enable_scheduler"] = safe(lambda: frappe.db.get_single_value("System Settings", "enable_scheduler"))

    print(json.dumps(out, indent=2, default=str))
    frappe.destroy()


if __name__ == "__main__":
    main()
