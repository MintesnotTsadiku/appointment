"""Business ownership resolution for tenant-scoped content.

One Organization, or one independent Provider, is one Business. Every content,
gallery, audience and publication operation must resolve exactly one authorized
business. Missing or ambiguous ownership fails closed.
"""

from __future__ import annotations

import frappe
from frappe import _

from appointment.public_experience import access as public_access

OWNER_TYPES = ("Organization", "Provider")


def active_owner_key(owner_type: str, organization: str | None = None, provider: str | None = None) -> str | None:
    """Return the canonical business key, or ``None`` for an invalid owner."""

    if owner_type == "Organization" and organization and not provider:
        return f"organization:{organization}"
    if owner_type == "Provider" and provider and not organization:
        return f"provider:{provider}"
    return None


def require_business_owner(owner_type: str, organization: str | None = None, provider: str | None = None) -> str:
    """Return the business key or refuse the operation."""

    key = active_owner_key(owner_type, organization, provider)
    if not key:
        frappe.throw(_("Content requires exactly one business owner."), frappe.PermissionError)
    return key


def can_manage_business(
    owner_type: str,
    organization: str | None = None,
    provider: str | None = None,
    user: str | None = None,
) -> bool:
    return public_access.can_manage_owner(owner_type, organization, provider, user)


def require_manage_business(
    owner_type: str,
    organization: str | None = None,
    provider: str | None = None,
    user: str | None = None,
) -> None:
    require_business_owner(owner_type, organization, provider)
    if not can_manage_business(owner_type, organization, provider, user):
        frappe.throw(_("You are not allowed to manage this business content."), frappe.PermissionError)


def owner_query_condition(table: str, user: str | None = None) -> str:
    """A SQL condition matching the rows of ``table`` a user may read.

    ``table`` is the already-quoted table name (for example
    ``tabContent Ownership``). Administrator is unrestricted; an unauthenticated
    or non-member actor matches nothing.
    """

    actor = user or frappe.session.user
    if actor == "Administrator":
        return ""
    if not public_access._enabled(actor):
        return "1=0"
    tick = chr(96)
    parts: list[str] = []
    organizations = public_access.membership.manager_organizations(actor)
    if organizations:
        names = ",".join(frappe.db.escape(name) for name in organizations)
        parts.append(
            f"{tick}{table}{tick}.owner_type='Organization' and {tick}{table}{tick}.organization in ({names})"
        )
    providers = public_access.owned_providers(actor)
    if providers:
        names = ",".join(frappe.db.escape(name) for name in providers)
        parts.append(
            f"{tick}{table}{tick}.owner_type='Provider' and {tick}{table}{tick}.provider in ({names})"
        )
    return "(" + " or ".join(parts) + ")" if parts else "1=0"
