"""Printable QR posters for the counter: scan to book, with opening hours in both clocks.

The same HTML template gives the print view (browser) and the PDF (wkhtmltopdf, like receipts).
Hours show international time and Ethiopian (Habesha) time from `growth/habesha.py`.
"""

from __future__ import annotations

import base64
from functools import lru_cache
from itertools import groupby

import frappe
from frappe import _
from frappe.rate_limiter import rate_limit
from frappe.utils import cstr, escape_html
from werkzeug.wrappers import Response

from appointment.growth import habesha
from appointment.growth.tools import colors as color_math

TEMPLATE = "appointment/templates/growth/poster.html"
SIZES = {"A4": (210, 297), "A5": (148, 210)}
THEMES = ("light", "dark", "brand")
LANGUAGES = ("both", "am", "en")
DAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
DAY_NAMES = {
    "en": ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"),
    "am": ("ሰኞ", "ማክሰኞ", "ረቡዕ", "ሐሙስ", "ዓርብ", "ቅዳሜ", "እሑድ"),
}


# ---------------------------------------------------------------------------
# Locations and hours
# ---------------------------------------------------------------------------
def locations(owner) -> list:
    filters = {"is_active": 1}
    if owner.organization:
        filters["organization"] = owner.organization
    else:
        filters.update(independent_provider=owner.provider, organization=["is", "not set"])
    return frappe.get_all("Location", filters=filters, fields=["name", "location_name"], order_by="creation asc")


def _hhmm(value) -> str:
    text = cstr(value)
    hour, _sep, rest = text.partition(":")
    return f"{int(hour or 0):02d}:{(rest or '00')[:2]}"


def week(location: str) -> dict[str, list[tuple[str, str]]]:
    """Open ranges per weekday as `HH:MM` pairs."""

    rows = frappe.get_all(
        "Opening Hours",
        filters={"parent": location, "parenttype": "Location", "is_open": 1},
        fields=["day_of_week", "start_time", "end_time"],
        order_by="idx asc",
    )
    result: dict[str, list[tuple[str, str]]] = {day: [] for day in DAYS}
    for row in rows:
        if row.day_of_week in result and row.start_time and row.end_time:
            result[row.day_of_week].append((_hhmm(row.start_time), _hhmm(row.end_time)))
    return {day: sorted(ranges) for day, ranges in result.items()}


def hour_rows(location: str | None) -> list[dict]:
    """Consecutive days with the same hours as one row, in both clocks; closed days last."""

    if not location:
        return []
    days = week(location)
    rows = []
    indexed = list(enumerate(DAYS))
    for ranges, group in groupby(indexed, key=lambda item: tuple(days[item[1]])):
        members = [index for index, _day in group]
        rows.append(dict(
            first=members[0], last=members[-1], closed=not ranges,
            days_en=_span(members, "en"), days_am=_span(members, "am"),
            international=" · ".join(habesha.format_hours_range(start, end, "en") for start, end in ranges),
            habesha=" · ".join(habesha.format_hours_range(start, end, "am") for start, end in ranges),
        ))
    return [row for row in rows if not row["closed"]] + [row for row in rows if row["closed"]]


def _span(members: list[int], lang: str) -> str:
    names = DAY_NAMES[lang]
    if len(members) == 1:
        return names[members[0]]
    return f"{names[members[0]]} – {names[members[-1]]}"


# ---------------------------------------------------------------------------
# QR code
# ---------------------------------------------------------------------------
def qr_svg(text: str, color: str = "#111111") -> str:
    """The QR code as one SVG path (quiet zone included), medium error correction."""

    import pyqrcode

    matrix = pyqrcode.create(text, error="M", mode="binary").code
    quiet = 4
    size = len(matrix) + 2 * quiet
    parts = []
    for y, row in enumerate(matrix):
        x = 0
        while x < len(row):
            if row[x]:
                start = x
                while x < len(row) and row[x]:
                    x += 1
                parts.append(f"M{start + quiet} {y + quiet}h{x - start}v1h-{x - start}z")
            else:
                x += 1
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" shape-rendering="crispEdges" '
        f'role="img" aria-label="QR code"><rect width="{size}" height="{size}" fill="#ffffff"/>'
        f'<path fill="{escape_html(color)}" d="{"".join(parts)}"/></svg>'
    )


# ---------------------------------------------------------------------------
# Poster
# ---------------------------------------------------------------------------
def options(size: str, theme: str, languages: str) -> tuple[str, str, str]:
    if size not in SIZES or theme not in THEMES or languages not in LANGUAGES:
        frappe.throw(_("Choose a valid poster size, theme and language."))
    return size, theme, languages


def palette(data: dict, dark: dict, theme: str) -> dict:
    light = data["colors"]
    primary = color_math.parse(light.get("primary") or "#7a2e4f")
    if theme == "dark":
        background = color_math.parse(dark.get("background") or "#15161a")
        accent = color_math.readable_on(color_math.parse(dark.get("primary") or light.get("primary") or "#d88"), background)
        text = color_math.readable_on(color_math.parse(dark.get("text") or "#f6f2ee"), background, 7)
    elif theme == "brand":
        background = primary
        text = color_math.readable_on(color_math.parse(light.get("on_primary") or "#ffffff"), background, 7)
        accent = text
    else:
        background = color_math.parse(light.get("background") or "#ffffff")
        accent = color_math.readable_on(primary, background)
        text = color_math.readable_on(color_math.parse(light.get("text") or "#1b1b1f"), background, 7)
    muted = color_math.mix(text, background, 0.3)
    panel = color_math.mix(background, text, 0.06)
    return {key: color_math.to_hex(value) for key, value in dict(
        background=background, text=text, accent=accent, muted=muted, panel=panel,
        rule=color_math.mix(background, text, 0.18), qr=color_math.readable_on(primary, (255, 255, 255), 7),
    ).items()}


