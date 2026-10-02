# Public template taste audit

> **Note (2026-10-02):** the `design-taste` skill and its `taste-lint.mjs` checker were retired from this repository because they made designs converge. References below are historical. The procedure now lives as an opt-in prompt outside the repo, and its design log is in `docs/implementation/design-log.md`.

Date: 2026-09-30. Scope: the five certified template packages and their recipe manifests. Method: the `design-taste` skill (`.claude/skills/design-taste/`), its lint script, and a manifest review. Nothing in the templates was changed by this audit.

Run the lint again at any time:

```bash
node .claude/skills/design-taste/scripts/taste-lint.mjs
```

## Summary

| Template | Lint errors | Lint warnings | Hard-coded strings | Hard-coded alt texts |
|---|---|---|---|---|
| selam-movement | 3 | 6 | 24 | 5 |
| bloom-hair | 4 | 7 | 38 | 4 |
| meron-atelier | 3 | 7 | 37 | 5 |
| abugida-language | 2 | 7 | 24 | 4 |
| tena-clinic | 2 | 6 | 39 | 4 |

## Findings, most severe first

### 1. Templates publish invented facts about real businesses

About 160 visible strings are hard-coded in the template JSX, copied from the design boards. Any business that picks a template shows them as its own. Examples:

- Tena: "Sample clinic location", "Addis Ababa, Ethiopia", "New patients welcome", "Clear, upfront fees", "In-person and online".
- Abugida: "Arat Kilo · Addis Ababa", alt text "The Arat Kilo learning room".
- Bloom: alt text "The Bole salon". A fake booking form with a one-option "Anyone lovely" stylist select and a date field that does nothing.
- Selam: class times "09:00" and "12:30" on every service.
- Meron: a founder quote the business never said.

These strings also never translate, so an Amharic visitor sees English chrome around Amharic content.

Fix: move each string into release content (editable by the owner) or into platform i18n (chrome only). Remove the fake form, or wire it to the booking contract. Hide sections with no content.

### 2. Five designs share one set of fonts

All three typography manifests point to `dejavu-serif.ttf`, `dejavu-serif-bold.ttf`, and `noto-sans-ethiopic.ttf`. Bloom sets Georgia directly in its CSS. Typography is the biggest lever for a distinct identity, and today the templates have none.

Fix: give each template its own licensed, bundled pairing with Ethiopic coverage. Remote font services are blocked by the public CSP, so files go under `appointment/public/` and into the typography manifests.

### 3. Four of five palettes are cream with clay accents

Canvases: #fffaf2, #f2f0e7, #f4efe2, #f7f5ee. Accents include clay #8b3a2c, terracotta #a55238, and vermilion #c43d1b. This is the most common generated-page palette, and it makes the gallery look like one design in five crops.

Fix: rotate palette families when each template is redone (see `design-log.md`). Keep status roles unchanged.

### 4. Template chrome follows generated-page habits

- Eyebrow labels above almost every section: Selam 9, Bloom 10, Abugida 8, against a limit of 4.
- Uppercase and wide tracking on labels that can hold Amharic text.
- Numbered markers (01, 02) on service lists, which are not sequences.
- Em dashes as separators ("People — Hair — A brighter you") and middle-dot strings ("Speak · listen · belong").
- Arrows appended to most links (Selam 8).
- Forced `<br/>` stanzas in headings (Meron 14, Tena 13), which break with Amharic or with the owner's own text.
- Floating corner captions ("Come / as you / are", "People / conversations / better days").
- Several labels for one intent on the same page, such as Meron's "Book a fitting" and "Our approach", which both lead to booking.

### 5. Layout and CSS details

- Every template uses `100vh`, which jumps on mobile browsers. Use `100dvh`.
- Selam has 9 different corner radii with no written rule.

### 6. Recipe copy says nothing to owners

All five recipe `description` fields say "<Name> is an independently implemented, art-directed public template package." Owners read this in the design gallery. Changing it changes the recipe fingerprint, so it needs a new recipe version.

## Suggested order for the UI work

