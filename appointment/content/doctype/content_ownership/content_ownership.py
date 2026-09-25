"""Content Ownership controller.

Maps one upstream authoring record (or an appointment gallery collection) to
exactly one business and public site. It is the tenant anchor that upstream
list and document permission conditions consult.
"""

from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document

from appointment.content import tenancy

SOURCE_DOCTYPES = ("Blog Post", "Newsletter", "Gallery Collection")
SOURCE_CAPABILITY = {
    "Blog Post": "blog",
    "Newsletter": "newsletter",
    "Gallery Collection": "gallery",
}


class ContentOwnership(Document):
    def validate(self):
        owner_key = tenancy.require_business_owner(self.owner_type, self.organization, self.provider)
        self.active_owner_key = owner_key
        if self.owner_type == "Organization":
            self.provider = None
        else:
            self.organization = None
        if self.source_doctype not in SOURCE_DOCTYPES:
            frappe.throw(_("Unsupported content source: {0}.").format(self.source_doctype))
        if self.capability != SOURCE_CAPABILITY[self.source_doctype]:
            frappe.throw(
                _("{0} content must use the {1} capability.").format(
                    self.source_doctype, SOURCE_CAPABILITY[self.source_doctype]
                )
            )
        if not self.source_name:
            frappe.throw(_("A content ownership record requires a source record."))
        if not self.is_new():
            stored = frappe.db.get_value(
                "Content Ownership", self.name, ["source_doctype", "source_name"], as_dict=True
            )
            if stored and (self.source_doctype, self.source_name) != (
                stored.source_doctype,
                stored.source_name,
            ):
                frappe.throw(_("The source record of an ownership mapping cannot change."))
        if self.public_site:
            site = frappe.db.get_value(
                "Public Site", self.public_site, ["owner_type", "organization", "provider"], as_dict=True
            )
            if not site or (site.owner_type, site.organization, site.provider) != (
                self.owner_type,
                self.organization,
                self.provider,
            ):
                frappe.throw(_("The Public Site belongs to a different business."))
        if not self.created_by_user:
            self.created_by_user = frappe.session.user
        self.ownership_key = f"{self.source_doctype}:{self.source_name}"
        duplicate = frappe.db.exists(
            "Content Ownership",
            {"ownership_key": self.ownership_key, "name": ["!=", self.name]},
        )
        if duplicate:
            frappe.throw(_("This source record is already owned by a business."))
