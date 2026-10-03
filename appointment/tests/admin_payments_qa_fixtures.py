"""Agent Plane fixtures for qa/manifests/admin-payments.

`setup()` adds three ledger entries for Bloom (two fees due, one waived), each
noted "QA admin ledger". `cleanup()` deletes them and puts the platform payment
settings and Bloom's payment rules back to their defaults.
"""

import frappe

from appointment.demo import showcase

ORG = "Bole Bloom Hair Studio"
MARK = "QA admin ledger"


def setup():
    frappe.set_user("Administrator")
    cleanup()
    for entry_type, amount, status in (("Platform fee", 50, "Due"), ("Platform fee", 30, "Due"), ("Platform fee", 20, "Waived")):
        frappe.get_doc(dict(
            doctype="Platform Ledger Entry", organization=ORG, entry_type=entry_type, amount=amount, status=status, note=MARK,
        )).insert(ignore_permissions=True)
    frappe.db.commit()
    return browser_values()


def browser_values(manifest=None):
    return showcase.browser_values(manifest)


def cleanup():
    frappe.set_user("Administrator")
    entries = frappe.get_all("Platform Ledger Entry", filters={"note": ["like", f"%{MARK}%"]}, pluck="name")
    for name in entries:
        frappe.delete_doc("Platform Ledger Entry", name, ignore_permissions=True, force=True)
    if frappe.db.exists("Business Payment Settings", ORG):
        frappe.delete_doc("Business Payment Settings", ORG, ignore_permissions=True, force=True)
    settings = frappe.get_single("Payment Settings")
    settings.update(dict(collection_mode="Business collects", platform_fee_type="None", platform_fee_value=0, free_bookings=0))
    settings.set("platform_bank_accounts", [])
    settings.save(ignore_permissions=True)
    frappe.db.commit()
    return {"entries": len(entries)}
