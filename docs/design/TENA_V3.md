# Tena v3, "Clear Path"

Tena v3 is the phase 2 redesign of the clinic template (`TEMPLATE_REIMAGINATION.md`, section 5.3). It is a new versioned package: recipe `tena-clinic` v3, renderer `tena-clinic@3`. Tena v2 stays registered. A site that is published on v2 does not change until its owner switches the template and publishes again. The Tena showcase (`/tena-studio`) now uses v3. New sites that choose Tena get v3, because the gallery and website setup offer the latest recipe version.

The behavior comes from the headless kit (`TEMPLATE_V3_KIT.md`). Every visual is in the package. Bloom v3 (`BLOOM_V3.md`) is the reference. Tena v3 imports nothing from it.

## Concept

A modern, calm private clinic with very good signage. The page is bright, orderly and reassuring, never cold. After dark, the same clinic is lit at dusk.

- Palette: the v2 palette. Mineral white canvas, scrub teal `#0b5563`, and signal yellow `#f2c14e`. Deep teal `#0b3d48` for the lit boards. Dark mode is the after-hours clinic: deep teal surfaces, teal glows and yellow plates that look backlit.
- The yellow rule: yellow marks "when and where" only. Durations, times, steps, the route stops, the open-hours badge, the "You are here" plate and the chosen day and time on the booking pages. Text and actions are never yellow.
- Type: Atkinson Hyperlegible Next for Latin text and Noto Sans Ethiopic for Amharic (typography `tena-clinic` v2). Amharic headings get more line height and no tracking.
- Open figures: Atkinson Hyperlegible Next has only a slashed zero, so "ETB 700" looked like "ETB 7ø0". The package adds "Tena Figures", the ten digits of the same font with an open zero (`appointment/public/fonts/tena/tena-figures-400.woff2` and `-700.woff2`, 1.7 KB each, SIL OFL 1.1). `scripts/build_tena_figures.py` makes them. The stylesheet puts "Tena Figures" in front of the body face with `unicode-range: U+0030-0039`, so only the digits change. The booking skin does the same through its font tokens.
- Shape: the rounded signage plate and the route line. Photos sit in rounded plates with a small yellow tab. A dashed teal route line runs down the left edge of the page like a floor marking.

## Sections

| Section | What it shows | Content source |
|---|---|---|
| Bar | Logo, name, nav, a call chip on phones, the booking action, the mode switch (circular reveal), and a dashed reading-progress line | Identity, `contact.phone` |
| Hero | A cinematic split. Left: the greeting by Addis time, the open-now badge, the headline, an oversized wayfinding arrow that draws from the headline to the booking action, the call link on phones. Right: the entrance photo (day or dusk) with a "You are here" plate and a glass card with the next free time of each service | `hero`, `placeHours`, live availability, role `hero.tena` |
| Appointment board | An illuminated departure board: one row per service with a photo, the duration on a yellow plate, the price in open figures, the next free time and an arrow. The photo of the row under the pointer or the focus shows on a screen next to the board | `services` (photo, else `care1–3.tena`) |
| Your visit, door to door | A sticky photo that changes with the step in view, and the steps as numbered plates joined by a dashed line. On phones each step shows its own photo | `process` (photo per step, else `visit1–4.tena`) |
| Clinic directory | A lit lobby directory: big portraits (4:5), the room-tag number, name, role, specialties, the next free time and "Book with Dawit". A swipe rail on phones | `providers` |
| Story | The wide team photo with an overlapping signage card and a checked list | `about` (photo, else `section.detail`) |
| The clinic in short | Large open figures that count up, over the reception counter photo | `proof` (photo, else `proof.tena`) |
| Benefits | A bento of wayfinding pictograms and one photo tile | `benefits` (photo, else `benefit.tena`) |
| Reviews | Three or more: a two-row marquee of signage cards with a pause button. Fewer: one pull quote with a photo | `testimonials` |
| FAQ | An accordion with a plus that turns to a minus, a photo, the call link and the weekly hours with the International / Habesha switch | `faq` (photo, else `faq.tena`), `placeHours` |
| Rooms | Tabs that change the room photo, the open-now badge, the address, a copy chip, the phone, the directions and a drawn area map | `locations` (photo, else `room1–3.tena`) |
| Booking band | The clinic front (dusk after dark) with the "Booking desk" plate where the route line ends, a glass card, the next free time and "N times left today" | `booking_cta` (photo, else `band.tena`) |
| Footer | The short name on a large signage plate, the open-now badge, links, the booking action, the call link and the credit | `footer` |
| Phone | A booking bar in the thumb zone with a call button. It hides over the booking band | |
| Desktop | Section dots on the right as floor numbers | |

