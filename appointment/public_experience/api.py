"""Whitelisted API for the single Brand Recipe/Public Experience path."""

from __future__ import annotations

import json

import frappe

from appointment.public_experience import access, brand_compiler, publisher
from appointment.public_experience import public_config
from appointment.public_experience import resolver as resolver_module
from appointment.public_experience.errors import BrandExperienceError, StaleDraftError
from appointment.public_experience.recipes import list_recipes
from appointment.public_experience.reserved import normalize_slug


def _request_host() -> str:
    request = getattr(frappe.local, "request", None)
    host = getattr(request, "host", None) if request is not None else None
    return (host or "").split(":")[0]


def _request_path() -> str:
    request = getattr(frappe.local, "request", None)
    return (getattr(request, "path", None) if request is not None else None) or "/"


@frappe.whitelist(allow_guest=True, methods=["GET"])
def get_public_ui_config(locale: str | None = None, public_path: str | None = None):
    from appointment.public_experience import observability

    try:
        context = resolver_module.resolve_public_experience(
            _request_host(), public_path if public_path is not None else _request_path(), locale
        )
        result = public_config.config_from_resolved(context).as_dict()
    except BrandExperienceError as exc:
        observability.record("resolve_rejected", reason=exc.details.get("reason"))
        raise
    observability.record("resolve", routeKind=context.route_kind)
    return result


@frappe.whitelist(allow_guest=True, methods=["GET"])
def get_public_experience_snapshot(locale: str | None = None, public_path: str | None = None):
    context = resolver_module.resolve_public_experience(
        _request_host(), public_path if public_path is not None else _request_path(), locale
    )
    snapshot = resolver_module.public_snapshot(context.release)
    booking_path = None
    if context.organization:
        slug = frappe.db.get_value("Organization", context.organization, "slug")
        if slug:
            booking_path = f"/schedule/org/{slug}"
    return {
        "contract": "appointment-public-snapshot.v2",
        "releaseHash": context.release_hash,
        "locale": context.locale,
        "availableLocales": list(context.available_locales),
        "routeKind": context.route_kind,
        "canonicalUrl": context.canonical_url,
        "recipeKey": context.recipe_key,
        "recipeVersion": context.recipe_version,
        "layoutRendererKey": context.layout_renderer_key,
        "layoutRendererVersion": context.layout_renderer_version,
        "compiledDesign": snapshot.get("compiledDesign") or {},
        "bookingPath": booking_path,
        "sections": snapshot.get("sections", []),
        "seo": snapshot.get("seo", {}),
        "booking": snapshot.get("booking", {}),
    }


@frappe.whitelist(methods=["GET"])
def list_brand_profiles():
    return {
        "profiles": frappe.get_list(
            "Brand Profile",
            fields=[
                "name", "profile_name", "application_name", "short_name", "logo_primary", "logo_compact", "favicon",
                "owner_type", "organization", "provider", "recipe_key",
                "recipe_version", "brand_inputs_json", "lifecycle",
                "active_revision", "draft_version", "modified",
            ],
            order_by="modified desc",
        )
    }


@frappe.whitelist(methods=["GET"])
def list_public_sites():
    return {
        "sites": frappe.get_list(
            "Public Site",
            fields=[
                "name", "site_title", "slug", "status", "owner_type",
                "organization", "provider", "brand_profile", "recipe_key",
                "recipe_version", "current_release", "draft_version", "modified",
            ],
            order_by="modified desc",
        )
    }


@frappe.whitelist(methods=["GET"])
def list_curated_recipes():
    showcases = _recipe_showcases()
    return {"recipes": [{**recipe.as_summary(), "showcase": showcases.get(recipe.key)} for recipe in list_recipes()]}


def _recipe_showcases() -> dict[str, dict]:
    """Gallery imagery per recipe; the example link is offered only once that showcase is live."""
    from appointment.public_experience.showcase_catalog import recipe_showcases

    result = {}
    for recipe_key, showcase in recipe_showcases().items():
        site = frappe.db.get_value("Public Site", {"slug": showcase["slug"], "status": "Published"}, "site_title")
        result[recipe_key] = {
            "heroAsset": showcase["heroAsset"],
            "logoAsset": showcase["logoAsset"],
            "title": site,
            "path": f"/{showcase['slug']}" if site else None,
        }
    return result


@frappe.whitelist(methods=["GET"])
def compile_brand(profile: str, expected_draft_version: int):
    return brand_compiler.compile_brand(profile, int(expected_draft_version)).as_dict()


@frappe.whitelist(methods=["POST"])
def publish_brand(profile: str, expected_draft_version: int):
    revision = brand_compiler.publish_brand(profile, int(expected_draft_version))
    return {"revision": revision.name, "revisionNumber": revision.revision_number, "compiledDesignHash": revision.compiled_design_hash}


@frappe.whitelist(methods=["POST"])
def rollback_brand(profile: str, revision: str):
    created = brand_compiler.rollback_brand(profile, revision)
    return {"revision": created.name, "revisionNumber": created.revision_number}


