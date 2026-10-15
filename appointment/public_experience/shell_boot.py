"""First-paint data for the public page shells (docs/operations/PUBLIC_PERFORMANCE.md).

A public page is a single-page application. Without help, a phone must load the application code, then ask
the server for the published design, and only then find the fonts and the hero photo. The shells
(`www/index.py` and `www/schedule/index.py`) therefore add, for the requested path:

- the published snapshot and UI config, as one non-executable `application/json` element. The data is the
  same guest projection that `get_public_experience_snapshot` and `get_public_ui_config` return, so nothing
  private goes into the page, and the content security policy does not change;
- a preload of the display font face for the script of the page language;
- on a landing page, a preload of the phone crop of the hero photo.

Every part is optional. When the path has no published site, or anything fails, the shell adds nothing
and the page loads its data from the API as before.
"""

from __future__ import annotations

import json
from datetime import datetime
from zoneinfo import ZoneInfo

import frappe

from appointment.public_experience.reserved import is_reserved_slug

BOOT_ELEMENT_ID = "pe-boot"
LOCALES = ("en", "am")
CONTENT_KINDS = ("blog", "gallery")
SAFE_ASSET_PREFIX = "/assets/appointment/"
# Kit pictures (templates/kit/core/picture.ts) switch to the phone crop below this width.
MOBILE_QUERY = "(max-width: 640px)"
ADDIS_ABABA = ZoneInfo("Africa/Addis_Ababa")
# Begin and end markers let the performance proxy remove the block to measure the earlier shell.
BLOCK_START = "<!--pe-fast-->"
BLOCK_END = "<!--/pe-fast-->"


def shell_boot_tags() -> str:
    """The boot element and preload links for the current request, or an empty string."""

    request = getattr(frappe.local, "request", None)
    if request is None or getattr(request, "method", "GET") != "GET":
        return ""
    try:
        parts = boot_parts(request.path or "/", request.args)
    except Exception:
        frappe.log_error(title="Public shell boot data failed")
        return ""
    if not parts:
        return ""
    from markupsafe import Markup

    data, links = parts
    return Markup(BLOCK_START + boot_element(data) + "".join(links) + BLOCK_END)


SITE_SHELL = "appointment/public/frontend/site.html"


def shell_template(path: str) -> str | None:
    """The lean website page (`site.html`, frontend/src/site-main.tsx) for a website address, when the build has it."""

    if not _site_route([segment for segment in path.split("/") if segment]):
        return None
    import os

    return SITE_SHELL if os.path.exists(frappe.get_app_path("appointment", "public", "frontend", "site.html")) else None


def boot_parts(path: str, args) -> tuple[dict, list[str]] | None:
    """The boot data and preload links for a public path; None for any other path."""

    segments = [segment for segment in path.split("/") if segment]
    if len(segments) >= 3 and segments[0] == "schedule" and segments[1] == "org":
        return _scheduler_parts(path, segments[2])
    route = _site_route(segments)
    if not route:
        return None
    kind, locale = route
    if kind == "book" and not locale:
        requested = args.get("locale")
        locale = requested if requested in LOCALES else None
    snapshot = _snapshot(path, locale)
    if not snapshot:
        return None
    config = _config(path, snapshot.get("locale"))
    data = {"path": path, "locale": locale, "snapshot": snapshot, "config": config}
    design = snapshot.get("compiledDesign") or {}
    links = font_preloads(design, snapshot.get("locale"))
    if kind == "landing":
        links += hero_preloads(design, snapshot.get("sections") or [], args.get("display"))
    return data, links


def _site_route(segments: list[str]) -> tuple[str, str | None] | None:
    """The kind of a public site path, as the application routes it (frontend/src/route.tsx)."""

    if not segments or len(segments) > 3 or is_reserved_slug(segments[0].lower()):
        return None
    if len(segments) == 1:
        return "landing", None
    second = segments[1]
    if second in CONTENT_KINDS:
        return "content", None
    if len(segments) == 2 and second in LOCALES:
        return "landing", second
    if len(segments) == 2 and second == "book":
        return "book", None
    return None


def _scheduler_parts(path: str, org_slug: str) -> tuple[dict, list[str]] | None:
    """The scheduler of a business with a website: the website's UI config (useBookingBrand)."""

    if is_reserved_slug(org_slug.lower()):
        return None
    site_path = "/" + org_slug
    config = _config(site_path, None, optional=True)
    if not config or config.get("source") != "experience-release":
        return None
    data = {"path": path, "configs": {site_path: config}}
    return data, font_preloads(config.get("compiledDesign") or {}, config.get("locale"))


