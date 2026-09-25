"""Capability and tenant scope for the public experience DocTypes."""

from __future__ import annotations

import frappe
from frappe import _

from appointment.scheduler import membership


def _actor(user=None) -> str:
    return user or frappe.session.user


def _enabled(user: str) -> bool:
    if user in (None, "", "Guest"):
        return False
    if user == "Administrator":
        return True
    return bool(frappe.db.get_value("User", user, "enabled"))


def owns_provider(provider: str, user=None) -> bool:
    user = _actor(user)
    return bool(
        provider
        and _enabled(user)
        and user != "Administrator"
        and frappe.db.exists("Provider", {"name": provider, "user": user, "is_active": 1})
    )


def owned_providers(user=None) -> list[str]:
    user = _actor(user)
    if not _enabled(user) or user == "Administrator":
        return []
    return frappe.get_all("Provider", filters={"user": user, "is_active": 1}, pluck="name")


def can_manage_owner(owner_type: str, organization=None, provider=None, user=None) -> bool:
    user = _actor(user)
    if user == "Administrator":
        return True
    if not _enabled(user):
        return False
    if owner_type == "Organization":
        return bool(organization) and organization in membership.manager_organizations(user)
    if owner_type == "Provider":
        return owns_provider(provider, user)
    return False


def require_brand_manage(owner_type: str, organization=None, provider=None, user=None) -> None:
    if not can_manage_owner(owner_type, organization, provider, user):
        frappe.throw(_("You are not allowed to manage this public experience."), frappe.PermissionError)


def _owner_condition(table: str, user=None) -> str:
    user = _actor(user)
    if user == "Administrator":
        return ""
    if not _enabled(user):
        return "1=0"
    tick = chr(96)
    parts = []
    organizations = membership.manager_organizations(user)
    if organizations:
        names = ",".join(frappe.db.escape(name) for name in organizations)
        parts.append(f"{tick}{table}{tick}.owner_type='Organization' and {tick}{table}{tick}.organization in ({names})")
    providers = owned_providers(user)
    if providers:
        names = ",".join(frappe.db.escape(name) for name in providers)
        parts.append(f"{tick}{table}{tick}.owner_type='Provider' and {tick}{table}{tick}.provider in ({names})")
    return "(" + " or ".join(parts) + ")" if parts else "1=0"


def brand_profile_query(user=None) -> str:
    return _owner_condition("tabBrand Profile", user)


def brand_profile_permission(doc, user=None, permission_type="read", ptype=None, **kwargs) -> bool:
    permission_type = ptype or permission_type
    user = _actor(user)
    if user == "Administrator":
        return True
    if permission_type == "delete":
        return False
    return can_manage_owner(doc.owner_type, doc.organization, doc.provider, user)


def brand_revision_query(user=None) -> str:
    condition = _owner_condition("tabBrand Profile", user)
    if not condition:
        return ""
    tick = chr(96)
    return f"{tick}tabBrand Revision{tick}.brand_profile in (select name from {tick}tabBrand Profile{tick} where {condition})"


def brand_revision_permission(doc, user=None, permission_type="read", ptype=None, **kwargs) -> bool:
    permission_type = ptype or permission_type
    user = _actor(user)
    if user == "Administrator":
        return True
    if permission_type in ("write", "delete", "share", "create"):
        return False
    profile = frappe.db.get_value("Brand Profile", doc.brand_profile, ["owner_type", "organization", "provider"], as_dict=True)
    return bool(profile) and can_manage_owner(profile.owner_type, profile.organization, profile.provider, user)


def _can_manage_site(site_name, user=None) -> bool:
    if not site_name:
        return False
    site = frappe.db.get_value("Public Site", site_name, ["owner_type", "organization", "provider"], as_dict=True)
    return bool(site) and can_manage_owner(site.owner_type, site.organization, site.provider, user)


def public_site_query(user=None) -> str:
    return _owner_condition("tabPublic Site", user)


def public_site_permission(doc, user=None, permission_type="read", ptype=None, **kwargs) -> bool:
    permission_type = ptype or permission_type
    user = _actor(user)
    if user == "Administrator":
        return True
    if permission_type == "delete":
        return False
    return can_manage_owner(doc.owner_type, doc.organization, doc.provider, user)


def _site_child_query(table: str, user=None) -> str:
    condition = public_site_query(user)
    if not condition:
        return ""
    tick = chr(96)
    return f"{tick}{table}{tick}.public_site in (select name from {tick}tabPublic Site{tick} where {condition})"


def public_site_domain_query(user=None) -> str:
    return _site_child_query("tabPublic Site Domain", user)


def public_site_domain_permission(doc, user=None, permission_type="read", ptype=None, **kwargs) -> bool:
    permission_type = ptype or permission_type
    user = _actor(user)
    if user == "Administrator":
        return True
    if permission_type in ("delete", "share"):
        return False
    return _can_manage_site(doc.public_site, user) if doc.public_site else "System Manager" in frappe.get_roles(user)


def experience_release_query(user=None) -> str:
    return _site_child_query("tabExperience Release", user)


def experience_release_permission(doc, user=None, permission_type="read", ptype=None, **kwargs) -> bool:
    permission_type = ptype or permission_type
    user = _actor(user)
    if user == "Administrator":
        return True
    if permission_type in ("write", "delete", "share"):
        return False
    if permission_type == "create":
        return "System Manager" in frappe.get_roles(user)
    return _can_manage_site(doc.public_site, user)
