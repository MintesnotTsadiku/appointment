"""Share images (Open Graph, 1200x630 PNG) for the tool pages.

Each image is drawn from the platform brand (name, colour, mark) and the tool title in the page
language. The file name carries a hash of everything drawn, so a change to the brand settings gives
a new file on the next page view; older files of the same tool and language are then removed.
"""

from __future__ import annotations

import hashlib
import os

import frappe
from frappe.utils import get_url

from appointment.growth.tools import colors

VERSION = "4"
SIZE = (1200, 630)
FOLDER = "tool-og"
ETHIOPIC_RANGES = ((0x1200, 0x139F), (0x2D80, 0x2DDF), (0xAB00, 0xAB2F))


def image_url(slug: str, lang: str, title: str, eyebrow: str, footer: str) -> str:
    """Absolute URL of the share image; the file is drawn on first use."""

    from appointment.growth.brand import brand

    values = brand()
    payload = "|".join(
        [VERSION, lang, title, eyebrow, footer, values["product_name"], values["primary_color"], values["mark"]]
    )
    digest = hashlib.sha1(payload.encode("utf-8")).hexdigest()[:12]
    prefix = f"{slug or 'index'}-{lang}-"
    name = f"{prefix}{digest}.png"
    folder = frappe.get_site_path("public", "files", FOLDER)
    path = os.path.join(folder, name)
    if not os.path.exists(path):
        try:
            os.makedirs(folder, exist_ok=True)
            render(values, title, eyebrow, footer).save(path + ".tmp", "PNG", optimize=True)
            os.replace(path + ".tmp", path)
            _remove_stale(folder, prefix, name)
        except Exception:
            frappe.log_error(title="Tool share image failed")
            return get_url(values.get("og_image") or "") if values.get("og_image") else ""
    return get_url(f"/files/{FOLDER}/{name}")


def render(values: dict, title: str, eyebrow: str, footer: str):
    from PIL import Image, ImageDraw

    palette = colors.palette(values.get("primary_color"))
    deep = colors.parse(palette["deep"])
    darker = colors.mix(deep, (0, 0, 0), 0.45)
    image = Image.new("RGB", SIZE, deep)
    draw = ImageDraw.Draw(image)
    _gradient(draw, deep, darker)
    _clock_motif(draw, colors.mix(deep, (255, 255, 255), 0.16))

    margin = 80
    mark_size = 76
    mark = _load_mark(values.get("mark"), mark_size)
    name_x = margin
    if mark is not None:
        tile = Image.new("RGBA", (mark_size + 16, mark_size + 16), (255, 255, 255, 255))
        mask = Image.new("L", tile.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, *tile.size), radius=22, fill=255)
        tile.alpha_composite(mark, (8, 8))
        image.paste(tile, (margin, margin), mask)
        name_x = margin + mark_size + 16 + 24
    _draw_runs(draw, (name_x, margin + 22), values.get("product_name") or "", 40, "#ffffff", bold=True)

    _draw_runs(draw, (margin, 232), eyebrow.upper(), 26, colors.to_hex(colors.mix(deep, (255, 255, 255), 0.72)), bold=True)
    size, lines = _fit_title(title, 680, 3)
    y = 280
    for line in lines:
        _draw_runs(draw, (margin, y), line, size, "#ffffff", bold=True)
        y += int(size * 1.22)
    _draw_runs(draw, (margin, SIZE[1] - margin - 30), footer, 30, colors.to_hex(colors.mix(deep, (255, 255, 255), 0.8)))
    return image


def _gradient(draw, top: tuple, bottom: tuple):
    width, height = SIZE
    for y in range(height):
        draw.line([(0, y), (width, y)], fill=colors.mix(top, bottom, y / height))


def _clock_motif(draw, color: tuple):
    """A large clock dial at the right edge: the shared idea of the time tools."""

    cx, cy, radius = 1080, 315, 300
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), outline=color, width=6)
    draw.ellipse((cx - radius + 40, cy - radius + 40, cx + radius - 40, cy + radius - 40), outline=color, width=2)
    import math

    for tick in range(12):
        angle = math.radians(tick * 30)
        inner, outer = radius - 70, radius - 46
        draw.line(
            [
                (cx + inner * math.sin(angle), cy - inner * math.cos(angle)),
                (cx + outer * math.sin(angle), cy - outer * math.cos(angle)),
            ],
            fill=color,
            width=8 if tick % 3 == 0 else 4,
        )