@frappe.whitelist(methods=["POST"])
def save_brand_draft(
    profile: str,
    expected_draft_version: int,
    brand_inputs_json: str | None = None,
    recipe_key: str | None = None,
    recipe_version: int | None = None,
    application_name: str | None = None,
    short_name: str | None = None,
):
    """Save only typed recipe inputs behind an expected draft version."""

    doc = frappe.get_doc("Brand Profile", profile)
    access.require_brand_manage(doc.owner_type, doc.organization, doc.provider)
    if int(doc.draft_version or 0) != int(expected_draft_version):
        raise StaleDraftError(
            f"the brand draft advanced to version {doc.draft_version}",
            details={"expected": int(expected_draft_version), "stored": int(doc.draft_version or 0)},
        )
    if brand_inputs_json is not None:
        if isinstance(brand_inputs_json, dict):
            doc.brand_inputs_json = json.dumps(brand_inputs_json, sort_keys=True)
        else:
            doc.brand_inputs_json = brand_inputs_json
    if recipe_key:
        doc.recipe_key = recipe_key
    if recipe_version is not None:
        doc.recipe_version = int(recipe_version)
    if application_name is not None:
        doc.application_name = application_name
    if short_name is not None:
        doc.short_name = short_name
    doc.save()
    return {"profile": doc.name, "draftVersion": doc.draft_version, "recipeKey": doc.recipe_key, "recipeVersion": doc.recipe_version}


@frappe.whitelist(methods=["GET"])
def brand_history(profile: str):
    doc = frappe.get_doc("Brand Profile", profile)
    access.require_brand_manage(doc.owner_type, doc.organization, doc.provider)
    rows = frappe.get_all(
        "Brand Revision",
        filters={"brand_profile": profile},
        fields=["name", "revision_number", "recipe_key", "recipe_version", "compiled_design_hash", "published_at", "published_by"],
        order_by="revision_number desc",
    )
    return {"active": doc.active_revision, "revisions": rows}


@frappe.whitelist(methods=["GET"])
def site_readiness(site: str):
    doc = frappe.get_doc("Public Site", site)
    access.require_brand_manage(doc.owner_type, doc.organization, doc.provider)
    recipe = next((item for item in list_recipes() if item.key == doc.recipe_key), None)
    present = {row.section_type for row in doc.sections if row.enabled}
    missing = sorted(set(recipe.required_sections) - present) if recipe else ["certified recipe"]
    checks = [
        {
            "check": "brand_published",
            "ok": bool(doc.brand_profile and frappe.db.get_value("Brand Profile", doc.brand_profile, "active_revision")),
            "remediation": None,
        },
        {"check": "locales", "ok": bool([row for row in doc.enabled_locales if row.enabled]), "remediation": None},
        {"check": "required_sections", "ok": not missing, "remediation": ("Add: " + ", ".join(missing)) if missing else None},
    ]
    primary = frappe.db.exists("Public Site Domain", {"public_site": site, "is_primary": 1})
    checks.append({"check": "primary_domain", "ok": bool(primary), "remediation": "Optional; set a primary domain." if not primary else None})
    return {"ready": all(check["ok"] for check in checks if check["check"] != "primary_domain"), "checks": checks}


@frappe.whitelist(methods=["GET"])
def experience_releases(site: str):
    doc = frappe.get_doc("Public Site", site)
    access.require_brand_manage(doc.owner_type, doc.organization, doc.provider)
    rows = frappe.get_all(
        "Experience Release",
        filters={"public_site": site},
        fields=["name", "release_number", "release_hash", "brand_revision", "recipe_key", "recipe_version", "compiled_design_hash", "published_at", "published_by"],
        order_by="release_number desc",
    )
    return {"current": doc.current_release, "releases": rows}


@frappe.whitelist(methods=["POST"])
def preview_experience(site: str, expected_version: int, viewport: str = "desktop", locale: str = "en"):
    return publisher.preview_experience(site, int(expected_version), viewport, locale).as_dict()


@frappe.whitelist(methods=["POST"])
def publish_experience(site: str, expected_version: int):
    release = publisher.publish_experience(site, int(expected_version))
    return {"release": release.name, "releaseNumber": release.release_number, "hash": release.release_hash}


@frappe.whitelist(methods=["POST"])
def rollback_experience(site: str, release: str):
    created = publisher.rollback_experience(site, release)
    return {"release": created.name, "releaseNumber": created.release_number}


@frappe.whitelist(methods=["GET"])
def domain_dns_instructions(domain: str):
    from appointment.public_experience import dns, edge
    doc = frappe.get_doc("Public Site Domain", domain)
    site = frappe.db.get_value("Public Site", doc.public_site, ["owner_type", "organization", "provider"], as_dict=True)
    if not site:
        frappe.throw("The domain has no site.")
    access.require_brand_manage(site.owner_type, site.organization, site.provider)
    target_host = frappe.conf.get("brand_public_experience_platform_host") or frappe.local.site
    records = dns.expected_records(doc.hostname_ascii, doc.verification_token or "", target_host, doc.domain_type)
    return {
        "hostname": doc.hostname_ascii,
        "status": doc.lifecycle_status,
        "records": [{"type": record.record_type, "host": record.host, "value": record.value, "purpose": record.purpose} for record in records],
        "edge_target": target_host,
        "adapter": type(edge.NginxSelfManagedAdapter()).__name__,
    }


@frappe.whitelist(methods=["GET"])
def edge_config_preview():
    frappe.only_for("System Manager")
    from appointment.public_experience.edge import NginxSelfManagedAdapter, render_config
    adapter = NginxSelfManagedAdapter()
    routes = adapter.active_routes()
    return {"config": render_config(routes, adapter.options()), "domains": [route.hostname for route in routes]}


@frappe.whitelist(methods=["GET"])
def reconciliation_diagnostics():
    frappe.only_for("System Manager")
    from appointment.public_experience.reconcile import get_reconciliation_diagnostics
    return get_reconciliation_diagnostics()
