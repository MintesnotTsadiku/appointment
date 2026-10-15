"""Whitelisted API for the single Brand Recipe/Public Experience path."""

from __future__ import annotations

import json

import frappe
from frappe import _
from frappe.rate_limiter import rate_limit

from appointment.content.monitoring import observed

from appointment.public_experience import access, brand_compiler, publisher
from appointment.public_experience import public_config
from appointment.public_experience import resolver as resolver_module
from appointment.public_experience.errors import BrandExperienceError, PublicResolutionError, StaleDraftError
from appointment.public_experience.recipes import available_recipes, list_recipes
from appointment.public_experience.reserved import normalize_slug


@frappe.whitelist(methods=["GET"])
def website_setup_context(industry: str = "", mood: str = "", audience: str = "", density: str = ""):
    from appointment.public_experience import setup

    organizations = access.membership.manager_organizations()
    providers = [name for name in access.owned_providers()
                 if frappe.db.get_value("Provider", name, "organization_status") == "Independent"]
    owners = [{"type": "Organization", "name": name,
               "label": frappe.db.get_value("Organization", name, "organization_name")} for name in organizations]
    owners += [{"type": "Provider", "name": name,
                "label": frappe.db.get_value("Provider", name, "provider_name")} for name in providers]
    sites = frappe.get_list("Public Site", filters={"status": ["!=", "Archived"]}, pluck="name")
    selected = access.membership.context().get("selected") or {}
    selected_owner = selected.get("organization")
    if selected_owner not in {row["name"] for row in owners}:
        selected_owner = owners[0]["name"] if len(owners) == 1 else None
    from appointment.growth.template_choice import for_user as gallery_template

    return {"selectedOwner": selected_owner, "owners": owners, "catalog": setup.ranked_catalog(industry, mood, audience, density),
            "sites": [setup.state(setup.require_site(name)) for name in sites],
            "galleryTemplate": gallery_template(frappe.session.user)}


@frappe.whitelist(methods=["POST"])
@observed("identity.upload", scope="site")
def upload_website_identity(site: str, expected_version: int, kind: str, content_base64: str, public_consent: int):
    from appointment.public_experience.identity_media import upload

    return upload(site, expected_version, kind, content_base64, public_consent)


@frappe.whitelist(methods=["POST"])
@observed("section_image.upload", scope="site")
def upload_website_section_image(site: str, content_base64: str, public_consent: int):
    """Add an owner photo to the website's media library for a section image slot."""
    from appointment.public_experience import section_media

    return section_media.upload(site, content_base64, public_consent)


@frappe.whitelist(methods=["GET"])
def website_media_library(site: str):
    from appointment.public_experience import section_media

    return section_media.library(site)


@frappe.whitelist(methods=["POST"])
def preview_website_template(owner_type: str, owner: str, recipe_key: str, preferences=None):
    from appointment.public_experience import setup

    return setup.preview_template(owner_type, owner, recipe_key, preferences)


@frappe.whitelist(methods=["POST"])
def start_website_setup(owner_type: str, owner: str, title: str, slug: str, recipe_key: str, preferences=None):
    from appointment.public_experience import setup

    return setup.start(owner_type, owner, title, slug, recipe_key, preferences)


@frappe.whitelist(methods=["POST"])
def switch_website_template(site: str, expected_version: int, recipe_key: str):
    """Move a website draft to another template after the owner confirmed it."""
    from appointment.public_experience import template_switch

    return template_switch.switch(site, expected_version, recipe_key)


@frappe.whitelist(methods=["POST"])
def save_website_setup(site: str, expected_version: int, step: str, title=None,
                       sections=None, features=None, brand_inputs=None, booking=None):
    from appointment.public_experience import setup

    return setup.save(site, expected_version, step, title, sections, features, brand_inputs, booking)


@frappe.whitelist(methods=["POST"])
@observed("website.preview", scope="site")
def preview_website_setup(site: str, expected_version: int, brand_inputs=None):
    from appointment.public_experience import setup

    return setup.preview(site, expected_version, brand_inputs)


@frappe.whitelist(methods=["POST"])
def website_setup_readiness(site: str, expected_version: int):
    from appointment.public_experience import setup

    return setup.readiness(site, expected_version)


@frappe.whitelist(methods=["POST"])
@observed("website.publish", scope="site")
def publish_website_setup(site: str, expected_version: int):
    from appointment.public_experience import setup

    return setup.publish(site, expected_version)


def _request_host() -> str:
    request = getattr(frappe.local, "request", None)
    host = getattr(request, "host", None) if request is not None else None
    return (host or "").split(":")[0]


def _request_path() -> str:
    request = getattr(frappe.local, "request", None)
    return (getattr(request, "path", None) if request is not None else None) or "/"


