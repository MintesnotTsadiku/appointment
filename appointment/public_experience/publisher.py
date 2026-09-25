"""The single Experience Release publisher.

The publisher is the only place that combines a compiled design with a typed
public content draft. It resolves editor-owned action intents to safe targets
inside the immutable release projection.
"""

from __future__ import annotations

import copy
import json
from collections.abc import Mapping
from dataclasses import dataclass
from datetime import timedelta
from types import MappingProxyType

import frappe
from frappe.utils import now_datetime

from appointment.public_experience import access
from appointment.public_experience.actions import project_action
from appointment.public_experience.canonical import canonicalize, hash_document
from appointment.public_experience.design_compiler import compile_design
from appointment.public_experience.errors import ExperiencePublishError, StaleDraftError, UnsafeActionIntentError
from appointment.public_experience.recipes import get_recipe
from appointment.public_experience.section_schemas import CONTENT_SCHEMA_VERSION, validate_typed_section

PREVIEW_TTL_SECONDS = 900
OUTBOX_EVENT_PUBLISHED = "experience_published"
OUTBOX_EVENT_ROLLED_BACK = "experience_rolled_back"
_RELEASE_PREFIX = "public_experience:release:"
_CONFIG_PREFIX = "public_experience:config:"


@dataclass(frozen=True)
class SignedPreview:
    token: str
    expires_at: str
    public_site: str
    draft_version: int
    viewport: str
    locale: str
    config: Mapping[str, object]

    def as_dict(self) -> dict:
        return {
            "token": self.token,
            "expiresAt": self.expires_at,
            "publicSite": self.public_site,
            "draftVersion": self.draft_version,
            "viewport": self.viewport,
            "locale": self.locale,
            "config": dict(self.config),
        }


def _resolve_site(site):
    return frappe.get_doc("Public Site", site) if isinstance(site, str) else site


def _lock_site(name: str) -> None:
    frappe.db.sql("select name from " + chr(96) + "tabPublic Site" + chr(96) + " where name=%s for update", name)


def _assert_current(site, expected_version: int) -> None:
    stored = int(site.draft_version or 0)
    if stored != int(expected_version):
        raise StaleDraftError(
            f"the site draft advanced to version {stored}",
            details={"expected": int(expected_version), "stored": stored, "site": site.name},
        )


def _parse_json(raw: object) -> dict:
    if not raw:
        return {}
    if isinstance(raw, dict):
        return dict(raw)
    try:
        data = json.loads(raw)
    except (TypeError, ValueError):
        return {}
    return dict(data) if isinstance(data, dict) else {}


def _brand_artifact(site) -> tuple[str, dict]:
    if not site.brand_profile:
        raise ExperiencePublishError("the site has no Brand Profile")
    revision_name = frappe.db.get_value("Brand Profile", site.brand_profile, "active_revision")
    if not revision_name:
        raise ExperiencePublishError("the brand has no published revision")
    revision = frappe.get_doc("Brand Revision", revision_name)
    try:
        design = json.loads(revision.normalized_json or "")
    except (TypeError, ValueError) as exc:
        raise ExperiencePublishError("the active Brand Revision is unreadable") from exc
    if not isinstance(design, dict) or design.get("contentHash") != revision.compiled_design_hash:
        raise ExperiencePublishError("the active Brand Revision is not a valid compiled design")
    return revision.name, design


def _section_content(row) -> dict:
    return _parse_json(row.content_json)


def _first_location(sections: list[dict]) -> tuple[str | None, str | None]:
    for section in sections:
        if section.get("type") != "locations":
            continue
        items = (section.get("content") or {}).get("items") or []
        if items and isinstance(items[0], dict):
            item = items[0]
            address = item.get("address") or {}
            phone = item.get("phone")
            return (
                address.get("en") if isinstance(address, dict) else None,
                phone if isinstance(phone, str) else None,
            )
    return None, None


