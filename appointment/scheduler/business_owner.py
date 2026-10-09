"""The business that owns customer data: an Organization or an independent provider.

An organization's key is its name. An independent provider's key is
`Provider:<provider>`, the same as its workspace key. Organization keys are
unchanged, so existing profile keys, opt-outs and links keep working.
See docs/features/INDEPENDENT_PROVIDER_CUSTOMERS_PLAN.md.
"""

import frappe
from frappe import _

PREFIX = "Provider:"


def from_key(key, offering=None):
    """The owner for a workspace or record key. Raises when it does not exist."""
    key = key or ""
    if key.startswith(PREFIX):
        return _provider(key.removeprefix(PREFIX), offering)
    return _organization(key)


def for_booking(doc):
    """The owner of an Appointment, or of a row with `organization` and `service`."""
    if doc.get("organization"):
        return _organization(doc.organization)
    provider = frappe.db.get_value("Service", doc.get("service"), "independent_provider")
    if not provider or provider != doc.get("provider"):
        return None
    return _provider(provider, doc.get("event_type"))


def for_record(doc):
    """The owner of a Customer Profile, Appointment Notification or opt-out row."""
    if doc.get("organization"):
        return _organization(doc.organization)
    if doc.get("independent_provider"):
        return _provider(doc.independent_provider)
    return None


def for_offering(offering):
    """The independent owner of an offering; organization offerings use their slug instead."""
    event = frappe.db.get_value("EventType", offering, ["provider", "service"], as_dict=True) if offering else None
    provider = event and event.provider and frappe.db.get_value("Service", event.service, "independent_provider")
    if not provider or provider != event.provider or frappe.db.get_value("Service", event.service, "organization"):
        frappe.throw(_("Business not found."), frappe.DoesNotExistError)
    return _provider(provider, offering)


# ---------------------------------------------------------------------------
# Record scopes
# ---------------------------------------------------------------------------
def record_fields(owner):
    """Owner fields to set on a new owned record."""
    return {"organization": owner.organization, "independent_provider": owner.provider}


def record_filters(owner):
    """Filters for owned records (profiles, notifications, opt-outs)."""
    if owner.organization:
        return {"organization": owner.organization}
    return {"independent_provider": owner.provider, "organization": ["is", "not set"]}


def booking_filters(owner):
    """Filters for the owner's Appointments."""
    if owner.organization:
        return {"organization": owner.organization}
    return {"provider": owner.provider, "organization": ["is", "not set"], "service": ["in", owner.services or [""]]}


def record_key(doc):
    """The owner key of an owned record, or None."""
    if doc.get("organization"):
        return doc.organization
    return PREFIX + doc.independent_provider if doc.get("independent_provider") else None


# ---------------------------------------------------------------------------
# Resolution
# ---------------------------------------------------------------------------
def _organization(name):
    row = frappe.db.get_value(
        "Organization", name, ["name", "organization_name", "slug", "logo", "email", "phone", "timezone", "language"], as_dict=True
    )
    if not row:
        frappe.throw(_("Business not found."), frappe.DoesNotExistError)
    root = f"/{row.slug}" if row.slug else ""
    return frappe._dict(
        key=row.name, kind="organization", organization=row.name, provider=None,
        display_name=row.organization_name or row.name, logo=row.logo, email=row.email, phone=row.phone,
        reply_to=row.email, timezone=row.timezone, language=row.language, slug=row.slug,
        public_root=root, book_path=f"{root}/book" if root else "", my_bookings_path=f"{root}/my-bookings" if root else "",
        manage_root=f"{root}/booking" if root else "",
    )


def _provider(name, offering=None):
    row = frappe.db.get_value(
        "Provider", name,
        ["name", "provider_name", "display_name", "profile_photo", "email", "phone", "user", "timezone", "language", "organization"],
        as_dict=True,
    )
    if not row or row.organization:
        frappe.throw(_("Business not found."), frappe.DoesNotExistError)
    services = frappe.get_all("Service", filters={"independent_provider": name, "organization": ["is", "not set"]}, pluck="name")
    offering = offering or _first_offering(name, services)
    root = f"/schedule/individual/{offering}" if offering else ""
    return frappe._dict(
        key=PREFIX + name, kind="provider", organization=None, provider=name, services=services,
        display_name=row.display_name or row.provider_name or name, logo=row.profile_photo, email=row.email, phone=row.phone,
        # The provider is the business, so replies reach their own account when no business email is set.
        reply_to=row.email or row.user, timezone=row.timezone, language=row.language, slug=None,
        public_root=root, book_path=root, my_bookings_path=f"{root}/my-bookings" if root else "",
        manage_root="/schedule/individual/booking",
    )


def _first_offering(provider, services):
    rows = frappe.get_all(
        "EventType", filters={"provider": provider, "service": ["in", services or [""]]}, pluck="name", order_by="creation asc", limit=1
    )
    return rows[0] if rows else None
