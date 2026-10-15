"""The public page of an independent provider: `/schedule/p/<public slug>`.

The page lists every bookable service of the provider. Each service opens its scheduler at
`/schedule/p/<public slug>/<offering>`. `Provider.public_slug` shares one address space with Public
Site slugs, former addresses (Public Site Slug Alias) and Organization slugs; `short_links.problem`
checks all of them. When the provider has a Public Site, `public_slug` follows the site slug.
A former page address is an alias with `provider` set, and redirects to the current one.
The page never shows a meeting link (`online_meeting.public_place`).
See docs/growth/PROVIDER_PAGE.md.
"""

from __future__ import annotations

import json
import re

import frappe
from frappe import _
from frappe.rate_limiter import rate_limit
from frappe.utils import cint, flt, get_url, nowdate

from appointment.scheduler import localized_names

ALIAS = "Public Site Slug Alias"
ROOT = "/schedule/p/"
NOT_FOUND = "This booking page is not available."
LANGUAGES = ("am", "en", "om", "ti", "so", "ar", "fr")
CURRENCY = "ETB"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
@frappe.whitelist(allow_guest=True, methods=["GET"])
@rate_limit(limit=120, seconds=60)
def public_provider(slug: str = ""):
    """The provider page: who the provider is, and each bookable service with its formats and places."""
    provider, canonical = owner_for_slug(slug)
    doc = provider and _published(provider)
    offerings = bookable_offerings(provider) if doc else []
    if not offerings:
        frappe.throw(_(NOT_FOUND), frappe.DoesNotExistError)
    site = frappe.db.get_value("Public Site", {"owner_type": "Provider", "provider": doc.name, "status": "Published"},
                               ["slug", "current_release"], as_dict=True)
    content = site_content(site, doc.name)
    return {
        "slug": slug,
        "canonical_slug": canonical,
        "name": doc.display_name or doc.provider_name or doc.name,
        "business_name": doc.provider_name or doc.name,
        # The name in both languages (Provider.display_name_am); the page shows its own language.
        "local_name": localized_names.provider_names(doc),
        "photo": public_photo(doc.profile_photo) or content["person"].get("image", ""),
        # The page picks the bio in its language and falls back to the other one (`provider_bio`).
        "bio": _plain(doc.bio),
        "bio_am": _plain(doc.bio_am),
        "languages": spoken_languages(doc.spoken_languages),
        "timezone": offerings[0].location.timezone or doc.timezone or "Africa/Addis_Ababa",
        "site_slug": site.slug if site else None,
        # Words the provider wrote in both languages on the published website: person name, role, service copy.
        "person": content["person"],
        "cover": content["cover"],
        "services": _services(offerings, canonical, content["services"]),
        "locations": list({row["name"]: row for row in (_place(parts.location) for parts in offerings)}.values()),
    }


def sitemap_links() -> list[dict]:
    """Published provider pages of providers without a published website (the website is their main page)."""
    with_site = set(frappe.get_all("Public Site", filters={"owner_type": "Provider", "status": "Published"}, pluck="provider"))
    rows = frappe.get_all("Provider", filters={"public_slug": ["is", "set"], "enable_public_booking": 1, "is_active": 1,
                                               "organization": ["is", "not set"]}, fields=["name", "public_slug"])
    links = []
    for row in rows:
        if row.name in with_site or not bookable_offerings(row.name):
            continue
        alternates = {"en": get_url(ROOT + row.public_slug), "am": get_url(f"{ROOT}{row.public_slug}?lang=am")}
        links += [{"loc": url, "lastmod": nowdate(), "alternates": alternates} for url in alternates.values()]
    return links


# ---------------------------------------------------------------------------
# Addresses
# ---------------------------------------------------------------------------
def ensure_slug(provider):
    """Give an independent provider its page address once. `provider` is a Provider doc or name."""
    doc = provider if not isinstance(provider, str) else frappe.get_doc("Provider", provider)
    current = frappe.db.sql("select public_slug from `tabProvider` where name=%s for update", doc.name)
    slug = current[0][0] if current else None
    if not slug:
        site = frappe.db.get_value("Public Site", {"owner_type": "Provider", "provider": doc.name, "status": ["!=", "Archived"]}, "slug")
        slug = site if site and not _problem(site, doc.name) else generate_slug(doc.provider_name or doc.name, doc.name)
        frappe.db.set_value("Provider", doc.name, "public_slug", slug, update_modified=False)
    doc.public_slug = slug
    return slug


def generate_slug(name: str, provider: str | None = None) -> str:
    """A free address from the name, or `book-<6 letters and digits>` for a name without Latin letters."""
    from appointment.growth.short_links import MAX_LENGTH, suggestions
    from appointment.public_experience.reserved import normalize_slug

    words = normalize_slug(name or "")
    if words:
        whole = words[:MAX_LENGTH].rsplit("-", 1)[0] if len(words) > MAX_LENGTH else words
        if not _problem(whole, provider):
            return whole
        found = suggestions(name, None, count=1, provider=provider)
        if found and not found[0].startswith("book-"):
            return found[0]
    while True:
        candidate = "book-" + frappe.generate_hash(length=6).lower()
        if not _problem(candidate, provider):
            return candidate


def owner_for_slug(slug: str) -> tuple[str | None, str | None]:
    """(provider, current slug) for a page address, a former page address or a former website address."""
    from appointment.public_experience.reserved import normalize_slug

    clean = normalize_slug(slug or "") if isinstance(slug, str) and len(slug) <= 100 else ""
    if not clean:
        return None, None
    provider = frappe.db.get_value("Provider", {"public_slug": clean}, "name")
    if not provider:
        alias = frappe.db.get_value(ALIAS, clean, ["provider", "public_site"], as_dict=True)
        provider = alias and (alias.provider or frappe.db.get_value("Public Site", alias.public_site, "provider"))
    current = provider and frappe.db.get_value("Provider", provider, "public_slug")
    return (provider, current) if current else (None, None)


