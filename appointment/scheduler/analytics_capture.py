"""Server-owned capture in the booking transaction; no historical backfill."""

import hashlib
import json
from datetime import datetime, timezone

import frappe
from frappe import _

SNAPSHOT = ("booking_source", "referral_source", "referral_code", "agreed_price",
            "agreed_currency", "discount_amount", "discount_code", "price_basis", "price_captured_at")
STAGES = {"arrive": "arrived_at", "check-in": "checked_in_at",
          "start": "actual_start", "end": "actual_end"}


def capture(doc):
    old = doc.get_doc_before_save()
    timestamp = datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=" ")
    events = json.loads(old.workflow_events or "[]") if old else []
    doc.workflow_events = json.dumps(events)
    if old:
        doc.recovered_from = old.recovered_from
        for field in SNAPSHOT:
            doc.set(field, old.get(field))
        for field in (*STAGES.values(), "confirmed_at", "cancelled_at"):
            doc.set(field, old.get(field))
    else:
        for field in (*STAGES.values(), "confirmed_at", "cancelled_at"):
            doc.set(field, None)
        terms = doc.flags.analytics_terms or {}
        doc.booking_source = "import" if frappe.flags.in_import or doc.flags.in_import else terms.get("source", "online" if doc.request_key else "staff")
        doc.referral_source, doc.referral_code = terms.get("referral_source"), terms.get("referral_code")
        doc.agreed_price = frappe.db.get_value("Service", doc.service, "price")
        doc.agreed_currency, doc.discount_amount = "ETB", 0
        doc.discount_code, doc.price_basis, doc.price_captured_at = None, "catalog-at-booking", timestamp
        if doc.booking_source == "import":
            doc.agreed_price, doc.price_captured_at, doc.price_basis = None, None, "unknown-import"
        doc.recovered_from = None
        append(doc, events, "create", timestamp, None, doc.status)
    if not old or old.status != doc.status:
        action = {"Confirmed": "confirm", "Cancelled": "cancel", "Completed": "complete", "No Show": "no-show"}.get(doc.status)
        if action:
            append(doc, events, action, timestamp, old.status if old else None, doc.status)
            if action in ("confirm", "cancel"):
                doc.set("confirmed_at" if action == "confirm" else "cancelled_at", timestamp)
    if old and any(str(old.get(key)) != str(doc.get(key)) for key in ("starts_at", "ends_at", "provider", "location")):
        append(doc, events, "reschedule", timestamp, old.status, doc.status,
               before={key: str(old.get(key)) for key in ("starts_at", "ends_at", "provider", "location")},
               after={key: str(doc.get(key)) for key in ("starts_at", "ends_at", "provider", "location")},
               reason=doc.flags.analytics_reason or "")
    stage = doc.flags.analytics_stage
    if stage in STAGES and not doc.get(STAGES[stage]):
        doc.set(STAGES[stage], timestamp)
        append(doc, events, stage, timestamp, doc.status, doc.status)
    if doc.flags.analytics_recovery and not doc.recovered_from:
        doc.recovered_from = doc.flags.analytics_recovery
        append(doc, events, "slot-recovery", timestamp, doc.status, doc.status, released_booking=doc.recovered_from)
    doc.workflow_events = json.dumps(events)


def append(doc, events, action, timestamp, previous, current, **details):
    key = hashlib.sha256(f"{doc.name}:{len(events)}:{action}".encode()).hexdigest()
    events.append(dict(idempotency_key=key, booking=doc.name, type=action, timestamp=timestamp,
                       actor=frappe.session.user, source=doc.booking_source or "unknown",
                       previous_status=previous, new_status=current, **details))


def _lock_booking(doc):
    """Lock what the booking holds: its provider, or the resources of a resource-only booking."""
    from appointment.scheduler.booking import lock_provider

    if doc.provider:
        lock_provider(frappe.get_doc("Provider", doc.provider))
        return
    resources = sorted({row.resource for row in doc.get("resources") or []})
    if resources:
        frappe.db.sql("select name from `tabResource` where name in %s for update", (tuple(resources),))


