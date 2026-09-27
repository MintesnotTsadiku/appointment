"""Allowlisted UI configuration projected from one immutable release."""

from __future__ import annotations

import json
from dataclasses import dataclass
from types import MappingProxyType

import frappe

from appointment.public_experience.canonical import hash_document
from appointment.public_experience.errors import PublicResolutionError
from appointment.public_experience.resolver import PUBLIC_EXPERIENCE_CONTRACT, public_snapshot


PUBLIC_UI_CONFIG_CONTRACT = "appointment-public-ui.v2"


def _json(raw: object) -> dict:
    if isinstance(raw, dict):
        return dict(raw)
    try:
        value = json.loads(raw or "")
    except (TypeError, ValueError):
        return {}
    return dict(value) if isinstance(value, dict) else {}


@dataclass(frozen=True)
class PublicUIConfig:
    contract: str
    source: str
    release_hash: str
    locale: str
    supported_locales: tuple[str, ...]
    recipe_key: str
    recipe_version: int
    compiled_design: dict
    identity: dict
    booking: dict
    cache: dict
    limitations: tuple[str, ...]

    def as_dict(self) -> dict:
        return {
            "contract": self.contract,
            "experienceContract": PUBLIC_EXPERIENCE_CONTRACT,
            "source": self.source,
            "releaseHash": self.release_hash,
            "locale": self.locale,
            "supportedLocales": list(self.supported_locales),
            "recipeKey": self.recipe_key,
            "recipeVersion": self.recipe_version,
            "compiledDesign": self.compiled_design,
            "identity": self.identity,
            "booking": self.booking,
            "cache": self.cache,
            "limitations": list(self.limitations),
        }


def config_from_resolved(context) -> PublicUIConfig:
    snapshot = public_snapshot(context.release)
    design = snapshot.get("compiledDesign") or {}
    if not context.release_hash or not design or design.get("contentHash") is None:
        raise PublicResolutionError("the active release has no compiled design", details={"reason": "design_missing"})
    identity = design.get("identity") or {}
    canonical = {
        "contract": PUBLIC_UI_CONFIG_CONTRACT,
        "experienceContract": PUBLIC_EXPERIENCE_CONTRACT,
        "release": context.release,
        "releaseHash": context.release_hash,
        "locale": context.locale,
        "recipeKey": context.recipe_key,
        "recipeVersion": context.recipe_version,
        "compiledDesignHash": design.get("contentHash"),
        "identity": identity,
    }
    return PublicUIConfig(
        contract=PUBLIC_UI_CONFIG_CONTRACT,
        source="experience-release",
        release_hash=context.release_hash,
        locale=context.locale,
        supported_locales=context.available_locales,
        recipe_key=context.recipe_key,
        recipe_version=context.recipe_version,
        compiled_design=design,
        identity=identity,
        booking=_json(snapshot.get("booking")),
        cache={"public": True, "etag": hash_document(canonical), "revalidateSeconds": 300},
        limitations=("booking-adapter:existing-scheduler",),
    )
