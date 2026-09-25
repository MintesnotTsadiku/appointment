"""Pure sRGB color helpers.

Only ``#rrggbb`` values are accepted. Named colors, ``rgb()``/``hsl()``,
gradients, CSS functions, ``url(...)`` and any other constructurable style
payload are rejected by :func:`is_valid_hex` before they can reach a renderer.
"""

from __future__ import annotations

import re

_HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}$")


def is_valid_hex(value: object) -> bool:
    """Return True only for an exact six-digit hexadecimal color."""

    return isinstance(value, str) and _HEX_RE.match(value) is not None


def parse_hex(value: str) -> tuple[int, int, int]:
    """Parse ``#rrggbb`` into an ``(r, g, b)`` integer tuple.

    Raises ``ValueError`` for anything :func:`is_valid_hex` rejects.
    """

    if not is_valid_hex(value):
        raise ValueError(f"not a hex color: {value!r}")
    return (int(value[1:3], 16), int(value[3:5], 16), int(value[5:7], 16))


def normalize_hex(value: str) -> str:
    """Return a lowercase ``#rrggbb`` string, validating the input."""

    return "#" + value[1:].lower()


def _linearize(channel: int) -> float:
    c = channel / 255.0
    if c <= 0.04045:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4


def relative_luminance(color: str) -> float:
    """WCAG 2.x relative luminance of an sRGB hex color."""

    r, g, b = parse_hex(color)
    return 0.2126 * _linearize(r) + 0.7152 * _linearize(g) + 0.0722 * _linearize(b)


def contrast_ratio(foreground: str, background: str) -> float:
    """WCAG contrast ratio between two sRGB hex colors (1.0 .. 21.0)."""

    lighter, darker = sorted((relative_luminance(foreground), relative_luminance(background)), reverse=True)
    return (lighter + 0.05) / (darker + 0.05)


def color_distance(left: str, right: str) -> float:
    """Normalized Euclidean distance in sRGB space (0.0 .. 1.0)."""

    lr, lg, lb = parse_hex(left)
    rr, rg, rb = parse_hex(right)
    return (((lr - rr) ** 2 + (lg - rg) ** 2 + (lb - rb) ** 2) ** 0.5) / (255.0 * (3**0.5))
