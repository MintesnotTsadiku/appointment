"""Typed errors for the recipe-backed Brand and Public Experience system."""

from __future__ import annotations


class BrandExperienceError(Exception):
    code = "brand_experience_error"

    def __init__(self, message: str, *, details: dict | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}


class DesignManifestError(BrandExperienceError):
    code = "design_manifest_error"


class DesignCompilationError(BrandExperienceError):
    code = "design_compilation"


class UnknownRecipeError(DesignCompilationError):
    code = "unknown_recipe"


class UnsafeActionIntentError(DesignCompilationError):
    code = "unsafe_action_intent"


class BrandCompilationError(BrandExperienceError):
    code = "brand_compilation"


class ExperiencePublishError(BrandExperienceError):
    code = "experience_publish"


class PublicResolutionError(BrandExperienceError):
    code = "public_resolution"


class StaleDraftError(BrandExperienceError):
    code = "stale_draft"
