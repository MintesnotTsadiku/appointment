"""Customer notifications for Appointments: decide, record, queue and report.

Every Appointment write reaches `on_appointment_update`. It finds the customer
event, records one `Appointment Notification` row and enqueues the email job
after the booking transaction commits. The job renders the message and puts it
on Frappe's email queue. See docs/features/CUSTOMER_NOTIFICATIONS_PLAN.md.
"""

from datetime import datetime, timedelta

import frappe
import pytz
from frappe import _
from frappe.utils import get_datetime, get_system_timezone, validate_email_address

from appointment.scheduler import business_owner, membership, notification_sms
from appointment.scheduler.booking_access import require_access

EVENT_SETTING = {
    "Confirmation": "send_confirmation",
    "Reschedule": "send_reschedule",
    "Cancellation": "send_cancellation",
    "Reminder": "send_reminder",
    # Payment emails are part of confirming the booking.
    "Payment request": "send_confirmation",
    "Payment reminder": "send_confirmation",
    # Receipts are records of money received or returned; they always go out.
    "Payment receipt": None,
    "Refund receipt": None,
}
RECEIPT_EVENTS = ("Payment receipt", "Refund receipt")
DEFAULT_SETTINGS = dict(
    sms_enabled=0, send_confirmation=1, send_reschedule=1, send_cancellation=1, send_reminder=1, reminder_lead_hours=24
)
CHECK_SETTINGS = ("sms_enabled", *EVENT_SETTING.values())
JOBS = {
    "Email": "appointment.scheduler.notification_email.send_notification",
    "SMS": "appointment.scheduler.notification_sms.send_notification",
}
LEAD_HOURS_RANGE = (1, 72)
OPEN_STATUSES = ("Pending", "Confirmed")

# Abuse limits. A guest can type any address into a public booking, so the
# per-address limits count confirmations only. Staff changes are trusted and
# only share the per-business hourly cap.
LIMIT_ADDRESS_PER_BUSINESS_DAY = 5
LIMIT_ADDRESS_PER_DAY = 20
LIMIT_BUSINESS_PER_HOUR = 500
REMINDER_BATCH = 500

EMAIL_QUEUE_STATUS = {"Not Sent": "Queued", "Sending": "Queued", "Sent": "Sent", "Partially Sent": "Sent"}


# ---------------------------------------------------------------------------
# Trigger
# ---------------------------------------------------------------------------
def on_appointment_update(doc):
    """Called from Appointment.on_update, which also runs on insert."""
    event = _event_for(doc)
    doc.flags.notification_status = queue_notification(doc, event) if event else "not_applicable"


def status_of(doc):
    """The `notification_status` value an API returns for the last write of `doc`."""
    return doc.flags.get("notification_status") or "not_applicable"


def _event_for(doc):
    if frappe.flags.skip_customer_notification or doc.flags.skip_customer_notification:
        return None
    if doc.flags.in_insert:
        return "Confirmation" if doc.status == "Confirmed" else None
    before = doc.get_doc_before_save()
    if not before:
        return None
    if doc.status == "Cancelled" and before.status != "Cancelled":
        return "Cancellation"
    if doc.status == "Confirmed" and before.status == "Pending":
        return "Confirmation"
    if doc.status in OPEN_STATUSES and _instant(before.starts_at) != _instant(doc.starts_at):
        return "Reschedule"
    return None


# ---------------------------------------------------------------------------
# Decide and record
# ---------------------------------------------------------------------------
def queue_notification(doc, event, receipt=None):
    """Record and enqueue `event` on each channel. Returns the notification status.

    Email always runs. SMS runs when the business turned it on and the site has
    an SMS gateway; independent providers have no SMS. The status is "queued"
    when any channel queued a message. A receipt goes by email only, once per receipt.
    Bookings outside any business, such as personal meetings, are not notified.
    """
    owner = business_owner.for_booking(doc)
    if not owner:
        return "not_applicable"
    statuses = [_queue_channel(doc, event, "Email", owner, receipt)]
    if not receipt and owner.organization and business_settings(owner.key).sms_enabled and notification_sms.available():
        statuses.append(_queue_channel(doc, event, "SMS", owner))
    return "queued" if "queued" in statuses else statuses[0]


def _queue_channel(doc, event, channel, owner, receipt=None):
    key = (f"{doc.name}:{event}:{receipt}" if receipt else _dedupe_key(doc, event)) + ("" if channel == "Email" else ":sms")
    if frappe.db.exists("Appointment Notification", {"dedupe_key": key}):
        return "queued"
    raw = doc.client_email if channel == "Email" else doc.client_phone
    recipient = validate_email_address(raw or "") if channel == "Email" else notification_sms.normalize_phone(raw)
    reason = _skip_reason(doc, event, channel, recipient, owner)
    row = frappe.get_doc(
        dict(
            doctype="Appointment Notification",
            appointment=doc.name,
            **business_owner.record_fields(owner),
            event=event,
            receipt=receipt,
            channel=channel,
            recipient=recipient or (raw or "")[:140],
            language=customer_language(doc, owner),
            status="Skipped" if reason else "Queued",
            skip_reason=reason,
            dedupe_key=key,
        )
    ).insert(ignore_permissions=True)
    if reason:
        return reason
    frappe.enqueue(JOBS[channel], queue="short", enqueue_after_commit=True, notification=row.name)
    return "queued"