def context(owner, size: str = "A4", theme: str = "light", location: str | None = None, languages: str = "both",
            pdf: bool = False) -> dict:
    from appointment.growth.brand import brand
    from appointment.growth.sharing import SOURCES, dark_colors, profile, tracked_url

    size, theme, languages = options(size, theme, languages)
    data = profile(owner, "am" if languages == "am" else "en")
    if not data["url"]:
        frappe.throw(_("Publish your booking page before printing a poster."))
    places = locations(owner)
    names = {row.name for row in places}
    if location and location not in names:
        frappe.throw(_("Choose one of your locations."), frappe.PermissionError)
    chosen = location or (places[0].name if places else None)
    platform = brand()
    url = tracked_url(data["url"], SOURCES[4])
    colors = palette(data, dark_colors(owner), theme)
    width, height = SIZES[size]
    show_en, show_am = languages in ("both", "en"), languages in ("both", "am")
    return dict(
        lang="am" if languages == "am" else "en",
        width=width, height=height, scale=width / 210, size=size, theme=theme, pdf=pdf,
        colors=colors, font_regular=font_data("regular"), font_bold=font_data("bold"),
        name=escape_html(data["name"]), logo=image_data_uri(data["logo"], 256),
        initials=escape_html("".join(word[0] for word in data["name"].split()[:2]).upper()),
        qr=qr_svg(url, colors["qr"]), short=escape_html(data["short"] or url.split("://", 1)[-1].split("?", 1)[0]),
        show_en=show_en, show_am=show_am,
        **_both("scan", "Scan to book"),
        **_both("hint", "Point your phone camera at the code"),
        **_both("hours", "Opening hours"),
        **_both("clock_intl", "International time"),
        **_both("clock_habesha", "Ethiopian time"),
        **_both("closed", "Closed"),
        location_name=escape_html(next((row.location_name for row in places if row.name == chosen), "")) if len(places) > 1 else "",
        rows=hour_rows(chosen),
        platform_mark=image_data_uri(platform.get("mark"), 96),
        **{f"powered_{lang}": escape_html(_("Online booking by {0}", lang=lang).format(platform["product_name"])) for lang in ("en", "am")},
    )


@lru_cache(maxsize=2)
def font_data(weight: str) -> str:
    """A static Noto Sans Ethiopic face as a data URI; wkhtmltopdf cannot use variable or WOFF2 fonts."""

    with open(frappe.get_app_path("appointment", "public", "fonts", "pdf", f"noto-sans-ethiopic-{weight}.ttf"), "rb") as handle:
        return "data:font/truetype;base64," + base64.b64encode(handle.read()).decode()


def image_data_uri(url: str | None, size: int) -> str:
    """A local app or site image as a PNG data URI; wkhtmltopdf cannot read WebP or fetch the site."""

    import io

    from PIL import Image

    from appointment.growth.og_image import local_path

    path = local_path(url or "")
    if not path:
        return ""
    try:
        with Image.open(path) as source:
            picture = source.convert("RGBA")
        picture.thumbnail((size, size))
        buffer = io.BytesIO()
        picture.save(buffer, "PNG", optimize=True)
    except Exception:
        return ""
    return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode()


def _both(key: str, text: str) -> dict:
    """`<key>_en` and `<key>_am`: the poster prints both languages whatever the session language."""

    return {f"{key}_en": _(text, lang="en"), f"{key}_am": _(text, lang="am")}


def render_html(owner, **kwargs) -> str:
    return frappe.render_template(TEMPLATE, context(owner, **kwargs))


def render_pdf(owner, size: str = "A4", **kwargs) -> bytes:
    from frappe.utils.pdf import get_pdf

    html = render_html(owner, size=size, pdf=True, **kwargs)
    return get_pdf(html, {
        "page-size": size, "margin-top": "0mm", "margin-bottom": "0mm", "margin-left": "0mm",
        "margin-right": "0mm", "disable-smart-shrinking": None, "zoom": "1.0",
    })


@frappe.whitelist(methods=["GET"])
@rate_limit(limit=30, seconds=60)
def poster(business: str, size: str = "A4", theme: str = "light", location: str | None = None,
           languages: str = "both", format: str = "html"):
    """The poster as a print view (`format=html`) or a PDF download (`format=pdf`)."""

    from appointment.growth.settings import growth
    from appointment.growth.sharing import require_business

    owner = require_business(business)
    if not growth()["posters_enabled"]:
        frappe.throw(_("Posters are switched off on this platform."), frappe.PermissionError)
    kwargs = dict(size=size, theme=theme, location=location or None, languages=languages)
    if format == "pdf":
        frappe.local.response.filename = f"{frappe.scrub(owner.display_name) or 'poster'}-{size.lower()}-poster.pdf"
        frappe.local.response.filecontent = render_pdf(owner, **kwargs)
        frappe.local.response.type = "pdf"
        return
    return Response(render_html(owner, **kwargs), content_type="text/html; charset=utf-8")
