"""Build "Tena Figures": the digits of Atkinson Hyperlegible Next with an open (unslashed) zero.

Tena v3 sets prices, durations, times and proof numbers in large type. Atkinson Hyperlegible Next has
only a slashed zero, so "ETB 700" read as "ETB 7ø0". This script takes the bundled variable font,
makes static instances, replaces the two inner counters of the zero (split by the slash) with one
counter, keeps only the ten digits, and renames the family. The Tena v3 stylesheet puts this face in
front of the body face with `unicode-range: U+0030-0039`, so every other character is unchanged.

Usage: python3 scripts/build_tena_figures.py
The source and the output are both in appointment/public/fonts/tena/ (SIL Open Font License 1.1).
"""

from __future__ import annotations

import io
from pathlib import Path

from fontTools import subset
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

FONTS = Path(__file__).resolve().parents[1] / "appointment" / "public" / "fonts" / "tena"
SOURCE = FONTS / "atkinson-hyperlegible-next.woff2"
FAMILY = "Tena Figures"
WEIGHTS = (400, 700)
DIGITS = [ord(str(value)) for value in range(10)]


def _contours(glyph, glyf):
    coords, ends, flags = glyph.getCoordinates(glyf)
    start = 0
    out = []
    for end in ends:
        out.append(([tuple(point) for point in coords[start:end + 1]], [flag & 1 for flag in flags[start:end + 1]]))
        start = end + 1
    return out


def _draw(pen, points, on_curve):
    """Draw one TrueType contour (on-curve and quadratic off-curve points) on a pen."""
    count = len(points)
    first = next(index for index, flag in enumerate(on_curve) if flag)
    order = [(first + step) % count for step in range(count)]
    pen.moveTo(points[order[0]])
    pending = []
    for index in order[1:]:
        if on_curve[index]:
            if pending:
                pen.qCurveTo(*pending, points[index])
                pending = []
            else:
                pen.lineTo(points[index])
        else:
            pending.append(points[index])
    if pending:
        pen.qCurveTo(*pending, points[order[0]])
    pen.closePath()


def open_zero(font: TTFont) -> None:
    """Replace the slashed zero's two inner counters with one counter that follows the outer outline."""
    glyf = font["glyf"]
    contours = _contours(glyf["zero"], glyf)
    if len(contours) != 3:
        raise ValueError(f"Unexpected zero outline: {len(contours)} contours")
    outer, first, second = contours
    xs = [x for x, _ in outer[0]]
    ys = [y for _, y in outer[0]]
    inner_xs = [x for x, _ in first[0] + second[0]]
    inner_ys = [y for _, y in first[0] + second[0]]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    sx = (max(inner_xs) - min(inner_xs)) / (max(xs) - min(xs))
    sy = (max(inner_ys) - min(inner_ys)) / (max(ys) - min(ys))
    icx, icy = (min(inner_xs) + max(inner_xs)) / 2, (min(inner_ys) + max(inner_ys)) / 2
    counter = [(round(icx + (x - cx) * sx), round(icy + (y - cy) * sy)) for x, y in outer[0]]
    pen = TTGlyphPen(None)
    _draw(pen, outer[0], outer[1])
    # The counter runs the other way round, so it cuts a hole.
    _draw(pen, list(reversed(counter)), list(reversed(outer[1])))
    glyph = pen.glyph()
    glyph.recalcBounds(glyf)
    glyf["zero"] = glyph


def rename(font: TTFont, weight: int) -> None:
    style = "Bold" if weight >= 700 else "Regular"
    for record in list(font["name"].names):
        if record.nameID in (1, 4, 16):
            record.string = FAMILY if record.nameID in (1, 16) else f"{FAMILY} {style}"
        elif record.nameID == 6:
            record.string = f"TenaFigures-{style}"
        elif record.nameID == 3:
            record.string = f"{FAMILY} {style} (from Atkinson Hyperlegible Next)"


def build(weight: int) -> Path:
    font = TTFont(SOURCE)
    static = instancer.instantiateVariableFont(font, {"wght": weight})
    open_zero(static)
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["tnum", "pnum"]
    options.name_IDs = ["*"]
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=DIGITS)
    subsetter.subset(static)
    rename(static, weight)
    static.flavor = "woff2"
    out = FONTS / f"tena-figures-{weight}.woff2"
    buffer = io.BytesIO()
    static.save(buffer)
    out.write_bytes(buffer.getvalue())
    return out


if __name__ == "__main__":
    for value in WEIGHTS:
        path = build(value)
        print(path.relative_to(FONTS.parents[2]), path.stat().st_size, "bytes")
