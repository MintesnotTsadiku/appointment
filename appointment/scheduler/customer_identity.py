"""Business-owned customer identity: normalization, exact matching and merge.

A Customer Profile belongs to one business: an Organization or an independent
provider (see `business_owner`). Profiles match only on the exact normalized
email or phone inside that business, never on names. Bookings keep their own
contact snapshot after they link to a profile.
"""

import hashlib

import frappe
from frappe import _
from frappe.utils import validate_email_address

from appointment.scheduler import business_owner
from appointment.scheduler.notification_sms import normalize_phone


def normalize_email(value):
    email = (value or "").strip().lower()
    return email if email and validate_email_address(email) else ""


def match_key(owner_key, kind, value):
    """Hash of the business owner key, kind and value. Empty when there is no value."""
    if not value:
        return None
    return hashlib.sha256(f"{owner_key}\0{kind}\0{value}".encode()).hexdigest()


def find_by_key(owner_key, email="", phone=""):
    """Profiles that match exactly, as {"email": name, "phone": name}."""
    found = {}
    for kind, value in (("email", normalize_email(email)), ("phone", normalize_phone(phone))):
        key = match_key(owner_key, kind, value)
        if key:
            name = frappe.db.get_value("Customer Profile", {f"{kind}_key": key}, "name")
            if name:
                found[kind] = name
    return found


def prepare_profile(doc):
    """Controller validation for Customer Profile."""
    doc.display_name = (doc.display_name or "").strip()
    if bool(doc.organization) == bool(doc.independent_provider):
        frappe.throw(_("A customer must belong to exactly one business."))
    business_owner.for_record(doc)  # Raises when the owner does not exist.
    if not doc.display_name:
        frappe.throw(_("A customer name is required."))
    if doc.primary_email and not normalize_email(doc.primary_email):
        frappe.throw(_("Enter a valid email address."))
    if doc.primary_phone and not normalize_phone(doc.primary_phone):
        frappe.throw(_("Enter a valid phone number."))
    doc.primary_email = normalize_email(doc.primary_email) or None
    doc.primary_phone = normalize_phone(doc.primary_phone) or None
    owner_key = business_owner.record_key(doc)
    doc.email_key = match_key(owner_key, "email", doc.primary_email)
    doc.phone_key = match_key(owner_key, "phone", doc.primary_phone)
    for kind in ("email", "phone"):
        key = doc.get(f"{kind}_key")
        other = key and frappe.db.get_value("Customer Profile", {f"{kind}_key": key, "name": ["!=", doc.name]}, "name")
        if other:
            frappe.throw(_("Another customer of this business already uses this {0}.").format(_(kind)), frappe.DuplicateEntryError)
    before = doc.get_doc_before_save()
    if before and business_owner.record_key(before) != owner_key and frappe.db.exists("Appointment", {"customer": doc.name}):
        frappe.throw(_("A customer with bookings cannot move to another business."))
    _check_preferences(doc)


def _check_preferences(doc):
    seen = set()
    for row in doc.preferred_providers:
        if doc.independent_provider:
            _check_independent_preference(doc, row)
        elif not frappe.db.exists(
            "Provider Organization",
            {"parent": row.provider, "parenttype": "Provider", "organization": doc.organization, "status": "Active"},
        ):
            frappe.throw(_("Preferred providers must work for this business."))
        if not doc.independent_provider and row.service and frappe.db.get_value("Service", row.service, "organization") != doc.organization:
            frappe.throw(_("Preferred services must belong to this business."))
        pair = (row.provider, row.service or "")
        if pair in seen:
            frappe.throw(_("Each preferred provider and service pair can appear once."))
        seen.add(pair)


def _check_independent_preference(doc, row):
    """An independent provider's customers can prefer only that provider and its services."""
    if row.provider != doc.independent_provider:
        frappe.throw(_("Preferred providers must work for this business."))
    service = frappe.db.get_value("Service", row.service, ["independent_provider", "organization"], as_dict=True) if row.service else None
    if row.service and (not service or service.independent_provider != doc.independent_provider or service.organization):
        frappe.throw(_("Preferred services must belong to this business."))


def resolve_for_booking(doc):
    """Link a new booking to its customer, creating the profile when none matches.

    Email wins when email and phone match two different profiles; the phone
    match is flagged for staff as a possible duplicate.
    """
    owner = business_owner.for_booking(doc)
    if not owner:
        return  # Bookings outside any business, such as personal meetings, have no customer profile.
    if doc.customer:
        profile = frappe.db.get_value("Customer Profile", doc.customer, ["organization", "independent_provider"], as_dict=True)
        if not profile or business_owner.record_key(profile) != owner.key:
            frappe.throw(_("The customer belongs to another business."), frappe.PermissionError)
        return
    found = find_by_key(owner.key, doc.client_email, doc.client_phone)
    if found.get("email") and found.get("phone") and found["email"] != found["phone"]:
        frappe.db.set_value("Customer Profile", found["phone"], "possible_duplicate", 1, update_modified=False)
    doc.customer = found.get("email") or found.get("phone") or create_profile(doc, owner).name


def create_profile(doc, owner=None):
    owner = owner or business_owner.for_booking(doc)
    email = normalize_email(doc.client_email)
    phone = normalize_phone(doc.client_phone)
    found = find_by_key(owner.key, email, phone)
    return frappe.get_doc(
        dict(
            doctype="Customer Profile",
            **business_owner.record_fields(owner),
            display_name=(doc.client_name or "").strip() or email or phone,
            # Contact that already belongs to another profile stays only on the booking.
            primary_email=None if found.get("email") else email or None,
            primary_phone=None if found.get("phone") else phone or None,
            preferred_language=doc.get("customer_language") or None,
        )
    ).insert(ignore_permissions=True)


def merge(source, target):
    """Move every booking and preference from `source` to `target`, then archive `source`."""
    source_doc = frappe.get_doc("Customer Profile", source)
    target_doc = frappe.get_doc("Customer Profile", target)
    if source == target or business_owner.record_key(source_doc) != business_owner.record_key(target_doc):
        frappe.throw(_("Choose two different customers of the same business."))
    if source_doc.status != "Active" or target_doc.status != "Active":
        frappe.throw(_("Only active customers can be merged."))
    moved = frappe.get_all("Appointment", filters={"customer": source}, pluck="name")
    for name in moved:
        # The link is server-owned; a direct update keeps the booking's lifecycle untouched.
        frappe.db.set_value("Appointment", name, "customer", target, update_modified=False)
    existing = {(row.provider, row.service or "") for row in target_doc.preferred_providers}
    for row in source_doc.preferred_providers:
        if (row.provider, row.service or "") not in existing:
            target_doc.append("preferred_providers", {"provider": row.provider, "service": row.service, "priority": row.priority})
    email, phone = source_doc.primary_email, source_doc.primary_phone
    source_doc.update(dict(status="Archived", merged_into=target, primary_email=None, primary_phone=None))
    source_doc.save(ignore_permissions=True)
    for field, value in (("primary_email", email), ("primary_phone", phone), ("preferred_language", source_doc.preferred_language)):
        if value and not target_doc.get(field):
            target_doc.set(field, value)
    if source_doc.private_notes:
        target_doc.private_notes = "\n\n".join(filter(None, [target_doc.private_notes, source_doc.private_notes]))
    target_doc.possible_duplicate = 0
    target_doc.save(ignore_permissions=True)
    target_doc.add_comment("Info", _("Merged {0} into this customer. {1} bookings moved.").format(source, len(moved)))
    return {"target": target, "moved": len(moved)}
