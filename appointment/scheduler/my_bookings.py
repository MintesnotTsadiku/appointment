"""My bookings: a customer's bookings with one business, opened by an emailed one-time link.

The customer gives an email; when the business knows it, an email carries a link
that works once for 30 minutes and opens a 7-day session on that device. There
is no password. Each open booking keeps its own manage link, so changes follow
the existing self-service rules. See docs/features/MY_BOOKINGS_PLAN.md.
"""

import hashlib
import hmac
import time

import frappe
from frappe import _
from frappe.rate_limiter import rate_limit
from frappe.utils import cint, escape_html, get_datetime, get_url
from frappe.utils.password import get_encryption_key

from appointment.scheduler import customer_identity, self_service

LINK_SECONDS = 30 * 60
SESSION_SECONDS = 7 * 24 * 3600
RESEND_SECONDS = 120
OPEN = ("Pending", "Confirmed")
LIST_LIMIT = 100
TEMPLATE = "appointment/templates/emails/customer_notification.html"
SENT = "If this email has bookings with {0}, we sent it a link to see them."
INVALID = "This link no longer works. Ask for a new one."


# ---------------------------------------------------------------------------
# Tokens
# ---------------------------------------------------------------------------
def _sign(purpose, organization, email, *parts):
    message = "\0".join([purpose, organization, email, *map(str, parts)])
    return hmac.new(get_encryption_key().encode(), message.encode(), hashlib.sha256).hexdigest()[:40]


def _nonce_key(nonce):
    return f"appointment:my_bookings:link:{nonce}"


def link_token(organization, email):
    """A one-time token; the nonce lives in the cache until it is used or expires."""
    nonce = frappe.generate_hash(length=20)
    expires = int(time.time()) + LINK_SECONDS
    frappe.cache.set_value(_nonce_key(nonce), f"{organization}\0{email}", expires_in_sec=LINK_SECONDS)
    return f"{nonce}.{expires}.{_sign('link', organization, email, nonce, expires)}"


def link_url(organization, email):
    slug = frappe.db.get_value("Organization", organization, "slug")
    return get_url(f"/{slug}/my-bookings?token={link_token(organization, email)}")


def session_token(organization, email):
    expires = int(time.time()) + SESSION_SECONDS
    return f"{expires}.{_sign('session', organization, email, expires)}"


def _business(slug):
    name = frappe.db.get_value("Organization", {"slug": slug, "is_active": 1}, "name") if slug else None
    if not name:
        frappe.throw(_("Business not found."), frappe.DoesNotExistError)
    return name


# ---------------------------------------------------------------------------
# Whose bookings
# ---------------------------------------------------------------------------
def _profiles(organization, email):
    """The customer profile for this email and any profiles merged into it."""
    key = customer_identity.match_key(organization, "email", email)
    root = frappe.db.get_value("Customer Profile", {"email_key": key}, "name") if key else None
    if not root:
        return []
    root = frappe.db.get_value("Customer Profile", root, "merged_into") or root
    return [root, *frappe.get_all("Customer Profile", filters={"merged_into": root}, pluck="name")]


def _booking_names(organization, email):
    by_email = frappe.db.sql(
        "select name from `tabAppointment` where organization=%s and lower(client_email)=%s",
        (organization, email),
    )
    names = {row[0] for row in by_email}
    profiles = _profiles(organization, email)
    if profiles:
        names |= set(frappe.get_all("Appointment", filters={"organization": organization, "customer": ["in", profiles]}, pluck="name"))
    return names


def _known(organization, email):
    return bool(_profiles(organization, email)) or bool(frappe.db.exists("Appointment", {"organization": organization, "client_email": email}))


# ---------------------------------------------------------------------------
# Guest APIs
# ---------------------------------------------------------------------------
@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=5, seconds=600, methods=["POST"])
def request_link(slug, email, language=None):
    """Email a one-time link when the business knows this address. The answer never says which."""
    organization = _business(slug)
    business_name = frappe.db.get_value("Organization", organization, "organization_name")
    address = customer_identity.normalize_email(email)
    if not address:
        frappe.throw(_("Enter a valid email address."))
    throttle = f"appointment:my_bookings:sent:{organization}:{address}"
    if _known(organization, address) and not frappe.cache.get_value(throttle):
        frappe.cache.set_value(throttle, 1, expires_in_sec=RESEND_SECONDS)
        _send_link(organization, address, language if language in ("en", "am") else "en")
    return {"message": _(SENT).format(business_name)}


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=20, seconds=600, methods=["POST"])
def open_link(slug, token):
    """Exchange a one-time link for a 7-day session on this device."""
    organization = _business(slug)
    try:
        nonce, expires, signature = (token or "").split(".")
        expires = int(expires)
    except ValueError:
        frappe.throw(_(INVALID), frappe.PermissionError)
    stored = frappe.cache.get_value(_nonce_key(nonce))
    if not stored or expires < time.time():
        frappe.throw(_(INVALID), frappe.PermissionError)
    owner, email = str(stored).split("\0", 1)
    if owner != organization or not hmac.compare_digest(signature, _sign("link", organization, email, nonce, expires)):
        frappe.throw(_(INVALID), frappe.PermissionError)
    frappe.cache.delete_value(_nonce_key(nonce))  # One use only.
    return {"session": session_token(organization, email), "email": email}