1. **Content ownership:** move hard-coded copy to content and i18n, remove fake controls. This is a correctness fix, not taste, and it touches every template.
2. **One template end to end as the pilot:** design read, token plan, new type pairing, palette, and layout per the skill. Start with Tena. A clinic has the strictest trust needs and the most invented claims today.
3. **The remaining four templates:** one at a time, each logged in `design-log.md` so none repeats another.
4. **Recipe v2 manifests:** real descriptions and the new typography and palette primitives.
5. **Staff app:** run the `staff-app.md` pre-flight on each priority page.

Each step ends with runner captures (1440 and 390, light and dark, `en` and `am`) and a clean lint.

## Taste v1

Date: 2026-09-30. Worktree: `feat/analytics-operations`. Site: `meet-beta-feat-analytics-operations-f2ca8e.localhost`. All five steps are done. Nothing is committed.

Browser checks ran only through the Agent Plane runner (`appointment.qa_runner.run`, `fixture_scope: rich_demo`). Manifests are in `qa/manifests/taste-v1/`; `generate.py` writes them. Evidence is in `qa/evidence/taste-v1/`: WebP captures plus a `summary.json` per set with the run ID and, per scenario, the pass state, console and network error counts and horizontal overflow. `qa/collect-taste-evidence.py` copies runner output into that folder.

### Lint

`node .claude/skills/design-taste/scripts/taste-lint.mjs` exits 0.

| Package | Errors | Warnings |
|---|---|---|
| tena-v2, selam-v2, bloom-v2, meron-v2, abugida-v2 | 0 | 0 |
| tena, selam, bloom, meron, abugida (v1, kept for pinned releases) | 0 | 1-2 each (Georgia fallback, uppercase rules, Selam radius count) |

The v1 warnings stay because v1 exists only to render releases that were published on it.

### Step 1: content ownership

What changed:

- All five v1 packages render only release content or translated chrome. Removed: about 160 hard-coded strings, every hard-coded `alt`, Selam's invented class times and "spots left", Bloom's fake booking form and rotated badge, Meron's invented founder quote, Tena's trust strip and "Sample clinic location", Abugida's word marquee, corner captions, forced `<br/>` stanzas and em dashes.
- Templates no longer borrow the showcase businesses' support photos (`support/<site>/scene-N.webp`), which any business picking the template used to inherit. Photos now come from release content or from the recipe's image roles with their catalog alt text.
- Section schemas (`section_schemas.py`) accept optional `image` (a packaged asset) and `imageAlt` (localized) on service items, provider items, location items and the about section. Releases without them stay valid, and templates hide the image.
- Chrome strings are in `publicSite` in `en.json` and `am.json` (19 strings, no case-only duplicates). `templates/chrome.ts` reads them for the page locale, not the staff-app language.
- Section anchors match the content actions (`#faq`, `#contact`); "Read arrival information" used to point nowhere.
- Booking links keep the page language: `/slug/book?locale=am`, and "Back to site" returns to `/slug/am`.
- Fonts are self-hosted for the whole app. `index.html` used to load Inter, Plus Jakarta Sans and Noto Sans Ethiopic from Google Fonts. Every page then waited on a CDN the runner cannot reach (136 s page loads, one console and one network error per page). The files are now in `appointment/public/fonts/app/` and `src/fonts.css`.
- Seeder (`appointment/demo/showcase.py`, `showcase_public.py`): the same copy now arrives as content, with Amharic for every localized string except personal and business names and bare numerals, owner photos with written alt text, hyphens instead of en dashes, no middle dots in summaries, and `am` enabled as a second locale (Partial). `PUBLIC_EXPERIENCE_VERSION` went 11 → 13; you approved the two runs.

Checks: lint `literal-copy`, `literal-alt` and `fake-control` are zero for all ten packages. Amharic pages: all 40 Amharic landing and handoff snapshots contain no English chrome string or label (checked against every `publicSite` value). The same check finds them on the English pages, so it works.

Runs: `BQA-2026-00245` (light) and `BQA-2026-00246` (dark), 20 scenarios each, all five v1 templates, landing and `/book`, 1440 and 390, zero console and network errors, no overflow. Evidence: `qa/evidence/taste-v1/step1-light/`, `step1-dark/`.

### Step 2: Tena pilot

Design read, grounding, token plan and the review against `tells.md` are in `design-log.md` (tena-clinic v2), written before the code.

