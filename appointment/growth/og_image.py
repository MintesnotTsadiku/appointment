"""Generic share cards: 1200x630 PNG images for Open Graph link previews.

`render_card` draws a business card (logo, name, a short line, up to three service chips, the
short link and a small platform mark) in the colours it is given. The file name is a hash of
everything drawn, so a change to any input gives a new file; older cards with the same `key` are
then removed. Latin text uses Inter and Ethiopic text uses Noto Sans Ethiopic (both app fonts).
"""

from __future__ import annotations

import hashlib
import json
import os

import frappe

from appointment.growth.tools import colors as color_math

VERSION = "2"
SIZE = (1200, 630)
FOLDER = "og-cards"
PANEL_X = 780
MARGIN = 72

ETHIOPIC_RANGES = ((0x1200, 0x139F), (0x2D80, 0x2DDF), (0xAB00, 0xAB2F))
_FONTS: dict = {}

DEFAULT_COLORS = {
    "background": "#fffaf5",
    "text": "#1f1720",
    "muted": "#6b5b66",
    "primary": "#7a2e4f",
    "on_primary": "#ffffff",
}


def render_card(
    title: str,
    subtitle: str = "",
    lines: list[str] | tuple = (),
    logo: str | None = None,
    colors: dict | None = None,
    lang: str = "en",
    footer: str = "",
    key: str = "",
) -> str:
    """Draw the card once and return its site-relative file URL (`/files/og-cards/...png`)."""

    from appointment.growth.brand import brand

    platform = brand()
    palette = card_colors(colors)
    payload = json.dumps(
        [VERSION, title, subtitle, list(lines)[:3], logo or "", palette, lang, footer,
         platform.get("product_name"), platform.get("mark")],
        ensure_ascii=False,
    )
    digest = hashlib.sha1(payload.encode("utf-8")).hexdigest()[:16]
    prefix = f"{_safe(key)}-" if key else ""
    name = f"{prefix}{digest}.png"
    folder = frappe.get_site_path("public", "files", FOLDER)
    path = os.path.join(folder, name)
    if not os.path.exists(path):
        os.makedirs(folder, exist_ok=True)
        image = draw_card(title, subtitle, list(lines)[:3], logo, palette, footer, platform)
        image.save(path + ".tmp", "PNG", optimize=True)
        os.replace(path + ".tmp", path)
        if prefix:
            _remove_stale(folder, prefix, name)
    return f"/files/{FOLDER}/{name}"


def card_colors(colors: dict | None) -> dict:
    """Complete the colour set and keep text readable on its background."""

    values = {**DEFAULT_COLORS, **{k: v for k, v in (colors or {}).items() if v}}
    background = color_math.parse(values["background"])
    primary = color_math.parse(values["primary"])
    values["text"] = color_math.to_hex(color_math.readable_on(color_math.parse(values["text"]), background, 7.0))
    values["muted"] = color_math.to_hex(color_math.readable_on(color_math.parse(values["muted"]), background, 4.5))
    values["on_primary"] = color_math.to_hex(color_math.readable_on(color_math.parse(values["on_primary"]), primary, 4.5))
    return {key: color_math.to_hex(color_math.parse(values[key])) for key in DEFAULT_COLORS}


def draw_card(title, subtitle, lines, logo, palette, footer, platform):
    from PIL import Image, ImageDraw

    background = color_math.parse(palette["background"])
    primary = color_math.parse(palette["primary"])
    on_primary = color_math.parse(palette["on_primary"])
    image = Image.new("RGB", SIZE, background)
    draw = ImageDraw.Draw(image)

    # Brand panel at the right with the logo (or initials) in a white disc.
    draw.rectangle((PANEL_X, 0, SIZE[0], SIZE[1]), fill=primary)
    _rings(draw, primary, on_primary)
    draw.rectangle((0, 0, PANEL_X - 1, SIZE[1]), fill=background)  # keep the rings inside the panel
    _logo_disc(image, logo, title, primary)

    width = PANEL_X - 2 * MARGIN
    y = MARGIN + 6
    if subtitle:
        _draw_runs(draw, (MARGIN, y), _fit(subtitle, 26, width), 26, palette["primary"], bold=True)
        y += 58
    size, title_lines = _fit_lines(title, width, 2, (76, 68, 60, 54, 48, 42))
    for line in title_lines:
        _draw_runs(draw, (MARGIN, y), line, size, palette["text"], bold=True)
        y += int(size * 1.2)
    y += 22
    _chips(draw, MARGIN, y, lines, width, palette)

    if footer:
        _draw_runs(draw, (MARGIN, SIZE[1] - MARGIN - 34), _fit(footer, 32, width), 32, palette["text"], bold=True)
    _platform_mark(image, draw, platform, on_primary)
    return image


def _rings(draw, primary, on_primary):
    tone = color_math.mix(primary, on_primary, 0.14)
    cx, cy = PANEL_X + (SIZE[0] - PANEL_X) // 2, SIZE[1] // 2 - 20
    for radius, width in ((250, 3), (300, 2)):
        draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), outline=tone, width=width)


