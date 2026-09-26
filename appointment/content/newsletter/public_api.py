"""Guest consent actions accept only site identifiers and opaque tokens."""

import frappe
from frappe.rate_limiter import rate_limit

from appointment.content.newsletter import audience, senders


@frappe.whitelist(allow_guest=True, methods=["GET"])
def signup_status(site):
    try:
        audience.public_site(site)
    except (frappe.DoesNotExistError, frappe.PermissionError):
        return {"available": False}
    return {"available": True}


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=20, seconds=60)
def subscribe(site, email, consent, locale="en"):
    return audience.subscribe(site, email, consent, locale)


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=30, seconds=60)
def confirm(token):
    return audience.confirm(token)


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=30, seconds=60)
def unsubscribe(token):
    return audience.unsubscribe(token)


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=20, seconds=60)
def verify_sender(token):
    return senders.verify(token)
