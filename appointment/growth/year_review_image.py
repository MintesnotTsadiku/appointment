"""The year-in-review share image: Pillow, 1080x1350 (portrait post) or 1080x1920 (story).

The business's brand sets the look: its logo, and the primary, canvas and text
colours of its published design (`sharing.profile`). A small platform mark sits
in the corner. Text drawing and fonts (Inter for Latin, Noto Sans Ethiopic for
Ethiopic, chosen per run) are shared with the other share images
(`growth/tools/og_image.py`, `growth/og_image.py`).
"""

from __future__ import annotations

import io

from frappe import _

from appointment.growth import ethiopian_calendar as ec
from appointment.growth import habesha
from appointment.growth.og_image import _fit, _load_image, card_colors
from appointment.growth.tools import colors as color_math
from appointment.growth.tools.og_image import _draw_runs, _width

SIZES = {"portrait": (1080, 1350), "story": (1080, 1920)}

# Layout per size: margin, header top, period size, hero number size, tile value size, footer height.
LAYOUT = {
    "portrait": dict(margin=72, top=72, period=84, hero=150, value=46, label=24, footer=150, gap=8, logo=104, after_header=44),
    "story": dict(margin=80, top=150, period=104, hero=210, value=54, label=27, footer=250, gap=26, logo=120, after_header=64),
}


def render(owner, period: dict, review: dict, lang: str, size: str) -> bytes:
    from appointment.growth.brand import brand
    from appointment.growth.sharing import profile

    business = profile(owner, lang)
    image = draw(business, brand(), period, review, lang, size)
    buffer = io.BytesIO()
    image.save(buffer, "PNG", optimize=True)
    return buffer.getvalue()


def draw(business: dict, platform: dict, period: dict, review: dict, lang: str, size: str):
    from PIL import Image, ImageDraw

    from appointment.growth.year_review import period_label

    width, height = SIZES[size]
    spec = LAYOUT[size]
    palette = card_colors(business.get("colors"))
    primary = color_math.parse(palette["primary"])
    on_primary = color_math.parse(palette["on_primary"])
    soft = color_math.to_hex(color_math.mix(on_primary, primary, 0.28))
    image = Image.new("RGB", (width, height), primary)
    canvas = ImageDraw.Draw(image)
    margin = spec["margin"]
    inner = width - 2 * margin

    _rings(canvas, width, primary, on_primary)

    # Header: logo tile, business name and the "year in review" line.
    y = spec["top"]
    tile = spec["logo"]
    _logo_tile(image, business, (margin, y), tile, primary)
    text_x = margin + tile + 28
    name_width = width - margin - text_x
    _draw_runs(canvas, (text_x, y + 8), _fit(business.get("name") or "", 40, name_width), 40, palette["on_primary"], bold=True)
    _draw_runs(canvas, (text_x, y + 62), _fit(_("Year in review", lang=lang), 28, name_width), 28, soft)

    # Period and the hero number.
    y += tile + spec["after_header"]
    label = period_label(period, lang)
    period_size = _shrink(label, spec["period"], inner, 52)
    _draw_runs(canvas, (margin, y), label, period_size, palette["on_primary"], bold=True)
    y += int(period_size * 1.25) + spec["gap"] + 8
    stats = review["stats"]
    hero = _number(stats["clients"])
    _draw_runs(canvas, (margin, y), hero, spec["hero"], palette["on_primary"], bold=True)
    y += int(spec["hero"] * 1.08)
    _draw_runs(canvas, (margin, y), _("Clients served", lang=lang), spec["label"] + 12, soft, bold=True)
    y += spec["label"] + 12 + spec["gap"] + 36

    # Stat tiles on the business's canvas colour.
    tiles = _tiles(stats, lang)
    panel_bottom = height - spec["footer"]
    _panel(canvas, palette, (margin, y, width - margin, panel_bottom), tiles, spec, size)

    # Footer: thanks, the booking link and the platform mark.
    footer_y = panel_bottom + (spec["footer"] - 80) // 2
    thanks = _("Thank you to everyone who booked with us.", lang=lang)
    _draw_runs(canvas, (margin, footer_y), _fit(thanks, 28, inner), 28, palette["on_primary"], bold=True)
    link = business.get("short") or (business.get("url") or "").removeprefix("https://").removeprefix("http://")
    mark_width = _platform_mark(image, canvas, platform, (width - margin, footer_y + 46), soft, lang)
    if link:
        _draw_runs(canvas, (margin, footer_y + 46), _fit(link, 24, inner - mark_width - 24), 24, soft)
    return image


# ---------------------------------------------------------------------------
# Tiles
# ---------------------------------------------------------------------------
def _number(value) -> str:
    return f"{int(value):,}"


