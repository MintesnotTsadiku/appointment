"""Immutable Experience Release controller.

A release pins one Brand Revision, one compiled design artifact and one typed
content projection. It has no template/theme fallback path.
"""

from __future__ import annotations

import json

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime

from appointment.public_experience import access
from appointment.public_experience.canonical import hash_document
from appointment.public_experience.recipes import get_recipe

_SITE_FIELDS = ("owner_type", "organization", "provider", "recipe_key", "recipe_version", "current_release", "draft_version")


class ExperienceRelease(Document):
    def validate(self):
        if not self.is_new():
            frappe.throw(_("Experience Releases are immutable."))
        if not self.flags.get("public_experience_factory"):
            frappe.throw(_("Experience Releases can only be created by the Experience Publisher."), frappe.PermissionError)
        if not self.public_site:
            frappe.throw(_("An Experience Release requires a Public Site."))
        site = frappe.db.get_value("Public Site", self.public_site, _SITE_FIELDS, as_dict=True)
        if not site:
            frappe.throw(_("Public Site {0} does not exist.").format(self.public_site))
        access.require_brand_manage(site.owner_type, site.organization, site.provider)
        snapshot = self._parse_json(self.normalized_json, "snapshot")
        self._validate_pins(site, snapshot)
        self.owner_type = site.owner_type
        self.organization = site.organization
        self.provider = site.provider
        self.release_number = self._next_release_number()
        self.previous_release = site.current_release
        self.source_draft_version = self.source_draft_version or site.draft_version
        self.recipe_key = snapshot["recipeKey"]
        self.recipe_version = snapshot["recipeVersion"]
        design = snapshot.get("compiledDesign") or {}
        self.compiled_design_hash = design.get("contentHash")
        self.layout_renderer_key = (design.get("layout") or {}).get("rendererKey")
        self.layout_renderer_version = (design.get("layout") or {}).get("rendererVersion")
        self.content_schema_version = int((design.get("layout") or {}).get("contentSchemaVersion") or 0)
        self.asset_manifest_json = json.dumps(design.get("assets") or {}, sort_keys=True)
        self.policy_versions_json = json.dumps(
            {"compiler": design.get("compilerPolicyVersion"), "content": self.content_schema_version},
            sort_keys=True,
        )
        expected_hash = hash_document(
            {
                "publicSite": self.public_site,
                "snapshot": snapshot,
                "brandRevision": self.brand_revision,
                "recipeKey": self.recipe_key,
                "recipeVersion": self.recipe_version,
                "compiledDesignHash": self.compiled_design_hash,
                "locales": self._safe(self.locales_json),
                "seo": self._safe(self.seo_json),
                "booking": self._safe(self.booking_json),
            }
        )
        if self.release_hash and self.release_hash != expected_hash:
            frappe.throw(_("Experience Release hash does not match its pinned artifact."))
        self.release_hash = expected_hash
        self.published_by = self.published_by or frappe.session.user
        self.published_at = self.published_at or now_datetime()
        self.validation_json = json.dumps({"ok": True, "issues": []}, sort_keys=True)

    def _validate_pins(self, site, snapshot):
        recipe = get_recipe(snapshot.get("recipeKey"), snapshot.get("recipeVersion"))
        if recipe.key != site.recipe_key or recipe.version != int(site.recipe_version or 0):
            frappe.throw(_("The release recipe does not match the Public Site."))
        design = snapshot.get("compiledDesign")
        if not isinstance(design, dict) or design.get("contract") != "appointment-compiled-design.v1":
            frappe.throw(_("The release must contain a compiled design."))
        if not self.brand_revision:
            frappe.throw(_("The release requires a Brand Revision."))
        revision = frappe.db.get_value(
            "Brand Revision",
            self.brand_revision,
            ["recipe_key", "recipe_version", "compiled_design_hash"],
            as_dict=True,
        )
        if not revision or revision.recipe_key != recipe.key or int(revision.recipe_version or 0) != recipe.version:
            frappe.throw(_("The pinned Brand Revision belongs to another recipe."))
        if revision.compiled_design_hash != design.get("contentHash"):
            frappe.throw(_("The release compiled design must equal the Brand Revision."))
        if not snapshot.get("sections"):
            frappe.throw(_("The release must contain typed public sections."))

    def on_trash(self):
        frappe.throw(_("Experience Releases cannot be deleted; a retention policy is pending."), frappe.PermissionError)

    def _parse_json(self, raw: object, label: str) -> dict:
        try:
            data = json.loads(raw or "")
        except (TypeError, ValueError):
            frappe.throw(_("The {0} snapshot must be valid JSON.").format(label))
        if not isinstance(data, dict) or not data:
            frappe.throw(_("The {0} snapshot must be a non-empty JSON object.").format(label))
        return data

    def _safe(self, raw: object) -> object:
        try:
            return json.loads(raw) if raw else {}
        except (TypeError, ValueError):
            return {}

    def _next_release_number(self) -> int:
        current = frappe.db.get_value(
            "Experience Release",
            {"public_site": self.public_site},
            "release_number",
            order_by="release_number desc",
        )
        return int(current or 0) + 1
