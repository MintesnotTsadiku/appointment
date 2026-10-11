# Show-off growth features (workstream E)

This document is the plan and run record for three features that let businesses show their work and bring new businesses to the platform:

1. A footer credit on public business websites.
2. A "Year in review" share image for owners.
3. A public business directory.

## 1. Template footer credit

**Behaviour.** Each certified template shows "Website by <product>" in its own footer. The link goes to the platform address with `?source=template_credit`. The text uses the page locale (`publicSite.websiteBy`: "Website by {product}" / "ድረ-ገጽ በ{product}").

**Gate.** Growth Settings `template_credit_enabled` (platform level). The credit stays hidden until the platform brand loads, so no fallback name flashes.

**Design.** The data is headless (`useTemplateCredit` in `frontend/src/public-experience/templates/credit.ts`, pure helpers in `credit-core.ts`). Each template draws the credit with its own CSS tokens, in light and dark mode:

| Template | Style |
|---|---|
| Bloom v2 | Muted line, ink link with a marigold underline |
| Abugida v2 | Italic muted line, red underline |
| Meron v2 | Caps label like a garment tag, navy rule (no caps in Amharic) |
| Selam v2 | Outlined pill, like the tempo tags |
| Tena v2 | Plain legible line in the legal row, primary underline |
| v1 templates and blog/gallery pages | A small line under the copyright in each template's footer |

**No double credit.** Template pages (home, blog, gallery) do not render `PoweredBy`. `PoweredBy` stays on the scheduler, manage-booking and my-bookings pages (workstream A). The booking handoff page has no footer and shows neither.

## 2. Year in review

**Numbers.** `appointment/growth/year_review.py` uses the same rows, owner scope and status rules as Insights (`analytics._report` scope, `BOOKED` statuses, `_rollup`). The analytics layer does not exclude showcase or QA records, so this module does not exclude them either.

| Stat | Rule | Shown when |
|---|---|---|
| Clients served | Distinct customer (profile, else email) on booked rows | Always (when ready) |
| Total bookings | Pending, Confirmed and Completed rows | Always (when ready) |
| New clients | Clients with no booked visit before the period | The business has earlier history |
| Returning clients | Clients with 2+ visits in the period or a visit before it | 10+ clients |
| Busiest day, busiest hour | Weekday and hour heatmap from `_rollup` | 20+ bookings |
| Top service | Most booked service and its share | 2+ services, 10+ bookings |
| Most booked (provider) | Most booked provider | Organizations only, 2+ providers |
| Booked in Amharic | `customer_language = am` over rows with a language | 20+ rows with a language and 30%+ coverage |

A period with fewer than 10 bookings is "not ready": the UI shows an empty state and the image endpoint refuses.

**Periods.** Calendar year and Ethiopian year (Meskerem 1 to Pagume 5/6, from `growth/ethiopian_calendar.py`). The list has the two most recent complete periods (the one that ended last comes first) and the two years "so far". The default is the most recent complete period with enough data, else the "so far" year with more bookings.

**Image.** `appointment/growth/year_review_image.py` draws a PNG with Pillow: 1080×1350 (post) or 1080×1920 (story), English or Amharic. It uses the business brand from `sharing.profile` (logo and the primary, canvas and text colours of the published design) and a small "Made with <product>" mark. Text and fonts come from the shared share-image helpers (`growth/tools/og_image.py`: Inter for Latin, Noto Sans Ethiopic for Ethiopic, chosen per run). No new font file was needed. The Amharic busiest hour uses the Habesha clock with the international time as a note.

**API.** `appointment.growth.year_review.summary(business, period=None)` and `appointment.growth.year_review.image(business, period, lang, size)`. Both need the owner, a manager or the independent provider (`sharing.require_business`). The gate is `year_review_enabled`.

**UI.** `frontend/src/pages/grow/sections/YearReviewSection.tsx`: period select (shadcn), image language and format toggles, the stats, a live preview, download, native share (with the image file when the device allows it) and a Telegram share link (`?source=year_review`). Insights has an entry card (`pages/grow/YearReviewPromo.tsx`) that opens `/grow#year-review`.

## 3. Public directory

**Data.** The existing type fields (Organization `organization_type`, Provider `business_type`) are coarse and differ between the two, so there are three new DocTypes (module Scheduler):

