"""Capture the template gallery preview images from the live showcase sites.

For every showcase in `appointment/public_experience/manifest/showcase/catalog.v1.json`
this opens the published site at desktop (1440x900) and mobile (390x844) sizes in
light mode and writes optimised WebP files to
`appointment/public/brand-experience/template-gallery/<recipe>-desktop.webp` and
`<recipe>-mobile.webp`. It then records each file and its SHA-256 checksum as the
site's `previewAssets` in the catalog, which the template gallery reads.

Run it with the bench Python, which has Playwright and Pillow:

    env/bin/python apps/appointment/scripts/capture_template_gallery.py http://localhost:47800
"""

from __future__ import annotations

import hashlib
import io
import json
import sys
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

APP = Path(__file__).resolve().parents[1] / "appointment"
CATALOG = APP / "public_experience" / "manifest" / "showcase" / "catalog.v1.json"
OUTPUT = APP / "public" / "brand-experience" / "template-gallery"

#: name -> (viewport width, viewport height, device scale, stored width)
SIZES = {
    "desktop": (1440, 900, 1, 1280),
    "mobile": (390, 844, 2, 420),
}


def showcases() -> dict[str, str]:
    """The first showcase slug per recipe, in catalog order."""
    result: dict[str, str] = {}
    for site in json.loads(CATALOG.read_text(encoding="utf-8"))["sites"].values():
        result.setdefault(site["recipe"], site["slug"])
    return result


def capture(base_url: str) -> dict[str, list[dict[str, str]]]:
    """Write the images and return the `previewAssets` rows per recipe."""
    OUTPUT.mkdir(parents=True, exist_ok=True)
    written: dict[str, list[dict[str, str]]] = {}
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        for recipe, slug in showcases().items():
            for name, (width, height, scale, stored) in SIZES.items():
                page = browser.new_page(
                    viewport={"width": width, "height": height},
                    device_scale_factor=scale,
                    color_scheme="light",
                    reduced_motion="reduce",
                )
                # A fixed afternoon in Addis Ababa, so time-of-day templates show their day photos (development server only).
                page.goto(f"{base_url.rstrip('/')}/{slug}?preview-time=16:30", wait_until="networkidle")
                page.evaluate("document.fonts.ready")
                page.wait_for_timeout(1200)
                image = Image.open(io.BytesIO(page.screenshot(full_page=False))).convert("RGB")
                page.close()
                image = image.resize((stored, round(image.height * stored / image.width)), Image.LANCZOS)
                target = OUTPUT / f"{recipe}-{name}.webp"
                image.save(target, "WEBP", quality=80, method=6)
                written.setdefault(recipe, []).append({
                    "viewport": name,
                    "asset": "/assets/appointment/" + target.relative_to(APP / "public").as_posix(),
                    "checksum": hashlib.sha256(target.read_bytes()).hexdigest(),
                })
        browser.close()
    return written


def record(previews: dict[str, list[dict[str, str]]]) -> None:
    """Store the rows on every catalog site of the captured recipe."""
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    for site in catalog["sites"].values():
        if site["recipe"] in previews:
            site["previewAssets"] = previews[site["recipe"]]
    CATALOG.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    captured = capture(sys.argv[1] if len(sys.argv) > 1 else "http://localhost:47800")
    record(captured)
    for rows in captured.values():
        for row in rows:
            print(row["asset"], row["checksum"][:12])