def _fonts_dir() -> str:
    return os.path.join(frappe.get_app_path("appointment"), "public", "fonts")


_FONTS: dict = {}


def _font(ethiopic: bool, size: int, bold: bool):
    from PIL import ImageFont

    # Font objects are read-only once loaded, so one process-wide cache is safe.
    cache = _FONTS
    key = (ethiopic, size, bold)
    if key not in cache:
        name = "app/noto-sans-ethiopic.woff2" if ethiopic else "app/inter.woff2"
        font = ImageFont.truetype(os.path.join(_fonts_dir(), name), size)
        try:
            font.set_variation_by_axes([700 if bold else 450])
        except Exception:
            pass
        cache[key] = font
    return cache[key]


def _is_ethiopic(char: str) -> bool:
    code = ord(char)
    return any(start <= code <= end for start, end in ETHIOPIC_RANGES)


def _runs(text: str):
    """Split text into (is_ethiopic, chunk) runs; spaces stay with the run before them."""

    runs: list[list] = []
    for char in text:
        ethiopic = _is_ethiopic(char) if not char.isspace() else (runs[-1][0] if runs else False)
        if runs and runs[-1][0] == ethiopic:
            runs[-1][1] += char
        else:
            runs.append([ethiopic, char])
    return runs


def _width(text: str, size: int, bold: bool = True) -> float:
    return sum(_font(eth, size, bold).getlength(chunk) for eth, chunk in _runs(text))


def _draw_runs(draw, xy: tuple, text: str, size: int, fill, bold: bool = False):
    x, y = xy
    for ethiopic, chunk in _runs(text):
        font = _font(ethiopic, size, bold)
        # Both fonts share the baseline: anchor "ls" puts the left baseline at y + size.
        draw.text((x, y + size), chunk, font=font, fill=fill, anchor="ls")
        x += font.getlength(chunk)


def _fit_title(title: str, max_width: int, max_lines: int) -> tuple[int, list[str]]:
    for size in (76, 70, 64, 58, 52, 46):
        lines = _wrap(title, size, max_width)
        if len(lines) <= max_lines:
            return size, lines
    return 46, _wrap(title, 46, max_width)[:max_lines]


def _wrap(text: str, size: int, max_width: int) -> list[str]:
    lines, current = [], ""
    for word in text.split():
        candidate = f"{current} {word}".strip()
        if current and _width(candidate, size) > max_width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def _load_mark(mark: str | None, size: int):
    """The brand mark as an RGBA image, read from app assets or public site files only."""

    from PIL import Image

    path = _local_path(mark or "")
    if not path:
        return None
    try:
        with Image.open(path) as source:
            mark_image = source.convert("RGBA")
        mark_image.thumbnail((size, size))
        canvas = Image.new("RGBA", (size, size), (255, 255, 255, 0))
        canvas.alpha_composite(mark_image, ((size - mark_image.width) // 2, (size - mark_image.height) // 2))
        return canvas
    except Exception:
        return None


def _local_path(url: str) -> str | None:
    url = url.split("?", 1)[0]
    if url.startswith("/assets/"):
        app, _, rest = url[len("/assets/") :].partition("/")
        if app not in frappe.get_installed_apps():
            return None
        root = os.path.join(frappe.get_app_path(app), "public")
    elif url.startswith("/files/"):
        root, rest = frappe.get_site_path("public", "files"), url[len("/files/") :]
    else:
        return None
    path = os.path.realpath(os.path.join(root, rest))
    if not path.startswith(os.path.realpath(root) + os.sep) or not os.path.isfile(path):
        return None
    return path


def _remove_stale(folder: str, prefix: str, keep: str):
    for name in os.listdir(folder):
        if name.startswith(prefix) and name != keep and name.endswith(".png"):
            try:
                os.remove(os.path.join(folder, name))
            except OSError:
                pass
