"""Trusted host/path resolution for the published public experience.

There is one authority: the active Experience Release. Unknown, unpublished or
incomplete sites fail closed; no alternate public design, mode flag or default tenant
can satisfy a public request.
"""

from __future__ import annotations

from dataclasses import dataclass
import json
import re

import frappe

from appointment.public_experience.canonical import hash_document
from appointment.public_experience.errors import PublicResolutionError
from appointment.public_experience.hostnames import normalize_hostname

PUBLIC_EXPERIENCE_CONTRACT = "appointment-public-experience.v2"
WEBSITE = "website"
BOOKING = "booking"
ASSET = "asset"
NOT_FOUND = "not_found"
_ASSET_PATHS = ("/robots.txt", "/sitemap.xml", "/favicon.ico")


@dataclass(frozen=True)
class PublishedExperienceContext:
    public_site: str
    status: str
    owner_type: str
    organization: str | None
    provider: str | None
    release: str
    release_hash: str
    brand_revision: str
    recipe_key: str
    recipe_version: int
    layout_renderer_key: str
    layout_renderer_version: int
    locale: str
    available_locales: tuple[str, ...]
    route_kind: str
    trusted_host: str
    canonical_origin: str
    canonical_url: str
    cache_key: str
    published: bool = True

    def as_dict(self) -> dict:
        return {
            "publicSite": self.public_site,
            "status": self.status,
            "ownerType": self.owner_type,
            "organization": self.organization,
            "provider": self.provider,
            "release": self.release,
            "releaseHash": self.release_hash,
            "brandRevision": self.brand_revision,
            "recipeKey": self.recipe_key,
            "recipeVersion": self.recipe_version,
            "layoutRendererKey": self.layout_renderer_key,
            "layoutRendererVersion": self.layout_renderer_version,
            "locale": self.locale,
            "availableLocales": list(self.available_locales),
            "routeKind": self.route_kind,
            "trustedHost": self.trusted_host,
            "canonicalOrigin": self.canonical_origin,
            "canonicalUrl": self.canonical_url,
            "cacheKey": self.cache_key,
            "published": self.published,
        }


def _platform_hosts() -> set[str]:
    hosts: set[str] = set()
    try:
        site = (frappe.local.site or "").split(":")[0].lower()
        if site:
            hosts.add(site)
    except Exception:
        pass
    configured = frappe.conf.get("brand_public_experience_platform_hosts") or []
    if isinstance(configured, str):
        configured = configured.split(",")
    for host in configured:
        value = str(host).strip().lower()
        if value:
            hosts.add(value)
    return hosts


def is_platform_host(host: str) -> bool:
    return host in _platform_hosts()


def _is_local(host: str) -> bool:
    # A platform host is served over plain HTTP only while the edge has no TLS (development stacks).
    if host.endswith(".localhost") or host.startswith("127.") or host == "localhost":
        return True
    return is_platform_host(host) and not frappe.conf.get("brand_public_experience_edge_tls")


def _origin(host: str) -> str:
    return f"{'http' if _is_local(host) else 'https'}://{host}"


def normalize_path(path: object) -> str:
    raw = str(path or "/")
    if "?" in raw:
        raw = raw.split("?", 1)[0]
    if "#" in raw:
        raw = raw.split("#", 1)[0]
    segments = [segment for segment in raw.split("/") if segment not in ("", ".")]
    if any(segment == ".." for segment in segments):
        return "/not-found"
    return "/" + "/".join(segments)


