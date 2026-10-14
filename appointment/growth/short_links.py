"""Short, memorable public addresses: check, suggest and change a Public Site slug or a provider page address.

A changed address keeps working: the former slug becomes a Public Site Slug Alias that redirects
to the current address (printed posters and old shared links depend on it). Only the business that
owned an alias may take it back; no other business can claim it.

Public Site slugs, Organization slugs and provider page addresses (`Provider.public_slug`) share one
address space. An independent provider with a website has one address: the site slug, and its
`public_slug` follows it (`sync_provider_slug`). Without a website, `check` and `change` work on the
provider page address. `Organization.validate` checks a new or changed organization slug with
`organization_slug_taken`. See docs/growth/PROVIDER_PAGE.md.
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
def problem(slug: str, site: str | None = None, *, provider: str | None = None) -> str | None:
    """Why `slug` cannot be the address of `site` or of `provider`'s page: length, format, reserved or taken; else None."""

    if not MIN_LENGTH <= len(slug) <= MAX_LENGTH:
        return "length"
    if not re.match(PATTERN, slug):
        return "format"
    if slug in RESERVED_SLUGS:
        return "reserved"
    if _taken(slug, site, provider):
        return "taken"
    return None


def organization_slug_taken(slug: str, organization: str | None = None) -> bool:
    """True when another business uses `slug`: its website, a former address or a provider page address.

    The namespace part of `problem` for `Organization.slug`, which `Organization.validate` calls for every new or
    changed slug. The organization's own slug, websites and former website addresses do not count. Organization
    slugs keep their own length and format rules (`business-<key>` is longer than a short link).
    """

    organization = organization or ""
    site = frappe.db.get_value("Public Site", {"slug": slug}, ["name", "organization"], as_dict=True)
    if site and site.organization != organization:
        return True
    alias = frappe.db.get_value(ALIAS, slug, ["public_site", "provider"], as_dict=True)
    if alias and (alias.provider or not alias.public_site
                  or frappe.db.get_value("Public Site", alias.public_site, "organization") != organization):
        return True
    if frappe.db.get_value("Organization", {"slug": slug, "name": ["!=", organization]}, "name"):
        return True
    return bool(frappe.db.get_value("Provider", {"public_slug": slug}, "name"))


def free_organization_slug(base: str, organization: str | None = None) -> str:
    """`base`, or `base-2`, `base-3` … when another business uses it (`organization_slug_taken`)."""

    candidate, number = base, 2
    while organization_slug_taken(candidate, organization):
        candidate, number = f"{base}-{number}", number + 1
    return candidate


def _taken(slug: str, site: str | None, provider: str | None = None) -> bool:
    owner = frappe.db.get_value("Public Site", site, ["organization", "provider"], as_dict=True) if site else None
    provider = provider or (owner and owner.provider)
    if provider and not site:
        site = frappe.db.get_value("Public Site", {"owner_type": "Provider", "provider": provider, "status": ["!=", "Archived"]}, "name")
    other_site = frappe.db.get_value("Public Site", {"slug": slug, "name": ["!=", site or ""]}, "name")
    if other_site:
        return True
    alias = frappe.db.get_value(ALIAS, slug, ["public_site", "provider"], as_dict=True)
    if alias and not ((alias.public_site and alias.public_site == site) or (alias.provider and alias.provider == provider)):
        return True
    # An organization's own slug is its booking root (`/<slug>/booking/...`); keep it for that business.
    organization = frappe.db.get_value("Organization", {"slug": slug}, "name")
    if organization:
        return organization != (owner and owner.organization)
    return bool(frappe.db.get_value("Provider", {"public_slug": slug, "name": ["!=", provider or ""]}, "name"))


