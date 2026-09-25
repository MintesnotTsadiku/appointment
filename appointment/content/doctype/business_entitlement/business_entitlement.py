"""Business Entitlement controller.

Rows are server-owned. Owners may read their effective capabilities; only
trusted workflows change them. A row never carries a payment authority.
"""

from __future__ import annotations

import json

import frappe
from frappe import _
from frappe.model.document import Document

from appointment.content import tenancy
from appointment.content.entitlements import ALL_STATES, CAPABILITY_SET, SOURCES


class BusinessEntitlement(Document):
    def validate(self):
        owner_key = tenancy.require_business_owner(self.owner_type, self.organization, self.provider)
        self.active_owner_key = owner_key
        if self.owner_type == "Organization":
            self.provider = None
        else:
            self.organization = None
        if self.capability not in CAPABILITY_SET:
            frappe.throw(_("Unknown capability: {0}.").format(self.capability))
        if self.state not in ALL_STATES:
            frappe.throw(_("Unknown entitlement state: {0}.").format(self.state))
        if self.source not in SOURCES:
            frappe.throw(_("Unknown entitlement source: {0}.").format(self.source))
        if self.limit_json:
            try:
                parsed = json.loads(self.limit_json)
            except (TypeError, ValueError):
                frappe.throw(_("Limits must be valid JSON."))
            if not isinstance(parsed, dict):
                frappe.throw(_("Limits must be a JSON object."))
        self.entitlement_key = f"{owner_key}:{self.capability}"
        duplicate = frappe.db.exists(
            "Business Entitlement",
            {"entitlement_key": self.entitlement_key, "name": ["!=", self.name]},
        )
        if duplicate:
            frappe.throw(_("This business already has an entitlement for {0}.").format(self.capability))