Every section has a photo or a drawing. Each section in the route has a numbered stop on the route line. A stop turns yellow when the visitor reaches it.

### Signature motion

The route line draws down the page as the visitor scrolls (CSS `view-timeline`, or `--p` from `useScrollProgress` where the browser has no scroll timeline). Other motion: the wayfinding arrow draws on load, reveals rise or open like a sliding plate, the proof numbers count up, the band and proof photos move a little (parallax), and pointer effects (magnetic actions, a glow under the pointer, zoom and pan on photos). `expressive` adds a slow drift of the hero photo. Reduced motion shows the final state: the route is drawn, nothing moves, and the reviews are a still grid.

### Night photos (addition A1)

- Dark mode always shows the dusk photos of the hero and the booking band.
- Light mode shows them from 18:00 to 06:00 Addis Ababa time. The hero copy then stands on a deep teal dusk stage, so the page reads as one evening scene.
- Other photos have no night version. In dark mode they get a soft teal grade.

### Additions A2 to A6

- A2, the success moment: "a check along the route" (`TenaMoment.tsx`, `moment.css`, loaded only after a booking). A dashed route draws in from both sides of the confirmation header, four stops light up in turn, and a yellow plate settles behind the check. With reduced motion the finished route shows at once.
- A3: zoom and pan on photos under a fine pointer (`data-pan`).
- A4: the shared booking flow calls `haptic("select")` on a time pick and `haptic("success")` after a booking.
- A5, the loading screen (`TenaLoading`): the bar, the hero bones with a yellow plate, and a dashed route line that keeps moving. It shows on the site and on the handoff.
- A6: section dots as floor numbers on desktop.

## Booking journey

The `/book` handoff (`/tena-studio/book`) uses the clinic front as its stage. The glass panel (the view-transition target, `data-vt-book`) has the greeting, the booking action, the next free time, the open-now badge, the address and the call link. Each service row is a link to that service's time picker with any clinician (`snapshot.bookingPaths`). On Amharic pages the links carry `lang=am`.

The booking skin (`tena-v3/booking.tsx`, `booking.css`, registered as `tena-clinic@3` in `SKINS`):

| Page | Tena's skin |
|---|---|
| Header (all steps) | A deep teal signage band in light and dark, with a dashed yellow route line along its foot. Each step is a stop on the route: a rounded plate with the number, yellow for the current step, a tick for a done step, and dashed lines between the stops |
| Page background | A faint, blurred echo of the clinic front (`band-w640`, the dusk file in dark mode). No grid pattern |
| Service chooser | Bold headings, the clinic logo, service photos in signage-plate frames with a yellow tab, rounded portraits |
| Time picker | The service photo at the top of the summary. The chosen day and the chosen time are yellow plates ("when" is yellow). The Continue button is teal |
| Details | The service photo in the summary, the teal confirm button |
| All pages | Open figures for prices and times (`--booking-font-body` with "Tena Figures" in front) |
| Confirmation | The check along the route (`TenaMoment`) |

The skin has no parallax, marquee, count-up or moving image. The only motion is the shared pick feedback and the success moment.

## Images

All photos are original and generated for this package with the Codex CLI (`codex exec --skip-git-repo-check -m gpt-6.1-sol --sandbox workspace-write -C <scratch dir> "<prompt>"`), with the built-in image tool and no drawing code. Four runs on 2026-10-15: the hero, the band, the proof counter and the team (with the two dusk edits); the visit, FAQ, benefit and room scenes; three service scenes; and one more room. Codex looked at each image and regenerated any with text, a patient face or extra fingers. The dusk photos are edits of the day photos, so the composition matches. A Pillow script crops each image to its slot and saves WebP (quality 76, `method=6`) and AVIF (quality 52) for the desktop file, the smaller widths and the mobile crop.