def _session_email(organization, session, email):
    try:
        expires, signature = (session or "").split(".")
        expires = int(expires)
    except ValueError:
        return None
    address = customer_identity.normalize_email(email)
    if not address or expires < time.time() or not hmac.compare_digest(signature, _sign("session", organization, address, expires)):
        return None
    return address


@frappe.whitelist(allow_guest=True)
@rate_limit(limit=60, seconds=60)
def bookings(slug, session, email):
    """Upcoming and past bookings for the signed-in email at this business."""
    organization = _business(slug)
    address = _session_email(organization, session, email)
    if not address:
        return {"valid": False, "message": _("Your sign-in has ended. Ask for a new link.")}
    names = _booking_names(organization, address)
    rows = frappe.get_all(
        "Appointment", filters={"name": ["in", list(names) or [""]]},
        fields=["name", "appointment_id", "service", "provider", "event_type", "starts_at", "booking_timezone", "status", "quantity", "manage_version"],
        order_by="starts_at desc", limit=LIST_LIMIT,
    )
    now = _utc_now()
    upcoming, past = [], []
    for row in rows:
        entry = _row(row, now)
        (upcoming if entry["upcoming"] else past).append(entry)
    upcoming.reverse()  # Soonest first.
    return {"valid": True, "email": address, "upcoming": upcoming, "past": past}


def _utc_now():
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).replace(tzinfo=None)


def _row(row, now):
    from appointment.scheduler import payments

    start = get_datetime(row.starts_at)
    open_booking = row.status in OPEN and start > now
    doc = frappe.get_doc("Appointment", row.name) if open_booking else None
    rooms = [frappe.db.get_value("Resource", r, "resource_name") for r in frappe.get_all(
        "Appointment Resource", filters={"parent": row.name, "parenttype": "Appointment"}, pluck="resource")]
    payment = payments.latest_payment(row.name)
    return dict(
        reference=row.appointment_id or row.name,
        service=frappe.db.get_value("Service", row.service, "service_name"),
        provider=frappe.db.get_value("Provider", row.provider, "full_name") if row.provider else None,
        resources=[name for name in rooms if name],
        starts_at=start.isoformat() + "Z",
        timezone=row.booking_timezone,
        status=row.status,
        quantity=cint(row.quantity) or 1,
        payment_status=payment.status if payment else None,
        upcoming=start > now and row.status not in ("Cancelled",),
        manage_path=self_service.manage_url(doc).replace(get_url(), "") if doc else None,
    )


# ---------------------------------------------------------------------------
# Email
# ---------------------------------------------------------------------------
def _send_link(organization, email, language):
    business = frappe.get_doc("Organization", organization)

    def t(text, *args):
        return _(text, lang=language).format(*(escape_html(str(arg)) for arg in args))

    from appointment.scheduler.notification_email import _public_logo

    context = dict(
        lang=language,
        heading=t("Your bookings"),
        intro=t("Hello, use this link to see your bookings with {0}. It works once, for 30 minutes.", business.organization_name),
        business_name=escape_html(business.organization_name),
        logo_url=_public_logo(business.logo),
        details=[],
        manage_label=t("See my bookings"),
        manage_url=escape_html(link_url(organization, email)),
        booking_label=t("Open the booking page"),
        booking_url=escape_html(get_url(f"/{business.slug}/book")) if business.slug else "",
        contact=t("Questions? Contact {0}.", " · ".join(filter(None, [business.phone, business.email]))) if (business.phone or business.email) else "",
        footer=t("You asked for this link on the {0} booking page. If you did not, you can ignore this email.", business.organization_name),
        opt_out_label="", opt_out_url="",
    )
    frappe.sendmail(
        recipients=[email],
        subject=_("Your bookings with {0}", lang=language).format(business.organization_name),
        message=frappe.render_template(TEMPLATE, context),
        reply_to=business.email or None,
        reference_doctype="Organization", reference_name=organization,
        add_unsubscribe_link=0, delayed=True,
    )
