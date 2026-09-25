"""Pure, code-owned registry for curated Brand Recipes v1.

The registry deliberately keeps palettes, typography, imagery, layout and surface
definitions separate. Providers never select those primitives independently;
recipes pin an exact compatible set and the compiler is the only composition
seam.
"""

from __future__ import annotations

import json
from collections.abc import Mapping
from dataclasses import dataclass
from functools import lru_cache
from importlib.resources import files

from appointment.public_experience.canonical import canonicalize, hash_document
from appointment.public_experience.errors import DesignManifestError, UnknownRecipeError

RECIPE_CONTRACT = "appointment-curated-recipe.v1"
COMPILED_DESIGN_CONTRACT = "appointment-compiled-design.v1"
COMPILER_POLICY_VERSION = "curated-brand-policy.v1"
RECIPE_MANIFESTS = {
    "selam-movement": "public_experience/manifest/design/recipes/selam-movement.v1.json",
    "bloom-hair": "public_experience/manifest/design/recipes/bloom-hair.v1.json",
    "meron-atelier": "public_experience/manifest/design/recipes/meron-atelier.v1.json",
    "abugida-language": "public_experience/manifest/design/recipes/abugida-language.v1.json",
    "tena-clinic": "public_experience/manifest/design/recipes/tena-clinic.v1.json",
}
PRIMITIVE_MANIFESTS = {
    "palette": "public_experience/manifest/design/palettes/{key}.v{version}.json",
    "typography": "public_experience/manifest/design/typography/{key}.v{version}.json",
    "imagery": "public_experience/manifest/design/imagery/{key}.v{version}.json",
    "layout": "public_experience/manifest/design/layouts/{key}.v{version}.json",
    "surface": "public_experience/manifest/design/surfaces/{key}.v{version}.json",
}

_RECIPE_KEYS = frozenset(
    {
        "kind",
        "contract",
        "key",
        "version",
        "label",
        "description",
        "audience",
        "mood",
        "supportedLocales",
        "accessibility",
        "primitives",
        "supportedSections",
        "requiredSections",
        "defaultInputs",
        "adjustments",
        "actionIntents",
        "contentRichness",
    }
)


@dataclass(frozen=True)
class ManifestRef:
    kind: str
    key: str
    version: int
    content_hash: str

    def as_dict(self) -> dict[str, object]:
        return {"kind": self.kind, "key": self.key, "version": self.version, "hash": self.content_hash}


@dataclass(frozen=True)
class RecipeDefinition:
    key: str
    version: int
    label: str
    description: str
    audience: str
    mood: str
    supported_locales: tuple[str, ...]
    supported_sections: tuple[str, ...]
    required_sections: tuple[str, ...]
    primitives: Mapping[str, ManifestRef]
    default_inputs: Mapping[str, object]
    adjustments: Mapping[str, Mapping[str, object]]
    action_intents: tuple[str, ...]
    content_richness: Mapping[str, object]
    accessibility: Mapping[str, object]
    document: Mapping[str, object]
    content_hash: str

    def as_summary(self) -> dict[str, object]:
        return {
            "key": self.key,
            "version": self.version,
            "label": self.label,
            "description": self.description,
            "audience": self.audience,
            "mood": self.mood,
            "supportedLocales": list(self.supported_locales),
            "supportedSections": list(self.supported_sections),
            "requiredSections": list(self.required_sections),
            "adjustments": {
                key: {
                    name: value
                    for name, value in definition.items()
                    if name in {"type", "choices", "optional"}
                }
                for key, definition in self.adjustments.items()
            },
            "accessibility": dict(self.accessibility),
        }


def _read(relative_path: str) -> dict[str, object]:
    try:
        text = files("appointment").joinpath(relative_path).read_text(encoding="utf-8")
    except (FileNotFoundError, ModuleNotFoundError, OSError) as exc:
        raise DesignManifestError(
            f"design manifest is missing: {relative_path}",
            details={"resource": relative_path},
        ) from exc
    try:
        document = json.loads(text)
    except json.JSONDecodeError as exc:
        raise DesignManifestError(
            f"design manifest is not valid JSON: {relative_path}",
            details={"resource": relative_path},
        ) from exc
    if not isinstance(document, dict):
        raise DesignManifestError(f"design manifest must be an object: {relative_path}")
    return document


def _strict(document: Mapping[str, object], allowed: set[str], source: str) -> None:
    unknown = sorted(set(document) - allowed)
    if unknown:
        raise DesignManifestError(
            f"design manifest contains unknown keys: {source}",
            details={"resource": source, "unknown": unknown},
        )


def _required_string(document: Mapping[str, object], key: str, source: str) -> str:
    value = document.get(key)
    if not isinstance(value, str) or not value.strip():
        raise DesignManifestError(f"{source} requires a non-empty string '{key}'")
    return value.strip()


def _required_version(document: Mapping[str, object], source: str) -> int:
    value = document.get("version")
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        raise DesignManifestError(f"{source} requires a positive integer version")
    return value