@frappe.whitelist(methods=["POST"])
def reception_stage(booking_id: str, stage: str, expected_modified: str):
    from appointment.scheduler.booking_access import require_access

    if stage not in STAGES:
        frappe.throw(_("Choose a supported reception stage."))
    doc = frappe.get_doc("Appointment", booking_id)
    require_access(doc)
    _lock_booking(doc)
    doc.reload()
    require_access(doc)
    if doc.get(STAGES[stage]):
        return {"booking_id": doc.name, "timestamp": doc.get(STAGES[stage]), "modified": str(doc.modified)}
    if str(doc.modified) != expected_modified:
        frappe.throw(_("This booking changed. Reload before editing."), frappe.TimestampMismatchError)
    if doc.status not in ("Pending", "Confirmed"):
        frappe.throw(_("Only active bookings support reception stages."))
    prerequisite = {"check-in": "arrived_at", "start": "checked_in_at", "end": "actual_start"}.get(stage)
    if prerequisite and not doc.get(prerequisite):
        frappe.throw(_("Complete the preceding reception stage first."))
    doc.flags.analytics_stage = stage
    doc.save(ignore_permissions=True)
    return {"booking_id": doc.name, "timestamp": doc.get(STAGES[stage]), "modified": str(doc.modified)}


@frappe.whitelist(methods=["POST"])
def link_recovery(booking_id: str, released_booking: str):
    from appointment.scheduler.booking_access import require_access
    from appointment.scheduler.booking import lock_provider
    doc = frappe.get_doc("Appointment", booking_id)
    released = frappe.get_doc("Appointment", released_booking)
    require_access(doc)
    require_access(released)
    if not doc.provider:
        frappe.throw(_("Recovery links apply to bookings with a provider."))
    if doc.organization != released.organization or doc.provider != released.provider:
        frappe.throw(_("Recovery bookings must share a business and provider."))
    lock_provider(frappe.get_doc("Provider", doc.provider))
    doc.reload()
    released.reload()
    if released.status != "Cancelled" or doc.status not in {"Pending", "Confirmed"}:
        frappe.throw(_("Recovery needs an active replacement and a cancelled booking."))
    if not released.cancelled_at or not doc.price_captured_at or doc.price_captured_at < released.cancelled_at:
        frappe.throw(_("Recovery requires a captured cancellation before replacement creation."))
    if not (doc.occupied_from < released.occupied_until and released.occupied_from < doc.occupied_until):
        frappe.throw(_("Replacement does not occupy the released interval."))
    if doc.recovered_from and doc.recovered_from != released.name:
        frappe.throw(_("This replacement already has a recovery link."))
    if not doc.recovered_from:
        doc.flags.analytics_recovery = released.name
        doc.save(ignore_permissions=True)
    return {"booking_id": doc.name, "released_booking": doc.recovered_from}


@frappe.whitelist(methods=['GET'])
def recovery_candidates(booking_id: str):
    from appointment.scheduler.booking_access import require_access
    doc=frappe.get_doc('Appointment',booking_id)
    require_access(doc)
    if not doc.provider or doc.status not in {'Pending','Confirmed'} or not doc.price_captured_at or not doc.occupied_from or not doc.occupied_until:
        return []
    scope={'organization':doc.organization} if doc.organization else {'organization':['is','not set']}
    rows=frappe.get_list('Appointment',filters={**scope,'provider':doc.provider,'status':'Cancelled',
        'cancelled_at':['<=',doc.price_captured_at],'occupied_from':['<',doc.occupied_until],
        'occupied_until':['>',doc.occupied_from]},fields=['name','appointment_date','start_time'],limit_page_length=1000)
    return [dict(name=row.name,date=str(row.appointment_date),time=str(row.start_time)) for row in rows]