def page_path(provider: str) -> str:
    slug = frappe.db.get_value("Provider", provider, "public_slug")
    return ROOT + slug if slug else ""


# ---------------------------------------------------------------------------
# Hooks
# ---------------------------------------------------------------------------
def validate_provider(doc, method=None):
    """Provider.validate: a document save never changes the page address.

    The address changes only through `ensure_slug`, `short_links.change` and the website sync, which check
    the shared address space. This also stops a provider loaded before such a change from writing an old value back.
    """
    old = doc.get_doc_before_save()
    doc.public_slug = old.public_slug if old else None
    if doc.get("spoken_languages"):
        doc.spoken_languages = json.dumps(spoken_languages(doc.spoken_languages))


def delete_aliases(doc, method=None):
    """Provider.on_trash: its former page addresses go with it."""
    for name in frappe.get_all(ALIAS, filters={"provider": doc.name}, pluck="name"):
        frappe.delete_doc(ALIAS, name, ignore_permissions=True, force=True)


# ---------------------------------------------------------------------------
# Projections
# ---------------------------------------------------------------------------
def bookable_offerings(provider: str) -> list:
    """The provider's offerings a guest may book now, oldest first."""
    from appointment.scheduler.booking import offering

    result = []
    for name in frappe.get_all("EventType", filters={"provider": provider, "is_active": 1}, pluck="name", order_by="creation asc"):
        try:
            parts = offering(name, public=True)
        except (frappe.PermissionError, frappe.ValidationError, frappe.DoesNotExistError):
            frappe.clear_messages()
            continue
        if parts.business.doctype == "Provider" and not parts.service.get("resource_only"):
            result.append(parts)
    return result


def spoken_languages(value) -> list[str]:
    try:
        codes = json.loads(value) if isinstance(value, str) else (value or [])
    except ValueError:
        return []
    return [code for code in LANGUAGES if isinstance(codes, list) and code in codes]


def public_photo(path: str | None) -> str:
    """Only a public file or bundled asset; never a private file or another host."""
    path = (path or "").strip()
    return path if re.match(r"^/(files|assets)/[^?#]+$", path) and ".." not in path else ""


def site_content(site, provider: str) -> dict:
    """Bilingual copy and the hero photo of the published website.

    `{person: {name, role, image, imageAlt}, services: {service: {name, summary}}, cover}`.
    """
    content = {"person": {}, "services": {}, "cover": ""}
    if not site or not site.current_release:
        return content
    from appointment.public_experience.resolver import public_snapshot

    for section in public_snapshot(site.current_release).get("sections") or []:
        items = (section.get("content") or {}).get("items") or []
        if section.get("type") == "hero" and not content["cover"]:
            content["cover"] = public_photo((section.get("content") or {}).get("image"))
        if section.get("type") == "services":
            content["services"] = {item["id"]: {key: _texts(item.get(key)) for key in ("name", "summary")}
                                   for item in items if item.get("id")}
        elif section.get("type") == "providers":
            person = next((item for item in items if item.get("id") == provider), items[0] if len(items) == 1 else None)
            if person:
                content["person"] = {"name": _texts(person.get("name")), "role": _texts(person.get("role")),
                                     "image": public_photo(person.get("image")), "imageAlt": _texts(person.get("imageAlt"))}
    return content


def _texts(value) -> dict:
    """`{en, am}` text of a content field; a plain string counts as English."""
    if isinstance(value, dict):
        return {lang: _plain(value.get(lang)) for lang in ("en", "am") if value.get(lang)}
    return {"en": _plain(value)} if value else {}


def _services(offerings, slug, copy=None):
    services = {}
    for parts in offerings:
        words = (copy or {}).get(parts.service.name) or {}
        service = services.setdefault(parts.service.name, {
            "service": parts.service.name, "name": parts.service.service_name,
            "description": _plain(parts.service.description),
            "names": words.get("name") or {}, "descriptions": words.get("summary") or {}, "offerings": []})
        price = flt(parts.event.price_override) or flt(parts.service.price)
        service["offerings"].append({
            "offering": parts.event.name, "path": f"{ROOT}{slug}/{parts.event.name}",
            "duration": cint(parts.event.duration_override or parts.service.duration), "price": price,
            "location": _place(parts.location)})
    for service in services.values():
        rows = service["offerings"]
        service.update(duration=min(row["duration"] for row in rows), price=min(row["price"] for row in rows),
                       currency=CURRENCY)
    return list(services.values())


def _place(location):
    from appointment.scheduler.online_meeting import is_online, public_place

    address = ", ".join(part for part in (location.address_line_1, location.address_line_2, location.city) if part)
    return {"name": location.location_name, "address": "" if is_online(location) else address, **public_place(location)}


def _published(provider):
    doc = frappe.get_doc("Provider", provider)
    if (not doc.is_active or doc.organization or doc.organizations or not cint(doc.enable_public_booking)
            or not doc.user or not frappe.db.get_value("User", doc.user, "enabled")):
        return None
    return doc


def provider_bio(row, lang: str) -> str:
    """The bio in `lang` ("am" or "en"), else the bio in the other language. `row` is a Provider doc or dict."""
    english, amharic = _plain(row.get("bio")), _plain(row.get("bio_am"))
    return (amharic or english) if lang == "am" else (english or amharic)


def _plain(text) -> str:
    return " ".join(re.sub(r"<[^>]+>", " ", str(text or "")).split())[:1200]


def _problem(slug, provider):
    from appointment.growth.short_links import problem

    return problem(slug, None, provider=provider)
