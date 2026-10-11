# Foundation: platform brand and growth settings

Status: code complete. Part of the browser checks and the Frappe test run are open, because the site database is paused for a restore (see "Open items").

## Contract

| Part | Location |
|---|---|
| DocType Platform Brand Settings (single, module Scheduler) | `appointment/scheduler/doctype/platform_brand_settings/` |
| DocType Growth Settings (single, module Scheduler) | `appointment/scheduler/doctype/growth_settings/` |
| `brand()` | `appointment/growth/brand.py` |
| `growth()`, `share_message(business, link)` | `appointment/growth/settings.py` |
| Cache (one entry per single, cleared in `on_update`) | `appointment/growth/cache.py` |
| Seeded defaults (the only place with brand values) | `appointment/growth/seed.py` |
| Guest API `public_brand()`; admin `get_settings()`, `save_settings(brand, growth)`, `upload_brand_image(field, content_base64)` | `appointment/growth/api.py` |
| Jinja `platform_brand()`, `growth_settings()` | `appointment/growth/jinja.py`, hooks `jinja.methods` |
| `usePlatformBrand()`, `useBrandedTranslation()`, `withBrand()`, `shareText()` | `frontend/src/lib/platform-brand.tsx`, pure helpers in `platform-brand-core.ts` |
| `PoweredBy` (`variant`, `source`, `showCta`) | `frontend/src/components/powered-by/index.tsx` |
| `PlatformMark` | `frontend/src/components/platform-mark/index.tsx` |
| Staff page Brand & growth, route `/admin/brand`, nav item `nav-admin-brand` | `frontend/src/pages/admin/brand/` |

### Rules

- `brand()` always returns every key. An empty product URL falls back to `get_url()`. An empty short host falls back to the host of the product URL. An empty product name falls back to the short host. `logo_dark` falls back to `logo`.
- `brand()["tagline"]` and `growth()["own_page_text"]`, `growth()["share_message"]` use the current language. The `_en` and `_am` values are also returned, so the SPA can pick by its own language.
- `public_brand()` returns `brand` and a fixed list of public growth fields (`api.PUBLIC_GROWTH`). Reward numbers and the email and SMS switches stay private. Rate limit: 120 requests per 60 s.
- Platform admin = System Manager, the same rule as `payments_admin._require_admin`. The DocTypes give access to System Manager only.
- `www/index.py` and `www/schedule/index.py` put `public_payload()` in `frappe.boot.platform_brand`. The SPA paints the brand from boot on the first frame. The Vite dev shell has no boot: the hook shows the current host, then fetches `public_brand` one time.
- Catalog strings that name the product use `{product}` (and `{host}` where needed). Use `useBrandedTranslation()` to fill them.
- Seeding runs in `after_install` and `after_migrate`. It fills a text only when it is empty, and a switch or number only when it was never saved. A value set to 0 stays 0.
- Uploaded brand images are re-encoded by `public_experience.media.sanitize_image` (PNG, JPEG or WebP, at most 2 MB) and saved as public files attached to Platform Brand Settings.

## Decisions

- Default mark: `/assets/appointment/appointment-logo.png` (the app icon that is already the favicon). Default share image: `/assets/appointment/frontend/icons/icon-512x512.png`. The app has no wide logo, so `logo` and `logo_dark` start empty and the UI shows the mark with the product name.
- Default primary colour `#A23B72`, taken from the app icon.
- `powered_by_pages` controls the invitation line under "Powered by". The "Powered by" line itself always shows, as before.
- The `PoweredBy` mark sits before the sentence, so the Amharic word order ("በ{product} የሚሠራ") reads naturally.
- The guest check uses the Bloom scheduler (`/schedule/org/bloom-studio`). `/bloom-studio` and `/bloom-studio/book` are template-owned pages without `PoweredBy`. Workstream A or E can add the mark there.
- The admin check is split into three manifests, because colour scheme and auth are set per manifest file.

## Verification

| Check | Result |
|---|---|
| `$G/migrate.sh` (one run, after both DocTypes existed) | Done. `public_brand` returned the seeded values. |
| `$G/test.sh appointment.tests.test_platform_brand` | 6 of 6 passed (run before the `frappe.db.commit` patch was added to `setUp`). |
| `node tests/platform-brand.test.mjs` (in `test:dom`) | Pass |
| `$G/build.sh` | tsc errors 0 (baseline 178), test:dom pass, build pass |
| Agent Plane `foundation-brand-guest.yaml` | BQA-2026-00251 Passed. The landing scenario had one `ERR_CONNECTION_RESET` while the stack restarted. |
| Agent Plane `foundation-brand.yaml`, `foundation-brand-dark.yaml` | Not run (database paused). |

The first guest run (BQA-2026-00250) found a missing `withBrand` import that broke the landing page. It is fixed.

## Open items (run after the site restore)

1. `$G/migrate.sh`. This syncs both DocTypes, seeds the defaults and imports the catalog.
2. `$G/strings.sh $G/strings/foundation-brand-placeholders.json` and `$G/strings.sh $G/strings/foundation-ui.json`. They are already merged into `en.json` and `am.json`; run them again only to re-import the site Translation records if migrate did not.
3. `$G/test.sh appointment.tests.test_platform_brand`
4. `$G/qa.sh qa/manifests/growth/foundation-brand.yaml appointment.tests.growth_foundation_qa_fixtures`
5. `$G/qa.sh qa/manifests/growth/foundation-brand-dark.yaml appointment.tests.growth_foundation_qa_fixtures`
6. `$G/qa.sh qa/manifests/growth/foundation-brand-guest.yaml`
7. Review the admin page screenshots (light desktop, dark mobile Amharic) and polish.
