"""Gallery Collection controller: ownership, slug, media and consent rules."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document

from appointment.content import entitlements, gallery, tenancy
from appointment.content.media_limits import enforce_gallery_limits
from appointment.public_experience.reserved import normalize_slug, slug_error


class GalleryCollection(Document):
    def validate(self):
        tenancy.require_business_owner(self.owner_type, self.organization, self.provider)
        if self.is_new():
            entitlements.require_capability(
                self.owner_type, self.organization, self.provider, "gallery"
            )
        self.slug = normalize_slug(self.slug or self.title)
        error = slug_error(self.slug)
        if error:
            frappe.throw(_(error))
        self._validate_unique_slug()
        self._validate_site()
        gallery.validate_collection(self)
        enforce_gallery_limits(self)

    def _validate_unique_slug(self):
        filters = {
            "owner_type": self.owner_type,
            "slug": self.slug,
            "name": ["!=", self.name],
        }
        filters["organization" if self.owner_type == "Organization" else "provider"] = (
            self.organization if self.owner_type == "Organization" else self.provider
        )
        if frappe.db.exists("Gallery Collection", filters):
            frappe.throw(_("That gallery address is already used by this business."))

    def _validate_site(self):
        if not self.public_site:
            return
        site = frappe.db.get_value(
            "Public Site", self.public_site, ["owner_type", "organization", "provider"], as_dict=True
        )
        if not site or (site.owner_type, site.organization, site.provider) != (
            self.owner_type,
            self.organization,
            self.provider,
        ):
            frappe.throw(_("The Public Site belongs to a different business."))
