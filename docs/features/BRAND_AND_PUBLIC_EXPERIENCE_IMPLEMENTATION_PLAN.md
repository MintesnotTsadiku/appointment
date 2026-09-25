# Brand and Public Experience — Clean-Slate Implementation Plan

**Status:** first curated recipe slice implemented; follow-up booking lifecycle slice remains
**Date:** 2026-09-25
**Primary app:** `appointment`
**Authoritative implementation record:** `docs/implementation/quiet-trust-warm-editorial-architecture.md`

## Decision

Build one public-experience system around certified recipes. A recipe is a reviewed composition of palette, semantic typography, imagery roles, layout, surfaces, density, motion, protected interaction states, supported content sections, and safe action intents. `Quiet Trust — Warm Editorial` v1 is the first and currently only registered recipe.

The system has one compiler, one immutable release model, one trusted public projection, and one editor path. It does not maintain parallel branding authorities, compatibility recipes, synchronization writes, rollout modes, or public runtime fallback to superseded branding artifacts. Existing booking and business domain behavior remains reusable.

## Scope of this slice

Implemented:

- code-owned recipe and primitive manifests;
- deterministic, pure `CompiledDesign` compiler with semantic tokens, identity, density, motion, action intents, asset provenance, validation, and hash;
- `Brand Profile` and immutable `Brand Revision` persistence;
- typed v2 public section contracts and server-resolved action intents;
- `Public Site` and immutable `Experience Release` publication;
- trusted host/path resolver and release-scoped public config/snapshot APIs;
- Quiet Trust landing page, booking handoff shell, local assets/fonts, responsive CSS, and guided editor;
- rich five-business Addis demo seed, migration backup, and browser evidence.

Not redesigned in this slice:

- scheduler calendar, appointment form, confirmation, reschedule, and cancellation surfaces;
- custom-domain certificate automation and production edge operations;
- general page-builder/CMS behavior or arbitrary customer-authored markup.

## Canonical model

- `Brand Profile`: one owner-scoped recipe draft and approved inputs.
- `Brand Revision`: immutable compiled design artifact with recipe/compiler/asset pins.
- `Public Site`: owner, slug, locale, typed section draft, SEO, and booking context.
- `Experience Release`: immutable snapshot pinning one Brand Revision, one compiled design, one typed content projection, locale/SEO/booking/assets/policies, and a release hash.
- `CompiledDesign`: the semantic contract consumed by public renderers and the later booking adapter.

The old visual-template/token-registry model is not part of this architecture. Platform-owned staff UI styling is separate from public tenant presentation.

## Contracts and invariants

`appointment-compiled-design.v1`, `appointment-public-experience.v2`, `appointment-public-ui.v2`, and `appointment-public-snapshot.v2` are closed contracts. A release is publishable only when the recipe, compiled-design hash, renderer, content schema, locale set, required sections, action intents, and owner/site pins match.

Public authoring stores localized plain text, canonical catalog facts, typed section records, and typed actions. It stores no HTML, CSS, JavaScript, arbitrary href, raw tenant CSS, remote font, or executable asset. Guest APIs expose only active immutable projections and fail closed on unknown hosts or incomplete releases.

## Publication and booking boundary

The landing CTA is a `booking_start` intent resolved to `/{slug}/book`. The current branded booking entry displays the same compiled identity and hands off to the established scheduler path. This is an explicit adapter seam, not a second booking renderer. Calendar/form/confirmation/reschedule/cancel redesign is a later tracer slice that consumes the same release contract.

## Recovery and acceptance

Take a site backup before schema or data cleanup. Local synthetic data may be reseeded; current demo public records are retained only when they validate against the current recipe/release contracts. Product rollback is through immutable revisions/releases; engineering rollback is through Git and the isolated backup.

Acceptance requires deterministic compile/hash, typed-content validation, safe action projection, owner isolation, no draft leakage, release-pin integrity, responsive/keyboard/reduced-motion rendering, local asset/font provenance, public HTTP/API resolution, and a seeded rich demo with five published Quiet Trust sites. See the implementation record for commands and evidence.