- Palette: cool mineral white, scrub teal and signal yellow (fills only). Contrast: text 13.8:1, muted 6.1:1, button 8.4:1, dark mode 9.5:1 or better.
- Type: Atkinson Hyperlegible Next (Braille Institute) with Noto Sans Ethiopic, both OFL, subset to 37 KiB and 165 KiB. Licenses sit next to the files; `scripts/build_public_fonts.py` rebuilds them.
- Layout: contained split hero, services as a reception board (the one bold thing), asymmetric about with the facts, staff directory, stepper, quote, accordion, arrival card, booking band. Radius system 6 px controls, 10 px panels.
- New primitives: palette `tena-clinic` v2, typography `tena-clinic` v2, surface `tena-clinic` v2, layout `tena-clinic` v2. v1 files are unchanged.
- The pilot captures went to you mid-run. Pilot fixes: button text contrast, headline on two lines, dark-mode band, and one accessory removed.

Runs: `BQA-2026-00265` to `00268`. Evidence: `qa/evidence/taste-v1/tena-*`, `tena-pilot-*.jpg`, `tena-source-vs-browser.jpg`.

### Step 3: the other four

One at a time, each logged in `design-log.md` before its code. No two templates share a display face, a palette family or a hero composition:

| Template | Palette | Display / Ethiopic | Hero | Bold thing |
|---|---|---|---|---|
| selam-movement | chalk sage, moss olive, lime | Figtree / Menbere | stacked type, then full-bleed panoramic strip | the panoramic strip |
| bloom-hair | lilac white, aubergine, marigold | Anton + Karla / Noto Sans Ethiopic Condensed | full-bleed poster with anchored panel | the poster panel |
| meron-atelier | chalk grey, navy wool, chalk blue | EB Garamond / Noto Serif Ethiopic | centered label over a triptych | the triptych |
| abugida-language | paper white, ink, rubric red | Alegreya / Abyssinica SIL | edge-bleed photo, copy on a red rule | the manuscript rule |

Found and fixed in the browser:

- Faces of one family with different `font-weight` ranges made Chrome skip the Latin face (Abugida rendered in DejaVu Sans). All families now share one descriptor, and every landing manifest asserts that its Latin face is requested (and its Ethiopic face in `am`).
- Lazy images were missing from full-page captures.
- Selam's lime band and Tena's band turned bright in dark mode.
- Bloom's headline wrapped to four lines.
- Public pages opened a realtime socket they never use. It produced intermittent `socket.io` 400s. `RealtimeProvider` now skips guest surfaces (public sites, `/book`, `/schedule/`); `tests/realtime-lifecycle.test.mjs` covers it.

Full matrix, all five v2 templates: landing, `/book` and scheduler; 1440 and 390; light and dark; `en` and `am`. That is 120 scenarios, with zero console errors, zero network errors and no horizontal overflow.

| Template | light en | dark en | light am | dark am |
|---|---|---|---|---|
| tena | 00265 | 00266 | 00267 | 00268 |
| selam | 00269 | 00285 | 00286 | 00272 |
| bloom | 00273 | 00274 | 00275 | 00276 |
| meron | 00277 | 00278 | 00279 | 00280 |
| abugida | 00281 | 00282 | 00283 | 00284 |

(Run IDs are `BQA-2026-<n>`. Selam `00270` and `00271` each had one socket 400 before the realtime fix; `00285` and `00286` re-ran them clean.) Evidence: `qa/evidence/taste-v1/<template>-<scheme>-<locale>/`.

`qa/manifests/rich-demo/public-dark.yaml` and `public-light.yaml` now wait for the template root and a link into `/book` instead of `booking-service`: `BQA-2026-00295` and `00296` pass with zero errors.

#### Deliberate differences from the reference boards

`qa/evidence/taste-v1/<template>-source-vs-browser.jpg` puts each board next to the v2 desktop and the Amharic phone capture. The boards were layout and tone references; v2 departs from them on purpose:

