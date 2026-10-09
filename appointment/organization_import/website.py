"""Validate workbook website text before writes and carry it into guided setup."""

from copy import deepcopy
import json
import re

import frappe
from frappe import _

from appointment.public_experience.section_schemas import validate_typed_section

FIELDS = {"hero_title": ("hero", "title"), "hero_subtitle": ("hero", "subtitle"),
          "about_body": ("about", "body"), "contact_email": ("contact", "email"), "contact_phone": ("contact", "phone")}


def errors(rows, organization=None):
    site = _site(organization)
    sections = None
    if site:
        from appointment.public_experience import setup

        sections = setup.state(setup.require_site(site))["sections"]
    result = []
    for row in rows:
        kind, field = FIELDS[row["field"]]
        message = None
        if field == "email" and not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", row["text"]):
            message = _("Enter a complete contact email address.")
        if sections is not None:
            section = next((entry for entry in sections if entry["type"] == kind), None)
            if section is None:
                message = _("This template has no {0} section. Remove this website text row.").format(kind)
            else:
                proposed = deepcopy(section["content"])
                proposed[field] = _value(field, row["text"])
                if not validate_typed_section(kind, proposed).ok:
                    message = _("This text does not fit your website section. Use plain text within the template limits.")
        if message:
            result.append({"sheet": "Website Content", "row": row["_row"], "cell": f"C{row['_row']}", "message": message})
    return result


def merge(sections, rows):
    result = deepcopy(sections)
    for row in rows:
        kind, field = FIELDS[row["field"]]
        target = next((section for section in result if section["type"] == kind), None)
        if target is None:
            frappe.throw(_("This template has no {0} section. Choose a template that supports your imported content.").format(kind))
        target["content"][field] = _value(field, row["text"])
    return result


def apply(rows, organization):
    site = _site(organization)
    if not site:
        return  # The immutable import audit retains starter text until Website setup.
    from appointment.public_experience import setup

    doc = setup.require_site(site)
    setup.save(site, doc.draft_version, "content", sections=merge(setup.state(doc)["sections"], rows))


def pending(organization):
    if not organization:
        return []
    value = frappe.db.get_value("Organization Workbook Import", {"organization": organization},
                                "website_content_json", order_by="creation desc")
    return json.loads(value or "[]")


def _site(organization):
    return frappe.db.get_value("Public Site", {"organization": organization, "status": ["!=", "Archived"]}, "name") if organization else None


def _value(field, text):
    return text if field in {"email", "phone"} else {"en": text}