def suggestions(name: str, site: str | None, current: str | None = None, count: int = 3, *, provider: str | None = None) -> list[str]:
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
        if candidate and candidate != current and candidate not in result and not problem(candidate, site, provider=provider):
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
    """Live availability of an address for the business's site or provider page, with suggestions."""

    from appointment.growth.sharing import require_business

    owner = require_business(business)
    site, provider, current = _target(owner)
    candidate = normalize_slug(slug or "")
    reason = "current" if candidate == current else problem(candidate, site and site.name, provider=provider)
    return {
        "slug": candidate,
        "available": reason is None,
        "reason": reason,
        "current": current,
        "suggestions": suggestions(owner.display_name, site and site.name, current, provider=provider),
    }


@frappe.whitelist(methods=["POST"])
def change(business: str, slug: str):
    """Move the business's site (or provider page) to `slug`; the former address keeps redirecting."""

    from appointment.growth.sharing import require_business

    owner = require_business(business)
    site, provider, current = _target(owner, lock=True)
    candidate = normalize_slug(slug or "")
    if candidate != (slug or "").strip().lower():
        frappe.throw(_("Use lowercase letters, numbers and single hyphens only."))
    if candidate == current:
        return state(site.name) if site else provider_state(provider)
    reason = problem(candidate, site and site.name, provider=provider)
    if reason:
        frappe.throw(_(MESSAGES[reason]).format(MIN_LENGTH, MAX_LENGTH))
    if not site:
        _move_provider_page(provider, current, candidate)
        return provider_state(provider)
    old = site.slug
    doc = frappe.get_doc("Public Site", site.name)
    doc.slug = candidate
    doc.save()
    if frappe.db.exists(ALIAS, candidate):
        frappe.delete_doc(ALIAS, candidate, ignore_permissions=True, force=True)
    if old and not frappe.db.exists(ALIAS, old):
        _retire(old, public_site=site.name)
    return state(site.name)


def _target(owner, lock=False):
    """(site, provider, current slug): the website when there is one, else an independent provider's page."""
    from appointment.growth.sharing import site_of

    site = site_of(owner)
    provider = owner.provider
    if site:
        if lock:
            frappe.db.sql("select name from `tabPublic Site` where name=%s for update", site.name)
        return site, provider, site.slug
    if not provider:
        frappe.throw(_("Create your website first to get a short link."))
    if not lock:  # a GET request does not write
        return None, provider, frappe.db.get_value("Provider", provider, "public_slug")
    from appointment.scheduler.provider_page import ensure_slug

    return None, provider, ensure_slug(provider)


def _move_provider_page(provider: str, old: str, new: str):
    frappe.db.set_value("Provider", provider, "public_slug", new, update_modified=False)
    if frappe.db.get_value(ALIAS, new, "provider") == provider:
        frappe.delete_doc(ALIAS, new, ignore_permissions=True, force=True)
    if old and not frappe.db.exists(ALIAS, old):
        _retire(old, provider=provider)


def _retire(slug: str, public_site: str | None = None, provider: str | None = None):
    frappe.get_doc({"doctype": ALIAS, "slug": slug, "public_site": public_site, "provider": provider,
                    "retired_at": now_datetime(), "retired_by": frappe.session.user}).insert(ignore_permissions=True)


MESSAGES = {
    "length": "Use {0} to {1} characters.",
    "format": "Use lowercase letters, numbers and single hyphens only.",
    "reserved": "That address is reserved by the platform.",
    "taken": "That address is already taken.",
}
#: `Organization.validate` shows it when a new or changed slug is another business's address.
ORGANIZATION_TAKEN = "The booking address {0} is already used by another business. Choose another address."


def state(site: str) -> dict:
    from appointment.growth.brand import brand

    slug = frappe.db.get_value("Public Site", site, "slug")
    return {
        "slug": slug,
        "short": f"{brand()['short_host']}/{slug}",
        "aliases": frappe.get_all(ALIAS, filters={"public_site": site}, pluck="slug", order_by="creation desc"),
    }


