# Quiet Trust — Warm Editorial

**Status:** first curated recipe vertical slice implemented
**Date:** 2026-09-25
**Primary app:** `appointment`
**Scope:** clean-slate public experience, recipe compiler, public projection, and the first branded landing/booking handoff

This is the implementation record for the first production-shaped recipe. It is the source of truth for the public-experience slice; the public-site/domain plan remains the source of truth for ownership, trusted host routing, and custom-domain operations.

## Product decision

Appointment has one public-experience authority:

1. a code-owned certified recipe registry;
2. one pure recipe compiler that emits `CompiledDesign`;
3. one immutable `Experience Release` that pins design and typed content;
4. one trusted public resolver/provider;
5. one guided editor for recipe inputs and publication.

There is no second branding registry, runtime theme selector, compatibility recipe, synchronization write, migration adapter, or alternate public renderer. The internal staff application may retain its platform-owned workspace styling; that is not a public tenant authority.

The first recipe is `quiet-trust-warm-editorial` v1, shown in the approved Warm Editorial concept. The other concepts are references for future recipe work and are not registered or selectable.

## Source layout

| Concern | Canonical source |
| --- | --- |
| recipe registry | `appointment/public_experience/recipes.py` |
| primitive manifests | `appointment/public_experience/manifest/design/` |
| compiler | `appointment/public_experience/design_compiler.py` |
| typed actions | `appointment/public_experience/actions.py` |
| typed section validation | `appointment/public_experience/section_schemas.py` |
| brand publication | `appointment/public_experience/brand_compiler.py` |
| content/design release | `appointment/public_experience/publisher.py` |
| trusted resolution | `appointment/public_experience/resolver.py` |
| public config | `appointment/public_experience/public_config.py` |
| public UI | `frontend/src/public-experience/` |
| editor | `frontend/src/pages/settings/public-experience.tsx` |
| deterministic demo | `appointment/tests/rich_demo.py` |

## Compiled design contract

`CompiledDesign` uses `appointment-compiled-design.v1` and contains:

- recipe key/version/hash and compiler policy version;
- light/dark semantic tokens, including protected `available`, `selected`, `today`, `limitedCapacity`, `waitlist`, `unavailable`, `focus`, `danger`, `error`, `success`, and `disabled` roles;
- semantic `display`, `body`, `ui`, and `numeric` typography roles with local licensed font assets and Latin/Ethiopic coverage;
- the recipe layout renderer, required section list, schema version, density, surface, motion, imagery roles, and action intents;
- localized-content and locale capabilities;
- application identity (`applicationName`, `shortName`);
- validation summary and deterministic `contentHash`.

The compiler validates contrast, state distinctness, closed primitive schemas, safe local asset paths, approved inputs, required sections, and recipe-approved locales. Accent, motion, and presentation density are the only current editor adjustments.

## Public content and action contract

Draft content uses `appointment-public-experience.v2` and content schema v2. The registered recipe requires these 13 typed sections:

`hero`, `services`, `providers`, `process`, `benefits`, `testimonials`, `proof`, `locations`, `about`, `faq`, `contact`, `booking_cta`, and `footer`.

The editor stores facts and intent, not HTML, CSS, scripts, or arbitrary links. A CTA is `{ intent, localized label, placement }`; publication resolves it to a safe release-only target. Booking intents resolve to the existing site-scoped scheduler entry, while call, directions, contact, and FAQ intents resolve through verified server data. The browser never authors a privileged route.

Testimonials require explicit consent. Service duration, price, provider, location, and contact fields are canonical or verified seeded facts. The renderer escapes localized text and recognizes only the closed section types.

## Publication flow

1. A Brand Profile selects the certified recipe and stores approved identity/adjustment inputs.
2. `compile_brand` produces a deterministic compiled design; `publish_brand` creates an immutable Brand Revision.
3. Public Site stores the typed section draft, locale, SEO, and booking projections.
4. `publish_experience` validates every section, resolves actions, pins the active Brand Revision and compiled design, computes the release hash, and atomically advances the site pointer.
5. Guest resolution uses only the active immutable Experience Release. Missing, suspended, malformed, or mismatched releases fail closed.
6. Cache invalidation and realtime notifications happen after commit; the release remains the source of truth if cache is unavailable.

