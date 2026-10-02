"""Subset the OFL font files that the app and the public template packages bundle.

The public CSP is `default-src 'self'`, so template fonts ship as local woff2
files under `appointment/public/fonts/<template>/`. Sources are the upstream
files in github.com/google/fonts (all SIL Open Font License 1.1); each output
folder keeps the OFL text next to the fonts.

Usage (source files downloaded beforehand, see FONTS below for the URLs):

    python3 scripts/build_public_fonts.py <source-dir> [template]
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "appointment" / "public" / "fonts"
UPSTREAM = "https://raw.githubusercontent.com/google/fonts/main/ofl/"

# Basic Latin, Latin-1, Latin Extended-A, general punctuation, currency and the
# arrows/marks templates use. Ethiopic, Ethiopic Supplement and Extended ranges.
LATIN = "U+0000-00FF,U+0100-017F,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2190-2193,U+2212,U+2215"
ETHIOPIC = "U+1200-139F,U+2D80-2DDF,U+AB00-AB2F,U+0020,U+00A0,U+2010-2027"
# Amharic syllables and punctuation only, for faces whose full Ethiopic set is very large.
AMHARIC = "U+1200-137F,U+0020,U+00A0,U+2010-2027"

# template, output name, upstream path, unicode ranges, axis pins (None keeps the axis)
FONTS = [
    ("tena", "atkinson-hyperlegible-next", "atkinsonhyperlegiblenext/AtkinsonHyperlegibleNext[wght].ttf", LATIN, {}),
    ("tena", "noto-sans-ethiopic", "notosansethiopic/NotoSansEthiopic[wdth,wght].ttf", ETHIOPIC, {"wdth": 100}),
    ("selam", "figtree", "figtree/Figtree[wght].ttf", LATIN, {}),
    # Two static weights are smaller than Menbere's variable masters (246 KiB against 372 KiB).
    ("selam", "menbere-regular", "menbere/Menbere[wght].ttf", AMHARIC, {"wght": 400}),
    ("selam", "menbere-bold", "menbere/Menbere[wght].ttf", AMHARIC, {"wght": 700}),
    ("bloom", "anton", "anton/Anton-Regular.ttf", LATIN, {}),
    ("bloom", "karla", "karla/Karla[wght].ttf", LATIN, {}),
    ("bloom", "noto-sans-ethiopic-condensed", "notosansethiopic/NotoSansEthiopic[wdth,wght].ttf", ETHIOPIC, {"wdth": 62.5}),
    ("bloom", "noto-sans-ethiopic", "notosansethiopic/NotoSansEthiopic[wdth,wght].ttf", ETHIOPIC, {"wdth": 100}),
    ("meron", "eb-garamond", "ebgaramond/EBGaramond[wght].ttf", LATIN, {}),
    ("meron", "noto-serif-ethiopic", "notoserifethiopic/NotoSerifEthiopic[wdth,wght].ttf", ETHIOPIC, {"wdth": 100}),
    ("abugida", "alegreya", "alegreya/Alegreya[wght].ttf", LATIN, {}),
    ("abugida", "abyssinica-sil", "abyssinicasil/AbyssinicaSIL-Regular.ttf", ETHIOPIC, {}),
    # Archivo at width 125 is the display face; width 100 is the text face. Weight ranges keep only what the template sets.
    # The platform landing page ("A Day, Coordinated"): display serif, clock mono, Ethiopic serif partner.
    ("landing", "fraunces", "fraunces/Fraunces[SOFT,WONK,opsz,wght].ttf", LATIN, {"SOFT": 0, "WONK": 0, "wght": (300, 700)}),
    ("landing", "fraunces-italic", "fraunces/Fraunces-Italic[SOFT,WONK,opsz,wght].ttf", LATIN, {"SOFT": 0, "WONK": 0, "wght": (300, 700)}),
    ("landing", "jetbrains-mono", "jetbrainsmono/JetBrainsMono[wght].ttf", LATIN, {"wght": (400, 600)}),
    ("landing", "noto-serif-ethiopic", "notoserifethiopic/NotoSerifEthiopic[wdth,wght].ttf", ETHIOPIC, {"wdth": 100, "wght": (400, 600)}),
    # The signed-in app and the platform chrome. Served locally so no page calls a font CDN.
    ("app", "inter", "inter/Inter[opsz,wght].ttf", LATIN, {"opsz": 14}),
    ("app", "plus-jakarta-sans", "plusjakartasans/PlusJakartaSans[wght].ttf", LATIN, {}),
    ("app", "noto-sans-ethiopic", "notosansethiopic/NotoSansEthiopic[wdth,wght].ttf", ETHIOPIC, {"wdth": 100}),
]


def build(source_dir: Path, template: str, name: str, upstream: str, unicodes: str, pins: dict) -> Path:
    font = TTFont(source_dir / upstream.replace("/", "__"), lazy=False)
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.notdef_outline = True
    # Browsers render these faces unhinted at text sizes; hinting doubles some files.
    options.hinting = False
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=subset.parse_unicodes(unicodes))
    subsetter.subset(font)
    if pins:
        # Pin axes after subsetting; instancing first leaves lazy glyph variations behind.
        font = instancer.instantiateVariableFont(font, pins)
    target = OUT / template / f"{name}.woff2"
    target.parent.mkdir(parents=True, exist_ok=True)
    font.flavor = "woff2"
    font.save(target)
    license_source = source_dir / (upstream.split("/")[0] + "__OFL.txt")
    shutil.copyfile(license_source, target.parent / f"{name}.OFL.txt")
    return target


def main(source_dir: str, only: str | None = None) -> None:
    for template, name, upstream, unicodes, pins in FONTS:
        if only and template != only:
            continue
        target = build(Path(source_dir), template, name, upstream, unicodes, pins)
        print(f"{target.relative_to(ROOT)} {target.stat().st_size // 1024} KiB  from {UPSTREAM}{upstream}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