def _snapshot(path: str, locale: str | None) -> dict | None:
    from appointment.public_experience.api import get_public_experience_snapshot

    return get_public_experience_snapshot(locale=locale, public_path=path, optional=1)


def _config(path: str, locale: str | None, optional: bool = False) -> dict | None:
    from appointment.public_experience.api import get_public_ui_config

    try:
        return get_public_ui_config(locale=locale, public_path=path, optional=1 if optional else 0)
    except Exception:
        # The page asks the API again and shows its own error state.
        return None


def boot_element(data: dict) -> str:
    """A JSON data element that no HTML parser can close early."""

    encoded = frappe.as_json(data, indent=None, separators=(",", ":"))
    encoded = encoded.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    return f'<script type="application/json" id="{BOOT_ELEMENT_ID}">{encoded}</script>'


def _safe_asset(src: object) -> str | None:
    if not isinstance(src, str) or not src.startswith(SAFE_ASSET_PREFIX) or ".." in src:
        return None
    if any(character in src for character in "\"'<>\\ ?#"):
        return None
    return src


def font_preloads(design: dict, locale: str | None) -> list[str]:
    """The display face for the script of the page language (guardrail G7)."""

    typography = design.get("typography") or {}
    display = ((typography.get("roles") or {}).get("display") or {}).get("family")
    script = "ethiopic" if locale == "am" else "latin"
    links = []
    for asset in typography.get("fontAssets") or []:
        if asset.get("family") != display or script not in (asset.get("scripts") or []) or asset.get("format") != "woff2":
            continue
        src = _safe_asset(asset.get("src"))
        if src:
            links.append(f'<link rel="preload" as="font" type="font/woff2" href="{src}" crossorigin>')
    return links[:1]


def _hero_asset(design: dict, sections: list) -> dict | None:
    """The hero photo as the kit templates choose it: the owner's packaged photo, else the `hero.primary` role.

    An owner's uploaded photo has no phone crop, so it gets no preload.
    """

    assets = design.get("assets") or {}
    hero = next((section for section in sections if isinstance(section, dict) and section.get("type") == "hero"), None)
    own = ((hero or {}).get("content") or {}).get("image")
    if isinstance(own, str) and own:
        return next((asset for asset in assets.values() if isinstance(asset, dict) and asset.get("src") == own), None)
    asset = assets.get("hero.primary")
    return asset if isinstance(asset, dict) else None


def _avif(src: str) -> str:
    return src[: -len(".webp")] + ".avif" if src.endswith(".webp") else src


def hero_preloads(design: dict, sections: list, display: str | None, now: datetime | None = None) -> list[str]:
    """The phone crop of the hero photo, high priority, as the kit `<picture>` requests it.

    Kit templates (renderer version 3, and Ergata 2) show the night photo in dark mode and, in light mode,
    after dark in Addis Ababa (18:00 to 06:00). Other packages choose their own files, so they get no preload.
    """

    layout = design.get("layout") or {}
    version = int(layout.get("rendererVersion") or 1)
    if version < 3 and not (layout.get("rendererKey") == "ergata-therapy" and version >= 2):
        return []
    asset = _hero_asset(design, sections)
    if not asset:
        return []
    hour = (now or datetime.now(ADDIS_ABABA)).astimezone(ADDIS_ABABA).hour
    after_dark = hour >= 18 or hour < 6

    def phone_crop(dark_mode: bool) -> str | None:
        if (dark_mode or after_dark) and asset.get("darkSrc"):
            return _safe_asset(asset.get("darkMobileSrc"))
        return _safe_asset(asset.get("mobileSrc")) if asset.get("mobileSrc") != asset.get("src") else None

    if display in ("light", "dark"):
        choices = [(phone_crop(display == "dark"), "")]
    elif phone_crop(False) == phone_crop(True):
        choices = [(phone_crop(False), "")]
    else:
        choices = [(phone_crop(False), " and (prefers-color-scheme: light)"), (phone_crop(True), " and (prefers-color-scheme: dark)")]
    avif = "avif" in (asset.get("formats") or [])
    links = []
    for src, scheme in choices:
        if not src:
            continue
        href, kind = (_avif(src), "image/avif") if avif and src.endswith(".webp") else (src, "")
        type_attribute = f' type="{kind}"' if kind else ""
        links.append(f'<link rel="preload" as="image" href="{href}"{type_attribute} media="{MOBILE_QUERY}{scheme}" fetchpriority="high">')
    return links
