"""Phase 5 exact orphan cleanup (disposable-user defaults).

The runner deletes its disposable qa-browser-* users but leaves their
`DefaultValue` (User Default) rows behind. This probe audits every such row,
asserts its parent User no longer exists and is not a retained persona, then
deletes exactly the audited row names (never a prefix sweep). It does not touch
the job queue or scheduler policy.
"""

from __future__ import annotations

import json

import frappe

SITE = "meet-beta-fix-appointment-beta-readiness-01dea7.localhost"
BENCH_SITES = "/home/minte/projects/appointment-worktree-runtimes/fix-appointment-beta-readiness-01dea7/bench/sites"
RETAINED = {
    "appointment-review-manager@example.test",
    "appointment-review-provider@example.test",
    "appointment-review-reception@example.test",
    "appointment-review-customer@example.test",
}


def main():
    import os

    if not getattr(frappe.local, "site", None):
        os.chdir(BENCH_SITES)
        frappe.init(site=SITE, sites_path=".")
        frappe.connect()
    frappe.set_user("Administrator")

    rows = frappe.get_all(
        "DefaultValue",
        filters={"parent": ["like", "qa-browser-%"]},
        fields=["name", "parent", "defkey", "defvalue"],
    )
    audited = []
    refused = []
    for row in rows:
        parent_exists = bool(frappe.db.exists("User", row["parent"]))
        if parent_exists or row["parent"] in RETAINED:
            refused.append(row)
        else:
            audited.append(row)

    for row in audited:
        frappe.db.delete("DefaultValue", {"name": row["name"]})
    frappe.db.commit()

    remaining = frappe.get_all("DefaultValue", filters={"parent": ["like", "qa-browser-%"]}, pluck="name")
    print(json.dumps({
        "audited_orphan_defaults": len(audited),
        "refused_existing_parents": refused,
        "deleted": [row["name"] for row in audited],
        "remaining_after": remaining,
        "retained_users_present": {u: bool(frappe.db.exists("User", u)) for u in sorted(RETAINED)},
        "mute_emails": frappe.conf.get("mute_emails"),
        "pause_scheduler": frappe.conf.get("pause_scheduler"),
    }, indent=2, default=str))


if __name__ == "__main__":
    main()
