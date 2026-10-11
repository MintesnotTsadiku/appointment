"""Short, memorable public addresses: check, suggest and change a Public Site slug.

A changed address keeps working: the former slug becomes a Public Site Slug Alias that redirects
to the current address (printed posters and old shared links depend on it). Only the business that
owned an alias may take it back; no other business can claim it.
"""

from __future__ import annotations

import re

import frappe
from frappe import _
from frappe.rate_limiter import rate_limit
from frappe.utils import now_datetime

from appointment.public_experience.reserved import RESERVED_SLUGS, normalize_slug

ALIAS = "Public Site Slug Alias"
MIN_LENGTH = 3
MAX_LENGTH = 30
PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
RULES = {"min": MIN_LENGTH, "max": MAX_LENGTH, "pattern": PATTERN}
#: Words that make a poor address on their own.
_FILLER = {"the", "and", "of", "for", "plc", "llc", "ltd", "sc", "co", "a", "an"}


# ---------------------------------------------------------------------------
# Rules
# ---------------------------------------------------------------------------
def problem(slug: str, site: str | None = None) -> str | None:
    """Why `slug` cannot be the address of `site`: length, format, reserved or taken; else None."""

    if not MIN_LENGTH <= len(slug) <= MAX_LENGTH:
        return "length"
    if not re.match(PATTERN, slug):
        return "format"
    if slug in RESERVED_SLUGS:
        return "reserved"
    if _taken(slug, site):
        return "taken"
    return None


def _taken(slug: str, site: str | None) -> bool:
    other_site = frappe.db.get_value("Public Site", {"slug": slug, "name": ["!=", site or ""]}, "name")
    if other_site:
        return True
    alias_site = frappe.db.get_value(ALIAS, slug, "public_site")
    if alias_site and alias_site != site:
        return True
    # An organization's own slug is its booking root (`/<slug>/booking/...`); keep it for that business.
    organization = frappe.db.get_value("Organization", {"slug": slug}, "name")
    if organization:
        owner = frappe.db.get_value("Public Site", site, "organization") if site else None
        return organization != owner
    return False


def suggestions(name: str, site: str | None, current: str | None = None, count: int = 3) -> list[str]:
    """Up to `count` short, available addresses made from the business name."""

    words = [word for word in normalize_slug(name).split("-") if word and word not in _FILLER]
    candidates: list[str] = []
    if words:
        first, last = words[0], words[-1]
        initials = "".join(word[0] for word in words)
        candidates += [
            first,
            "-".join(words[:2]),
            "".join(words[:2]),
            f"{first}-{last}",
            "-".join(words[-2:]),
            initials if len(initials) >= MIN_LENGTH else "",
            f"{first}-addis",
            f"{initials}-{last}" if len(words) > 2 else "",
            f"{first}-book",
        ]
    candidates += [f"{(words or ['book'])[0]}-{n}" for n in range(2, 10)]
    result: list[str] = []
    for candidate in candidates:
        candidate = normalize_slug(candidate)[:MAX_LENGTH].strip("-")
        if candidate and candidate != current and candidate not in result and not problem(candidate, site):
            result.append(candidate)
        if len(result) >= count:
            break
    return result


# ---------------------------------------------------------------------------
# Owner endpoints
# ---------------------------------------------------------------------------
@frappe.whitelist(methods=["GET"])
@rate_limit(limit=120, seconds=60)
def check(business: str, slug: str = ""):
    """Live availability of an address for the business's site, with suggestions."""

    from appointment.growth.sharing import require_business, site_of

    owner = require_business(business)
    site = site_of(owner)
    if not site:
        frappe.throw(_("Create your website first to get a short link."))
    candidate = normalize_slug(slug or "")
    reason = "current" if candidate == site.slug else problem(candidate, site.name)
    return {
        "slug": candidate,
        "available": reason is None,
        "reason": reason,
        "current": site.slug,
        "suggestions": suggestions(owner.display_name, site.name, site.slug),
    }