@frappe.whitelist(allow_guest=True, methods=["GET"])
def get_public_ui_config(locale: str | None = None, public_path: str | None = None, optional: int | str = 0):
    """Return the public UI config. With `optional`, a path that has no published site returns None
    (status 200) instead of a 404: callers such as the booking page theme a business only when it has one."""
    from appointment.public_experience import observability

    try:
        context = resolver_module.resolve_public_experience(
            _request_host(), public_path if public_path is not None else _request_path(), locale
        )
        result = public_config.config_from_resolved(context).as_dict()
    except PublicResolutionError as exc:
        observability.record("resolve_rejected", reason=exc.details.get("reason"))
        if frappe.utils.cint(optional):
            return None
        raise
    except BrandExperienceError as exc:
        observability.record("resolve_rejected", reason=exc.details.get("reason"))
        raise
    observability.record("resolve", routeKind=context.route_kind)
    return result


def _independent_offerings(provider):
    """The bookable offerings of an independent provider, oldest first, one per service."""
    from appointment.scheduler.booking import offering

    found = {}
    for event in frappe.get_all("EventType", filters={"provider": provider, "is_active": 1},
                                fields=["name", "service"], order_by="creation asc"):
        if event.service in found:
            continue
        try:
            found[event.service] = offering(event.name, public=True)
        except (frappe.PermissionError, frappe.ValidationError, frappe.DoesNotExistError):
            continue
    return found


def _independent_booking_paths(provider):
    """The scheduler path of each bookable offering of an independent provider, by service, oldest first."""
    slug = frappe.db.get_value("Provider", provider, "public_slug")
    root = f"/schedule/p/{slug}/" if slug else "/schedule/individual/"
    return {service: root + parts.event.name for service, parts in _independent_offerings(provider).items()}


def _organization_booking_paths(organization, slug):
    """The scheduler of each service of a business, by service: its first public offering, with any provider."""
    from appointment.scheduler.booking import offering

    services = frappe.get_all("Service", filters={"organization": organization, "is_active": 1}, pluck="name")
    found = {}
    for event in frappe.get_all("EventType", filters={"is_active": 1, "service": ["in", services]},
                                fields=["name", "service"], order_by="creation asc") if services else []:
        if event.service in found:
            continue
        try:
            offering(event.name, public=True)
        except (frappe.PermissionError, frappe.ValidationError, frappe.DoesNotExistError):
            frappe.clear_messages()
            continue
        found[event.service] = f"/schedule/org/{slug}/{event.name}?with=any"
    return found


def _format(place):
    """The public session format of a place: `locationType` and the platform label, never the meeting link."""
    from appointment.scheduler.online_meeting import public_place

    facts = public_place(place)
    return {"locationType": facts["location_type"], "platform": facts["platform"]}


def _session_formats(organization=None, provider=None):
    """How each session meets, by service, and how each place meets, by location.

    A service whose offerings meet both online and in person has no entry; its content `format` or its name decides.
    """
    if provider:
        from appointment.scheduler.booking import offering

        pairs, places = [], {}
        for event in frappe.get_all("EventType", filters={"provider": provider, "is_active": 1}, pluck="name"):
            try:
                parts = offering(event, public=True)
            except (frappe.PermissionError, frappe.ValidationError, frappe.DoesNotExistError):
                frappe.clear_messages()
                continue
            pairs.append((parts.service.name, parts.location.name))
            places[parts.location.name] = parts.location
        location_filter = {"independent_provider": provider, "organization": ["is", "not set"]}
    else:
        services = frappe.get_all("Service", filters={"organization": organization, "is_active": 1}, pluck="name")
        rows = frappe.get_all("EventType", filters={"service": ["in", services or [""]], "is_active": 1},
                              fields=["service", "location"]) if services else []
        pairs = [(row.service, row.location) for row in rows]
        places = {}
        location_filter = {"organization": organization}
    for row in frappe.get_all("Location", filters={**location_filter, "is_active": 1},
                              fields=["name", "location_type", "video_platform"]):
        places.setdefault(row.name, row)
    place_formats = {name[:64]: _format(place) for name, place in places.items()}
    by_service = {}
    for service, location in pairs:
        if location[:64] in place_formats:
            by_service.setdefault(service, []).append(place_formats[location[:64]])
    session_formats = {}
    for service, formats in by_service.items():
        if len({row["locationType"] for row in formats}) == 1:
            platforms = {row["platform"] for row in formats}
            session_formats[service] = {"locationType": formats[0]["locationType"],
                                        "platform": formats[0]["platform"] if len(platforms) == 1 else ""}
    return session_formats, place_formats


