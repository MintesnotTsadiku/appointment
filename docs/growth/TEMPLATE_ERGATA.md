# Ergata Therapy template

Ergata ("እርጋታ", calm) is a public website template for counsellors, psychologists, psychotherapists and small group practices. It is a certified recipe (`ergata-therapy` v1) with its own template package, primitives, starter copy, imagery and fonts. Independent providers and organizations can choose it in website setup.

## Design decisions

- The visitor is often anxious and private. The page must feel calm, warm, safe and professional. It must never feel clinical or like a sales page.
- One recurring shape: the arched window. It frames the hero photo, the portrait, the session icons, the visit photo and the booking band.
- Palette "linen, sage and clay": linen canvas `#f5f0e8`, deep sage actions `#3b5a4b`, clay `#9c5436` for small marks only (eyebrow, free price, notice). Dark mode is a deep forest night `#121916` with pale sage actions. All text roles pass WCAG AA (body text 12.2:1 light, 14.4:1 dark; muted text 6.1:1 and 9.1:1; button text 7.5:1 and 10:1). Two more palettes: "Soft canvas" (deep teal and sage) and "Paper & ink".
- Type: Fraunces with the SOFT axis at 100 for headings (warm, round terminals) joined with Noto Serif Ethiopic; Source Sans 3 for reading at 18 px joined with Noto Sans Ethiopic. Amharic headings get more line height and no negative tracking. "Clear sans" is the alternative font choice.
- Spacious density by default. Generous section spacing; reading measure near 36 em.
- Motion is quiet: the hero arch opens like a curtain, copy rises, sections fade up 14 px. Under `prefers-reduced-motion` all animation and transitions stop and every section shows at once.
- The safety notice uses clay, not alarm red, with large tap targets (`tel:` links) for the numbers.
- Focus rings use the palette focus colour (3 px). Tap targets are 44 px or more. No autoplay.

## Sections and content model

The recipe requires 15 sections, in this order: `hero`, `benefits`, `approaches`, `about`, `process`, `services`, `providers`, `proof`, `testimonials`, `faq`, `notice`, `locations`, `contact`, `booking_cta`, `footer`.

| Section | Shown as | Notes |
|---|---|---|
| `hero` | Eyebrow, headline, lede, "Book a first session", softer second action, reassurance line, arched photo with the lead practitioner card | `hero` now accepts an optional owner photo (`image`, localized `imageAlt`), the same as other sections. |
| `benefits` | "What we can work on together": anxiety, low mood, stress and burnout, grief, relationships and couples, trauma, life changes | `icon` names map to Ergata's own line icons. |
| `approaches` (new) | "Approaches, in plain words": CBT, ACT, person-centred, EMDR-informed, solution-focused | New closed section: `title`, `intro`, `items[{title, description}]`. |
| `about` | Practitioner or practice story, highlights as chips, room photo | |
| `process` | "Your first session" in four steps | |
| `services` | "Sessions and fees" cards with format icon, duration, fee ("Free" when the price is 0) | Items come from the real Service records. The icon (room, video, phone, intro) is read from the session name only. |
| `providers` + `proof` | Practitioner card (portrait, role, specialties, short credentials) next to "Training and registration" (degree, licence, membership, supervision) | Editable fields. Starter copy never invents credentials: `proof` items start empty and the section is hidden. |
| `testimonials` | Anonymised quotes | Empty and hidden by default. The schema requires `consent: true` on each quote. |
| `faq` | Sessions needed, confidentiality limits, Amharic sessions, cancellation, payment | |
| `notice` (new) | "This is not an emergency service" with call buttons | New closed section: `title`, `body`, `items[{label, phone}]`. Phone values allow digits, spaces and `+()-` only. The numbers (991 police, 907 ambulance) are owner content in the starter copy, never template logic. |
| `locations` + `contact` | "Where we meet" card (address, hours, phone, email, directions), courtyard photo | |
| `booking_cta` | Sage band with the booking action | |
| `footer` | Brand, short line, links, "Website by" credit | Credit uses `useTemplateCredit` (honours `template_credit_enabled`, `?source=template_credit`). |