The imagery manifest `manifest/design/imagery/tena-clear-path.v1.json` records 16 roles with the alt text, focal point, sizes, `darkSrc`, `formats`, `widths` and the SHA-256 of every file. The showcase catalog (`catalog.v1.json`, site `tena`) lists all 126 files with their checksums in `templateAssets`. The showcase content gives each photo an Amharic description.

18 generated photos (16 roles, the dusk hero and the dusk band), 126 files, 5.1 MB in `appointment/public/brand-experience/support/tena-v3/`.

| File | Desktop | Mobile | AVIF (desktop) |
|---|---|---|---|
| `hero` | 1280x1024, 86 KB | 720x800, 53 KB | 60 KB |
| `hero-night` | 1280x1024, 81 KB | 720x800, 50 KB | 57 KB |
| `band` | 1536x880, 198 KB | 720x900, 83 KB | 121 KB |
| `band-night` | 1536x880, 152 KB | 720x900, 63 KB | 101 KB |
| `proof` | 1536x658, 57 KB | 720x900, 20 KB | 38 KB |
| `team` | 1536x658, 50 KB | 720x540, 28 KB | 38 KB |
| `visit1` … `visit4` | 880x1100, 40–122 KB | 720x540, 22–58 KB | 28–77 KB |
| `faq` | 960x720, 38 KB | 720x540, 24 KB | 26 KB |
| `benefit` | 900x900, 34 KB | 720x540, 19 KB | 25 KB |
| `care1` … `care3` | 900x900, 32–85 KB | 600x600, 19–48 KB | 22–55 KB |
| `room1` … `room3` | 1440x960, 67–104 KB | 720x540, 26–36 KB | 46–70 KB |

Each desktop file also has `-w640`/`-w960` (scenes), `-w560` (visit, FAQ, benefit) or `-w480` (service photos) versions for `srcset`.

The staff portraits of the directory are the existing showcase portraits (`providers/dawit-haile.webp`, `saron-mekonnen.webp`, `yonas-assefa.webp`).

### Prompts

Every prompt starts with the shared art direction:

> Modern, calm private family clinic in CMC, Addis Ababa, Ethiopia. Bright clean daylight, mineral white walls, deep scrub teal and warm light wood, a few small signal-yellow details (a yellow chair cushion, a yellow handrail cap, a yellow floor stripe), healthy green plants. Documentary healthcare photography, reassuring and orderly, 35 mm lens feel, natural colour, gentle contrast. Never cold, never sterile-blue. Rules: fictional people only. No text, letters, numbers, logos, signage words, brand marks, clocks, posters or readable screens or charts anywhere (any sign or panel must be blank or plain colour). No medical gore, no needles, no blood, no syringes, no pills close-up. FACES RULE: clinic staff (clinicians in teal scrubs or white coats, the receptionist) may show their faces with a calm, natural, warm expression (not a stock smile, not posed); PATIENTS AND VISITORS MUST NEVER SHOW THEIR FACE: they are seen from behind, from the back of the shoulder, or out of frame. Rich, real Ethiopian skin tones. Photorealistic, no illustration look, no extra fingers, natural hands.

| File | Scene |
|---|---|
| `hero` | The entrance and reception, wide. A clinician in teal scrubs (face visible) welcomes a mother and her small daughter, both seen from behind, at the open glass door. A wooden counter, a receptionist in soft focus, a blank teal panel, a yellow floor line. |
| `hero-night` | The same scene, camera and people at dusk: a deep blue evening outside, warm lamps and a teal ceiling glow. An edit of `hero`. |
| `band` | The clinic front window and teal door from a quiet tree-lined street in late afternoon, a yellow bench, no people, no sign. |
| `band-night` | The same building at dusk, every window lit, a teal glow at the door. An edit of `band`. |
| `proof` | A detail of the wooden reception counter: a plant, blank cards, a teal pen holder and a small yellow bell. |
| `team` | Three clinicians stand together in the bright corridor (faces visible), a yellow floor line behind them. |
| `visit1` | The open white gate and the garden path to the teal door. |
| `visit2` | The receptionist (face visible) greets a visitor seen from behind. |
| `visit3` | The waiting corner: wooden armchairs, a yellow cushion, a water carafe, plants, a tall window. |
| `visit4` | The consultation room: a wooden desk, two chairs, a window over the city. |
| `faq` | A clipboard with blank paper, a pen and a glass of water on a side table by a window. |
| `benefit` | A clinician's hands draw a diagram of circles and arrows on blank paper; the patient's hands at the edge. |
| `care1` | A clinician (face visible) listens across a desk to a patient seen from behind. |
| `care2` | A clinician points with a pen to a blank page in a folder; the patient's hands rest on the desk. |
| `care3` | A clinician in a white coat (face in three-quarter view) walks with an older patient seen from behind on a garden path. |
| `room1` | Consultation room one from the doorway: a teal chair at a desk, an examination couch with a teal blanket, a yellow stool, sheer curtains. |
| `room2` | Consultation room two: a teal accent wall, a desk, two chairs, a city view. |
| `room3` | Consultation room three: a round table with three teal chairs and a shelf with a folded yellow blanket. |

