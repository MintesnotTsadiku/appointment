"""Immutable compiled-design revision controller."""

from __future__ import annotations

import json

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime

from appointment.public_experience import access
from appointment.public_experience.canonical import hash_document

_PROFILE_FIELDS = (
    "owner_type",
    "organization",
    "provider",
    "recipe_key",
    "recipe_version",
    "active_revision",
)


class BrandRevision(Document):
    def validate(self):
        if not self.is_new():
            frappe.throw(_("Brand Revisions are immutable."), frappe.PermissionError)
        if not self.flags.get("public_experience_factory"):
            frappe.throw(_("Brand Revisions can only be created by the Brand Compiler."), frappe.PermissionError)
        if not self.brand_profile:
            frappe.throw(_("A Brand Revision requires a Brand Profile."))
        snapshot = self._parse_snapshot()
        profile = frappe.db.get_value("Brand Profile", self.brand_profile, _PROFILE_FIELDS, as_dict=True)
        if not profile:
            frappe.throw(_("Brand Profile {0} does not exist.").format(self.brand_profile))
        access.require_brand_manage(profile.owner_type, profile.organization, profile.provider)
        if snapshot.get("contract") != "appointment-compiled-design.v1":
            frappe.throw(_("Brand Revision must contain a compiled design artifact."))
        if snapshot.get("recipeKey") != profile.recipe_key or int(snapshot.get("recipeVersion") or 0) != int(profile.recipe_version or 0):
            frappe.throw(_("Compiled design recipe does not match the Brand Profile."))
        expected_hash = snapshot.get("contentHash")
        if not expected_hash or expected_hash != hash_document({key: value for key, value in snapshot.items() if key != "contentHash"}):
            frappe.throw(_("Compiled design content hash is invalid."))
        self.owner_type = profile.owner_type
        self.organization = profile.organization
        self.provider = profile.provider
        self.recipe_key = snapshot["recipeKey"]
        self.recipe_version = snapshot["recipeVersion"]
        self.recipe_hash = snapshot.get("recipeHash")
        self.compiler_policy_version = snapshot.get("compilerPolicyVersion")
        self.compiled_design_hash = expected_hash
        layout = snapshot.get("layout") or {}
        self.layout_renderer_key = layout.get("rendererKey")
        self.layout_renderer_version = layout.get("rendererVersion")
        self.asset_manifest_json = json.dumps(snapshot.get("assets") or {}, sort_keys=True)
        self.revision_number = self._next_revision_number()
        self.previous_revision = profile.active_revision
        if self.compiled_design_hash and self.compiled_design_hash != expected_hash:
            frappe.throw(_("Brand Revision hash does not match its compiled design."))
        self.published_by = self.published_by or frappe.session.user
        self.published_at = self.published_at or now_datetime()
        self.validation_json = json.dumps(snapshot.get("validation") or {"ok": True, "issues": []}, sort_keys=True)

    def on_trash(self):
        frappe.throw(_("Brand Revisions cannot be deleted; a retention policy is pending."), frappe.PermissionError)

    def _parse_snapshot(self) -> dict:
        try:
            snapshot = json.loads(self.normalized_json or "")
        except (TypeError, ValueError):
            frappe.throw(_("Brand Revision compiled design must be valid JSON."))
        if not isinstance(snapshot, dict) or not snapshot:
            frappe.throw(_("Brand Revision compiled design must be a non-empty JSON object."))
        return snapshot

    def _next_revision_number(self) -> int:
        current = frappe.db.get_value(
            "Brand Revision",
            {"brand_profile": self.brand_profile},
            "revision_number",
            order_by="revision_number desc",
        )
        return int(current or 0) + 1