A draft never reaches public traffic. Rollback creates/activates an attributable immutable artifact; it does not edit history.

## Routes and booking boundary

Public routes are authoritative at `/:slug`, `/:slug/:locale`, and `/:slug/book`. They load the release-scoped compiled design and typed snapshot through `PublicExperienceProvider` and `PublicSiteHome`.

The landing page is complete for this slice. Its booking CTA is a safe typed `booking_start` intent and the branded booking entry is a Quiet Trust handoff shell leading to the existing scheduler path `/schedule/org/{slug}`. Calendar, form, confirmation, reschedule, and cancel visual/lifecycle redesign are deliberately staged follow-up work. The seam is the release `bookingPath` plus the existing scheduler contract; later work can replace the handoff without changing the public recipe authority.

## Assets and typography

The recipe owns two generated, local, text-free raster assets:

- `appointment/public/quiet-trust/hero-addis.jpg` — wide Addis consultation-room hero;
- `appointment/public/quiet-trust/detail-addis.jpg` — square linen/ceramic editorial detail.

The asset manifest records role, alt text, focal point, dimensions, MIME type, SHA-256 checksum, and generated provenance. Local fonts are `DejaVu Serif` for display and `Noto Sans Ethiopic` for body/UI coverage, with license files beside the font assets. No remote font, remote image, tenant script, or uploaded executable media is part of the recipe.

## Clean-slate data and recovery

The isolated site was backed up before schema migration:

`/home/minte/.local/state/frappe-worktree-stack/feat-analytics-operations-f2ca8e/bench/sites/meet-beta-feat-analytics-operations-f2ca8e.localhost/private/backups/20260925_050332-meet-beta-feat-analytics-operations-f2ca8e_localhost-site_config_backup.json` plus the matching SQL/public/private backup archives.

The obsolete `Theme Template` DocType and exact synthetic rehearsal records were removed after inventory. The retired branding, logo, color-preset, and runtime-theme fields were also removed from `Landing Page Settings`; that singleton now contains only platform marketing-page content, SEO, and cache settings. Platform application colors are code-owned defaults, while tenant landing, booking, and scheduler surfaces read only published Experience Releases. The five rich-demo businesses and their booking records were retained and reseeded against the new recipe/release contracts. Git history and the site backup are the recovery mechanisms; no customer-data migration path is required.

## Verification

From the worktree:

```sh
python3 -m compileall -q appointment/public_experience appointment/tests/rich_demo.py
bench --site meet-beta-feat-analytics-operations-f2ca8e.localhost migrate
bench --site meet-beta-feat-analytics-operations-f2ca8e.localhost execute appointment.tests.test_public_experience_contracts.run
bench --site meet-beta-feat-analytics-operations-f2ca8e.localhost execute appointment.tests.test_public_deployment.run
bench --site meet-beta-feat-analytics-operations-f2ca8e.localhost execute appointment.demo.showcase.seed
bench --site meet-beta-feat-analytics-operations-f2ca8e.localhost execute appointment.tests.test_rich_demo.verify
bench --site meet-beta-feat-analytics-operations-f2ca8e.localhost execute appointment.tests.rehearsal.run_release_rehearsal
```

Frontend checks use Node 22:

```sh
/home/minte/.nvm/versions/node/v22.22.2/bin/node node_modules/typescript/bin/tsc --noEmit
/home/minte/.nvm/versions/node/v22.22.2/bin/node node_modules/vite/bin/vite.js build --base=/assets/appointment/frontend/
for test in tests/*.test.mjs; do /home/minte/.nvm/versions/node/v22.22.2/bin/node "$test"; done
```

The public browser rehearsal covers Tena, Meron, Abugida, and Bloom at desktop/mobile widths plus the authenticated recipe editor. Evidence is stored under `qa/evidence/public-experience-final/`.

## Follow-up boundary

The next slice may deepen the scheduler adapter and redesign the booking lifecycle surfaces, but it must consume this release-scoped `CompiledDesign` and typed action projection. It must not introduce a second recipe compiler, another public provider, raw CTA links, mutable runtime theme reads, or a second publication authority.