def _hhmm(value) -> str:
    """`HH:MM` of a Time value (a timedelta or a string from the database); "" when it is empty."""
    if value in (None, ""):
        return ""
    if hasattr(value, "total_seconds"):
        minutes = min(int(value.total_seconds()) // 60, 24 * 60 - 1)
        return f"{minutes // 60:02d}:{minutes % 60:02d}"
    parts = str(value).split(":")
    try:
        return f"{int(parts[0]):02d}:{int(parts[1]):02d}"
    except (IndexError, ValueError):
        return ""


def _place_hours(organization=None, provider=None):
    """Weekly opening hours of each active place, by location, for "open now" badges. Public facts only."""
    location_filter = {"organization": organization} if organization else {"independent_provider": provider, "organization": ["is", "not set"]}
    places = frappe.get_all("Location", filters={**location_filter, "is_active": 1}, fields=["name", "timezone"])
    if not places:
        return {}
    rows = frappe.get_all("Opening Hours", filters={"parenttype": "Location", "parent": ["in", [row.name for row in places]], "is_open": 1},
                          fields=["parent", "day_of_week", "start_time", "end_time"], order_by="idx asc", ignore_permissions=True)
    hours = {row.name[:64]: {"timezone": row.timezone or "Africa/Addis_Ababa", "days": []} for row in places}
    for row in rows:
        start, end = _hhmm(row.start_time), _hhmm(row.end_time)
        if row.parent[:64] in hours and row.day_of_week and start < end:
            hours[row.parent[:64]]["days"].append({"day": row.day_of_week, "open": start, "close": end})
    return hours


@frappe.whitelist(allow_guest=True, methods=["GET"])
def get_public_experience_snapshot(locale: str | None = None, public_path: str | None = None, optional: int | str = 0):
    """The published snapshot. With `optional`, a path without a published site returns None instead of a 404."""
    try:
        context = resolver_module.resolve_public_experience(
            _request_host(), public_path if public_path is not None else _request_path(), locale
        )
    except PublicResolutionError:
        if frappe.utils.cint(optional):
            return None
        raise
    snapshot = resolver_module.public_snapshot(context.release)
    booking_path = None
    booking_paths = {}
    session_formats, place_formats, place_hours = {}, {}, {}
    if context.organization or context.provider:
        session_formats, place_formats = _session_formats(context.organization, context.provider)
        place_hours = _place_hours(context.organization, context.provider)
    if context.organization:
        slug = frappe.db.get_value("Organization", context.organization, "slug")
        if slug:
            booking_path = f"/schedule/org/{slug}"
            booking_paths = _organization_booking_paths(context.organization, slug)
    elif context.provider:
        if frappe.db.get_value("Provider", context.provider, "enable_public_booking"):
            booking_paths = _independent_booking_paths(context.provider)
            # The first offering the owner made is the main one; later ones are extras.
            booking_path = next(iter(booking_paths.values()), None)
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
        # Each session's own scheduler, by service, so a visitor can pick the online or the office session.
        "bookingPaths": booking_paths,
        # How each session and place meets ("online" or "in_person") and its platform label, by service and by
        # location. Public and never secret: the meeting link is not here. See docs/growth/ONLINE_LOCATIONS.md.
        "sessionFormats": session_formats,
        "placeFormats": place_formats,
        # Weekly opening hours by location ("open now" and the Habesha clock on template pages).
        "placeHours": place_hours,
        "sections": snapshot.get("sections", []),
        "seo": snapshot.get("seo", {}),
        "booking": snapshot.get("booking", {}),
        "features": snapshot.get("features", []),
        "siteSlug": frappe.db.get_value("Public Site", context.public_site, "slug"),
    }


@frappe.whitelist(allow_guest=True, methods=["GET"])
@rate_limit(limit=60, seconds=60)
def get_next_availability(public_path: str | None = None, locale: str | None = None):
    """Guest: the next free times of a published site, when its owner turned live availability on.

    Counts and start times only (see `next_availability`); cached for 60 seconds per release. A site
    without the setting, or a path without a published site, answers `{"enabled": false}`.
    """
    from appointment.public_experience import next_availability

    try:
        context = resolver_module.resolve_public_experience(
            _request_host(), public_path if public_path is not None else _request_path(), locale
        )
    except PublicResolutionError:
        return {"enabled": False}
    return next_availability.for_context(context)


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
    return {"recipes": [{**recipe.as_summary(), "showcase": showcases.get(recipe.key)} for recipe in available_recipes()]}


@frappe.whitelist(allow_guest=True, methods=["GET"])
def get_public_template_gallery():
    """Every certified template with its previews and, when published, its live showcase (landing gallery)."""
    from appointment.public_experience.template_gallery import template_gallery

    return template_gallery()


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
            _("the brand draft advanced to version {0}").format(doc.draft_version),
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
        {"check": "required_sections", "ok": not missing, "remediation": _("Add: {0}").format(", ".join(missing)) if missing else None},
    ]
    primary = frappe.db.exists("Public Site Domain", {"public_site": site, "is_primary": 1})
    checks.append({"check": "primary_domain", "ok": bool(primary), "remediation": _("Optional; set a primary domain.") if not primary else None})
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
        frappe.throw(_("The domain has no site."))
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