def _logo_disc(image, logo, title, primary):
    from PIL import Image, ImageDraw

    diameter = 280
    cx, cy = PANEL_X + (SIZE[0] - PANEL_X) // 2, SIZE[1] // 2 - 20
    disc = Image.new("RGBA", (diameter, diameter), (0, 0, 0, 0))
    ImageDraw.Draw(disc).ellipse((0, 0, diameter - 1, diameter - 1), fill=(255, 255, 255, 255))
    picture = _load_image(logo, int(diameter * 0.62))
    if picture is not None:
        disc.alpha_composite(picture, ((diameter - picture.width) // 2, (diameter - picture.height) // 2))
    else:
        initials = "".join(word[0] for word in (title or "?").split()[:2]).upper() or "?"
        draw = ImageDraw.Draw(disc)
        size = 110
        text_width = _width(initials, size)
        _draw_runs(draw, ((diameter - text_width) / 2, diameter / 2 - size * 0.62), initials, size,
                   color_math.to_hex(primary), bold=True)
    image.paste(disc, (cx - diameter // 2, cy - diameter // 2), disc)


def _chips(draw, x0, y, lines, width, palette):
    size, pad_x, height, gap = 26, 22, 52, 14
    x = x0
    rows = 0
    for text in lines:
        label = _fit(text, size, width - 2 * pad_x)
        chip = _width(label, size, bold=False) + 2 * pad_x
        if x > x0 and x + chip > x0 + width:
            rows += 1
            if rows >= 2:
                return
            x, y = x0, y + height + gap
        draw.rounded_rectangle((x, y, x + chip, y + height), radius=height // 2,
                               fill=palette["background"], outline=palette["primary"], width=3)
        _draw_runs(draw, (x + pad_x, y + (height - size) / 2 - 3), label, size, palette["text"])
        x += chip + gap


def _platform_mark(image, draw, platform, on_primary):
    name = platform.get("product_name") or ""
    size = 22
    mark = _load_image(platform.get("mark"), 34)
    text_width = _width(name, size, bold=True)
    total = text_width + (44 if mark is not None else 0)
    x = SIZE[0] - 36 - total
    y = SIZE[1] - 36 - 34
    if mark is not None:
        image.paste(mark, (int(x), y), mark)
        x += 44
    _draw_runs(draw, (x, y + 4), name, size, color_math.to_hex(on_primary), bold=True)


def _fit_lines(text, width, max_lines, sizes):
    for size in sizes:
        lines = _wrap(text, size, width)
        if len(lines) <= max_lines and all(_width(line, size) <= width for line in lines):
            return size, lines
    size = sizes[-1]
    lines = _wrap(text, size, width)[:max_lines]
    return size, [_fit(line, size, width) for line in lines]


def _fit(text: str, size: int, width: int) -> str:
    """Cut `text` with an ellipsis so it fits `width`."""

    text = (text or "").strip()
    if _width(text, size) <= width:
        return text
    while text and _width(text + "…", size) > width:
        text = text[:-1]
    return text.rstrip() + "…"


def _load_image(url: str | None, size: int):
    from PIL import Image

    path = local_path(url or "")
    if not path:
        return None
    try:
        with Image.open(path) as source:
            picture = source.convert("RGBA")
        picture.thumbnail((size, size))
        return picture
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Text: Ethiopic and Latin runs drawn with their own fonts on one baseline
# ---------------------------------------------------------------------------
def _font(ethiopic: bool, size: int, bold: bool):
    from PIL import ImageFont

    key = (ethiopic, size, bold)
    if key not in _FONTS:
        name = "noto-sans-ethiopic.woff2" if ethiopic else "inter.woff2"
        font = ImageFont.truetype(os.path.join(frappe.get_app_path("appointment"), "public", "fonts", "app", name), size)
        try:
            font.set_variation_by_axes([700 if bold else 450])
        except Exception:
            pass
        _FONTS[key] = font
    return _FONTS[key]


def _is_ethiopic(char: str) -> bool:
    return any(start <= ord(char) <= end for start, end in ETHIOPIC_RANGES)


def _runs(text: str) -> list[list]:
    runs: list[list] = []
    for char in text:
        ethiopic = _is_ethiopic(char) if not char.isspace() else (runs[-1][0] if runs else False)
        if runs and runs[-1][0] == ethiopic:
            runs[-1][1] += char
        else:
            runs.append([ethiopic, char])
    return runs


def _width(text: str, size: int, bold: bool = True) -> float:
    return sum(_font(ethiopic, size, bold).getlength(chunk) for ethiopic, chunk in _runs(text))


def _draw_runs(draw, xy: tuple, text: str, size: int, fill, bold: bool = False):
    x, y = xy
    for ethiopic, chunk in _runs(text):
        font = _font(ethiopic, size, bold)
        draw.text((x, y + size), chunk, font=font, fill=fill, anchor="ls")
        x += font.getlength(chunk)


def _wrap(text: str, size: int, max_width: int) -> list[str]:
    lines, current = [], ""
    for word in (text or "").split():
        candidate = f"{current} {word}".strip()
        if current and _width(candidate, size) > max_width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def local_path(url: str) -> str | None:
    """The file behind an app asset (`/assets/<app>/...`) or public site file (`/files/...`) URL."""

    url = (url or "").split("?", 1)[0]
    if url.startswith("/assets/"):
        app, _sep, rest = url[len("/assets/"):].partition("/")
        if app not in frappe.get_installed_apps():
            return None
        root = os.path.join(frappe.get_app_path(app), "public")
    elif url.startswith("/files/"):
        root, rest = frappe.get_site_path("public", "files"), url[len("/files/"):]
    else:
        return None
    path = os.path.realpath(os.path.join(root, rest))
    if not path.startswith(os.path.realpath(root) + os.sep) or not os.path.isfile(path):
        return None
    return path


def _safe(value: str) -> str:
    return "".join(ch if ch.isalnum() or ch in "-_" else "-" for ch in value.lower())[:60]


def _remove_stale(folder: str, prefix: str, keep: str):
    import re

    pattern = re.compile(re.escape(prefix) + r"[0-9a-f]{16}\.png")
    for name in os.listdir(folder):
        if name != keep and pattern.fullmatch(name):
            try:
                os.remove(os.path.join(folder, name))
            except OSError:
                pass