## Showcase

The seeder moved the showcase to v3 (`appointment/demo/showcase.py`, `PUBLIC_EXPERIENCE_VERSION` raised by one on each run). Nothing was changed by hand.

- The catalog site `tena` has `heroRole: hero.tena`, `detailRole: visit2.tena`, the v3 hero checksum and `templateAssets`.
- The brand profile uses motion `expressive` and the short name "Tena".
- `booking_json.liveAvailability` is on.
- The content (`showcase_public.py`, the Tena block at the end) uses the v3 photos for the hero, the story, the services, the three rooms and the four visit steps, with Amharic descriptions (`V3_SCENES["tena"]`). The visit has four steps, one for each photo (gate, reception, waiting corner, consultation room). The proof is the clinic in numbers (`PROOF["tena"]`: 3 rooms, 3 clinicians, arrive 10 minutes early). There are five consented reviews (`EXTRA_TESTIMONIALS["tena"]`), with no patient photo.
- The seeder applies a photo to each process step when `V3_SCENES` has a `process` list (all v3 showcases can use this).

## Browser QA (Agent Plane, 2026-10-15)

Fixture: `appointment.tests.template_tena_v3_qa_fixtures` (setup before, cleanup after). The success scenarios book appointments for the QA client Kidist Haile. `cleanup()` deletes them by the client's exact email or exact phone and name.

| Run | Manifest | Result |
|---|---|---|
| BQA-2026-00350 | `template-tena-v3.yaml`: en and am, 1440 and 390, light, full motion. Every section, the review pause, the FAQ and the Habesha clock, the room tabs, the band, the footer, a full page, the handoff after the view transition, the chooser and the time picker. | Passed, 0 console, 0 network errors |
| BQA-2026-00359 | `template-tena-v3-dark.yaml`: en and am, 1440 and 390, dark, reduced motion. Dusk photos, the still review grid, a full page, the mode switch both ways, the handoff and the chooser. | Passed, 4 console messages (the known framer-motion reduced-motion notice of the scheduler), 0 network errors |
| BQA-2026-00356 | `template-tena-v3-states.yaml`: dusk photos in light mode after 18:00, the morning (closed until 08:00), live availability on, off and empty, the loading screens (site light, handoff dark, Amharic phone), and a booking from the landing page to the confirmation with the check along the route. | Passed, 0 console, 0 network errors |
| BQA-2026-00354 | `booking-journey-tena.yaml`: English desktop light, and Amharic phone dark with the Saron filter, from the landing page through the handoff, the time picker, the chooser and the details form to the confirmation. | Passed, 0 console, 0 network errors |
| BQA-2026-00361 | `template-gallery.yaml` (existing) after the gallery recapture | Passed, 0 console, 0 network errors |

Earlier runs on the same day (BQA-2026-00334, 00336, 00338, 00342) also passed. After them, the live card on phones moved onto the hero photo (it pushed the page down when it arrived: CLS 0.14), the handoff "Back to site" link stopped wrapping in Amharic, the calendar shows the chosen day as a yellow plate, and room one got its own photo.

## Review

Reviewed at 1440 and 390, light and dark, English and Amharic, as an art director and as a conversion designer.