def _route_kind(remaining: str) -> str:
    if remaining in ("", "/"):
        return WEBSITE
    if remaining == "/book" or remaining.startswith("/book/"):
        return BOOKING
    parts = remaining.strip("/").split("/")
    if parts[0] in ("blog", "gallery") and len(parts) <= 2 and all(parts) and (len(parts) == 1 or re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", parts[1])):
        return parts[0] + ("_detail" if len(parts) == 2 else "_index")
    if remaining in _ASSET_PATHS:
        return ASSET
    return NOT_FOUND


def _match_platform_site(path: str):
    segments = [segment for segment in path.split("/") if segment]
    if not segments:
        return None, path
    from appointment.public_experience.reserved import normalize_slug
    slug = normalize_slug(segments[0])
    site = frappe.db.get_value("Public Site", {"slug": slug}, "name")
    return (site, "/" + "/".join(segments[1:])) if site else (None, path)


def _match_custom_domain(host: str, path: str):
    domain = frappe.db.get_value(
        "Public Site Domain",
        {"hostname_ascii": host, "lifecycle_status": "Active"},
        ["public_site"],
        as_dict=True,
    )
    return (domain.public_site, path) if domain else (None, path)


def _json(raw: object) -> dict:
    if isinstance(raw, dict):
        return dict(raw)
    try:
        data = json.loads(raw or "")
    except (TypeError, ValueError):
        return {}
    return dict(data) if isinstance(data, dict) else {}


def _load_release(release_name: str):
    cache_key = f"public_experience:release:{release_name}"
    try:
        cached = frappe.cache.get_value(cache_key)
    except Exception:
        cached = None
    if cached:
        return frappe._dict(cached)
    release = frappe.db.get_value(
        "Experience Release",
        release_name,
        [
            "name",
            "release_hash",
            "brand_revision",
            "recipe_key",
            "recipe_version",
            "compiled_design_hash",
            "layout_renderer_key",
            "layout_renderer_version",
            "normalized_json",
        ],
        as_dict=True,
    )
    if release:
        try:
            frappe.cache.set_value(cache_key, dict(release), expires_in_sec=3600)
        except Exception:
            pass
    return release


def public_snapshot(release_name: str) -> dict:
    raw = frappe.db.get_value("Experience Release", release_name, "normalized_json")
    return _json(raw)


def _available_locales(site: str) -> tuple[str, ...]:
    rows = frappe.get_all(
        "Public Site Locale",
        filters={"parent": site, "parenttype": "Public Site", "enabled": 1},
        pluck="locale",
        ignore_permissions=True,
    )
    return tuple(rows)


def resolve_public_experience(trusted_host: str, normalized_path: str, locale: str | None = None) -> PublishedExperienceContext:
    try:
        host = normalize_hostname(trusted_host)
    except ValueError as exc:
        raise PublicResolutionError("the request host is not allowed", details={"reason": "invalid_host"}) from exc
    path = normalize_path(normalized_path)
    site, remaining = _match_platform_site(path) if is_platform_host(host) else _match_custom_domain(host, path)
    if not site:
        raise PublicResolutionError("no published site for this host", details={"reason": "unknown_host", "host": host})
    meta = frappe.db.get_value(
        "Public Site",
        site,
        ["status", "owner_type", "organization", "provider", "recipe_key", "recipe_version", "default_locale", "current_release"],
        as_dict=True,
    )
    if not meta or meta.status != "Published":
        raise PublicResolutionError("the site is not published", details={"reason": "not_published", "site": site})
    if not meta.current_release:
        raise PublicResolutionError("the site has no active release", details={"reason": "no_release", "site": site})
    release = _load_release(meta.current_release)
    if not release:
        raise PublicResolutionError("the active release is unreadable", details={"reason": "release_missing", "site": site})
    snapshot = _json(release.normalized_json)
    design = snapshot.get("compiledDesign") or {}
    if (
        release.recipe_key != meta.recipe_key
        or int(release.recipe_version or 0) != int(meta.recipe_version or 0)
        or release.compiled_design_hash != design.get("contentHash")
        or design.get("contract") != "appointment-compiled-design.v1"
    ):
        raise PublicResolutionError("the active release has inconsistent design pins", details={"reason": "release_invalid", "site": site})
    available = _available_locales(site)
    if not available:
        raise PublicResolutionError("the site has no enabled locale", details={"reason": "locale_missing", "site": site})
    chosen = locale if locale in available else meta.default_locale
    if chosen not in available:
        chosen = available[0]
    if locale and locale in available and remaining == f"/{locale}":
        remaining = "/"
    route_kind = _route_kind(remaining)
    if route_kind == NOT_FOUND:
        raise PublicResolutionError("the public route does not exist", details={"reason": "route_not_found"})
    origin = _origin(host)
    canonical_url = origin + path
    cache_key = hash_document(
        {
            "contract": PUBLIC_EXPERIENCE_CONTRACT,
            "site": site,
            "host": host,
            "release": release.name,
            "releaseHash": release.release_hash,
            "locale": chosen,
            "routeKind": route_kind,
            "path": path,
        }
    )
    return PublishedExperienceContext(
        public_site=site,
        status=meta.status,
        owner_type=meta.owner_type,
        organization=meta.organization,
        provider=meta.provider,
        release=release.name,
        release_hash=release.release_hash,
        brand_revision=release.brand_revision,
        recipe_key=release.recipe_key,
        recipe_version=int(release.recipe_version),
        layout_renderer_key=release.layout_renderer_key,
        layout_renderer_version=int(release.layout_renderer_version or 0),
        locale=chosen,
        available_locales=tuple(available),
        route_kind=route_kind,
        trusted_host=host,
        canonical_origin=origin,
        canonical_url=canonical_url,
        cache_key=cache_key,
    )
