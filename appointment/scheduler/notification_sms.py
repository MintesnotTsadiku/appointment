"""Send one customer notification SMS through the gateway in Frappe's SMS Settings.

The gateway is AfroMessage (https://www.afromessage.com/developers). Frappe's
`send_sms` is not used: it counts any HTTP 200 as sent, but AfroMessage
answers 200 with `acknowledge: "error"` for rejected messages, and the job
needs the provider message ID. The URL, parameters and headers still come
from SMS Settings. `afromessage_token` in site config, when set, supplies the
bearer token so the secret can stay out of the database.
"""

import re

import frappe
import pytz
import requests
from frappe import _
from frappe.utils import get_datetime

from appointment.helpers.utils import format_ethiopian_time

TIMEOUT_SECONDS = 15

COPY = {
    "Confirmation": "{0}: your booking for {1} on {2} is confirmed.",
    "Reschedule": "{0}: your booking for {1} is moved to {2}.",
    "Cancellation": "{0}: your booking for {1} on {2} is cancelled.",
    "Reminder": "{0}: reminder of your booking for {1} on {2}.",
}


def available():
    """True when the site has an SMS gateway."""
    return bool(frappe.db.get_single_value("SMS Settings", "sms_gateway_url"))


def is_muted():
    """`mute_sms` in site config wins. Without it, SMS follows `mute_emails`."""
    flag = frappe.conf.get("mute_sms")
    return bool(frappe.conf.get("mute_emails")) if flag is None else bool(int(flag))


def normalize_phone(raw):
    """Return the number in +<country><number> form, or "" when it is not usable.

    Ethiopian numbers may arrive as 09…/07…, 9…/7…, 2519… or +2519….
    """
    number = re.sub(r"[\s\-().]", "", raw or "")
    if number.startswith("+"):
        return number if number[1:].isdigit() and 8 <= len(number) - 1 <= 15 else ""
    if not number.isdigit():
        return ""
    if number.startswith("251") and len(number) == 12:
        return "+" + number
    if number.startswith("0") and len(number) == 10 and number[1] in "79":
        return "+251" + number[1:]
    if len(number) == 9 and number[0] in "79":
        return "+251" + number
    return ""


def send_notification(notification):
    """Background job: render the SMS and hand it to the gateway."""
    from appointment.scheduler.notifications import is_stale

    if not frappe.db.exists("Appointment Notification", notification):
        return  # The booking was deleted before the job ran.
    row = frappe.get_doc("Appointment Notification", notification)
    if row.status != "Queued" or row.provider_message_id:
        return
    doc = frappe.get_doc("Appointment", row.appointment)
    if is_stale(row.event, doc):
        row.db_set({"status": "Skipped", "skip_reason": "stale"})
        return
    text = render(row.event, doc, row.language)
    if is_muted():
        row.db_set({"status": "Skipped", "skip_reason": "muted", "message": text})
        return
    try:
        message_id = deliver(row.recipient, text)
    except Exception as error:
        row.db_set({"status": "Failed", "message": text, "error": str(error)[:500]})
        frappe.log_error(title="Customer SMS failed", reference_doctype="Appointment", reference_name=doc.name)
        return
    row.db_set({"status": "Sent", "message": text, "provider_message_id": message_id or ""})


def render(event, doc, language):
    business = frappe.db.get_value("Organization", doc.organization, "organization_name")
    service = frappe.db.get_value("Service", doc.service, "service_name") if doc.service else ""
    return _(COPY[event], lang=language).format(business, service, when(doc, language))


def when(doc, language):
    zone = pytz.timezone(doc.booking_timezone or "Africa/Addis_Ababa")
    local = pytz.UTC.localize(get_datetime(doc.starts_at)).astimezone(zone)
    if language == "am":
        return f"{local:%Y-%m-%d} {format_ethiopian_time(local)}"
    return f"{local:%a %d %b, %I:%M %p}"


def deliver(phone, text):
    """POST one message. Returns the provider message ID or raises."""
    settings = frappe.get_single("SMS Settings")
    headers = {"Accept": "application/json"}
    payload = {}
    for parameter in settings.parameters:
        (headers if parameter.header else payload)[parameter.parameter] = parameter.value
    if frappe.conf.get("afromessage_token"):
        headers["Authorization"] = f"Bearer {frappe.conf.afromessage_token}"
    payload[settings.message_parameter or "message"] = text
    payload[settings.receiver_parameter or "to"] = phone

    if settings.use_post:
        as_json = headers.get("Content-Type") == "application/json"
        response = requests.post(
            settings.sms_gateway_url, headers=headers, timeout=TIMEOUT_SECONDS,
            **({"json": payload} if as_json else {"data": payload}),
        )
    else:
        response = requests.get(settings.sms_gateway_url, headers=headers, params=payload, timeout=TIMEOUT_SECONDS)
    response.raise_for_status()
    body = response.json()
    if body.get("acknowledge") != "success":
        errors = (body.get("response") or {}).get("errors") or body
        raise frappe.ValidationError(f"SMS gateway refused the message: {errors}")
    return (body.get("response") or {}).get("message_id")
