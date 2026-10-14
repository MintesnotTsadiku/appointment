"""A former address that redirects to the current one: of a Public Site, or of a provider page."""

import frappe
from frappe import _
from frappe.model.document import Document


class PublicSiteSlugAlias(Document):
    def validate(self):
        if bool(self.public_site) == bool(self.provider):
            frappe.throw(_("A former address belongs to exactly one website or provider page."))
