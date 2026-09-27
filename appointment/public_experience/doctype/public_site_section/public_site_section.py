"""Public Site Section controller for schema-versioned typed content."""

from __future__ import annotations

import json

import frappe
from frappe import _
from frappe.model.document import Document

from appointment.public_experience.actions import ACTION_INTENTS
from appointment.public_experience.section_schemas import CONTENT_SCHEMA_VERSION, validate_typed_section


class PublicSiteSection(Document):
    def validate(self):
        if int(self.schema_version or 0) != CONTENT_SCHEMA_VERSION:
            frappe.throw(_("Sections must use schema version {0}.").format(CONTENT_SCHEMA_VERSION))
        report = validate_typed_section(self.section_type, self._content(), allowed_intents=ACTION_INTENTS)
        if not report.ok:
            first = report.issues[0]
            frappe.throw(_("Section '{0}' is invalid ({1}): {2}").format(self.section_type, first.field, first.requirement))

    def _content(self) -> dict:
        raw = self.content_json
        if not raw:
            return {}
        if isinstance(raw, dict):
            return raw
        try:
            data = json.loads(raw)
        except (TypeError, ValueError):
            frappe.throw(_("Section content must be valid JSON."))
        return data if isinstance(data, dict) else {}