Starter copy: `appointment/public_experience/manifest/content/ergata-therapy.v1.json` (English and Amharic). Guided website setup (`setup.prefill_sections`) applies it to a new draft for this recipe. Facts from the business records (sessions, locations, people, contact details) stay. Lists that are still empty take the starter lists. The hero's second action is "Free 15-minute introductory call" only when the business has a free session of 20 minutes or less; otherwise it is "Questions before you book". A group practice with more than one provider gets "Our therapists".

## Images and how they were made

All images are original and license-clean. Codex CLI image generation made the photos (`codex exec`, built-in image generation, one prompt with shared art direction: Addis Ababa interior, natural light, sage, sand, clay, no text, logos, screens or people except the portrait). One room image was regenerated once because it had book-spine lettering. Pillow resized them and saved WebP.

| File (under `appointment/public/brand-experience/`) | Size | Use | Alt (en) |
|---|---|---|---|
| `heroes/ergata-therapy.webp` | 1040×1300, 139 KiB | Hero (recipe role `hero.ergata`, chooser thumbnail) | Morning light through a linen curtain falls on an olive tree, a clay jug and a glass of water in a quiet room. |
| `support/ergata/room.webp` | 1440×960, 176 KiB | About (role `detail.ergata`) | Two soft armchairs face each other across a small wooden table in a sunlit counselling room. |
| `support/ergata/window.webp` | 1440×961, 112 KiB | Support asset (gallery) | — |
| `support/ergata/path.webp` | 1440×960, 189 KiB | Showcase visit photo | A stone path between green plants leads to an open wooden door in a quiet courtyard. |
| `providers/tsion-hailu.webp` | 768×768, 34 KiB | Showcase portrait of a fictional practitioner | Portrait of Tsion Hailu in a white cotton scarf, smiling gently. |
| `brands/ergata-showcase-logo.webp`, `brands/ergata-showcase-favicon.png` | 512 px, 64 px | Showcase mark | Drawn with Pillow (arched window with a clay leaf). |

Amharic alt text is in the starter copy and the showcase content (`imageAlt.am`). The imagery manifest (`imagery/ergata-rooms.v1.json`) keeps the English alt as its required fallback. The design reference is `docs/design-references/public-experience/v1/ergata/moodboard-01.webp` (photos and palette swatches, composed with Pillow), recorded in the reference manifest and the showcase catalog.

Fonts: `appointment/public/fonts/ergata/` (Fraunces SOFT 100, Source Sans 3, Noto Serif Ethiopic, Noto Sans Ethiopic; SIL OFL 1.1, licence text next to each file). Built with `scripts/build_public_fonts.py <source-dir> ergata` from the Google Fonts repository.

## Files

