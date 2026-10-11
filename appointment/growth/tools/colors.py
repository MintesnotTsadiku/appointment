"""Readable accent colours derived from the platform brand colour."""

from __future__ import annotations

import re

FALLBACK = "#7a2e4f"
_HEX = re.compile(r"^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$")


def parse(value: str | None) -> tuple[int, int, int]:
    match = _HEX.match((value or "").strip())
    digits = match.group(1) if match else FALLBACK[1:]
    if len(digits) == 3:
        digits = "".join(ch * 2 for ch in digits)
    return tuple(int(digits[i : i + 2], 16) for i in (0, 2, 4))


def to_hex(rgb: tuple[int, int, int]) -> str:
    return "#" + "".join(f"{max(0, min(255, round(c))):02x}" for c in rgb)


def luminance(rgb: tuple[int, int, int]) -> float:
    def channel(c: float) -> float:
        c = c / 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = (channel(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    la, lb = sorted((luminance(a), luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def mix(a: tuple[int, int, int], b: tuple[int, int, int], amount: float) -> tuple[int, int, int]:
    """`amount` of `b` mixed into `a`."""

    return tuple(round(x + (y - x) * amount) for x, y in zip(a, b))


def readable_on(color: tuple[int, int, int], background: tuple[int, int, int], minimum: float = 4.5):
    """`color` moved toward black or white until it reaches `minimum` contrast on `background`."""

    target = (0, 0, 0) if luminance(background) > 0.4 else (255, 255, 255)
    step = 0.0
    result = color
    while contrast(result, background) < minimum and step < 1:
        step += 0.05
        result = mix(color, target, step)
    return result


def palette(brand_color: str | None) -> dict[str, str]:
    """Accent colours for the light and dark page themes and for the share image."""

    brand = parse(brand_color)
    light_bg, dark_bg, white = (255, 250, 245), (20, 20, 28), (255, 255, 255)
    accent = readable_on(brand, light_bg)
    accent_dark = readable_on(brand, dark_bg)
    deep = readable_on(brand, white, 7.0)  # share-image background with white text
    return {
        "brand": to_hex(brand),
        "accent": to_hex(accent),
        "accent_ink": "#ffffff" if contrast(accent, white) >= 4.5 else "#111111",
        "accent_dark": to_hex(accent_dark),
        "accent_dark_ink": "#111111" if contrast(accent_dark, (17, 17, 17)) >= 4.5 else "#ffffff",
        "deep": to_hex(deep),
    }
