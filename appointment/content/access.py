"""Tenant access for content DocTypes and upstream Blog/Newsletter records.

Lists and single-document checks share the same ownership rule so a list never
shows a record that a direct read would deny. A global Frappe role alone never
grants access to another business, and a missing ownership row fails closed.
"""

from __future__ import annotations

import frappe

from appointment.content import tenancy
from appointment.public_experience import access as public_access

UPSTREAM_SOURCES = {
    "Blog Post": "Blog Post",
    "Newsletter": "Newsletter",
}


def _actor(user=None) -> str:
    return user or frappe.session.user


def _enabled(user: str) -> bool:
    return public_access._enabled(user)


def _has_any_business(user: str) -> bool:
    if user == "Administrator":
        return True
    if not _enabled(user):
        return False
    if public_access.membership.manager_organizations(user):
        return True
    return bool(public_access.owned_providers(user))


def business_entitlement_query(user=None) -> str:
    return tenancy.owner_query_condition("tabBusiness Entitlement", user)


def file_query(user=None) -> str:
    """Public image bytes do not grant access to their private File metadata."""
    condition = public_access.public_site_query(user)
    if not condition:
        return ""
    return ("(coalesce(`tabFile`.attached_to_doctype, '') != 'Public Site' or "
            "`tabFile`.attached_to_name in (select name from `tabPublic Site` "
            f"where {condition}))")


def file_permission(doc, user=None, **kwargs):
    from appointment.content.media_access import governed_file

    stored = governed_file(doc)
    if not stored:
        return None
    if (kwargs.get("ptype") or kwargs.get("permission_type")) == "write" and not doc.is_new():
        return False
    site = frappe.db.get_value("Public Site", stored.attached_to_name,
                               ["owner_type", "organization", "provider"], as_dict=True)
    if not site:
        return False
    return tenancy.can_manage_business(site.owner_type, site.organization, site.provider, _actor(user))


def business_entitlement_permission(doc, user=None, permission_type="read", ptype=None, **kwargs) -> bool:
    permission_type = ptype or permission_type
    actor = _actor(user)
    if actor == "Administrator":
        return True
    if permission_type in ("read", "report", "export", "print", "email", None):
        return tenancy.can_manage_business(doc.owner_type, doc.organization, doc.provider, actor)
    # Only trusted server tooling changes entitlements.
    return "System Manager" in frappe.get_roles(actor)


def content_ownership_query(user=None) -> str:
    return tenancy.owner_query_condition("tabContent Ownership", user)


def content_ownership_permission(doc, user=None, permission_type="read", ptype=None, **kwargs) -> bool:
    permission_type = ptype or permission_type
    actor = _actor(user)
    if actor == "Administrator":
        return True
    if permission_type == "delete":
        return False
    if permission_type == "create":
        return _has_any_business(actor)
    return tenancy.can_manage_business(doc.owner_type, doc.organization, doc.provider, actor)


def gallery_collection_query(user=None) -> str:
    return tenancy.owner_query_condition("tabGallery Collection", user)


def gallery_collection_permission(doc, user=None, permission_type="read", ptype=None, **kwargs) -> bool:
    permission_type = ptype or permission_type
    actor = _actor(user)
    if actor == "Administrator":
        return True
    if not _enabled(actor):
        return False
    if permission_type == "delete":
        return False
    if permission_type == "create":
        return _has_any_business(actor)
    return tenancy.can_manage_business(doc.owner_type, doc.organization, doc.provider, actor)


def published_content_release_query(user=None) -> str:
    return tenancy.owner_query_condition("tabPublished Content Release", user)


def published_content_release_permission(doc, user=None, permission_type="read", ptype=None, **kwargs) -> bool:
    permission_type = ptype or permission_type
    actor = _actor(user)
    if actor == "Administrator":
        return True
    if permission_type in ("read", "report", "export", "print", "email", None):
        return tenancy.can_manage_business(doc.owner_type, doc.organization, doc.provider, actor)
    if permission_type == "create":
        return "System Manager" in frappe.get_roles(actor)
    # Releases are immutable: no write, delete or share.
    return False


def _owned_source_condition(source_doctype: str, table: str, user=None) -> str:
    actor = _actor(user)
    condition = tenancy.owner_query_condition("tabContent Ownership", actor)
    if condition == "":
        return ""
    quote = chr(96)
    source = frappe.db.escape(source_doctype)
    return (
        f"{quote}{table}{quote}.name in (select {quote}tabContent Ownership{quote}.source_name "
        f"from {quote}tabContent Ownership{quote} "
        f"where {quote}tabContent Ownership{quote}.source_doctype={source} and {condition})"
    )


def _owns_source(source_doctype: str, source_name: str, user) -> bool:
    actor = _actor(user)
    if actor == "Administrator":
        return True
    if not _enabled(actor) or not source_name:
        return False
    rows = frappe.get_all(
        "Content Ownership",
        filters={"source_doctype": source_doctype, "source_name": source_name},
        fields=["owner_type", "organization", "provider"],
        ignore_permissions=True,
    )
    return any(
        tenancy.can_manage_business(row.owner_type, row.organization, row.provider, actor) for row in rows
    )


def blog_post_query(user=None) -> str:
    return _owned_source_condition("Blog Post", "tabBlog Post", user)


def blog_post_permission(doc, user=None, permission_type="read", ptype=None, **kwargs) -> bool:
    permission_type = ptype or permission_type
    actor = _actor(user)
    if actor == "Administrator":
        return True
    if not _enabled(actor):
        return False
    if doc is None:
        # Doctype-level check: role DocPerm already gates this. Row filtering is
        # done by permission_query_conditions and the document-level check below.
        return True
    if permission_type == "create":
        return _has_any_business(actor)
    return _owns_source("Blog Post", doc.name, actor)


def newsletter_query(user=None) -> str:
    return _owned_source_condition("Newsletter", "tabNewsletter", user)


def blog_category_query(user=None):
    return _owned_source_condition("Blog Category", "tabBlog Category", user)


def blogger_query(user=None):
    return _owned_source_condition("Blogger", "tabBlogger", user)


def article_support_permission(doc, user=None, permission_type="read", ptype=None, **kwargs):
    operation = ptype or permission_type
    actor = _actor(user)
    if actor == "Administrator":
        return True
    if not _enabled(actor):
        return False
    if doc is None:
        return True
    if operation == "create":
        return _has_any_business(actor)
    return _owns_source(doc.doctype, doc.name, actor)


def newsletter_permission(doc, user=None, permission_type="read", ptype=None, **kwargs) -> bool:
    permission_type = ptype or permission_type
    actor = _actor(user)
    if actor == "Administrator":
        return True
    if not _enabled(actor):
        return False
    if doc is None:
        return True
    if permission_type == "create":
        return _has_any_business(actor)
    return _owns_source("Newsletter", doc.name, actor)