- Frontend package: `frontend/src/public-experience/templates/ergata/` (`ErgataTemplate.tsx`, `ErgataContent.tsx`, `ErgataNewsletter.tsx`, `icons.tsx`, `ergata.css`, `ergata-newsletter.css`), registered as `ergata-therapy@1` in `templates/registry.ts`. Font faces in `platform.css`. Chrome keys `approach`, `sessions`, `free`, `bookThis`, `callNumber`.
- Recipe and primitives: `manifest/design/recipes/ergata-therapy.v1.json`, `palettes/ergata-therapy{,-soft,-paper}.v1.json`, `typography/ergata-therapy{,-alternate}.v1.json`, `imagery/ergata-rooms.v1.json`, `layouts/ergata-therapy.v1.json`, `surfaces/ergata-therapy.v1.json`, `appearance-options.v1.json`, `recipes.py`.
- Schema: `section_schemas.py` (`approaches`, `notice`, hero photo); `Public Site Section.section_type` options (migrated once).
- Setup: `setup.py` (catalog entry, industry "therapy", starter copy, fix: an independent provider's draft now lists that provider). Website setup page: industry option "Counselling and therapy" and `data-qa` hooks on the template cards and the preview button.
- Showcase catalog: `manifest/showcase/catalog.v1.json` entry `ergata` (slug `tsion-counselling`). `demo/content_world.py` now requires content for every seeded business only, so a catalog showcase made by a fixture does not break the seeder.
- Independent booking: `public_offering` returns `site_slug`; the independent scheduler (`/schedule/individual/<offering>`) wears the published template's colours and type, as organization schedulers do. The public booking path for an independent provider now opens the first offering the owner made.
- Tests: `frontend/tests/public-template-packages.test.mjs`, `appointment/tests/test_public_experience_contracts.py`, `appointment/tests/test_showcase_catalog.py`.
- QA: `appointment/tests/template_ergata_qa_fixtures.py`, `qa/manifests/growth/template-ergata.yaml`, `template-ergata-dark.yaml`, `template-ergata-chooser.yaml`.

## Showcase

The seeder (`appointment.demo.showcase.seed`) needs a paused scheduler and seeds organizations only, and the dev site must not be reseeded. So the showcase is a QA fixture with exact cleanup: `appointment.tests.template_ergata_qa_fixtures`.

- Tsion Hailu Counselling, an independent counselling psychologist (fictional), at `/tsion-counselling`, English and Amharic. Six sessions: free 15-minute introductory call, first session in person (60 min, ETB 1,500), individual in person (50 min, ETB 1,200), online video (50 min, ETB 1,200), phone (50 min, ETB 1,000), couples (80 min, ETB 2,000). The draft starts from guided setup, so it also tests the starter copy.
- Hiwot Family Therapy Centre, a small group practice (organization) with no website, so its owner sees the template chooser.

`cleanup()` deletes only the records that `setup()` recorded, by exact name.

## QA runs (Agent Plane)

| Run | Manifest | Result |
|---|---|---|
| BQA-2026-00472 | `template-ergata.yaml`: en and am, 1440 and 390, light; booking from the landing page to the time picker (en desktop, am mobile) | Passed, 0 console, 0 network errors |
| BQA-2026-00475 | `template-ergata-dark.yaml`: en and am, 1440 and 390, dark, reduced motion; booking to the time picker (en mobile) | Passed, 1 console message (known framer-motion reduced-motion notice), 0 network errors |
| BQA-2026-00471 | `template-ergata-chooser.yaml`: group practice owner sees Ergata in the chooser and previews it | Passed, 3 console messages from the existing sandboxed preview iframe ("Blocked script execution in about:srcdoc"), 0 network errors |

Earlier runs BQA-2026-00453 to 00468 found and fixed: an unsupported `fetchPriority` prop, button text that inherited the link colour, sticky headings in full-page captures, reveal sections that stayed hidden when the viewport grew (fix in `templates/motion.ts`: also sweep on resize), an unbranded independent scheduler, the scheduler opening the couples session, the scheduler using light tokens in dark mode, a long practice name in the hero card, and the band arch.

Other checks: `$G/build.sh` typecheck 176 (baseline 178), `test:dom` pass, build pass. Frappe modules `test_public_experience_contracts` (21), `test_showcase_catalog` (4), `test_website_setup` (21), `test_independent_booking` (14) pass.

## Open points

- The guided setup editor edits only English titles and body text; owners cannot yet edit or remove list items (approaches, FAQ) there, and an English edit drops the Amharic value of that field. This affects all templates.
- An independent provider's `/book` handoff opens one offering; each session card links to the same handoff.
- The shared scheduler draws the selected day with a primary-to-accent gradient (sage to clay); this is shared scheduler styling.
- The showcase lives only while the fixture runs. To ship it permanently, the seeder needs support for independent-provider businesses.
