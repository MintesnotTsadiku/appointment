"""Validated source of truth for shipped showcase design assignments."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

CONTRACT = "appointment-showcase-catalog.v1"
CATALOG_PATH = Path(__file__).parent / "manifest" / "showcase" / "catalog.v1.json"
APP_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = APP_ROOT.parent


def load_showcase_catalog() -> dict[str, Any]:
    data = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    if data.get("contract") != CONTRACT or data.get("version") != 1:
        raise ValueError("Unsupported showcase catalog")
    sites = data.get("sites")
    if not isinstance(sites, dict) or not sites:
        raise ValueError("Showcase catalog must contain sites")
    return data


def recipe_assignments() -> dict[str, dict[str, str]]:
    assignments = {}
    for key, site in load_showcase_catalog()["sites"].items():
        assignments[key] = {
            "recipe": site["recipe"],
            "hero": site["heroRole"],
            "detail": site["detailRole"],
            "logo": site["logoAsset"],
            "favicon": site["faviconAsset"],
            "density": "spacious" if key in {"bloom", "abugida"} else "comfortable",
        }
    return assignments


def recipe_showcases() -> dict[str, dict[str, str]]:
    """Platform-owned example per recipe for the design gallery (never tenant data)."""
    showcases = {}
    for site in load_showcase_catalog()["sites"].values():
        showcases.setdefault(site["recipe"], {"slug": site["slug"], "heroAsset": site["heroAsset"], "logoAsset": site["logoAsset"]})
    return showcases


def validate_showcase_catalog() -> dict[str, Any]:
    catalog = load_showcase_catalog()
    seen_slugs: set[str] = set()
    for key, site in catalog["sites"].items():
        _require_text(site, key, "slug", "recipe", "heroRole", "detailRole", "heroAsset", "heroChecksum", "logoAsset", "logoChecksum", "faviconAsset", "faviconChecksum", "benchmark")
        if site["slug"] in seen_slugs:
            raise ValueError(f"Duplicate showcase slug: {site['slug']}")
        seen_slugs.add(site["slug"])
        asset = _asset_path(site["heroAsset"])
        _verify_checksum(asset, site["heroChecksum"])
        _verify_checksum(_asset_path(site["logoAsset"]), site["logoChecksum"])
        _verify_checksum(_asset_path(site["faviconAsset"]), site["faviconChecksum"])
        _validate_previews(key, site.get("previewAssets"))
        support_assets = site.get("supportAssets")
        if not isinstance(support_assets, list) or len(support_assets) != 3:
            raise ValueError(f"Showcase site {key} requires three support assets")
        for support in support_assets:
            if not isinstance(support, dict):
                raise ValueError(f"Invalid support asset for {key}")
            _require_text(support, key, "asset", "checksum")
            _verify_checksum(_asset_path(support["asset"]), support["checksum"])
        provider_assets = site.get("providerAssets")
        if not isinstance(provider_assets, list) or not provider_assets:
            raise ValueError(f"Showcase site {key} requires provider assets")
        for provider in provider_assets:
            if not isinstance(provider, dict):
                raise ValueError(f"Invalid provider asset for {key}")
            _require_text(provider, key, "name", "asset", "checksum")
            _verify_checksum(_asset_path(provider["asset"]), provider["checksum"])
            # Optional: the AVIF file and the 96 and 192 px avatar files of the portrait.
            variants = provider.get("variants", [])
            if not isinstance(variants, list):
                raise ValueError(f"Invalid portrait variants for {key}")
            for variant in variants:
                if not isinstance(variant, dict):
                    raise ValueError(f"Invalid portrait variant for {key}")
                _require_text(variant, key, "asset", "checksum")
                _verify_checksum(_asset_path(variant["asset"]), variant["checksum"])
        # Optional: every file of a template package's imagery (desktop, mobile, night, widths, AVIF).
        template_assets = site.get("templateAssets", [])
        if not isinstance(template_assets, list):
            raise ValueError(f"Invalid template assets for {key}")
        for entry in template_assets:
            if not isinstance(entry, dict):
                raise ValueError(f"Invalid template asset for {key}")
            _require_text(entry, key, "asset", "checksum")
            _verify_checksum(_asset_path(entry["asset"]), entry["checksum"])
        benchmark = REPO_ROOT / site["benchmark"]
        if not benchmark.is_file():
            raise ValueError(f"Missing benchmark for {key}: {site['benchmark']}")
    return catalog


#: The template gallery shows every template at these sizes.
PREVIEW_VIEWPORTS = ("desktop", "mobile")


def _validate_previews(key: str, previews: Any) -> None:
    """Gallery screenshots (scripts/capture_template_gallery.py): one per viewport, checksummed."""
    if not isinstance(previews, list) or sorted(row.get("viewport") for row in previews if isinstance(row, dict)) != sorted(PREVIEW_VIEWPORTS):
        raise ValueError(f"Showcase site {key} requires desktop and mobile preview assets")
    for preview in previews:
        _require_text(preview, key, "viewport", "asset", "checksum")
        _verify_checksum(_asset_path(preview["asset"]), preview["checksum"])


def _require_text(site: dict[str, Any], key: str, *fields: str) -> None:
    missing = [field for field in fields if not isinstance(site.get(field), str) or not site[field].strip()]
    if missing:
        raise ValueError(f"Invalid showcase site {key}: {', '.join(missing)}")


def _asset_path(public_url: str) -> Path:
    prefix = "/assets/appointment/"
    if not public_url.startswith(prefix) or ".." in public_url:
        raise ValueError(f"Unsafe showcase asset path: {public_url}")
    return APP_ROOT / "public" / public_url.removeprefix(prefix)


def _verify_checksum(path: Path, expected: str) -> None:
    if not path.is_file():
        raise ValueError(f"Missing showcase asset: {path}")
    actual = hashlib.sha256(path.read_bytes()).hexdigest()
    if actual != expected:
        raise ValueError(f"Showcase asset checksum mismatch: {path.name}")
