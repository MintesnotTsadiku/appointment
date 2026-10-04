"""End-to-end check across payments, rooms and equipment, receipts, notifications and the scheduled jobs.

`setup()` prepares Bloom: payment required (bank transfer, 30% booking fee),
receipt prefix QAE2E, a platform fee of 25 ETB, a "Styling chair (E2E)" that
Cut and shape needs (one chair per room), and a 72-hour reminder lead so the
QA day falls inside it. Guests then book through the browser (qa-e2e-*).
`run_jobs()` runs the scheduled functions the cron would run (the site keeps
pause_scheduler on) and reports what they did. `cleanup()` removes the QA
records, the reminder rows the run queued for demo bookings, and restores the
settings. See docs/features/E2E_CHECK.md.
"""

import json
from datetime import timedelta

import frappe
from frappe.utils import add_days, nowdate

from appointment.scheduler import booking, notifications, payments, resources, statements
from appointment.tests import payments_qa_fixtures
from appointment.tests import demo_offerings

ORG = payments_qa_fixtures.ORG
RAHEL = demo_offerings.cut_rahel()  # Cut and shape, Rahel, Bole quiet styling room
TYPE_NAME = "Styling chair (E2E)"
PREFIX = "QAE2E"
STATE_KEY = "appointment_e2e_state"


def _day():
    for offset in range(1, 14):
        day = add_days(nowdate(), offset)
        if sum(1 for s in booking.slots(RAHEL, day)["all_available_slots_for_data"] if s["available"]) >= 3:
            return str(day)
    frappe.throw("No open Bloom day in the next two weeks.")


def setup():
    frappe.set_user("Administrator")
    cleanup()
    started = frappe.utils.now()
    payments_qa_fixtures.setup()
    settings = payments.business(ORG)
    settings.receipt_prefix = PREFIX
    settings.save(ignore_permissions=True)

    platform = frappe.get_single("Payment Settings")
    previous_platform = dict(platform_fee_type=platform.platform_fee_type, platform_fee_value=platform.platform_fee_value, free_bookings=platform.free_bookings)
    platform.update(dict(platform_fee_type="Fixed", platform_fee_value=25, free_bookings=0))
    platform.save(ignore_permissions=True)

    kind = frappe.get_doc(dict(doctype="Resource Type", organization=ORG, type_name=TYPE_NAME)).insert(ignore_permissions=True)
    for name, location in (("E2E chair", "Bole main studio"), ("E2E quiet chair", "Bole quiet styling room")):
        frappe.get_doc(dict(doctype="Resource", organization=ORG, resource_name=name, resource_type=kind.name, location=location)).insert(ignore_permissions=True)
    service = frappe.get_doc("Service", frappe.db.get_value("EventType", RAHEL, "service"))
    service.set("resource_needs", [dict(resource_type=kind.name)])
    resources._save_needs(service)

    previous_lead = notifications.business_settings(ORG).get("reminder_lead_hours")
    _set_lead(72)
    # Computed once here: browser_values runs inside the QA runner's open transaction during the browser run.
    frappe.db.set_default(STATE_KEY, json.dumps(dict(started=started, platform=previous_platform, lead=previous_lead, day=_day())))
    frappe.db.commit()
    return browser_values()


def _set_lead(hours):
    name = frappe.db.get_value("Customer Notification Settings", {"organization": ORG}, "name")
    if name:
        frappe.db.set_value("Customer Notification Settings", name, "reminder_lead_hours", hours)
    else:
        frappe.get_doc(dict(doctype="Customer Notification Settings", organization=ORG, reminder_lead_hours=hours)).insert(ignore_permissions=True)


def browser_values(manifest=None):
    values = payments_qa_fixtures.browser_values(manifest)
    values["qa_e2e_day"] = json.loads(frappe.db.get_default(STATE_KEY) or "{}").get("day", "")
    for key, email in (("paid", "qa-e2e-paid@example.test"), ("unpaid", "qa-e2e-unpaid@example.test")):
        name = frappe.db.get_value("Appointment", {"client_email": email}, "name")
        values[f"qa_e2e_{key}_id"] = name or ""
        if name:
            from appointment.scheduler import self_service

            values[f"qa_e2e_{key}_manage"] = self_service.manage_url(frappe.get_doc("Appointment", name)).replace(frappe.utils.get_url(), "")
    return values


def _qa_bookings():
    return frappe.get_all("Appointment", filters={"client_email": ["like", "qa-e2e-%"]}, pluck="name")


def report():
    """What the journey left in the database: bookings, payments, receipts, resources, notifications, ledger."""
    out = []
    for name in _qa_bookings():
        doc = frappe.get_doc("Appointment", name)
        payment = payments.latest_payment(name)
        out.append(dict(
            booking=name, email=doc.client_email, status=doc.status, start=str(doc.starts_at),
            resources=[frappe.db.get_value("Resource", row.resource, "resource_name") for row in doc.resources],
            payment=dict(status=payment.status, amount=payment.amount, reference=payment.reference) if payment else None,
            receipts=frappe.get_all("Payment Receipt", filters={"appointment": name}, fields=["receipt_number", "kind", "status", "amount"]),
            ledger=frappe.get_all("Platform Ledger Entry", filters={"appointment": name}, fields=["entry_type", "amount", "status"]),
            notifications=[
                dict(event=row.event, status=row.status, skip=row.skip_reason,
                     email=bool(row.email_queue),
                     attachment=bool(row.receipt and row.email_queue and ".pdf" in (frappe.db.get_value("Email Queue", row.email_queue, "message") or "")))
                for row in frappe.get_all("Appointment Notification", filters={"appointment": name, "channel": "Email"},
                                          fields=["event", "status", "skip_reason", "email_queue", "receipt"], order_by="creation asc")
            ],
        ))
    return out


