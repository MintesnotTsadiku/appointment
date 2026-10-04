"""Agent Plane fixtures for qa/manifests/payments.

`setup()` turns on payment for Bloom for the QA run: one QA bank account and a
30% booking-fee policy. `browser_values()` names the QA bookings the guest runs
create (qa-pay-*@example.test). `cleanup()` removes everything the run created
and turns payment off again.
"""

import frappe
from frappe.utils import add_days, nowdate

from appointment.demo import showcase
from appointment.tests import qa_days

ORG = "Bole Bloom Hair Studio"
POLICY_NAME = "QA payments booking fee"
COMBOS = [(lang, size) for lang in ("en", "am") for size in ("desktop", "mobile")]


def setup():
    frappe.set_user("Administrator")
    cleanup()
    settings = frappe.get_doc(dict(
        doctype="Business Payment Settings", organization=ORG, accept_bank_transfer=1,
        bank_accounts=[{"bank": "Commercial Bank of Ethiopia", "account_name": "Bole Bloom Hair Studio (QA)", "account_number": "1000999000111", "note": "QA account"}],
    ))
    settings.insert(ignore_permissions=True)
    frappe.get_doc(dict(
        doctype="Policy", policy_name=POLICY_NAME, applies_to="All Services", organization=ORG, created_by_organization=ORG,
        is_active=1, valid_from=add_days(nowdate(), -1), cancellation_window_hours=24, reschedule_window_hours=24,
        deposit_percentage=30, late_cancellation_fee_percentage=50, refund_policy="Full Refund",
    )).insert(ignore_permissions=True)
    frappe.db.set_value("Organization", ORG, "require_payment", 1)
    frappe.db.commit()
    return browser_values()


def browser_values(manifest=None):
    values = showcase.browser_values(manifest)
    values["qa_open_day"] = qa_days.open_day()
    for lang, size in COMBOS:
        name = frappe.db.get_value(
            "Appointment", {"client_email": f"qa-pay-{lang}-{size}@example.test"}, "name", order_by="creation desc"
        )
        values[f"qa_pay_{lang}_{size}_id"] = name or ""
        values[f"qa_pay_{lang}_{size}_day"] = str(frappe.db.get_value("Appointment", name, "appointment_date")) if name else ""
    return values


def cleanup():
    frappe.set_user("Administrator")
    names = frappe.get_all("Appointment", filters={"client_email": ["like", "qa-pay-%"]}, pluck="name")
    payments = frappe.get_all("Booking Payment", filters={"appointment": ["in", names or [""]]}, pluck="name")
    customers = set(frappe.get_all("Appointment", filters={"name": ["in", names or [""]]}, pluck="customer"))
    for name in frappe.get_all("Platform Ledger Entry", filters={"booking_payment": ["in", payments or [""]]}, pluck="name"):
        frappe.delete_doc("Platform Ledger Entry", name, ignore_permissions=True, force=True)
    for name in frappe.get_all("File", filters={"attached_to_doctype": "Booking Payment", "attached_to_name": ["in", payments or [""]]}, pluck="name"):
        frappe.delete_doc("File", name, ignore_permissions=True, force=True)
    for name in payments:
        frappe.delete_doc("Booking Payment", name, ignore_permissions=True, force=True)
    queues = frappe.get_all("Email Queue", filters={"reference_doctype": "Appointment", "reference_name": ["in", names or [""]]}, pluck="name")
    for name in names:
        frappe.delete_doc("Appointment", name, ignore_permissions=True, force=True)
    for name in queues:
        frappe.delete_doc("Email Queue", name, ignore_permissions=True, force=True)
    for name in customers:
        if name and not frappe.db.exists("Appointment", {"customer": name}):
            frappe.delete_doc("Customer Profile", name, ignore_permissions=True, force=True)
    for name in frappe.get_all("Policy", filters={"policy_name": POLICY_NAME}, pluck="name"):
        frappe.delete_doc("Policy", name, ignore_permissions=True, force=True)
    if frappe.db.exists("Business Payment Settings", ORG):
        frappe.delete_doc("Business Payment Settings", ORG, ignore_permissions=True, force=True)
    frappe.db.set_value("Organization", ORG, "require_payment", 0)
    frappe.db.commit()
    return {"appointments": len(names), "payments": len(payments)}
