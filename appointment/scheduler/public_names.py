"""The names customers see on public pages, in English and Amharic, edited by the business's managers.

Settings › Business shows one card per managed business: the business name and description, and the
public name of each provider who offers its services. Amharic pages show the Amharic value, else the
English one (`localized_names`). The record name of the Organization never changes.
"""

from __future__ import annotations

import json

import frappe
from frappe import _

from appointment.scheduler import localized_names

NAME_LIMIT = 140
DESCRIPTION_LIMIT = 1000


@frappe.whitelist(methods=["GET"])
def business_names():
    """Each business the user manages, with its names and its providers' public names."""
    from appointment.scheduler.membership import manager_organizations

    return [_business(name) for name in manager_organizations()]


@frappe.whitelist(methods=["POST"])
def save_business_names(organization, organization_name, organization_name_am="", description="", description_am="", providers=None):
    """Save the names of one business and of its providers. `providers` is `[{id, name, name_am}]`."""
    from appointment.scheduler.membership import require_manager

    require_manager(organization)
    org = frappe.get_doc("Organization", organization)
    org.organization_name = _required(organization_name, _("Enter the business name in English."))
    org.organization_name_am = _clean(organization_name_am, NAME_LIMIT)
    org.description = _clean(description, DESCRIPTION_LIMIT, keep_lines=True)
    org.description_am = _clean(description_am, DESCRIPTION_LIMIT, keep_lines=True)
    org.save(ignore_permissions=True)
    rows = json.loads(providers) if isinstance(providers, str) else (providers or [])
    allowed = set(_provider_ids(organization))
    for row in rows:
        if not isinstance(row, dict) or row.get("id") not in allowed:
            frappe.throw(_("Choose a provider of this business."), frappe.PermissionError)
        provider = frappe.get_doc("Provider", row["id"])
        provider.display_name = _required(row.get("name"), _("Enter each provider's name in English."))
        provider.display_name_am = _clean(row.get("name_am"), NAME_LIMIT)
        provider.save(ignore_permissions=True)
    return _business(organization)


def _business(organization):
    org = frappe.db.get_value("Organization", organization,
                              ["name", "organization_name", "organization_name_am", "description", "description_am"], as_dict=True)
    providers = frappe.get_all("Provider", filters={"name": ["in", _provider_ids(organization) or [""]]},
                               fields=["name", "display_name", "full_name", "provider_name", "display_name_am"], order_by="creation asc")
    return {
        "organization": org.name,
        "name": localized_names.organization_names(org),
        "description": localized_names.organization_descriptions(org),
        "providers": [{"id": row.name, "name": localized_names.provider_names(row)} for row in providers],
    }


def _provider_ids(organization):
    services = frappe.get_all("Service", filters={"organization": organization}, pluck="name")
    if not services:
        return []
    return sorted({row for row in frappe.get_all("EventType", filters={"service": ["in", services]}, pluck="provider") if row})


def _required(value, message):
    text = _clean(value, NAME_LIMIT)
    if not text:
        frappe.throw(message)
    return text


def _clean(value, limit, keep_lines=False):
    text = str(value or "")
    if any(character in text for character in "<>\x00"):
        frappe.throw(_("Use plain text without < or >."))
    if keep_lines:
        return "\n".join(" ".join(line.split()) for line in text.strip().splitlines())[:limit]
    return " ".join(text.split())[:limit]