def is_stale(event, doc):
    """The booking changed again before the job ran."""
    if event in RECEIPT_EVENTS:
        return False
    if event == "Cancellation":
        return doc.status != "Cancelled"
    return doc.status not in OPEN_STATUSES


def _skip_reason(doc, event, channel, recipient, owner):
    setting = EVENT_SETTING[event]
    if setting and not business_settings(owner.key)[setting]:
        return "disabled"
    if not recipient:
        return "no_recipient"
    # The opt-out link is in the reminder email; it stops reminders on every channel.
    if event == "Reminder" and is_opted_out(owner.key, doc.client_email or ""):
        return "opted_out"
    if _over_limit(owner, recipient, event, channel):
        return "rate_limited"
    return None


def _over_limit(owner, recipient, event, channel):
    day_ago, hour_ago = datetime.now() - timedelta(days=1), datetime.now() - timedelta(hours=1)
    sent = {"status": ["in", ["Queued", "Sent", "Delivered"]], "channel": channel}
    scope = business_owner.record_filters(owner)
    if frappe.db.count("Appointment Notification", {**sent, **scope, "creation": [">", hour_ago]}) >= LIMIT_BUSINESS_PER_HOUR:
        return True
    if event != "Confirmation":
        return False
    confirmations = {**sent, "event": "Confirmation", "recipient": recipient, "creation": [">", day_ago]}
    return (
        frappe.db.count("Appointment Notification", {**confirmations, **scope}) >= LIMIT_ADDRESS_PER_BUSINESS_DAY
        or frappe.db.count("Appointment Notification", confirmations) >= LIMIT_ADDRESS_PER_DAY
    )


def _dedupe_key(doc, event):
    """Confirmation once per booking, a reminder once per start time, changes once per write."""
    start = _instant(doc.starts_at).isoformat() if doc.starts_at else ""
    if event in ("Confirmation", "Payment request"):
        return f"{doc.name}:{event}"
    if event == "Reminder":
        return f"{doc.name}:{event}:{start}"
    return f"{doc.name}:{event}:{start}:{doc.modified}"


def customer_language(doc, owner=None):
    owner = owner or business_owner.for_booking(doc)
    language = (
        doc.get("customer_language")
        or (doc.get("customer") and frappe.db.get_value("Customer Profile", doc.customer, "preferred_language"))
        or (owner and owner.language)
    )
    return language if language in ("en", "am") else "en"


def business_settings(organization):
    """Settings for an owner key. Independent providers use the defaults for now."""
    if not organization or organization.startswith(business_owner.PREFIX):
        return frappe._dict(DEFAULT_SETTINGS)
    saved = frappe.db.get_value(
        "Customer Notification Settings", organization, list(DEFAULT_SETTINGS), as_dict=True
    )
    return frappe._dict(saved or DEFAULT_SETTINGS)


def is_opted_out(owner_key, email):
    return bool(frappe.db.exists("Customer Notification Opt Out", {"opt_out_key": opt_out_key(owner_key, email)}))


def opt_out_key(owner_key, email):
    return f"{owner_key}:{email.strip().lower()}"[:140]


def _instant(value):
    return get_datetime(value) if value else None


# ---------------------------------------------------------------------------
# Reminder job (scheduler)
# ---------------------------------------------------------------------------
def send_due_reminders():
    """Queue reminders for Confirmed Appointments inside their business lead time.

    Idempotent: the reminder `dedupe_key` includes the start time, so a repeat
    run queues nothing and a reschedule allows one new reminder.
    """
    now = datetime.now(pytz.UTC).replace(tzinfo=None)
    candidates = frappe.get_all(
        "Appointment",
        filters={"status": "Confirmed", "starts_at": ["between", [now, now + timedelta(hours=LEAD_HOURS_RANGE[1])]]},
        fields=["name", "organization", "service", "provider", "event_type", "starts_at", "creation"],
        order_by="starts_at asc",
    )
    done = set(
        frappe.get_all(
            "Appointment Notification",
            filters={"event": "Reminder", "appointment": ["in", [row.name for row in candidates] or [""]]},
            pluck="dedupe_key",
        )
    )
    queued = 0
    for row in candidates:
        if queued >= REMINDER_BATCH:
            break
        if f"{row.name}:Reminder:{_instant(row.starts_at).isoformat()}" in done or not _reminder_due(row, now):
            continue
        queue_notification(frappe.get_doc("Appointment", row.name), "Reminder")
        queued += 1
    return queued