def run_jobs():
    """Run the cron functions once, as the scheduler would, and report their effect on the QA bookings."""
    frappe.set_user("Administrator")
    unpaid = frappe.db.get_value("Appointment", {"client_email": "qa-e2e-unpaid@example.test"}, "name")
    result = {}
    result["send_due_reminders"] = notifications.send_due_reminders()
    if unpaid:
        payment = payments.latest_payment(unpaid)
        # Move the unpaid hold's deadline into the past; the job decides the rest.
        frappe.db.set_value("Booking Payment", payment.name, "hold_expires_at", payments._now() - timedelta(minutes=1), update_modified=False)
    result["process_holds"] = payments.process_holds()
    result["send_monthly_statements"] = statements.send_monthly_statements()
    frappe.db.commit()
    return result


def cleanup():
    frappe.set_user("Administrator")
    state = json.loads(frappe.db.get_default(STATE_KEY) or "{}")
    names = _qa_bookings()
    payment_rows = frappe.get_all("Booking Payment", filters={"appointment": ["in", names or [""]]}, pluck="name")
    customers = set(frappe.get_all("Appointment", filters={"name": ["in", names or [""]]}, pluck="customer"))
    # Reminders the job queued for demo bookings during the run: Bloom's (72-hour lead) and any
    # other business whose bookings came inside their own lead time. The paused scheduler would queue them again later.
    demo_reminders = frappe.get_all(
        "Appointment Notification",
        filters={"event": "Reminder", "creation": [">=", state.get("started") or "2999-01-01"], "appointment": ["not in", names or [""]]},
        fields=["name", "appointment", "email_queue"],
    )
    for row in demo_reminders:
        if row.email_queue:
            frappe.delete_doc("Email Queue", row.email_queue, ignore_permissions=True, force=True)
        frappe.delete_doc("Appointment Notification", row.name, ignore_permissions=True, force=True)
    queues = frappe.get_all("Email Queue", filters={"reference_doctype": "Appointment", "reference_name": ["in", names or [""]]}, pluck="name")
    frappe.db.delete("Appointment Notification", {"appointment": ["in", names or [""]]})
    for name in queues:
        frappe.delete_doc("Email Queue", name, ignore_permissions=True, force=True)
    for name in frappe.get_all("Email Queue", filters={"reference_doctype": "Organization", "reference_name": ORG, "creation": [">=", state.get("started") or "2999-01-01"]}, pluck="name"):
        frappe.delete_doc("Email Queue", name, ignore_permissions=True, force=True)
    for name in frappe.get_all("Payment Receipt", filters={"appointment": ["in", names or [""]]}, pluck="name"):
        frappe.delete_doc("Payment Receipt", name, ignore_permissions=True, force=True)
    for name in frappe.get_all("Platform Ledger Entry", filters={"booking_payment": ["in", payment_rows or [""]]}, pluck="name"):
        frappe.delete_doc("Platform Ledger Entry", name, ignore_permissions=True, force=True)
    for name in frappe.get_all("File", filters={"attached_to_doctype": "Booking Payment", "attached_to_name": ["in", payment_rows or [""]]}, pluck="name"):
        frappe.delete_doc("File", name, ignore_permissions=True, force=True)
    for name in payment_rows:
        frappe.delete_doc("Booking Payment", name, ignore_permissions=True, force=True)
    for name in names:
        frappe.delete_doc("Appointment", name, ignore_permissions=True, force=True)
    for name in customers:
        if name and not frappe.db.exists("Appointment", {"customer": name}):
            frappe.delete_doc("Customer Profile", name, ignore_permissions=True, force=True)
    frappe.db.delete("Series", {"name": ["like", f"{PREFIX}-%"]})

    kinds = frappe.get_all("Resource Type", filters={"organization": ORG, "type_name": TYPE_NAME}, pluck="name")
    service = frappe.get_doc("Service", frappe.db.get_value("EventType", RAHEL, "service"))
    if any(row.resource_type in kinds for row in service.resource_needs):
        service.set("resource_needs", [row for row in service.resource_needs if row.resource_type not in kinds])
        resources._save_needs(service)
        resources.assign_upcoming(ORG, service.name)
    for name in frappe.get_all("Resource", filters={"resource_type": ["in", kinds or [""]]}, pluck="name"):
        frappe.delete_doc("Resource", name, ignore_permissions=True, force=True)
    for name in kinds:
        frappe.delete_doc("Resource Type", name, ignore_permissions=True, force=True)

    if state:
        platform = frappe.get_single("Payment Settings")
        platform.update(state.get("platform") or {})
        platform.save(ignore_permissions=True)
        _set_lead(state.get("lead") or 24)
        frappe.db.set_default(STATE_KEY, "")
        frappe.db.set_default(f"appointment_statement_sent:{ORG}", "")
    payments_qa_fixtures.cleanup()
    frappe.db.commit()
    return {"appointments": len(names), "demo_reminders_removed": len(demo_reminders)}
