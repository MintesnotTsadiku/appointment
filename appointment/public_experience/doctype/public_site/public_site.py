"""Public Site controller for a recipe-backed typed content draft."""

from __future__ import annotations

import json

import frappe
from frappe import _
from frappe.model.document import Document

from appointment.public_experience import access
from appointment.public_experience.errors import BrandExperienceError
from appointment.public_experience.recipes import get_recipe
from appointment.public_experience.reserved import normalize_slug, slug_error
from appointment.public_experience.section_schemas import CONTENT_SCHEMA_VERSION, validate_typed_section


class PublicSite(Document):
    def before_save(self):
        if self.is_new():
            self.draft_version = 1
        else:
            self.draft_version = (self.draft_version or 0) + 1

    def validate(self):
        self._validate_owner()
        self._validate_capability()
        self._validate_single_active_site()
        self._validate_slug()
        self._validate_brand_profile()
        self._validate_recipe()
        self._validate_locales()
        self._validate_sections()
        self._validate_publication()
        self.platform_url = f"/{self.slug}"

    def _validate_owner(self):
        if self.owner_type == "Organization":
            if not self.organization or self.provider:
                frappe.throw(_("A site has exactly one Organization owner."))
            owner = frappe.db.get_value("Organization", self.organization, ["is_active"], as_dict=True)
            if not owner:
                frappe.throw(_("Organization {0} does not exist.").format(self.organization))
            if not owner.is_active:
                frappe.throw(_("Organization {0} is not active.").format(self.organization))
            self.provider = None
            self.active_owner_key = None if self.status == "Archived" else f"organization:{self.organization}"
            return
        if self.owner_type == "Provider":
            if not self.provider or self.organization:
                frappe.throw(_("A site has exactly one Provider owner."))
            owner = frappe.db.get_value("Provider", self.provider, ["is_active", "organization_status"], as_dict=True)
            if not owner:
                frappe.throw(_("Provider {0} does not exist.").format(self.provider))
            if not owner.is_active:
                frappe.throw(_("Provider {0} is not active.").format(self.provider))
            if owner.organization_status != "Independent":
                frappe.throw(_("Only an independent Provider may own a site."))
            self.organization = None
            self.active_owner_key = None if self.status == "Archived" else f"provider:{self.provider}"
            return
        frappe.throw(_("Choose an owner type of Organization or Provider."))

    def _validate_capability(self):
        access.require_brand_manage(self.owner_type, self.organization, self.provider)

    def _validate_single_active_site(self):
        filters = {"status": ["!=", "Archived"], "owner_type": self.owner_type}
        filters["organization" if self.owner_type == "Organization" else "provider"] = (
            self.organization if self.owner_type == "Organization" else self.provider
        )
        if not self.is_new():
            filters["name"] = ["!=", self.name]
        if frappe.db.exists("Public Site", filters):
            frappe.throw(_("This business already has an active Public Site."))

    def _validate_slug(self):
        self.slug = normalize_slug(self.slug)
        error = slug_error(self.slug)
        if error:
            frappe.throw(_(error))
        filters = {"slug": self.slug}
        if not self.is_new():
            filters["name"] = ["!=", self.name]
        if frappe.db.exists("Public Site", filters):
            frappe.throw(_("That site address is already taken."))

    def _validate_brand_profile(self):
        if not self.brand_profile:
            return
        profile = frappe.db.get_value(
            "Brand Profile",
            self.brand_profile,
            ["owner_type", "organization", "provider", "recipe_key", "recipe_version"],
            as_dict=True,
        )
        if not profile or (profile.owner_type, profile.organization, profile.provider) != (
            self.owner_type,
            self.organization,
            self.provider,
        ):
            frappe.throw(_("The Brand Profile belongs to a different business."))
        if profile.recipe_key != self.recipe_key or int(profile.recipe_version or 0) != int(self.recipe_version or 0):
            frappe.throw(_("The Public Site recipe must match its Brand Profile."))

    def _validate_recipe(self):
        try:
            recipe = get_recipe(self.recipe_key, self.recipe_version or None)
        except BrandExperienceError as exc:
            frappe.throw(str(exc))
        self.recipe_key = recipe.key
        self.recipe_version = recipe.version
        self.content_schema_version = CONTENT_SCHEMA_VERSION

    def _validate_locales(self):
        recipe = get_recipe(self.recipe_key, self.recipe_version)
        if not self.enabled_locales:
            self.append(
                "enabled_locales",
                {"locale": self.default_locale, "enabled": 1, "is_default": 1, "translation_status": "Complete"},
            )
        enabled = [row.locale for row in self.enabled_locales if row.enabled]
        if len(set(enabled)) != len(enabled):
            frappe.throw(_("A locale can only be enabled once."))
        if not enabled:
            frappe.throw(_("Enable at least one locale."))
        if self.default_locale not in enabled:
            frappe.throw(_("The default locale must be enabled."))
        unsupported = sorted(set(enabled) - set(recipe.supported_locales))
        if unsupported:
            frappe.throw(_("Unsupported locales: {0}").format(", ".join(unsupported)))
        defaults = [row.locale for row in self.enabled_locales if row.is_default]
        if len(defaults) > 1 or (defaults and defaults[0] != self.default_locale):
            frappe.throw(_("Only the default locale may be marked as default."))

    def _validate_sections(self):
        recipe = get_recipe(self.recipe_key, self.recipe_version)
        seen: set[str] = set()
        present: set[str] = set()
        for row in self.sections:
            if not row.section_id or row.section_id in seen:
                frappe.throw(_("Each section needs a unique stable ID."))
            seen.add(row.section_id)
            if row.enabled:
                present.add(row.section_type)
            if row.section_type not in recipe.supported_sections:
                frappe.throw(_("Section '{0}' is not supported by this recipe.").format(row.section_type))
            if int(row.schema_version or 0) != CONTENT_SCHEMA_VERSION:
                frappe.throw(_("Section '{0}' must use schema version {1}.").format(row.section_type, CONTENT_SCHEMA_VERSION))
            report = validate_typed_section(row.section_type, self._section_content(row), allowed_intents=recipe.action_intents)
            if not report.ok:
                first = report.issues[0]
                frappe.throw(_("Section '{0}' is invalid ({1}): {2}").format(row.section_type, first.field, first.requirement))
        if self.status == "Published":
            missing = [section for section in recipe.required_sections if section not in present]
            if missing:
                frappe.throw(_("Published sites must include: {0}").format(", ".join(missing)))

    def _section_content(self, row) -> dict:
        raw = row.content_json
        if not raw:
            return {}
        if isinstance(raw, dict):
            return raw
        try:
            data = json.loads(raw)
        except (TypeError, ValueError):
            frappe.throw(_("Section content must be valid JSON."))
        return data if isinstance(data, dict) else {}

    def _validate_publication(self):
        if self.current_release:
            release_site = frappe.db.get_value("Experience Release", self.current_release, "public_site")
            if release_site != self.name:
                frappe.throw(_("The current release does not belong to this site."))
        if self.status == "Published" and not self.current_release:
            frappe.throw(_("Publish an Experience Release before marking the site Published."))