def _reminder_due(row, now):
    owner = business_owner.for_booking(row)
    if not owner:
        return False
    settings = business_settings(owner.key)
    if not settings.send_reminder:
        return False
    lead = timedelta(hours=int(settings.reminder_lead_hours or DEFAULT_SETTINGS["reminder_lead_hours"]))
    created = pytz.timezone(get_system_timezone()).localize(get_datetime(row.creation)).astimezone(pytz.UTC).replace(tzinfo=None)
    starts = _instant(row.starts_at)
    # A booking made inside the lead time already got its confirmation.
    return starts - lead <= now and starts - created > lead


# ---------------------------------------------------------------------------
# Staff APIs
# ---------------------------------------------------------------------------
@frappe.whitelist()
def get_settings(organization):
    owner = _require_manager(organization)
    recent = frappe.get_all(
        "Appointment Notification",
        filters=business_owner.record_filters(owner),
        fields=["name", "appointment", "event", "channel", "status", "skip_reason", "email_queue", "creation"],
        order_by="creation desc",
        limit=20,
    )
    return {
        "settings": business_settings(organization),
        "sms_available": bool(owner.organization) and notification_sms.available(),
        # Independent providers use the default settings; a provider record can come later.
        "editable": bool(owner.organization),
        "recent": [_with_delivery(row) for row in recent],
    }


@frappe.whitelist(methods=["POST"])
def save_settings(organization, **values):
    if not _require_manager(organization).organization:
        frappe.throw(_("Independent providers use the default message settings."))
    clean = {key: int(frappe.utils.cint(values[key])) for key in DEFAULT_SETTINGS if key in values}
    for key in CHECK_SETTINGS:
        if key in clean:
            clean[key] = 1 if clean[key] else 0
    if clean.get("sms_enabled") and not notification_sms.available():
        frappe.throw(_("SMS is not set up for this site."))
    lead = clean.get("reminder_lead_hours")
    if lead is not None and not LEAD_HOURS_RANGE[0] <= lead <= LEAD_HOURS_RANGE[1]:
        frappe.throw(_("Choose a reminder lead time from 1 to 72 hours."))
    if frappe.db.exists("Customer Notification Settings", organization):
        doc = frappe.get_doc("Customer Notification Settings", organization)
    else:
        doc = frappe.get_doc(dict(doctype="Customer Notification Settings", organization=organization, **DEFAULT_SETTINGS))
    doc.update(clean)
    doc.save(ignore_permissions=True)
    return business_settings(organization)


@frappe.whitelist()
def for_appointment(booking_id):
    doc = frappe.get_doc("Appointment", booking_id)
    require_access(doc)
    rows = frappe.get_all(
        "Appointment Notification",
        filters={"appointment": doc.name},
        fields=["name", "event", "channel", "status", "skip_reason", "email_queue", "creation"],
        order_by="creation asc",
    )
    return [_with_delivery(row) for row in rows]


def _with_delivery(row):
    """Read the delivery state from the Email Queue row the job created."""
    if row.status == "Queued" and row.email_queue:
        queue_status = frappe.db.get_value("Email Queue", row.email_queue, "status")
        row.status = EMAIL_QUEUE_STATUS.get(queue_status, "Failed" if queue_status else "Queued")
    row.pop("email_queue", None)
    return row


def _require_manager(organization):
    """The owner for a workspace key the current user manages."""
    organization = organization or ""
    if organization.startswith(business_owner.PREFIX):
        from appointment.scheduler.independent import require_owner

        require_owner(organization.removeprefix(business_owner.PREFIX))
    elif organization not in membership.manager_organizations():
        frappe.throw(_("You cannot manage notifications for this business."), frappe.PermissionError)
    return business_owner.from_key(organization)


# ---------------------------------------------------------------------------
# Customer opt-out (reminders only)
# ---------------------------------------------------------------------------
@frappe.whitelist(allow_guest=True)
def unsubscribe(organization, email):
    """Signed link from reminder emails. Stops reminders from one business.

    `organization` is the owner key, so it is `Provider:<provider>` for an independent provider.
    """
    from frappe.utils.verified_command import verify_request

    if not verify_request():
        return
    owner = business_owner.from_key(organization)
    key = opt_out_key(owner.key, email)
    if not frappe.db.exists("Customer Notification Opt Out", {"opt_out_key": key}):
        frappe.get_doc(
            dict(doctype="Customer Notification Opt Out", **business_owner.record_fields(owner), email=email.strip().lower(), opt_out_key=key)
        ).insert(ignore_permissions=True)
    business = owner.display_name
    frappe.respond_as_web_page(
        _("Reminders turned off"),
        _("You will no longer get appointment reminders from {0}. Booking confirmations and changes still arrive.").format(
            frappe.utils.escape_html(business)
        ),
        indicator_color="green",
    )
