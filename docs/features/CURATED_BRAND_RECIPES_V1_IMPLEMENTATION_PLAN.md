# Curated Brand Recipes v1 — Implementation Plan

**Status:** Quiet Trust — Warm Editorial v1 implemented
**Date:** 2026-09-25
**Primary app:** `appointment`

## Product boundary

Providers choose a certified recipe and a small set of recipe-declared safe adjustments. They do not assemble arbitrary themes, tokens, markup, scripts, fonts, or layouts. The first registry contains only `quiet-trust-warm-editorial` v1. Other visual concepts remain design references until separately reviewed and registered.

This is a clean-slate product. There is one recipe compiler, one `CompiledDesign`, one `Experience Release`, one public projection/provider, and one editor. No parallel branding authority, compatibility recipe, synchronization write, rollout mode, or customer-data migration mechanism is required.

## Recipe contract

Each recipe manifest pins:

- palette primitive with light/dark semantic roles and protected booking states;
- typography primitive with semantic roles, local assets, licenses, and script coverage;
- imagery primitive with local roles, alt text, focal points, dimensions, checksums, and provenance;
- layout/surface primitives with renderer and content-schema version;
- required/supported typed sections, locales, content richness, and action intents;
- certified adjustment choices and accessibility policy.

The registry returns immutable `RecipeDefinition` values. The compiler loads only referenced code-owned manifests, validates their closed schemas, normalizes approved inputs, and hashes the canonical compiled artifact.

## First recipe

Quiet Trust — Warm Editorial is a warm editorial Addis-facing recipe for clinics, wellness practices, and thoughtful professional services. Its public renderer provides a split hero, generous content rhythm, restrained terracotta/indigo semantic palette, local Latin/Ethiopic fonts, responsive cards/process/FAQ/CTA sections, visible focus, and reduced-motion behavior.

The recipe requires 13 sections: hero, services, providers, process, benefits, testimonials, proof, locations, about, FAQ, contact, booking CTA, and footer. Testimonial records require explicit consent. Booking calls use typed intent; publication resolves the target to the site-scoped scheduler handoff.

## Editor boundary

The editor may change application/short name, accent color when contrast-safe, calm/standard motion, and comfortable/spacious presentation density. It may compile, show readiness, publish a Brand Revision, and publish an Experience Release. It never writes raw design tokens or arbitrary content markup.

## Acceptance gates

1. Pure compiler determinism and contrast/state-distinctness checks pass.
2. Brand Revision stores a complete compiled design with a verifiable hash.
3. Public Site publication stores a typed, projected, immutable snapshot.
4. Guest resolution returns only the active release and fails closed for mismatch/absence.
5. Local imagery/fonts are available with provenance/license metadata.
6. The five-business Addis demo renders differentiated typed content through the same recipe.
7. Landing booking CTA reaches the established booking flow without redesigning lifecycle routes.
8. Frontend typecheck/build/node checks and browser desktop/mobile/editor rehearsal pass.

## Future recipes

A new recipe requires a new manifest set, renderer compatibility review, accessibility evidence, content/action contract review, and a separate acceptance run. It must register through the same compiler/publication/provider path and must not introduce a second public authority.
