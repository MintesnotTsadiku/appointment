"""Render and queue one customer notification email.

Values are escaped here because `frappe.render_template` does not autoescape.
The only link is the business booking page, plus a signed reminder opt-out.
"""

import frappe
import pytz
from frappe import _
from frappe.utils import escape_html, get_datetime, get_url
from frappe.utils.verified_command import get_signed_params

from appointment.helpers.utils import format_ethiopian_time
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
        message = render(row.event, doc, row.language, row.recipient)
        queue = frappe.sendmail(
            recipients=[row.recipient],
            subject=message["subject"],
            message=message["html"],
            reply_to=frappe.db.get_value("Organization", doc.organization, "email") or None,
            reference_doctype="Appointment",
            reference_name=doc.name,
            add_unsubscribe_link=0,
        )
    except Exception as error:
        row.db_set({"status": "Failed", "error": str(error)[:500]})
        frappe.log_error(title="Customer notification failed", reference_doctype="Appointment", reference_name=doc.name)
        return
    row.db_set("email_queue", queue.name if queue else None)


def render(event, doc, language, recipient):
    """Subject and HTML for one event, in `language` ("en" or "am")."""
    business = frappe.get_doc("Organization", doc.organization)
    business_name = business.organization_name
    customer = (doc.client_name or "").strip()[:NAME_LIMIT]
    copy = COPY[event]

    def t(text, *args):
        return _(text, lang=language).format(*(escape_html(str(arg)) for arg in args))

    context = dict(
        lang=language,
        subject=_(copy["subject"], lang=language).format(business_name),
        heading=t(copy["heading"]),
        intro=t(copy["intro"], customer, business_name),
        business_name=escape_html(business_name),
        logo_url=_public_logo(business.logo),
        details=[
            (t("Service"), escape_html(_value("Service", doc.service, "service_name"))),
            (t("Provider"), escape_html(_value("Provider", doc.provider, "full_name"))),
            (t("Location"), escape_html(_value("Location", doc.location, "location_name"))),
            (t("Date and time"), escape_html(when(doc, language))),
        ],
        booking_label=t("Open the booking page"),
        booking_url=escape_html(get_url(f"/{business.slug}/book")) if business.slug else "",
        contact=t("Questions? Contact {0}.", " · ".join(filter(None, [business.phone, business.email]))) if (business.phone or business.email) else "",
        footer=t("You get this email because you booked with {0}.", business_name),
        opt_out_label=t("Stop reminders from this business"),
        opt_out_url=escape_html(opt_out_url(doc.organization, recipient)) if event == "Reminder" else "",
    )
    return {"subject": context["subject"], "html": frappe.render_template(TEMPLATE, context)}


def when(doc, language):
    """Start time in the booking time zone. Amharic adds Ethiopian clock time."""
    zone = pytz.timezone(doc.booking_timezone or "Africa/Addis_Ababa")
    local = pytz.UTC.localize(get_datetime(doc.starts_at)).astimezone(zone)
    if language == "am":
        return f"{local:%Y-%m-%d} · {format_ethiopian_time(local)} ({local:%H:%M})"
    return f"{local:%A, %d %B %Y, %I:%M %p} ({zone.zone.replace('_', ' ')})"


def opt_out_url(organization, email):
    params = get_signed_params({"organization": organization, "email": email})
    return get_url(f"/api/method/appointment.scheduler.notifications.unsubscribe?{params}")


def _public_logo(logo):
    """Only a public file on this site, never a remote or private URL."""
    if logo and logo.startswith("/files/"):
        return escape_html(get_url(logo))
    return ""


def _value(doctype, name, field):
    return (frappe.db.get_value(doctype, name, field) if name else "") or ""
