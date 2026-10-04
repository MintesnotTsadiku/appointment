"""Agent Plane fixtures for qa/manifests/receipts.

`setup()` turns on payment for Bloom (through the payments fixture), gives Bloom
the QA receipt prefix "QARC" and a TIN, books two paid bookings on the first
open day, confirms both (each gets a receipt) and refunds the second (refund
receipt). `cleanup()` removes them, the QA receipt series and the settings.
"""

import frappe
from frappe.utils import add_days, nowdate

from appointment.scheduler import booking, payments, self_service
from appointment.tests import payments_qa_fixtures
from appointment.tests import demo_offerings

ORG = payments_qa_fixtures.ORG
OFFERING = demo_offerings.cut_rahel()  # Cut and shape, Rahel, Bole quiet styling room
PREFIX = "QARC"
EMAIL = "qa-receipt-{n}@example.test"


def _day():
    for offset in range(1, 14):
        day = add_days(nowdate(), offset)
        free = [s for s in booking.slots(OFFERING, day)["all_available_slots_for_data"] if s["available"]]
        if len(free) >= 2:
            return str(day), free
    frappe.throw("No open Bloom day in the next two weeks.")


def setup():
    frappe.set_user("Administrator")
    cleanup()
    payments_qa_fixtures.setup()
    settings = payments.business(ORG)
    settings.receipt_prefix, settings.tin = PREFIX, "0099887766"
    settings.save(ignore_permissions=True)
    _day_value, free = _day()
    for n in (1, 2):
        frappe.set_user("Guest")
        result = booking.book(OFFERING, free[n - 1]["start_time"], free[n - 1]["end_time"], f"Receipt QA {n}", EMAIL.format(n=n),
                              frappe.generate_hash(length=24), organization_id=ORG, payment_method=payments.BANK)
        frappe.set_user("Administrator")
        payment = payments.latest_payment(result["booking_id"])
        payments.mark_paid(payment, reviewer="Administrator")
        if n == 2:
            payments.record_refund(payment.name, 100, reference="QA-REFUND")
    frappe.db.commit()
    return browser_values()


def browser_values(manifest=None):
    values = payments_qa_fixtures.browser_values(manifest)
    for n in (1, 2):
        name = frappe.db.get_value("Appointment", {"client_email": EMAIL.format(n=n)}, "name")
        values[f"qa_rc_{n}_id"] = name or ""
        if name:
            doc = frappe.get_doc("Appointment", name)
            values[f"qa_rc_{n}_manage"] = self_service.manage_url(doc).replace(frappe.utils.get_url(), "")
            values["qa_rc_day"] = str(doc.appointment_date)
    values["qa_rc_month"] = nowdate()[:7]
    return values


def cleanup():
    frappe.set_user("Administrator")
    names = frappe.get_all("Appointment", filters={"client_email": ["like", "qa-receipt-%"]}, pluck="name")
    payment_rows = frappe.get_all("Booking Payment", filters={"appointment": ["in", names or [""]]}, pluck="name")
    customers = set(frappe.get_all("Appointment", filters={"name": ["in", names or [""]]}, pluck="customer"))
    receipts = frappe.get_all("Payment Receipt", filters={"appointment": ["in", names or [""]]}, pluck="name")
    frappe.db.delete("Appointment Notification", {"appointment": ["in", names or [""]]})
    frappe.db.delete("Email Queue", {"reference_doctype": "Appointment", "reference_name": ["in", names or [""]]})
    for name in receipts:
        frappe.delete_doc("Payment Receipt", name, ignore_permissions=True, force=True)
    for name in frappe.get_all("Platform Ledger Entry", filters={"booking_payment": ["in", payment_rows or [""]]}, pluck="name"):
        frappe.delete_doc("Platform Ledger Entry", name, ignore_permissions=True, force=True)
    for name in payment_rows:
        frappe.delete_doc("Booking Payment", name, ignore_permissions=True, force=True)
    for name in names:
        frappe.delete_doc("Appointment", name, ignore_permissions=True, force=True)
    for name in customers:
        if name and not frappe.db.exists("Appointment", {"customer": name}):
            frappe.delete_doc("Customer Profile", name, ignore_permissions=True, force=True)
    # The QA receipts used their own series; drop it so no business sequence has a gap.
    frappe.db.delete("Series", {"name": ["like", f"{PREFIX}-%"]})
    payments_qa_fixtures.cleanup()  # Payment settings, the QA policy, require_payment off.
    frappe.db.commit()
    return {"appointments": len(names), "receipts": len(receipts)}