def _tiles(stats: dict, lang: str) -> list[tuple[str, str, str]]:
    """`(label, value, note)` for every stat present, in reading order."""
    t = lambda text: _(text, lang=lang)  # noqa: E731
    tiles = [(t("Total bookings"), _number(stats["bookings"]), "")]
    if "new_clients" in stats:
        tiles.append((t("New clients"), _number(stats["new_clients"]), ""))
    if "returning_rate" in stats:
        tiles.append((t("Returning clients"), f"{stats['returning_rate']}%", t("came back again")))
    if "busiest_day" in stats:
        tiles.append((t("Busiest day"), ec.WEEKDAYS[stats["busiest_day"]["weekday"]][0 if lang == "am" else 1], ""))
    if "busiest_hour" in stats:
        hour = stats["busiest_hour"]["hour"]
        if lang == "am":
            tiles.append((t("Busiest hour"), habesha.format_habesha(hour, 0), habesha.format_international(hour, 0)))
        else:
            tiles.append((t("Busiest hour"), f"{hour % 12 or 12} {'AM' if hour < 12 else 'PM'}", ""))
    if "top_service" in stats:
        tiles.append((t("Top service"), stats["top_service"]["name"], t("{0}% of bookings").format(stats["top_service"]["share"])))
    if "top_provider" in stats:
        tiles.append((t("Most booked"), stats["top_provider"]["name"], t("{0} bookings").format(_number(stats["top_provider"]["count"]))))
    if "amharic_share" in stats:
        tiles.append((t("Booked in Amharic"), f"{stats['amharic_share']}%", ""))
    return tiles[:8]


def _panel(canvas, palette, box, tiles, spec, size):
    left, top, right, bottom = box
    canvas.rounded_rectangle(box, radius=40, fill=palette["background"])
    pad = 40 if size == "portrait" else 48
    columns = 2
    rows = max(1, -(-len(tiles) // columns))
    cell_width = (right - left - 2 * pad - (columns - 1) * 24) / columns
    cell_height = (bottom - top - 2 * pad) / rows
    value_size, label_size = spec["value"], spec["label"]
    # Shrink the type when many rows share a short panel.
    has_notes = any(note for _label, _value, note in tiles)
    while cell_height < label_size * 1.4 + value_size * 1.25 + (label_size * 1.3 if has_notes else 0) + 18 and value_size > 30:
        value_size -= 2
        label_size = max(20, label_size - 1)
    divider = color_math.to_hex(color_math.mix(color_math.parse(palette["background"]), color_math.parse(palette["text"]), 0.12))
    for index, (label, value, note) in enumerate(tiles):
        column, row = index % columns, index // columns
        x = left + pad + column * (cell_width + 24)
        y = top + pad + row * cell_height
        if row:
            canvas.line((x, y - 1, x + cell_width, y - 1), fill=divider, width=2)
        # Top-aligned so the labels and values of one row share a line.
        y += 14 if row else 4
        _draw_runs(canvas, (x, y), _fit(label, label_size, int(cell_width)), label_size, palette["muted"])
        y += label_size * 1.4
        fitted = _shrink(value, value_size, int(cell_width), int(value_size * 0.6))
        _draw_runs(canvas, (x, y + (value_size - fitted) * 0.6), _fit(value, fitted, int(cell_width)), fitted, palette["text"], bold=True)
        if note:
            y += value_size * 1.25
            _draw_runs(canvas, (x, y), _fit(note, label_size - 2, int(cell_width)), label_size - 2, palette["muted"])


def _shrink(text: str, size: int, width: int, minimum: int) -> int:
    while size > minimum and _width(text, size) > width:
        size -= 2
    return size


# ---------------------------------------------------------------------------
# Brand pieces
# ---------------------------------------------------------------------------
def _rings(canvas, width, primary, on_primary):
    tone = color_math.to_hex(color_math.mix(primary, on_primary, 0.1))
    cx, cy = width - 120, 150
    for radius, line in ((260, 3), (330, 2), (400, 2)):
        canvas.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), outline=tone, width=line)


def _logo_tile(image, business, xy, size, primary):
    from PIL import Image, ImageDraw

    tile = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(tile).rounded_rectangle((0, 0, size - 1, size - 1), radius=size // 4, fill=(255, 255, 255, 255))
    picture = _load_image(business.get("logo"), int(size * 0.74))
    if picture is not None:
        tile.alpha_composite(picture, ((size - picture.width) // 2, (size - picture.height) // 2))
    else:
        initials = "".join(word[0] for word in (business.get("name") or "?").split()[:2]).upper() or "?"
        text_size = int(size * 0.4)
        _draw_runs(ImageDraw.Draw(tile), ((size - _width(initials, text_size)) / 2, size / 2 - text_size * 0.62),
                   initials, text_size, color_math.to_hex(primary), bold=True)
    image.paste(tile, xy, tile)


def _platform_mark(image, canvas, platform, right_top, color, lang) -> int:
    """Draw "<product>" with its mark, right-aligned at `right_top`; returns the width used."""
    name = platform.get("product_name") or ""
    if not name:
        return 0
    text = _("Made with {0}", lang=lang).format(name)
    size = 22
    mark = _load_image(platform.get("mark"), 30)
    text_width = _width(text, size, bold=True)
    total = int(text_width + (40 if mark is not None else 0))
    x, y = right_top[0] - total, right_top[1]
    if mark is not None:
        image.paste(mark, (int(x), int(y - 2)), mark)
        x += 40
    _draw_runs(canvas, (x, y), text, size, color, bold=True)
    return total
