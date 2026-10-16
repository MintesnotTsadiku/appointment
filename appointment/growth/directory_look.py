"""How a listed business looks on a directory card: its own photo, colours, services and prices.

Everything comes from the business's published release (`resolver.public_snapshot`), so the card
shows what the business published and nothing else: the hero photo of its website (with the smaller
widths, AVIF files and the night photo the template package ships), its brand colours, its
Amharic site name, the hero title as a tagline, the services with the prices it shows, and whether
its owner turned live availability on. A business without a website (scheduler page only) gets its
active services from the Service records and no photo.

Releases never change after they are published, so the look of a release is cached for a day.
"""

from __future__ import annotations

import re

import frappe

from appointment.public_experience.next_availability import enabled as live_availability_on

ASSET_PREFIXES = ("/assets/appointment/", "/files/")
CACHE_PREFIX = "appointment:directory_look:"
CACHE_SECONDS = 24 * 3600
OFFERS = 3
_UNSAFE = re.compile(r"[\"'<>\\ ?#]")


def safe_asset(src: object) -> str:
    """A local image path that is safe in an attribute, else ""."""
    if not isinstance(src, str) or not src.startswith(ASSET_PREFIXES) or ".." in src or _UNSAFE.search(src):
        return ""
    return src


def _text(value, lang: str) -> str:
    if isinstance(value, dict):
        return str(value.get(lang) or "").strip()
    return str(value or "").strip() if lang == "en" else ""


def _width_name(src: str, width: int) -> str:
    stem, dot, extension = src.rpartition(".")
    return f"{stem}-w{width}.{extension}" if dot else src


def _sources(src: str, width: int, widths: list) -> list[dict]:
    """`srcset` entries for a photo: the smaller widths the package ships, then the file itself."""
    rows = [dict(src=_width_name(src, value), width=value) for value in widths if isinstance(value, int) and value < width]
    rows.append(dict(src=src, width=width))
    return rows


def _avif(src: str) -> str:
    return src[: -len(".webp")] + ".avif" if src.endswith(".webp") else ""


def _picture(asset: dict, alt: dict) -> dict | None:
    """The card photo: srcsets for light and dark mode, WebP and AVIF, and the focal point."""
    src = safe_asset(asset.get("src"))
    if not src:
        return None
    width = int(asset.get("width") or 0) or 1280
    widths = asset.get("widths") if isinstance(asset.get("widths"), list) else []
    avif = "avif" in (asset.get("formats") or [])

    def srcsets(base: str) -> dict:
        rows = _sources(base, width, widths)
        webp = ", ".join(f"{row['src']} {row['width']}w" for row in rows)
        avif_set = ", ".join(f"{_avif(row['src'])} {row['width']}w" for row in rows) if avif and base.endswith(".webp") else ""
        smallest = rows[0]["src"]
        return dict(webp=webp, avif=avif_set, fallback=smallest)

    dark = safe_asset(asset.get("darkSrc"))
    focal = asset.get("focalPoint") if isinstance(asset.get("focalPoint"), dict) else {}
    x, y = (min(max(float(focal.get(axis) or 0.5), 0), 1) for axis in ("x", "y"))
    return dict(light=srcsets(src), dark=srcsets(dark) if dark else None, alt=alt,
                position=f"{round(x * 100)}% {round(y * 100)}%")


def _hero(design: dict, sections: list) -> dict | None:
    """The hero photo as the templates choose it: the owner's photo in the hero section, else `hero.primary`."""
    assets = design.get("assets") or {}
    hero = next((row for row in sections if isinstance(row, dict) and row.get("type") == "hero"), None) or {}
    content = hero.get("content") or {}
    own = content.get("image")
    alt = {lang: _text(content.get("imageAlt"), lang) for lang in ("en", "am")}
    if isinstance(own, str) and own:
        asset = next((row for row in assets.values() if isinstance(row, dict) and row.get("src") == own), None)
        return _picture(asset or {"src": own}, alt)
    asset = assets.get("hero.primary")
    if not isinstance(asset, dict):
        return None
    return _picture(asset, {"en": alt["en"] or str(asset.get("alt") or ""), "am": alt["am"]})


def _offers(sections: list, show_prices: bool) -> list[dict]:
    services = next((row for row in sections if isinstance(row, dict) and row.get("type") == "services"), None) or {}
    offers = []
    for item in (services.get("content") or {}).get("items") or []:
        if not isinstance(item, dict):
            continue
        names = {lang: _text(item.get("name"), lang) for lang in ("en", "am")}
        if not names["en"] and not names["am"]:
            continue
        price = item.get("price") if show_prices and isinstance(item.get("price"), (int, float)) else None
        offers.append(dict(id=str(item.get("id") or ""), names=names, price=price, currency=str(item.get("currency") or "ETB"),
                           duration=int(item.get("durationMinutes") or 0) or None))
    return offers


def from_release(release: str) -> dict:
    """The look of one published release (cached; releases are immutable)."""
    key = CACHE_PREFIX + release
    cached = frappe.cache.get_value(key)
    if isinstance(cached, dict):
        return cached
    from appointment.public_experience.resolver import public_snapshot

    snapshot = public_snapshot(release) or {}
    design = snapshot.get("compiledDesign") or {}
    sections = [row for row in snapshot.get("sections") or [] if isinstance(row, dict)]
    tokens = design.get("tokens") or {}
    booking = snapshot.get("booking") if isinstance(snapshot.get("booking"), dict) else {}
    hero = next((row for row in sections if row.get("type") == "hero"), None) or {}
    look = dict(
        picture=_hero(design, sections),
        accent={mode: _color((tokens.get(mode) or {}).get("primary")) for mode in ("light", "dark")},
        live=live_availability_on(booking),
        offers=_offers(sections, booking.get("showPrices") is not False),
        tagline={lang: _text((hero.get("content") or {}).get("title"), lang) for lang in ("en", "am")},
        local_title=_text(snapshot.get("localTitle"), "am"),
    )
    frappe.cache.set_value(key, look, expires_in_sec=CACHE_SECONDS)
    return look


def _color(value) -> str:
    return value if isinstance(value, str) and re.fullmatch(r"#[0-9a-fA-F]{6}", value) else ""


def from_services(owner_key: str | None) -> dict:
    """The look of a business without a website: its active services, no photo, no live times."""
    from appointment.scheduler.business_owner import PREFIX

    empty = dict(picture=None, accent={"light": "", "dark": ""}, live=False, offers=[], tagline={"en": "", "am": ""}, local_title="")
    if not owner_key:
        return empty
    filters = {"is_active": 1, "resource_only": ["!=", 1]}
    if owner_key.startswith(PREFIX):
        filters.update(independent_provider=owner_key.removeprefix(PREFIX), organization=["is", "not set"])
    else:
        filters["organization"] = owner_key
    rows = frappe.get_all("Service", filters=filters, fields=["name", "service_name", "price", "duration"], order_by="creation asc")
    offers = [dict(id=row.name, names={"en": row.service_name, "am": ""}, price=row.price, currency="ETB", duration=row.duration or None)
              for row in rows]
    return dict(empty, offers=offers)


def ranked_offers(look: dict, ranking: list[str], limit: int = OFFERS) -> list[dict]:
    """The offers most booked first (`ranking` is service ids by bookings), then in the site's order."""
    order = {name: index for index, name in enumerate(ranking)}
    offers = sorted(look.get("offers") or [], key=lambda row: order.get(row["id"], len(order)))
    return offers[:limit]
