"""Draw the logo and favicon marks for the New themes v1 showcase businesses.

Each mark is the first fidel of the business name, set in the template's own
OFL Ethiopic face on the template's primary color. Usage:

    python3 scripts/build_showcase_marks.py <font-source-dir>

The source dir holds the upstream google/fonts files named as in build_public_fonts.py.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1] / "appointment" / "public" / "brand-experience" / "brands"

# key, glyph, font file, weight, ground, ink, dot color, shape
MARKS = [
]


def draw(size: int, glyph: str, font_path: Path, weight: int, ground: str, ink: str, dot: str, shape: str) -> Image.Image:
    scale = 4
    canvas = size * scale
    image = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    pen = ImageDraw.Draw(image)
    if shape == "round":
        pen.ellipse((0, 0, canvas - 1, canvas - 1), fill=ground)
    else:
        pen.rounded_rectangle((0, 0, canvas - 1, canvas - 1), radius=canvas // 64, fill=ground)
    font = ImageFont.truetype(str(font_path), int(canvas * 0.58))
    # Axis order differs per file, so set each axis by its name.
    font.set_variation_by_axes([weight if axis["name"] in (b"Weight", "Weight") else axis["default"] for axis in font.get_variation_axes()])
    box = pen.textbbox((0, 0), glyph, font=font)
    x = (canvas - (box[2] - box[0])) / 2 - box[0]
    y = (canvas - (box[3] - box[1])) / 2 - box[1]
    pen.text((x, y), glyph, font=font, fill=ink)
    # The accent mark: the recording lamp in a corner, or a float on the waterline.
    d = canvas * 0.11
    cx, cy = (canvas * 0.80, canvas * 0.20) if shape == "square" else (canvas * 0.80, canvas * 0.80)
    if shape == "square":
        pen.rounded_rectangle((cx - d / 2, cy - d / 2, cx + d / 2, cy + d / 2), radius=canvas // 128, fill=dot)
    else:
        pen.ellipse((cx - d / 2, cy - d / 2, cx + d / 2, cy + d / 2), fill=dot)
    return image.resize((size, size), Image.LANCZOS)


def main(source_dir: str) -> None:
    for key, glyph, font_file, weight, ground, ink, dot, shape in MARKS:
        font_path = Path(source_dir) / font_file
        draw(512, glyph, font_path, weight, ground, ink, dot, shape).save(OUT / f"{key}-logo.webp", "WEBP", quality=92, method=6)
        draw(64, glyph, font_path, weight, ground, ink, dot, shape).save(OUT / f"{key}-favicon.png", "PNG", optimize=True)
        print(key, "logo and favicon written")


if __name__ == "__main__":
    main(sys.argv[1])