- All: no board copy ("Good hair. Great energy.", "Feel heard. Feel cared for."), no invented claims, captions, quotes or trust strips. Text is the business's own content.
- All: new palettes and typefaces. The boards used the cream and terracotta family and one shared serif, which the audit flagged.
- Tena (Quiet Trust board): same split hero and section order; the services become a board with duration and price; no leaf ornament.
- Selam (Warm Vitality board 03): the round badge and class timetable are gone; a panoramic strip replaces the arched photo.
- Bloom (Warm Vitality board 01): the board's booking form and "Come as you are" badge are gone; the hero is a poster instead of a split.
- Meron and Abugida (Crafted Editorial board 01): the two templates used to share one board and look alike. Meron is now centered and symmetric; Abugida is an edge-bleed manuscript page.

### Step 4: recipe v2

- `recipes.py` keeps every version loadable (`RECIPE_MANIFESTS` maps key → version → file). `get_recipe(key)` and the gallery return the latest; `get_recipe(key, 1)` still resolves releases pinned to v1.
- The frontend registry resolves by `rendererKey@rendererVersion`. Releases on v1 render the v1 package; v2 releases render the new one. The v1 recipe hashes are unchanged.
- Recipe v2 files have real `description` and `audience` text. The design gallery card now shows the description, and the side panel shows the description and "Best for". The v1 mood labels no longer match the designs, so the gallery no longer shows them.
- Tests: `test_published_recipe_versions_stay_loadable_and_the_gallery_offers_the_latest` and `test_taste_v1_typography_is_distinct_and_bundled` (Frappe, `appointment.tests.test_public_experience_contracts`, 10 tests OK). `tests/public-template-packages.test.mjs` asserts both versions are registered for all five.
- Browser: the gallery at `/settings/public-experience` shows v2 for all five (`BQA-2026-00293`, `00294`).

### Step 5: staff app pre-flight

Pages: home, calendar, reception, analytics, settings, team (plus the design gallery), as `bloom.owner@example.test`, 1440 and 390, light and dark.

Fixed:

- Page header eyebrows: Home's greeting and Analytics' "Business intelligence" are removed. `PageHeader` renders any remaining context line in sentence case without tracking.
- Uppercase tracked micro-labels, which Ethiopic cannot carry: settings group headings, calendar list day headings, reception weekday headers, booking form legends.
- Metadata with more than one middle dot and an en dash range: Home and Analytics descriptions.
- Raw `bg-blue-500` on the shared date picker's selected day now uses `bg-primary`.

Unchanged: routes, permissions, API contracts and `data-qa` attributes.

Runs: `BQA-2026-00293` (light), `BQA-2026-00294` (dark), 14 scenarios each, zero console errors, zero network errors, no overflow. Evidence: `qa/evidence/taste-v1/staff-light/`, `staff-dark/`.

### Tests

- Frappe: `test_public_experience_contracts` 10 OK, `test_showcase_catalog` 3 OK, `test_public_deployment` 7 OK.
- Frontend: `npm run test:dom` passes. Eslint is clean on every changed file. `tsc` shows 181 errors, all in `src/pages/tasks` and present before this work; none are in changed files.

### Left undone, and why

- The scheduler (`/schedule/org/...`) has no translations. It stays English on Amharic visits. Translating it is outside this brief.
- The scheduler keeps its own primary-to-accent gradients from the booking interaction model.
- Reception logs one console warning (not an error) in development builds: framer-motion's "You have Reduced Motion enabled", because the runner emulates reduced motion. Wrapping the app in `MotionConfig` made the warning appear on every page, so I reverted it.
- One staff socket 400 appeared once (`BQA-2026-00288`, settings, phone, dark) and did not repeat in `00290` to `00294`. It is the dev stack's socket server, not page code.
- An owner who opens the editor and saves moves the brand profile to v2. The existing rule then requires the site to match before the next publish. The live site keeps rendering its pinned release. This behavior predates Taste v1.
- The v2 recipes keep v1 `mood` values. They are published now and cannot change in place; a v3 can replace them.
- `appointment/www/*.html` are build outputs and still reference Google Fonts until the next `npm run build`. The platform marketing landing pages (`/`, ink, buna, day) still import Google Fonts; they are not public templates or staff pages.
- The onboarding wizard uses Tailwind palette colors. It is not one of the priority pages.
- Person and business names have no Amharic transliteration, so they show in Latin script.
