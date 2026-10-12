"""Readable referral codes and the business facts the referral loop needs.

A code is letters from a name plus three digits, for example `BLOOM427`.
Business and partner codes share the Business Referral Code table; customer
codes live in Customer Referral Code. Codes never change once issued.
"""

import random
import re
import unicodedata

import frappe
from frappe import _

from appointment.scheduler import business_owner

PARTNER_PREFIX = "Partner:"
CODE_PATTERN = re.compile(r"^[A-Z0-9]{4,20}$")
LETTERS = 6
ATTEMPTS = 40


def clean(code):
    """The canonical form of a code typed or pasted by a person. Empty when it cannot be a code."""
    value = re.sub(r"[^A-Za-z0-9]", "", str(code or "")).upper()
    return value if CODE_PATTERN.match(value) else ""


def business_code(owner_key):
    """The referral code of a business. Creates it on first use."""
    existing = frappe.db.get_value("Business Referral Code", {"owner_key": owner_key}, "name")
    if existing:
        return existing
    owner = business_owner.from_key(owner_key)
    frappe.db.sql("select name from `tabUser` where name=%s for update", owner_user(owner_key) or "Administrator")
    existing = frappe.db.get_value("Business Referral Code", {"owner_key": owner_key}, "name")
    if existing:
        return existing
    return _insert_code("Business Referral Code", owner.display_name, dict(
        holder_type="Business", owner_key=owner_key, holder_name=owner.display_name, **business_owner.record_fields(owner),
    ))


def partner_code(partner):
    """The referral code of an approved Growth Partner. Creates it on first use."""
    key = PARTNER_PREFIX + partner.name
    existing = frappe.db.get_value("Business Referral Code", {"owner_key": key}, "name")
    if existing:
        return existing
    label = partner.organization_name or partner.partner_name
    return _insert_code("Business Referral Code", label, dict(
        holder_type="Partner", owner_key=key, holder_name=label, growth_partner=partner.name,
    ))


def customer_code(profile_name):
    """The personal referral code of one customer at one business. Creates it on first use."""
    existing = frappe.db.get_value("Customer Referral Code", {"customer_profile": profile_name}, "name")
    if existing:
        return existing
    profile = frappe.db.get_value(
        "Customer Profile", profile_name, ["name", "display_name", "organization", "independent_provider"], as_dict=True
    )
    if not profile:
        frappe.throw(_("Customer not found."), frappe.DoesNotExistError)
    # Five digits: a customer code carries a first name, so it must not be easy to guess.
    return _insert_code("Customer Referral Code", first_name(profile.display_name), min_digits=5, values=dict(
        customer_profile=profile.name, owner_key=business_owner.record_key(profile),
        organization=profile.organization, independent_provider=profile.independent_provider,
    ))


def resolve(code):
    """The Business Referral Code row for a code, or None."""
    code = clean(code)
    if not code:
        return None
    return frappe.db.get_value(
        "Business Referral Code", code, ["name", "holder_type", "owner_key", "holder_name", "growth_partner"], as_dict=True
    )


# ---------------------------------------------------------------------------
# Business facts
# ---------------------------------------------------------------------------
def owner_user(owner_key):
    """The account that runs a business, or None."""
    if not owner_key:
        return None
    if owner_key.startswith(business_owner.PREFIX):
        return frappe.db.get_value("Provider", owner_key.removeprefix(business_owner.PREFIX), "user")
    return frappe.db.get_value("Organization", owner_key, "owner_user")


def display_name(owner_key):
    try:
        return business_owner.from_key(owner_key).display_name
    except frappe.DoesNotExistError:
        return owner_key


def first_name(name):
    parts = (name or "").strip().split()
    return parts[0] if parts else ""


# ---------------------------------------------------------------------------
# Generation
# ---------------------------------------------------------------------------
def _insert_code(doctype, label, values, min_digits=3):
    stem = _stem(label)
    for attempt in range(ATTEMPTS):
        digits = max(min_digits, 3 if attempt < ATTEMPTS // 2 else 5)
        code = f"{stem}{random.randint(10 ** (digits - 1), 10 ** digits - 1)}"
        if frappe.db.exists(doctype, code):
            continue
        frappe.get_doc(dict(doctype=doctype, code=code, **values)).insert(ignore_permissions=True)
        # Codes are created on first use, often in a GET request, which Frappe does not commit by default.
        frappe.local.flags.commit = True
        return code
    frappe.throw(_("Could not create a referral code. Try again."))


def _stem(label):
    """Up to six ASCII letters from a name; names in other scripts fall back to a neutral stem."""
    ascii_text = unicodedata.normalize("NFKD", label or "").encode("ascii", "ignore").decode()
    letters = re.sub(r"[^A-Za-z]", "", ascii_text).upper()
    return letters[:LETTERS] if len(letters) >= 3 else "BOOK"
