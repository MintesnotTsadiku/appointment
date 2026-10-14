"""The website template a new owner chose in the landing template gallery.

"Use this template" sends a guest to `/signup?source=template_gallery&template=<recipe key>`.
`registration.signup` keeps the key on the account's Business Signup Source (`remember_signup`), so
the choice survives every redirect after sign-up: auto sign-in, a later sign-in, administrator
approval, another browser. Website setup reads it back while the business has no website yet.

Only certified recipe keys are kept (`list_recipes()`); an unknown key is dropped without an error.
"""

from __future__ import annotations

import frappe
from frappe import _

from appointment.public_experience.recipes import list_recipes

GALLERY_SOURCE = "template_gallery"


def clean(key) -> str | None:
    """The key when it names a certified recipe, else None."""
    value = str(key or "").strip().lower()
    return value if value and value in _recipe_labels() else None


def remember(user, key, source=GALLERY_SOURCE) -> str | None:
    """Keep a template on the account's pending sign-up source. Other attribution stays as it is."""
    from appointment.growth.referrals import clean_source

    template = clean(key)
    if not template or not user or user in ("Guest", "Administrator"):
        return None
    pending = frappe.db.get_value("Business Signup Source", {"signup_user": user, "status": "Pending"}, "name")
    if pending:
        frappe.db.set_value("Business Signup Source", pending, "template", template)
        return pending
    return frappe.get_doc(dict(
        doctype="Business Signup Source", signup_user=user, status="Pending",
        source=clean_source(source), template=template,
    )).insert(ignore_permissions=True).name


def for_user(user) -> str | None:
    """The template this account chose, while its first business has no website yet."""
    if not user or user == "Guest":
        return None
    rows = frappe.get_all(
        "Business Signup Source",
        filters={"signup_user": user, "template": ["is", "set"]},
        fields=["template", "organization", "independent_provider"],
        order_by="creation desc",
        limit=1,
    )
    if not rows or _has_site(rows[0]):
        return None
    return clean(rows[0].template)


@frappe.whitelist(methods=["GET"])
def chosen_template():
    """The gallery template for the signed-in owner, with its name and picture, or nothing."""
    from appointment.public_experience.template_gallery import template_gallery

    key = for_user(frappe.session.user)
    entry = next((row for row in template_gallery()["templates"] if row["key"] == key), None) if key else None
    if not entry:
        return {"key": None}
    return {"key": key, "label": entry["label"], "image": entry["previews"].get("desktop") or entry["hero"]}


@frappe.whitelist(methods=["POST"])
def note_template(template=None):
    """A signed-in account without a business keeps the template it chose until it creates one."""
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Sign in first."), frappe.PermissionError)
    if frappe.db.exists("Business Signup Source", {"signup_user": user, "status": "Attached"}):
        return {"stored": False}
    return {"stored": bool(remember(user, template))}


def _has_site(row) -> bool:
    if row.organization:
        scope = {"organization": row.organization}
    elif row.independent_provider:
        scope = {"provider": row.independent_provider}
    else:
        return False  # No business yet, so no website.
    return bool(frappe.db.exists("Public Site", {**scope, "status": ["!=", "Archived"]}))


def _recipe_labels() -> dict[str, str]:
    return {recipe.key: recipe.label for recipe in list_recipes()}