@frappe.whitelist(methods=["POST"])
def change(business: str, slug: str):
    """Move the business's site to `slug`; the former address keeps redirecting."""

    from appointment.growth.sharing import require_business, site_of

    owner = require_business(business)
    site = site_of(owner)
    if not site:
        frappe.throw(_("Create your website first to get a short link."))
    frappe.db.sql("select name from `tabPublic Site` where name=%s for update", site.name)
    candidate = normalize_slug(slug or "")
    if candidate != (slug or "").strip().lower():
        frappe.throw(_("Use lowercase letters, numbers and single hyphens only."))
    if candidate == site.slug:
        return state(site.name)
    reason = problem(candidate, site.name)
    if reason:
        frappe.throw(_(MESSAGES[reason]).format(MIN_LENGTH, MAX_LENGTH))
    old = site.slug
    doc = frappe.get_doc("Public Site", site.name)
    doc.slug = candidate
    doc.save()
    if frappe.db.exists(ALIAS, candidate):
        frappe.delete_doc(ALIAS, candidate, ignore_permissions=True, force=True)
    if old and not frappe.db.exists(ALIAS, old):
        frappe.get_doc({"doctype": ALIAS, "slug": old, "public_site": site.name, "retired_at": now_datetime(),
                        "retired_by": frappe.session.user}).insert(ignore_permissions=True)
    return state(site.name)


MESSAGES = {
    "length": "Use {0} to {1} characters.",
    "format": "Use lowercase letters, numbers and single hyphens only.",
    "reserved": "That address is reserved by the platform.",
    "taken": "That address is already taken.",
}


def state(site: str) -> dict:
    from appointment.growth.brand import brand

    slug = frappe.db.get_value("Public Site", site, "slug")
    return {
        "slug": slug,
        "short": f"{brand()['short_host']}/{slug}",
        "aliases": frappe.get_all(ALIAS, filters={"public_site": site}, pluck="slug", order_by="creation desc"),
    }


# ---------------------------------------------------------------------------
# Redirects
# ---------------------------------------------------------------------------
def current_slug(alias: str) -> str | None:
    """The current slug for a former address, or None when it is not (only) a former address."""

    alias = normalize_slug(alias or "")
    if not alias or frappe.db.exists("Public Site", {"slug": alias}):
        return None
    site = frappe.db.get_value(ALIAS, alias, "public_site")
    if not site:
        return None
    row = frappe.db.get_value("Public Site", site, ["slug", "status"], as_dict=True)
    return row.slug if row and row.status != "Archived" and row.slug != alias else None


def redirect_path(path: str, query: str = "") -> str | None:
    """`/<old>/rest?query` to `/<new>/rest?query` when the first segment is a former address."""

    segments = [segment for segment in (path or "").split("/") if segment]
    if not segments:
        return None
    target = current_slug(segments[0])
    if not target:
        return None
    rest = "/".join(segments[1:])
    location = f"/{target}" + (f"/{rest}" if rest else "")
    return f"{location}?{query}" if query else location


@frappe.whitelist(allow_guest=True, methods=["GET"])
@rate_limit(limit=60, seconds=60)
def resolve(path: str = ""):
    """Where a former address now lives; the SPA uses it when it serves the page itself."""

    if not isinstance(path, str) or len(path) > 300:
        return None
    clean, _sep, query = path.partition("?")
    return redirect_path(clean, query)


def shell_redirect():
    """Raise a 301 for a former address in the SPA shell (production crawlers and old links)."""

    request = getattr(frappe.local, "request", None)
    if request is None:
        return
    query = request.query_string.decode() if request.query_string else ""
    target = redirect_path(request.path, query)
    if target:
        frappe.flags.redirect_location = target
        raise frappe.Redirect(301)


def validate_public_site(doc, method=None):
    """Public Site hook: a new or changed slug may not claim another business's former address."""

    owner = frappe.db.get_value(ALIAS, doc.slug, "public_site") if doc.slug else None
    if owner and owner != doc.name:
        frappe.throw(_("That address is already taken."))
