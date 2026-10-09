"""The single Brand Recipe compiler and publication seam."""

from __future__ import annotations

import json
from dataclasses import dataclass

import frappe
from frappe import _
from frappe.utils import now_datetime

from appointment.public_experience import access
from appointment.public_experience.canonical import canonicalize
from appointment.public_experience.design_compiler import compile_design
from appointment.public_experience.errors import BrandCompilationError, BrandExperienceError, StaleDraftError
from appointment.public_experience.recipes import get_recipe


@dataclass(frozen=True)
class BrandCompilationResult:
    """The deterministic result of compiling one Brand Profile draft."""

    profile: str
    draft_version: int
    recipe_key: str
    recipe_version: int
    compiler_policy_version: str
    compiled_design: dict
    canonical: str
    content_hash: str

    @property
    def is_valid(self) -> bool:
        return bool(self.compiled_design.get("validation", {}).get("ok"))

    def as_dict(self) -> dict:
        return {
            "profile": self.profile,
            "draftVersion": self.draft_version,
            "recipeKey": self.recipe_key,
            "recipeVersion": self.recipe_version,
            "compilerPolicyVersion": self.compiler_policy_version,
            "compiledDesign": dict(self.compiled_design),
            "contentHash": self.content_hash,
            "valid": self.is_valid,
            "issues": list(self.compiled_design.get("validation", {}).get("issues") or []),
        }


def _resolve_profile(profile):
    return frappe.get_doc("Brand Profile", profile) if isinstance(profile, str) else profile


def _lock_profile(name: str) -> None:
    frappe.db.sql("select name from " + chr(96) + "tabBrand Profile" + chr(96) + " where name=%s for update", name)


def _assert_current(profile, expected_draft_version: int) -> None:
    stored = int(profile.draft_version or 0)
    if stored != int(expected_draft_version):
        raise StaleDraftError(
            _("the brand draft advanced to version {0}").format(stored),
            details={"expected": int(expected_draft_version), "stored": stored, "profile": profile.name},
        )


def _inputs(profile) -> dict:
    raw = profile.brand_inputs_json
    if not raw:
        return {}
    if isinstance(raw, dict):
        data = dict(raw)
    else:
        try:
            data = json.loads(raw)
        except (TypeError, ValueError) as exc:
            raise BrandCompilationError(_("recipe adjustments are not valid JSON"), details={"profile": profile.name}) from exc
    if not isinstance(data, dict):
        raise BrandCompilationError(_("Recipe adjustments must be a JSON object."), details={"profile": profile.name})
    return data


def compile_brand(profile, expected_draft_version: int) -> BrandCompilationResult:
    """Compile a draft through the certified recipe registry."""

    doc = _resolve_profile(profile)
    access.require_brand_manage(doc.owner_type, doc.organization, doc.provider)
    _assert_current(doc, expected_draft_version)
    try:
        recipe = get_recipe(doc.recipe_key, doc.recipe_version or None)
        design = compile_design(
            recipe.key,
            recipe.version,
            {
                **_inputs(doc),
                "application_name": doc.application_name,
                "short_name": doc.short_name or doc.application_name,
                "logo_primary": doc.logo_primary,
                "logo_compact": doc.logo_compact,
                "favicon": doc.favicon,
            },
            {
                "sections": list(recipe.required_sections),
                "locales": list(recipe.supported_locales),
                "content_richness": "rich",
            },
        )
    except BrandExperienceError as exc:
        raise BrandCompilationError(str(exc), details={"profile": doc.name, **exc.details}) from exc
    artifact = design.as_dict()
    return BrandCompilationResult(
        profile=doc.name,
        draft_version=int(doc.draft_version or 0),
        recipe_key=recipe.key,
        recipe_version=recipe.version,
        compiler_policy_version=design.compiler_policy_version,
        compiled_design=artifact,
        canonical=design.canonical,
        content_hash=design.content_hash,
    )


def _emit_after_commit(event: str, payload: dict) -> None:
    def _publish() -> None:
        try:
            frappe.publish_realtime(event, payload)
        except Exception:
            frappe.log_error(frappe.get_traceback(), f"Brand compiler event: {event}")

    frappe.db.after_commit.add(_publish)


def _write_revision(profile, result: BrandCompilationResult):
    design = result.compiled_design
    layout = design.get("layout") or {}
    revision = frappe.get_doc(
        {
            "doctype": "Brand Revision",
            "brand_profile": profile.name,
            "normalized_json": canonicalize(design),
            "compiled_design_hash": result.content_hash,
            "recipe_key": result.recipe_key,
            "recipe_version": result.recipe_version,
            "recipe_hash": design.get("recipeHash"),
            "compiler_policy_version": result.compiler_policy_version,
            "layout_renderer_key": layout.get("rendererKey"),
            "layout_renderer_version": layout.get("rendererVersion"),
            "asset_manifest_json": json.dumps(design.get("assets") or {}, sort_keys=True),
            "validation_json": json.dumps(design.get("validation") or {}, sort_keys=True),
        }
    )
    revision.flags.public_experience_factory = True
    revision.flags.ignore_permissions = True
    revision.insert()
    profile.active_revision = revision.name
    profile.lifecycle = "Published"
    profile.published_at = now_datetime()
    profile.published_by = frappe.session.user
    profile.flags.ignore_permissions = True
    profile.save()
    return revision


def publish_brand(profile, expected_draft_version: int):
    """Compile, validate and publish one immutable Brand Revision."""

    doc = _resolve_profile(profile)
    access.require_brand_manage(doc.owner_type, doc.organization, doc.provider)
    _lock_profile(doc.name)
    doc.reload()
    _assert_current(doc, expected_draft_version)
    result = compile_brand(doc, expected_draft_version)
    if not result.is_valid:
        raise BrandCompilationError(_("the compiled design is not publishable"), details={"profile": doc.name})
    revision = _write_revision(doc, result)
    _emit_after_commit("brand_published", {"profile": doc.name, "revision": revision.name, "hash": result.content_hash})
    return revision


def rollback_brand(profile, revision):
    """Create a new revision from a prior compiled design without editing history."""

    doc = _resolve_profile(profile)
    access.require_brand_manage(doc.owner_type, doc.organization, doc.provider)
    _lock_profile(doc.name)
    doc.reload()
    target = revision if hasattr(revision, "normalized_json") else frappe.get_doc("Brand Revision", revision)
    if target.brand_profile != doc.name:
        raise BrandCompilationError(_("the revision belongs to a different brand"))
    if not target.normalized_json or not target.compiled_design_hash:
        raise BrandCompilationError(_("the revision has no compiled design to reinstate"))
    result = BrandCompilationResult(
        profile=doc.name,
        draft_version=int(doc.draft_version or 0),
        recipe_key=target.recipe_key,
        recipe_version=int(target.recipe_version),
        compiler_policy_version=target.compiler_policy_version,
        compiled_design=json.loads(target.normalized_json),
        canonical=target.normalized_json,
        content_hash=target.compiled_design_hash,
    )
    new_revision = _write_revision(doc, result)
    _emit_after_commit(
        "brand_rolled_back",
        {"profile": doc.name, "revision": new_revision.name, "reinstated": target.name},
    )
    return new_revision