- The hero now reads as a clinic entrance: the photo fills 54 % of the screen, the "You are here" plate and the wayfinding arrow say "this way to booking", and the live card puts three real times next to the photo. The dusk version (dark mode or after 18:00) is calm and warm, not a recolour.
- The appointment board is the strongest section: it scans like a reception board, and the yellow duration plates and open-figure prices are easy to compare. Zeros are now open on every page, including the booking pages.
- The directory gives each clinician a 4:5 portrait about 400 px wide. People are now the main trust signal, as they should be for a clinic.
- The route line and the numbered stops connect the page without noise. On phones the line is thin and the stops are small squares, so they do not compete with the content.
- Conversion: the booking action is in the bar, the hero, each board row, each directory card, the band, the footer and the phone bar. A call link sits next to it on phones. On the booking pages, yellow marks only the chosen day and time, so the choice is clear at a glance.
- Open points: the full-page captures show the lower board rows and the proof numbers mid-reveal or mid-count, because the capture does not wait for the motion. The Amharic page shows the clinic and clinician names in English, because the showcase content has no Amharic names. The section dots on desktop sit close to the board's photo screen at 1440 px.

## Performance

Measured with a Playwright script on production builds (`vite build`) of `develop` (ad7c51f) and of this work, served one after the other by the stack's web port with the same data, cache off. Phone: 390 px, 9 Mbps, 170 ms, CPU 4x. Three other agents used the machine at the same time, so a single measurement varies by about 1 s; the table gives medians.

| Page | Before (ad7c51f) | After |
|---|---|---|
| Service chooser `/schedule/org/tena-studio` (7 rounds) | LCP 3.31 s, CLS 0.005, 271 KB images | LCP 3.54 s, CLS 0.006, 296 KB images |
| Same, 4 more rounds in turn | LCP 3.84 s | LCP 3.61 s |
| Time picker, `with=any` (4 rounds) | LCP 4.86 s, CLS 0.003, 80 KB | LCP 4.93 s, CLS 0.003, 105 KB |
| Bloom landing (unchanged template, control) | LCP 4.11 s | LCP 5.36 s |
| Tena landing, phone | Not comparable: the `develop` build has no `tena-clinic@3` package, so the v3 release fails closed | LCP 5.23 s, CLS 0, 263 KB images |
| Tena landing, desktop 1440 | | LCP 1.73 s, CLS 0, 516 KB images |

The chooser and the time picker did not get slower: the differences are smaller than the noise (the Bloom control moved 1.2 s with no change). Blocking the "Tena Figures" font or the backdrop photo did not change the chooser LCP. The chooser LCP element is still the business description. The phone landing LCP element is the hero photo (the mobile AVIF is 36 KB). CLS is 0 and the first-load image weight is 263 KB on a phone, within guardrails G1 and G2. The phone LCP misses 2.5 s, as for every template: the time goes to the app shell (see `BLOOM_V3.md`, "Performance").

## Files

- Package: `frontend/src/public-experience/templates/tena-v3/` (`TenaTemplate.tsx`, `parts.tsx`, `art.tsx`, `TenaMoment.tsx`, `booking.tsx`, `tena.css`, `booking.css`, `moment.css`), registered as `tena-clinic@3` with `Loading`, the moment and the booking skin.
- Recipe and primitives: `recipes/tena-clinic.v3.json`, `layouts/tena-clinic.v3.json`, `surfaces/tena-clinic.v3.json`, `imagery/tena-clear-path.v1.json`, `recipes.py`.
- Fonts: `appointment/public/fonts/tena/tena-figures-400.woff2`, `-700.woff2`, `tena-figures.OFL.txt`, `scripts/build_tena_figures.py`.
- Showcase: `appointment/demo/showcase.py`, `showcase_public.py`, `catalog.v1.json`, gallery previews `template-gallery/tena-clinic-desktop.webp` and `-mobile.webp` (`scripts/capture_template_gallery.py http://localhost:47800 tena-clinic`).
- QA: `qa/manifests/growth/template-tena-v3.yaml`, `-dark.yaml`, `-states.yaml`, `booking-journey-tena.yaml`, `appointment/tests/template_tena_v3_qa_fixtures.py`.
- Tests: `appointment/tests/test_template_tena_v3.py`, `test_public_experience_contracts.py`, `frontend/tests/public-template-packages.test.mjs`, `booking-skin.test.mjs`.
- Translations: `publicSite.tena.*` in `en.json` and `am.json`.