def _project_content(value: object, *, public_path: str, phone: str | None, location_query: str | None) -> object:
    if isinstance(value, dict):
        if "intent" in value and "label" in value and "placement" in value:
            return project_action(
                value,
                public_path=public_path,
                phone=phone,
                location_query=location_query,
            )
        return {
            key: _project_content(item, public_path=public_path, phone=phone, location_query=location_query)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [
            _project_content(item, public_path=public_path, phone=phone, location_query=location_query)
            for item in value
        ]
    return value


def _compose_sections(site, recipe, *, public_path: str) -> list[dict]:
    rows = [row for row in site.sections if row.enabled]
    rows.sort(key=lambda row: (row.order_index or 0, row.section_id or ""))
    sections: list[dict] = []
    present: set[str] = set()
    for row in rows:
        if row.section_type not in recipe.supported_sections:
            raise ExperiencePublishError(f"section '{row.section_type}' is not supported by this recipe")
        if int(row.schema_version or 0) != CONTENT_SCHEMA_VERSION:
            raise ExperiencePublishError(f"section '{row.section_type}' has the wrong schema version")
        content = _section_content(row)
        report = validate_typed_section(row.section_type, content, allowed_intents=recipe.action_intents)
        if not report.ok:
            first = report.issues[0]
            raise ExperiencePublishError(f"section '{row.section_type}' is invalid ({first.field}): {first.requirement}")
        sections.append(
            {
                "id": row.section_id,
                "type": row.section_type,
                "schemaVersion": CONTENT_SCHEMA_VERSION,
                "order": row.order_index or 0,
                "content": content,
            }
        )
        present.add(row.section_type)
    missing = [name for name in recipe.required_sections if name not in present]
    if missing:
        raise ExperiencePublishError("missing required sections: " + ", ".join(missing))
    location_query, phone = _first_location(sections)
    for section in sections:
        section["content"] = _project_content(
            section["content"],
            public_path=public_path,
            phone=phone,
            location_query=location_query,
        )
    return sections


def _snapshot(site, recipe, design, sections) -> dict:
    return {
        "site": site.name,
        "recipeKey": recipe.key,
        "recipeVersion": recipe.version,
        "compiledDesign": design,
        "contentSchemaVersion": CONTENT_SCHEMA_VERSION,
        "locales": {
            "default": site.default_locale,
            "enabled": [row.locale for row in site.enabled_locales if row.enabled],
        },
        "sections": sections,
        "seo": _parse_json(site.seo_json),
        "booking": _parse_json(site.booking_json),
    }


def _release_document(site, snapshot, brand_revision, design) -> dict:
    return {
        "publicSite": site.name,
        "snapshot": snapshot,
        "brandRevision": brand_revision,
        "recipeKey": snapshot["recipeKey"],
        "recipeVersion": snapshot["recipeVersion"],
        "compiledDesignHash": design["contentHash"],
        "locales": snapshot["locales"],
        "seo": snapshot["seo"],
        "booking": snapshot["booking"],
    }


def _write_outbox(event: str, payload: dict, idempotency_key: str) -> None:
    if frappe.db.exists("Public Experience Outbox", {"idempotency_key": idempotency_key}):
        return
    doc = frappe.get_doc(
        {
            "doctype": "Public Experience Outbox",
            "event": event,
            "idempotency_key": idempotency_key,
            "status": "Pending",
            "scheduled_at": now_datetime(),
            "payload_json": json.dumps(payload, sort_keys=True),
        }
    )
    doc.flags.ignore_permissions = True
    doc.insert()


def purge_experience_cache(site: str, release: str | None = None) -> None:
    keys = [f"{_CONFIG_PREFIX}{site}"]
    if release:
        keys.append(f"{_RELEASE_PREFIX}{release}")
    try:
        frappe.cache.delete_value(keys)
    except Exception:
        pass


def _after_commit_purge(site: str, release: str, event: str, payload: dict) -> None:
    def _run() -> None:
        purge_experience_cache(site, release)
        try:
            frappe.publish_realtime(event, payload)
        except Exception:
            frappe.log_error(frappe.get_traceback(), f"Experience publisher event: {event}")

    frappe.db.after_commit.add(_run)


def publish_experience(site, expected_version: int):
    """Compose, validate and publish an immutable Experience Release."""

    doc = _resolve_site(site)
    access.require_brand_manage(doc.owner_type, doc.organization, doc.provider)
    _lock_site(doc.name)
    doc.reload()
    _assert_current(doc, expected_version)
    recipe = get_recipe(doc.recipe_key, doc.recipe_version or None)
    brand_revision, design = _brand_artifact(doc)
    if design.get("recipeKey") != recipe.key or int(design.get("recipeVersion") or 0) != recipe.version:
        raise ExperiencePublishError("the site recipe and compiled design do not match")
    sections = _compose_sections(doc, recipe, public_path=f"/{doc.slug}")
    snapshot = _snapshot(doc, recipe, design, sections)
    release_hash = hash_document(_release_document(doc, snapshot, brand_revision, design))
    release = frappe.get_doc(
        {
            "doctype": "Experience Release",
            "public_site": doc.name,
            "normalized_json": canonicalize(snapshot),
            "release_hash": release_hash,
            "brand_revision": brand_revision,
            "recipe_key": recipe.key,
            "recipe_version": recipe.version,
            "compiled_design_hash": design["contentHash"],
            "layout_renderer_key": (design.get("layout") or {}).get("rendererKey"),
            "layout_renderer_version": (design.get("layout") or {}).get("rendererVersion"),
            "content_schema_version": CONTENT_SCHEMA_VERSION,
            "locales_json": json.dumps(snapshot["locales"], sort_keys=True),
            "seo_json": json.dumps(snapshot["seo"], sort_keys=True),
            "booking_json": json.dumps(snapshot["booking"], sort_keys=True),
            "asset_manifest_json": json.dumps(design.get("assets") or {}, sort_keys=True),
            "policy_versions_json": json.dumps(
                {"compiler": design.get("compilerPolicyVersion"), "content": CONTENT_SCHEMA_VERSION},
                sort_keys=True,
            ),
            "source_draft_version": doc.draft_version,
        }
    )
    release.flags.public_experience_factory = True
    release.flags.ignore_permissions = True
    release.insert()
    doc.current_release = release.name
    doc.status = "Published"
    doc.last_published_at = now_datetime()
    doc.last_published_by = frappe.session.user
    if not doc.first_published_at:
        doc.first_published_at = doc.last_published_at
    doc.flags.ignore_permissions = True
    doc.save()
    _write_outbox(
        OUTBOX_EVENT_PUBLISHED,
        {"site": doc.name, "release": release.name, "hash": release_hash},
        f"publish:{doc.name}:{release_hash}",
    )
    _after_commit_purge(doc.name, release.name, OUTBOX_EVENT_PUBLISHED, {"site": doc.name, "release": release.name})
    from appointment.public_experience import observability
    observability.record("experience_publish")
    return release


def rollback_experience(site, release):
    """Create a new release from a prior immutable projection."""

    doc = _resolve_site(site)
    access.require_brand_manage(doc.owner_type, doc.organization, doc.provider)
    _lock_site(doc.name)
    doc.reload()
    target = release if hasattr(release, "normalized_json") else frappe.get_doc("Experience Release", release)
    if target.public_site != doc.name or not target.normalized_json:
        raise ExperiencePublishError("the release does not belong to this site or has no snapshot")
    snapshot = _parse_json(target.normalized_json)
    design = snapshot.get("compiledDesign") or {}
    release_hash = hash_document(_release_document(doc, snapshot, target.brand_revision, design))
    new_release = frappe.get_doc(
        {
            "doctype": "Experience Release",
            "public_site": doc.name,
            "normalized_json": target.normalized_json,
            "release_hash": release_hash,
            "brand_revision": target.brand_revision,
            "recipe_key": target.recipe_key,
            "recipe_version": target.recipe_version,
            "compiled_design_hash": target.compiled_design_hash,
            "layout_renderer_key": target.layout_renderer_key,
            "layout_renderer_version": target.layout_renderer_version,
            "content_schema_version": target.content_schema_version,
            "locales_json": target.locales_json,
            "seo_json": target.seo_json,
            "booking_json": target.booking_json,
            "asset_manifest_json": target.asset_manifest_json,
            "policy_versions_json": target.policy_versions_json,
            "source_draft_version": doc.draft_version,
        }
    )
    new_release.flags.public_experience_factory = True
    new_release.flags.ignore_permissions = True
    new_release.insert()
    doc.current_release = new_release.name
    doc.status = "Published"
    doc.last_published_at = now_datetime()
    doc.last_published_by = frappe.session.user
    doc.flags.ignore_permissions = True
    doc.save()
    _write_outbox(
        OUTBOX_EVENT_ROLLED_BACK,
        {"site": doc.name, "release": new_release.name, "reinstated": target.name},
        f"rollback:{doc.name}:{new_release.release_number}",
    )
    _after_commit_purge(doc.name, new_release.name, OUTBOX_EVENT_ROLLED_BACK, {"site": doc.name, "release": new_release.name})
    from appointment.public_experience import observability
    observability.record("experience_rollback")
    return new_release


def preview_experience(site, expected_version: int, viewport: str, locale: str) -> SignedPreview:
    """Build an unpersisted draft snapshot behind a short-lived signed token."""

    doc = _resolve_site(site)
    access.require_brand_manage(doc.owner_type, doc.organization, doc.provider)
    _assert_current(doc, expected_version)
    recipe = get_recipe(doc.recipe_key, doc.recipe_version or None)
    brand_revision, design = _brand_artifact(doc)
    sections = _compose_sections(doc, recipe, public_path=f"/{doc.slug}")
    snapshot = _snapshot(doc, recipe, design, sections)
    token = frappe.generate_hash(length=40)
    expires_at = now_datetime() + timedelta(seconds=PREVIEW_TTL_SECONDS)
    payload = {
        "site": doc.name,
        "draftVersion": doc.draft_version,
        "viewport": viewport,
        "locale": locale,
        "brandRevision": brand_revision,
        "snapshot": snapshot,
        "expiresAt": str(expires_at),
    }
    try:
        frappe.cache.set_value(f"public_experience:preview:{token}", payload, expires_in_sec=PREVIEW_TTL_SECONDS)
    except Exception:
        pass
    return SignedPreview(
        token=token,
        expires_at=str(expires_at),
        public_site=doc.name,
        draft_version=int(doc.draft_version or 0),
        viewport=viewport,
        locale=locale,
        config=MappingProxyType(payload),
    )


def consume_preview(token: str) -> dict | None:
    if not token:
        return None
    try:
        return frappe.cache.get_value(f"public_experience:preview:{token}")
    except Exception:
        return None
