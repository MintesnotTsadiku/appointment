"""Render and queue one customer notification email.

Values are escaped here because `frappe.render_template` does not autoescape.
The only link is the business booking page, plus a signed reminder opt-out.
The business is the booking's owner: an Organization or an independent provider.
"""

import frappe
import pytz
from frappe import _
from frappe.utils import escape_html, flt, get_datetime, get_url
from frappe.utils.verified_command import get_signed_params

from appointment.helpers.utils import format_ethiopian_time
from appointment.scheduler import business_owner, self_service
from appointment.scheduler.notifications import is_stale

TEMPLATE = "appointment/templates/emails/customer_notification.html"
NAME_LIMIT = 80

COPY = {
    "Confirmation": dict(
        subject="Your booking with {0} is confirmed",
        heading="Booking confirmed",
        intro="Hello {0}, your booking is confirmed.",
    ),
    "Reschedule": dict(
        subject="Your booking with {0} has a new time",
        heading="Booking moved",
        intro="Hello {0}, {1} moved your booking. The new time is below.",
    ),
    "Cancellation": dict(
        subject="Your booking with {0} is cancelled",
        heading="Booking cancelled",
        intro="Hello {0}, {1} cancelled your booking.",
    ),
    "Reminder": dict(
        subject="Reminder: your booking with {0}",
        heading="Upcoming booking",
        intro="Hello {0}, this is a reminder of your booking.",
    ),
}
# The customer made the change through their manage link.
CUSTOMER_INTRO = {
    "Reschedule": "Hello {0}, you moved your booking. The new time is below.",
    "Cancellation": "Hello {0}, you cancelled your booking.",
}
COPY["Payment request"] = dict(
    subject="Complete your booking with {0}",
    heading="Payment needed",
    intro="Hello {0}, your booking is held until {1}. Pay {2} to confirm it.",
)
COPY["Payment reminder"] = dict(
    subject="Reminder: pay to keep your booking with {0}",
    heading="Payment still needed",
    intro="Hello {0}, we have not received your payment yet. Your booking is held until {1}.",
)
COPY["Payment receipt"] = dict(
    subject="Your receipt from {0}",
    heading="Payment received",
    intro="Hello {0}, thank you for your payment to {1}. Your receipt is attached.",
)
COPY["Refund receipt"] = dict(
    subject="Your refund receipt from {0}",
    heading="Refund recorded",
    intro="Hello {0}, {1} recorded a refund for your booking. Your refund receipt is attached.",
)
UNPAID_INTRO = "Hello {0}, your booking was released because the payment was not received."
# Events whose booking is still open, so the email carries the manage link.
MANAGEABLE = ("Confirmation", "Reschedule", "Reminder", "Payment request", "Payment reminder", "Payment receipt")


def send_notification(notification):
    """Background job: render the message and put it on Frappe's email queue."""
    if not frappe.db.exists("Appointment Notification", notification):
        return  # The booking was deleted before the job ran.
    row = frappe.get_doc("Appointment Notification", notification)
    if row.status != "Queued" or row.email_queue:
        return
    doc = frappe.get_doc("Appointment", row.appointment)
    if is_stale(row.event, doc):
        row.db_set({"status": "Skipped", "skip_reason": "stale"})
        return
    try:
        message = render(row.event, doc, row.language, row.recipient, receipt=row.get("receipt"))
        attachments = None
        if row.get("receipt"):
            from appointment.scheduler import receipts

            attachments = [receipts.attachment(row.receipt)]
        queue = frappe.sendmail(
            attachments=attachments,
            recipients=[row.recipient],
            subject=message["subject"],
            message=message["html"],
            reply_to=business_owner.for_booking(doc).reply_to or None,
            reference_doctype="Appointment",
            reference_name=doc.name,
            add_unsubscribe_link=0,
        )
    except Exception as error:
        row.db_set({"status": "Failed", "error": str(error)[:500]})
        frappe.log_error(title="Customer notification failed", reference_doctype="Appointment", reference_name=doc.name)
        return
    row.db_set("email_queue", queue.name if queue else None)