def provider_state(provider: str) -> dict:
    from appointment.growth.brand import brand
    from appointment.scheduler.provider_page import ROOT

    slug = frappe.db.get_value("Provider", provider, "public_slug")
    return {
        "slug": slug,
        "short": f"{brand()['short_host']}/{slug}",
        "path": ROOT + slug,
        "aliases": frappe.get_all(ALIAS, filters={"provider": provider}, pluck="slug", order_by="creation desc"),
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
    """Where an address now lives, or None when it is current.

    - `/<old>/rest` to `/<new>/rest` when the first segment is a former website address.
    - `/schedule/p/<old>/rest` to `/schedule/p/<current>/rest` for a former provider page address.
    - `/<page address>` to `/schedule/p/<page address>` when no website or organization holds it.
    """

    segments = [segment for segment in (path or "").split("/") if segment]
    if not segments:
        return None
    if segments[0] == "schedule":
        location = _former_provider_page(segments)
    else:
        target = current_slug(segments[0])
        location = _join(f"/{target}", segments[1:]) if target else _provider_short_link(segments)
    if not location:
        return None
    location, _sep, extra = location.partition("?")
    query = "&".join(part for part in (query, extra) if part)
    return f"{location}?{query}" if query else location


def _former_provider_page(segments: list[str]) -> str | None:
    from appointment.scheduler.provider_page import ROOT, owner_for_slug

    if len(segments) < 3 or segments[1] != "p":
        return None
    _provider, current = owner_for_slug(segments[2])
    return _join(ROOT + current, segments[3:]) if current and current != segments[2] else None


def _provider_short_link(segments: list[str]) -> str | None:
    """`<short host>/<page address>` opens the provider page; `/<address>/am` opens it in Amharic."""
    from appointment.scheduler.provider_page import ROOT, owner_for_slug

    first = segments[0]
    if (first in RESERVED_SLUGS or normalize_slug(first) != first
            or frappe.db.exists("Public Site", {"slug": first, "status": "Published"})
            or frappe.db.exists("Organization", {"slug": first})):
        return None
    _provider, current = owner_for_slug(first)
    if not current:
        return None
    if segments[1:] in (["am"], ["en"]):
        return f"{ROOT}{current}?lang={segments[1]}"
    return _join(ROOT + current, segments[1:])


def _join(root: str, rest: list[str]) -> str:
    return root + ("/" + "/".join(rest) if rest else "")


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
    """Public Site hook: a new or changed slug may not claim another business's address or former address."""

    if not doc.slug:
        return
    provider = doc.provider if doc.owner_type == "Provider" else None
    alias = frappe.db.get_value(ALIAS, doc.slug, ["public_site", "provider"], as_dict=True)
    if alias and not (alias.public_site == doc.name or (provider and alias.provider == provider)):
        frappe.throw(_("That address is already taken."))
    holder = frappe.db.get_value("Provider", {"public_slug": doc.slug}, "name")
    if holder and holder != provider:
        frappe.throw(_("That address is already taken."))


def sync_provider_slug(doc, method=None):
    """Public Site hook: an independent provider's page address follows its website address.

    The former page address keeps redirecting: as a website alias when it was the website's former
    slug, else as a provider page alias.
    """

    if doc.owner_type != "Provider" or not doc.provider or not doc.slug or doc.status == "Archived":
        return
    current = frappe.db.get_value("Provider", doc.provider, "public_slug")
    if current == doc.slug:
        return
    before = doc.get_doc_before_save()
    frappe.db.set_value("Provider", doc.provider, "public_slug", doc.slug, update_modified=False)
    if frappe.db.get_value(ALIAS, doc.slug, "provider") == doc.provider:
        frappe.delete_doc(ALIAS, doc.slug, ignore_permissions=True, force=True)
    if current and not frappe.db.exists(ALIAS, current):
        if before and before.slug == current:
            _retire(current, public_site=doc.name)
        else:
            _retire(current, provider=doc.provider)
