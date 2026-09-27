"""Lazy server-backed interfaces for Brand Recipes and Public Experiences."""

from __future__ import annotations


def compile_brand(profile: object, expected_draft_version: int) -> object:
    from appointment.public_experience import brand_compiler
    return brand_compiler.compile_brand(profile, expected_draft_version)


def publish_brand(profile: object, expected_draft_version: int) -> object:
    from appointment.public_experience import brand_compiler
    return brand_compiler.publish_brand(profile, expected_draft_version)


def rollback_brand(profile: object, revision: object) -> object:
    from appointment.public_experience import brand_compiler
    return brand_compiler.rollback_brand(profile, revision)


def preview_experience(site: object, expected_version: int, viewport: str, locale: str) -> object:
    from appointment.public_experience import publisher
    return publisher.preview_experience(site, expected_version, viewport, locale)


def publish_experience(site: object, expected_version: int) -> object:
    from appointment.public_experience import publisher
    return publisher.publish_experience(site, expected_version)


def rollback_experience(site: object, release: object) -> object:
    from appointment.public_experience import publisher
    return publisher.rollback_experience(site, release)


def resolve_public_experience(trusted_host: str, normalized_path: str, locale: str | None = None) -> object:
    from appointment.public_experience import resolver
    return resolver.resolve_public_experience(trusted_host, normalized_path, locale)