def _ref(kind: str, raw: object, recipe_source: str) -> ManifestRef:
    if not isinstance(raw, dict):
        raise DesignManifestError(f"{recipe_source} primitive '{kind}' must be an object")
    _strict(raw, {"key", "version"}, f"{recipe_source}.{kind}")
    key = _required_string(raw, "key", f"{recipe_source}.{kind}")
    version = raw.get("version")
    if isinstance(version, bool) or not isinstance(version, int) or version < 1:
        raise DesignManifestError(f"{recipe_source}.{kind} requires a positive integer version")
    path_template = PRIMITIVE_MANIFESTS.get(kind)
    if path_template is None:
        raise DesignManifestError(f"unsupported primitive kind: {kind}")
    path = path_template.format(key=key, version=version)
    primitive = _read(path)
    primitive_key = primitive.get("key")
    primitive_version = primitive.get("version")
    if primitive_key != key or primitive_version != version or primitive.get("kind") != kind:
        raise DesignManifestError(
            f"primitive reference mismatch: {recipe_source}.{kind}",
            details={"resource": path, "expected": {"key": key, "version": version}},
        )
    return ManifestRef(kind, key, version, hash_document(primitive))


def _recipe(document: Mapping[str, object], source: str) -> RecipeDefinition:
    _strict(document, set(_RECIPE_KEYS), source)
    if document.get("kind") != "recipe" or document.get("contract") != RECIPE_CONTRACT:
        raise DesignManifestError(f"unsupported recipe contract: {source}")
    key = _required_string(document, "key", source)
    version = _required_version(document, source)
    locales = document.get("supportedLocales")
    sections = document.get("supportedSections")
    required = document.get("requiredSections")
    if not all(isinstance(value, list) and value for value in (locales, sections, required)):
        raise DesignManifestError(f"{source} requires non-empty locale and section lists")
    if any(not isinstance(value, str) or not value for value in (*locales, *sections, *required)):
        raise DesignManifestError(f"{source} contains an invalid locale or section identifier")
    if not set(required).issubset(set(sections)):
        raise DesignManifestError(f"{source} required sections must be supported sections")
    accessibility = document.get("accessibility")
    if not isinstance(accessibility, dict):
        raise DesignManifestError(f"{source} requires accessibility metadata")
    _strict(accessibility, {"level", "focusVisible", "reducedMotion"}, f"{source}.accessibility")
    if accessibility.get("level") != "AA" or accessibility.get("focusVisible") is not True:
        raise DesignManifestError(f"{source} is not an accepted accessibility-certified recipe")
    primitives = document.get("primitives")
    if not isinstance(primitives, dict) or set(primitives) != set(PRIMITIVE_MANIFESTS):
        raise DesignManifestError(f"{source} must pin every internal primitive kind")
    resolved_primitives = {kind: _ref(kind, value, source) for kind, value in primitives.items()}
    default_inputs = document.get("defaultInputs")
    adjustments = document.get("adjustments")
    action_intents = document.get("actionIntents")
    richness = document.get("contentRichness")
    if not isinstance(default_inputs, dict) or not isinstance(adjustments, dict) or not isinstance(richness, dict):
        raise DesignManifestError(f"{source} requires closed defaults, adjustments and richness metadata")
    if not isinstance(action_intents, list) or not action_intents or any(
        not isinstance(value, str) or not value for value in action_intents
    ):
        raise DesignManifestError(f"{source} requires a typed action-intent allowlist")
    for name, definition in adjustments.items():
        if not isinstance(name, str) or not isinstance(definition, dict):
            raise DesignManifestError(f"{source}.adjustments must contain named objects")
        _strict(definition, {"type", "choices", "optional", "protected"}, f"{source}.adjustments.{name}")
        if definition.get("type") not in {"hex-color", "enum", "asset-role"}:
            raise DesignManifestError(f"{source}.adjustments.{name} has an unsupported type")
        if definition.get("type") in {"enum", "asset-role"}:
            choices = definition.get("choices")
            if not isinstance(choices, list) or not choices:
                raise DesignManifestError(f"{source}.adjustments.{name} requires choices")
    return RecipeDefinition(
        key=key,
        version=version,
        label=_required_string(document, "label", source),
        description=_required_string(document, "description", source),
        audience=_required_string(document, "audience", source),
        mood=_required_string(document, "mood", source),
        supported_locales=tuple(locales),
        supported_sections=tuple(sections),
        required_sections=tuple(required),
        primitives=resolved_primitives,
        default_inputs=default_inputs,
        adjustments=adjustments,
        action_intents=tuple(action_intents),
        content_richness=richness,
        accessibility=accessibility,
        document=document,
        content_hash=hash_document(document),
    )


@lru_cache(maxsize=None)
def get_recipe(recipe_key: str, recipe_version: int | None = None) -> RecipeDefinition:
    if not isinstance(recipe_key, str) or not recipe_key.strip():
        raise UnknownRecipeError("a certified recipe key is required")
    key = recipe_key.strip()
    path = RECIPE_MANIFESTS.get(key)
    if path is None:
        raise UnknownRecipeError(f"unknown curated recipe: {key}", details={"recipeKey": key})
    document = _read(path)
    definition = _recipe(document, path)
    if recipe_version is not None and recipe_version != definition.version:
        raise UnknownRecipeError(
            f"recipe {key} has no version {recipe_version}",
            details={"recipeKey": key, "requested": recipe_version, "available": definition.version},
        )
    return definition


def list_recipes() -> tuple[RecipeDefinition, ...]:
    return tuple(get_recipe(key) for key in RECIPE_MANIFESTS)


def canonical_recipe_contract(recipe: RecipeDefinition) -> str:
    return canonicalize(
        {
            "contract": RECIPE_CONTRACT,
            "recipe": recipe.document,
            "primitives": {key: value.as_dict() for key, value in recipe.primitives.items()},
        }
    )
