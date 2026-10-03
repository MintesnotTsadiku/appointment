"""Agent Plane fixtures for qa/manifests/self-service.

`setup()` books two Bloom appointments per language and viewport:
- "free": Cut and shape, two days out, no policy. The customer reschedules, then cancels at no cost.
- "late": Scalp care consultation, tomorrow, under a temporary 72-hour policy for that
  service with a 100 ETB fee and 300 ETB paid. Reschedule is blocked; cancel shows the fee.
`cleanup()` removes exactly what `setup()` created.

Run: bench --site <site> execute appointment.tests.self_service_qa_fixtures.setup
"""

import frappe
from frappe.utils import add_days, nowdate

from appointment.scheduler import booking, self_service

FREE_OFFERING = "EVT-2026-000109"  # Cut and shape, Rahel Girma
LATE_OFFERING = "EVT-2026-000111"  # Scalp care consultation
POLICY_NAME = "QA self-service late policy"
EMAIL = "qa-manage-{kind}-{lang}-{size}@example.test"
COMBOS = [(lang, size) for lang in ("en", "am") for size in ("desktop", "mobile")]


def setup():
    frappe.set_user("Administrator")
    cleanup()
    late_service = frappe.db.get_value("EventType", LATE_OFFERING, "service")
    organization = frappe.db.get_value("Service", late_service, "organization")
    frappe.get_doc(dict(
        doctype="Policy", policy_name=POLICY_NAME, applies_to="Specific Service", service=late_service,
        organization=organization, created_by_organization=organization, is_active=1,
        valid_from=add_days(nowdate(), -1), cancellation_window_hours=72, reschedule_window_hours=72,
        late_cancellation_fee_amount=100, refund_policy="Full Refund",
    )).insert(ignore_permissions=True)
    free = _free(FREE_OFFERING, range(2, 14))
    late = _free(LATE_OFFERING, range(1, 3))  # Inside the 72-hour window.
    for index, (lang, size) in enumerate(COMBOS):
        _book(FREE_OFFERING, free[index], EMAIL.format(kind="free", lang=lang, size=size), organization, lang)
        name = _book(LATE_OFFERING, late[index], EMAIL.format(kind="late", lang=lang, size=size), organization, lang)
        frappe.db.set_value("Appointment", name, "amount_paid", 300, update_modified=False)
    frappe.db.commit()
    return browser_values()


def browser_values(manifest=None):
    from appointment.demo import showcase

    values = showcase.browser_values(manifest)
    for lang, size in COMBOS:
        for kind in ("free", "late"):
            name = frappe.db.get_value("Appointment", {"client_email": EMAIL.format(kind=kind, lang=lang, size=size)}, "name")
            values[f"qa_manage_{kind}_{lang}_{size}"] = _path(name) if name else ""
            values[f"qa_manage_{kind}_{lang}_{size}_id"] = name or ""
    values["qa_manage_invalid"] = "/bloom-studio/booking/APT-0000.0.00000000000000000000000000000000"
    return values


def cleanup():
    names = frappe.get_all("Appointment", filters={"client_email": ["like", "qa-manage-%"]}, pluck="name")
    queues = frappe.get_all("Email Queue", filters={"reference_doctype": "Appointment", "reference_name": ["in", names or [""]]}, pluck="name")
    customers = set(frappe.get_all("Appointment", filters={"name": ["in", names or [""]]}, pluck="customer"))
    for name in names:
        frappe.delete_doc("Appointment", name, ignore_permissions=True, force=True)
    for name in queues:
        frappe.delete_doc("Email Queue", name, ignore_permissions=True, force=True)
    for name in customers:
        if name and not frappe.db.exists("Appointment", {"customer": name}):
            frappe.delete_doc("Customer Profile", name, ignore_permissions=True, force=True)
    for name in frappe.get_all("Policy", filters={"policy_name": POLICY_NAME}, pluck="name"):
        frappe.delete_doc("Policy", name, ignore_permissions=True, force=True)
    frappe.db.commit()
    return {"appointments": len(names), "emails": len(queues)}


def _free(offering, offsets):
    """Free slots on the first day in `offsets` (days from today) that has enough of them."""
    for offset in offsets:
        day = add_days(nowdate(), offset)
        slots = [s for s in booking.slots(offering, day)["all_available_slots_for_data"] if s["available"]]
        if len(slots) >= len(COMBOS):
            return slots
    frappe.throw(f"Not enough free slots for {offering}.")


def _book(offering, slot, email, organization, language):
    frappe.set_user("Guest")
    result = booking.book(
        offering, slot["start_time"], slot["end_time"], "QA Manage " + email.split("@")[0][10:],
        email, frappe.generate_hash(length=24), organization_id=organization, language=language,
    )
    frappe.set_user("Administrator")
    return result["booking_id"]


def _path(name):
    doc = frappe.get_doc("Appointment", name)
    slug = frappe.db.get_value("Organization", doc.organization, "slug")
    return f"/{slug}/booking/{self_service.token_for(doc)}"