def render(event, doc, language, recipient, receipt=None):
    """Subject and HTML for one event, in `language` ("en" or "am")."""
    business = business_owner.for_booking(doc)
    business_name = business.display_name
    customer = (doc.client_name or "").strip()[:NAME_LIMIT]
    copy = COPY[event]
    by_customer = doc.get("last_changed_by") == "Customer" and event in CUSTOMER_INTRO
    unpaid = event == "Cancellation" and doc.get("cancellation_reason") in ("Payment not received", _("Payment not received"))
    payment = _payment_facts(doc, language)

    def t(text, *args):
        return _(text, lang=language).format(*(escape_html(str(arg)) for arg in args))

    context = dict(
        lang=language,
        subject=_(copy["subject"], lang=language).format(business_name),
        heading=t(copy["heading"]),
        intro=t(UNPAID_INTRO if unpaid else CUSTOMER_INTRO[event] if by_customer else copy["intro"],
                customer, *(payment["intro_args"] if event in ("Payment request", "Payment reminder") else [business_name])),
        business_name=escape_html(business_name),
        logo_url=_public_logo(business.logo),
        details=[
            (t("Service"), escape_html(_value("Service", doc.service, "service_name"))),
            *([(t("Provider"), escape_html(_value("Provider", doc.provider, "full_name")))] if doc.provider else []),
            (t("Location"), escape_html(_value("Location", doc.location, "location_name"))),
            *_resource_rows(doc, t),
            *([(t("Quantity"), escape_html(str(doc.quantity)))] if (doc.get("quantity") or 1) > 1 else []),
            (t("Date and time"), escape_html(when(doc, language))),
            *_fee_rows(doc, t),
            *(payment["rows"] if event not in ("Cancellation", "Refund receipt") else []),
            *_receipt_rows(receipt, t),
        ],
        manage_label=t("Manage your booking"),
        manage_url=escape_html(self_service.manage_url(doc)) if event in MANAGEABLE else "",
        booking_label=t("Open the booking page"),
        booking_url=escape_html(get_url(business.book_path)) if business.book_path else "",
        contact=t("Questions? Contact {0}.", " · ".join(filter(None, [business.phone, business.email]))) if (business.phone or business.email) else "",
        footer=t("You get this email because you booked with {0}.", business_name),
        all_bookings_label=t("See all your bookings"),
        all_bookings_url=escape_html(get_url(business.my_bookings_path)) if business.my_bookings_path else "",
        opt_out_label=t("Stop reminders from this business"),
        opt_out_url=escape_html(opt_out_url(business.key, recipient)) if event == "Reminder" else "",
    )
    return {"subject": context["subject"], "html": frappe.render_template(TEMPLATE, context)}


def _payment_facts(doc, language):
    """Amounts and deadline from the booking's latest payment, for payment emails and the confirmation."""
    from appointment.scheduler import payments

    payment = payments.latest_payment(doc.name)
    if not payment:
        return {"rows": [], "intro_args": ["", ""]}

    def t(text):
        return _(text, lang=language)

    zone = pytz.timezone(doc.booking_timezone or "Africa/Addis_Ababa")
    deadline = pytz.UTC.localize(get_datetime(payment.hold_expires_at)).astimezone(zone) if payment.hold_expires_at else None
    deadline_text = f"{deadline:%Y-%m-%d %H:%M}" if deadline else ""
    money = lambda value: f"{payment.currency} {flt(value):,.2f}"  # noqa: E731
    rows = [(escape_html(t("Paid") if payment.status == "Paid" else t("Due now")), escape_html(money(payment.amount)))]
    if flt(payment.balance_due):
        rows.append((escape_html(t("Balance at the visit")), escape_html(money(payment.balance_due))))
    if payment.method == payments.BANK and payment.status in ("Awaiting payment", "Rejected"):
        for account in payments.bank_accounts(payment.organization, payment.collector):
            rows.append((escape_html(t("Pay to")), escape_html(f"{account['bank']} · {account['account_name']} · {account['account_number']}")))
        rows.append((escape_html(t("Payment reference")), escape_html(doc.appointment_id or doc.name)))
    return {"rows": rows, "intro_args": [deadline_text, money(payment.amount)]}


def _resource_rows(doc, t):
    """The rooms or equipment the booking holds, by name."""
    names = [_value("Resource", row.resource, "resource_name") for row in doc.get("resources") or []]
    names = [name for name in names if name]
    return [(t("Room or equipment"), escape_html(", ".join(names)))] if names else []


def _receipt_rows(receipt, t):
    if not receipt:
        return []
    row = frappe.db.get_value("Payment Receipt", receipt, ["receipt_number", "kind", "amount", "currency"], as_dict=True)
    if not row:
        return []
    rows = [(t("Receipt number"), escape_html(row.receipt_number))]
    if row.kind == "Refund":
        rows.append((t("Amount refunded"), escape_html(f"{row.currency} {flt(row.amount):,.2f}")))
    return rows


def _fee_rows(doc, t):
    """A late cancel records a fee and a refund; the customer sees both."""
    if doc.status != "Cancelled" or not (flt(doc.cancellation_fee) or flt(doc.refund_due)):
        return []
    return [
        (t("Late cancellation fee"), escape_html(f"ETB {flt(doc.cancellation_fee):,.2f}")),
        (t("Refund due"), escape_html(f"ETB {flt(doc.refund_due):,.2f}")),
    ]


def when(doc, language):
    """Start time in the booking time zone. Amharic adds Ethiopian clock time."""
    zone = pytz.timezone(doc.booking_timezone or "Africa/Addis_Ababa")
    local = pytz.UTC.localize(get_datetime(doc.starts_at)).astimezone(zone)
    if language == "am":
        return f"{local:%Y-%m-%d} · {format_ethiopian_time(local)} ({local:%H:%M})"
    return f"{local:%A, %d %B %Y, %I:%M %p} ({zone.zone.replace('_', ' ')})"


def opt_out_url(owner_key, email):
    # The parameter keeps its name so links already sent keep working.
    params = get_signed_params({"organization": owner_key, "email": email})
    return get_url(f"/api/method/appointment.scheduler.notifications.unsubscribe?{params}")


def _public_logo(logo):
    """Only a public file on this site, never a remote or private URL."""
    if logo and logo.startswith("/files/"):
        return escape_html(get_url(logo))
    return ""


def _value(doctype, name, field):
    return (frappe.db.get_value(doctype, name, field) if name else "") or ""
