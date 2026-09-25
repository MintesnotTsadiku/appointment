"""Public Site Domain controller.

A domain mapping is normalized before it is stored, gets a per-domain random
verification token, and follows an explicit, auditable state machine. TLS keys
are never stored here.
"""

from __future__ import annotations

import json

import frappe
from frappe import _
from frappe.model.document import Document

from appointment.public_experience import access
from appointment.public_experience.hostnames import hostname_error, normalize_hostname
from appointment.public_experience.reserved import normalize_slug, slug_error

_CUSTOM_TYPES = ("Custom Subdomain", "Custom Apex")
_PLATFORM_PATH = "Platform Path"

# Allowed lifecycle transitions.
_TRANSITIONS = {
    "Draft": ("Awaiting DNS", "Removing"),
    "Awaiting DNS": ("Verifying", "Error", "Removing"),
    "Verifying": ("Verified", "Error", "Removing"),
    "Verified": ("Certificate Pending", "Error", "Removing"),
    "Certificate Pending": ("Activating", "Error", "Removing"),
    "Activating": ("Active", "Error", "Removing"),
    "Active": ("Suspended", "Removing", "Error"),
    "Error": ("Verifying", "Suspended", "Removing"),
    "Suspended": ("Active", "Removing"),
    "Removing": ("Quarantined", "Removed"),
    "Quarantined": ("Removed",),
    "Removed": (),
}

_SITE_FIELDS = ("owner_type", "organization", "provider")


class PublicSiteDomain(Document):
    def validate(self):
        self._normalize()
        self._validate_site_capability()
        self._validate_primary()
        self._validate_transition()

    def _normalize(self):
        if self.domain_type == _PLATFORM_PATH:
            value = normalize_slug(self.hostname_display or self.hostname_ascii)
            error = slug_error(value)
        else:
            raw = self.hostname_display or self.hostname_ascii
            error = hostname_error(raw)
            value = normalize_hostname(raw) if error is None else ""
        if error:
            frappe.throw(_(error))
        self.hostname_ascii = value
        if self.domain_type in _CUSTOM_TYPES and not self.verification_token:
            self.verification_token = frappe.generate_hash(length=32)

    def _validate_site_capability(self):
        site = frappe.db.get_value("Public Site", self.public_site, _SITE_FIELDS, as_dict=True)
        if not site:
            frappe.throw(_("Public Site {0} does not exist.").format(self.public_site))
        access.require_brand_manage(site.owner_type, site.organization, site.provider)

    def _validate_primary(self):
        if not self.is_primary:
            return
        filters = {"public_site": self.public_site, "is_primary": 1}
        if not self.is_new():
            filters["name"] = ["!=", self.name]
        if frappe.db.exists("Public Site Domain", filters):
            frappe.throw(_("This site already has a primary domain."))

    def _validate_transition(self):
        if self.is_new():
            return
        previous = self.get_doc_before_save()
        if not previous or previous.lifecycle_status == self.lifecycle_status:
            return
        allowed = _TRANSITIONS.get(previous.lifecycle_status, ())
        if self.lifecycle_status not in allowed:
            frappe.throw(
                _("A domain cannot move from {0} to {1}.").format(previous.lifecycle_status, self.lifecycle_status)
            )

    def expected_dns(self) -> list[dict]:
        try:
            return json.loads(self.expected_dns_json or "[]")
        except (TypeError, ValueError):
            return []
