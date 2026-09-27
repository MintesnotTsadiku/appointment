"""Brand Profile controller for one certified public-experience recipe."""

from __future__ import annotations

import json

import frappe
from frappe import _
from frappe.model.document import Document

from appointment.public_experience import access
from appointment.public_experience.design_compiler import compile_design
from appointment.public_experience.errors import BrandExperienceError
from appointment.public_experience.recipes import get_recipe


class BrandProfile(Document):
    def before_save(self):
        if self.is_new():
            self.draft_version = 1
        else:
            self.draft_version = (self.draft_version or 0) + 1

    def validate(self):
        self._validate_owner()
        self._validate_capability()
        self._validate_single_active_profile()
        self._validate_owner_immutable()
        from appointment.public_experience.identity_media import validate_profile

        validate_profile(self)
        self._validate_recipe()

    def _validate_owner(self):
        if self.owner_type == "Organization":
            if not self.organization or self.provider:
                frappe.throw(_("A brand has exactly one Organization owner."))
            owner = frappe.db.get_value("Organization", self.organization, ["is_active"], as_dict=True)
            if not owner:
                frappe.throw(_("Organization {0} does not exist.").format(self.organization))
            if not owner.is_active:
                frappe.throw(_("Organization {0} is not active.").format(self.organization))
            self.provider = None
            self.active_owner_key = None if self.lifecycle == "Archived" else f"organization:{self.organization}"
            return
        if self.owner_type == "Provider":
            if not self.provider or self.organization:
                frappe.throw(_("A brand has exactly one Provider owner."))
            owner = frappe.db.get_value("Provider", self.provider, ["is_active", "organization_status"], as_dict=True)
            if not owner:
                frappe.throw(_("Provider {0} does not exist.").format(self.provider))
            if not owner.is_active:
                frappe.throw(_("Provider {0} is not active.").format(self.provider))
            if owner.organization_status != "Independent":
                frappe.throw(_("Only an independent Provider may own a brand."))
            self.organization = None
            self.active_owner_key = None if self.lifecycle == "Archived" else f"provider:{self.provider}"
            return
        frappe.throw(_("Choose an owner type of Organization or Provider."))

    def _validate_capability(self):
        access.require_brand_manage(self.owner_type, self.organization, self.provider)

    def _validate_single_active_profile(self):
        filters = {"lifecycle": ["!=", "Archived"], "owner_type": self.owner_type}
        filters["organization" if self.owner_type == "Organization" else "provider"] = (
            self.organization if self.owner_type == "Organization" else self.provider
        )
        if not self.is_new():
            filters["name"] = ["!=", self.name]
        if frappe.db.exists("Brand Profile", filters):
            frappe.throw(_("This business already has an active Brand Profile."))

    def _validate_owner_immutable(self):
        if self.is_new():
            return
        previous = self.get_doc_before_save()
        if previous and previous.active_revision:
            current = (self.owner_type, self.organization, self.provider)
            original = (previous.owner_type, previous.organization, previous.provider)
            if current != original:
                frappe.throw(_("A published brand's owner cannot be changed."))

    def _parse_inputs(self) -> dict:
        raw = self.brand_inputs_json
        if not raw:
            data = {}
        elif isinstance(raw, dict):
            data = dict(raw)
        else:
            try:
                data = json.loads(raw)
            except (TypeError, ValueError):
                frappe.throw(_("Recipe adjustments must be valid JSON."))
        if not isinstance(data, dict):
            frappe.throw(_("Recipe adjustments must be a JSON object."))
        self.brand_inputs_json = json.dumps(data, sort_keys=True)
        return data

    def _validate_recipe(self):
        try:
            recipe = get_recipe(self.recipe_key, self.recipe_version or None)
            inputs = self._parse_inputs()
            compile_design(
                recipe.key,
                recipe.version,
                {
                    **inputs,
                    "application_name": self.application_name,
                    "short_name": self.short_name or self.application_name,
                    "logo_primary": self.logo_primary,
                    "logo_compact": self.logo_compact,
                    "favicon": self.favicon,
                },
                {"sections": list(recipe.required_sections), "locales": list(recipe.supported_locales), "content_richness": "rich"},
            )
        except BrandExperienceError as exc:
            frappe.throw(str(exc))
        self.recipe_key = recipe.key
        self.recipe_version = recipe.version