- **Directory Category**: name en/am, slug, booking phrase en/am, description en/am, enabled, sort order, "suggest for" business types. Eleven seeded rows: salon & barber, spa & beauty, clinic, dental, tutoring, fitness, consulting, legal, tailoring, photography, real estate.
- **Directory Area**: name en/am, slug, city, enabled, sort order, neighbourhood aliases. Seeded with the 11 Addis Ababa sub-cities (aliases such as Kazanchis → Kirkos, Gerji → Bole, CMC → Yeka) and ten towns.
- **Directory Listing**: one row per owner key (organization or `Provider:<name>`), `listed` (default off), category, area, listed at.

`directory.ensure_defaults` (after_migrate) inserts missing seed rows and never changes a saved row.

**Owner opt-in.** `frontend/src/pages/grow/sections/DirectorySection.tsx` with `appointment.growth.directory.owner_listing` and `save_owner_listing`. The section suggests a category from the business type and an area from the location address. A business must have a published booking page to list.

**Published booking page.** A Published Public Site with public booking on (`/<slug>`). Else the scheduler page when public booking is on (`/schedule/org/<slug>`, or `/schedule/individual/<offering>` for an independent provider).

**Pages.** `appointment/www/directory.py` and `directory.html` (same layout approach as the tools pages): `/directory`, `/directory/<category>`, `/directory/<category>/<area>`, and the same under `/am/`. Every page has one H1, a title of 60 characters or fewer, a description of 155 characters or fewer, a canonical URL, hreflang en/am/x-default, Open Graph, `index, follow`, `ItemList` JSON-LD with `LocalBusiness` items, and `BreadcrumbList` JSON-LD. Pages show 24 businesses each, with rel prev/next. A page with no listed business is not found (404), and empty pages are neither linked nor in the sitemap. Booking links carry `?source=directory`. The gate is `directory_enabled`.

**Routing.** `website_route_rules` in `hooks.py`, `directory` reserved in `reserved.py` and `routes.ts`, and `directory|am/directory` in the Vite proxy. Sitemap entries come through the `appointment_sitemap_links` hook (`appointment.www.directory.sitemap_links`). The landing footer links to `/directory` when the flag is on.

## Tests

- Frappe: `appointment/tests/test_growth_showoff.py` (credit flag, period boundaries, numbers for an organization and an independent provider, thin data, default period, permissions, the image in both sizes and languages, directory opt-in, unpublished exclusion, category and area pages, 404s, Amharic pages, hreflang, JSON-LD, sitemap, owner permissions). Tests roll back to a savepoint and patch `frappe.db.commit`.
- Frontend: `frontend/tests/growth-showoff.test.mjs` (credit link, hour and weekday labels, tiles, image URL, share links), added to `test:dom`.
- Agent Plane: `qa/manifests/growth/showoff-*.yaml` with fixture `appointment.tests.growth_showoff_qa_fixtures`.

## Run record (12 October 2026)

- `$G/build.sh`: tsc errors 0 (baseline 178), `test:dom` pass, build pass.
- The share image was drawn outside the site with stub translations and reviewed (en and am, post and story).
- The coordinator paused all site work (a site restore). These steps did not run and must run after the restore:
  1. `$G/migrate.sh` (creates Directory Category, Directory Area and Directory Listing; seeds categories and areas).
  2. `$G/strings.sh $G/strings/showoff-ui.json` and `$G/strings.sh $G/strings/showoff-server.json` (they were merged into en.json/am.json before the pause; run again so the restored site has the Translation rows).
  3. `$G/test.sh appointment.tests.test_growth_showoff`.
  4. Agent Plane, each with fixture `appointment.tests.growth_showoff_qa_fixtures`: `showoff-credit.yaml`, `showoff-credit-dark.yaml`, `showoff-review.yaml`, `showoff-review-dark.yaml`, `showoff-directory-owner.yaml`, `showoff-directory-guest.yaml`.

## Decisions

- New Directory DocTypes instead of the existing type fields, because those fields are coarse and differ between organizations and providers.
- Areas are a configurable DocType with Amharic names and neighbourhood aliases. The Location DocType has no sub-city field.
- The credit links to the platform home page with `?source=template_credit`, as asked. The landing page must pass `source` on to sign-up for attribution (workstream F/C).
- The Telegram share URL can only carry a link and text, so it shares the booking link with a caption. The image goes through download or the native share sheet.
- A one-line fix in the shared `growth/tools/og_image.py`: the font cache used `frappe.local.__dict__`, which Frappe 17 does not allow (AttributeError). It now uses a module-level cache. This also unblocks the tool and share-card images.
