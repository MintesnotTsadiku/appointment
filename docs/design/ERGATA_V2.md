# Ergata v2: "a calm room to talk", at v3 parity

Ergata v2 brings the therapy template to the level of the v3 packages (`TEMPLATE_REIMAGINATION.md`, section 5.6 and the 16 consistency requirements in section 8). It is a new versioned package: recipe `ergata-therapy` v2, renderer `ergata-therapy@2`. Ergata v1 is retired (`recipes.RETIRED_VERSIONS`): it is no longer offered, but it stays registered, so a site published on v1 does not change until its owner switches the template and publishes again. The Ergata showcase (`/yared-counselling`) now uses v2. New sites that choose Ergata get v2.

The behavior comes from the headless kit (`TEMPLATE_V3_KIT.md`). Every visual is in the package. The package uses its own class prefix (`.eg2-`, custom properties `--e2-*`), so its stylesheet never styles a v1 page.

## Concept

Ergata keeps everything that made v1 the reference: the arched window as the one shape, a picture in every section, drawings that recolour with the palette, the calm serif voice, the safety notice in clay. v2 adds:

| Addition | What it does |
|---|---|
| Night photos (N1) | After 18:00 in Addis Ababa, and always in dark mode, the hero and the booking band show the same room lamp-lit at dusk and the arched window at evening. In dark mode the other photos get a soft forest grade. |
| Deep-sage band (D7) | "Approaches" is the one deep band of the page: the night walk between lighter bands. A thin lamp-gold path draws itself across the band as the visitor scrolls. |
| Gentle parallax (X3) | The organic shapes, the sprigs, the small window over the room photo and the band window move a little faster or slower than the page. The hero photo drifts inside its arch, and on "expressive" it zooms very slowly. |
| Next free introductory call (P1) | The hero, the booking band and the handoff say "Next free introductory call: today 16:00" when the owner turned live availability on. Each session card and the therapist card show their own next free time. |
| Kind words (C6 / P5) | Three or more consented quotes: a slow marquee of quiet cards next to an arched photo of two cups, with a pause button. One or two: a pull quote. |
| Time of day (A1) | "Good morning / afternoon / evening" by the Addis Ababa clock, with a small sprig, above the eyebrow. |
| Phone booking bar (Mo1) | A thumb-zone bar after the hero (arch mark, next free time, booking action); hidden while the booking band is in view. The header keeps only the name and the mode switch on phones. |
| Swipe rails (Mo2) | "What we can work on" and "Sessions and fees" become snap-scrolling rails on phones, with a "Swipe for more" hint. |
| Mobile hero | On phones the copy flows first (greeting, eyebrow, headline, lede, action, next free call) and the arch peeks into the first screen; the meeting formats and the reassurance line move under the arch. |
| Hours with the Habesha clock | Each place card shows "Open now · closes at 18:00" and its weekly hours (from `snapshot.placeHours`). One International / Habesha switch over the places; Habesha first on Amharic pages. |
| Section dots (A6) | Small arched dots on the right edge on wide screens, after the hero. |
| Zoom and pan (A3) | Photos in arches zoom and follow a fine pointer. |
| Loading screen (A5) | `ErgataLoading`: linen bones and an arch that fills slowly with dawn light. |
| Success moment (A2) | `ErgataMoment`, "a calm glow": a warm lamp light blooms behind the confirmation, an arched window draws itself, a few motes of light rise. Reduced motion: the glow and the window rest, still. |
| Photos in every section | New photos for the kind words (two cups on a sill) and the "ask a question first" strip (a hand writing in a notebook, the phone face down). |
| Holiday moments (A7) | A linen card with a small drawing in an arched window, in the hero copy. See `TEMPLATE_V3_KIT.md`, "Holiday moments". |

Kept from v1: the online and office session formats (from `sessionFormats`/`placeFormats` or content), every owner image slot of the website editor, the Amharic copy, the safety notice, and the per-session scheduler links.

## Motion

Showcases use `expressive`; new sites get `standard` (the recipe offers calm, standard and expressive). `calm` keeps short reveals only. `standard` adds parallax, the drawn path, the lamp glow on the "next free" dots, the breathing shapes, pointer zoom and the marquee. `expressive` travels further and adds the slow drift on the hero photo. Reduced motion shows the final state of everything, a still review grid and no pointer effects. Reveal looks: `rise` and `arch` (a clip-path that opens like the hero window).

## Booking journey

- The `/book` handoff is the template's own page: the dawn window (night window after dark), the greeting, the booking action, the next free introductory call, the reassurance line, the compact safety notice, and one link per session (format icon, length, fee, next free time) to that session's own scheduler. The links carry `lang` and move inside the app. The panel is the target of the booking view transition (`data-vt-book`).
- The booking skin (`ergata-v2/booking.tsx`, `booking.css`, `SKINS` key `ergata-therapy@2`, name `ergata-v2`): a linen header with a thin sage-and-lamp line, a faint echo of the dawn window (the evening window in dark mode), arched photo frames, the soft serif for headings, a deep-sage pill for the booking action with a soft lamp glow in dark mode, pill times, arched days, slightly arched cards, and a small arched window for each step.
- The skin contract gained an optional `formatPhotoRoles`: the photo of the place where a session meets. The independent scheduler (`/schedule/p/<slug>/<offering>`) now shows, for any template with a skin: the step marks (Time, Details, Done), the place's photo in the summary (the office door for an office session, the quiet desk for a video session), `haptic("select")` on a time, `haptic("success")` and the template's success moment after a booking. Templates without a skin keep the plain header.
- A group practice on Ergata (organization flow) gets the counselling room as the service photo.

## Images

All photos are original, generated with the Codex CLI (`gpt-6.1-sol`, built-in image tool, no drawing code), the same method as `BLOOM_V3.md`. One run on 2026-10-15 (`codex exec --skip-git-repo-check -m gpt-6.1-sol --sandbox workspace-write -C <scratch> -i hero-day.png -i band-day.png < PROMPT.txt`). The night photos are edits of the day photos (given as input images). Codex reviewed each image; it regenerated the square photo once for its pixel size, and the first version was kept.

Shared art direction (every prompt):

> Ergata Therapy, "a calm room to talk": calm, warm, safe, quiet and unhurried. Soft, low-contrast, slightly matte film look. Palette of sage green, warm sand, clay terracotta, oat linen and soft off-white, with deep green shadows. Real, lived-in Ethiopian middle-class settings in Addis Ababa. Editorial photography, 35 mm lens feel. Rules: no text, letters, numbers, logos, signage, brand marks, clocks or readable screens anywhere (any screen is dark or turned away). FACES RULE: no faces at all; no person is shown except where a scene asks for hands, and then only hands and sleeves, never a face. Fictional settings only. Photorealistic, no illustration look, no extra fingers, natural hands.

| File | Scene |
|---|---|
| `hero-night` | An edit of the v1 hero: the same room, olive tree, clay jug, glass and armchair at dusk; deep blue evening and small city lights in the window, a linen table lamp glowing on the side table, the leaf shadows cast by the lamp. |
| `band-night` | An edit of the v1 dawn window: the same arched window after sunset, indigo and violet sky, one or two early stars, small lights on the far hills, lamp glow on the sill and the curtain. |
| `testimonial` | Two small handleless cups (one clay, one off-white) on a wooden windowsill in the late afternoon, leaf shadows on plaster, a folded linen cloth and a sprig. |
| `contact` | A hand and an oat linen sleeve writing in a notebook with blank pages, a phone face down, a clay cup of tea, morning light, a sage curtain. |

`appointment/public/brand-experience/support/ergata-v2/`: 90 files, 4.6 MB. The v1 photos (hero, room, window, needs, approach, faq, office, online, band) are copied byte for byte (no second lossy pass); v2 adds an AVIF file for each WebP file and smaller widths. The four new photos are cropped and encoded with Pillow (WebP q76 `method=6`, AVIF q52).

| Photo | Desktop | Mobile | AVIF (desktop) |
|---|---|---|---|
| `hero` / `hero-night` | 1040x1300, 139 / 115 KB | 640x800, 66 / 58 KB | 71 / 76 KB |
| `band` / `band-night` | 960x1280, 84 / 60 KB | 600x800, 42 / 31 KB | 47 / 44 KB |
| `testimonial` | 960x960, 91 KB | 600x600, 38 KB | 61 KB |
| `contact` | 1440x960, 69 KB | 720x540, 23 KB | 52 KB |

The imagery manifest `manifest/design/imagery/ergata-rooms.v2.json` records 11 roles (`hero.ergata`, `detail.ergata`, `window.ergata`, `needs.ergata`, `approach.ergata`, `faq.ergata`, `office.ergata`, `online.ergata`, `band.ergata`, `testimonial.ergata`, `contact.ergata`) with alt text, focal points, sizes, `darkSrc` for the hero and the band, `formats`, `widths` and the SHA-256 of all 90 files. The showcase catalog entry `ergata` lists every file in `templateAssets`. Scripts: `~/template-v3-work/phase3-ergata/scripts/crop.py` and `make_manifest.py`.

## Showcase

The seeder moved the showcase to v2 (`ergata_showcase.SHOWCASE.version`; `independent_showcase.refresh` now switches the website to the latest version of its template with the product's own `template_switch.switch`, then publishes). Nothing was changed by hand.

- Motion `expressive` (the most expressive level the recipe offers).
- `booking_json`: `liveAvailability` and `holidayGreetings` on.
- Four anonymised, consented client quotes (first name and kind of session only).
- Content photos point at the v2 files, so they keep their night photos, mobile crops and AVIF.
- The FAQ edit is idempotent now: an earlier refresh had added "How do I pay?" more than once.
- The v2 starter copy is `manifest/content/ergata-therapy.v2.json` (the v1 copy with the v2 hero photo).

## Browser QA (Agent Plane, 2026-10-15)

Fixtures: `appointment.tests.template_ergata_qa_fixtures.setup` (the showcase's QA records; never run its cleanup), then `appointment.tests.template_ergata_v2_qa_fixtures` (setup before, cleanup after the journey; it deletes only the QA client's bookings, by exact phone and name).

| Run | Manifest | Result |
|---|---|---|
| BQA-2026-00479 | `template-ergata-v2.yaml`: en desktop and am phone, light, full motion. Hero with greeting and next free call, the needs rail, the deep band, first session, sessions with next free times, therapist, kind words (marquee running, then paused), FAQ, places with the Habesha clock, band, section dots (desktop) and the phone booking bar, full page. | Passed, 0 console, 0 network errors |
| BQA-2026-00482 | `template-ergata-v2-dark.yaml`: en phone and am desktop, dark, reduced motion. Night hero and band, the still review grid (no pause button), places, full page, the mode switch both ways. | Passed, 0 console, 0 network errors |
| BQA-2026-00483 | `template-ergata-v2-states.yaml`: night photos in light mode at 20:30, the morning (closed until 09:00), availability off and empty, the loading screens (site light, handoff dark, Amharic phone), the handoff with six session links. | Passed, 0 console, 0 network errors |
| BQA-2026-00484 | `booking-journey-ergata.yaml`: en desktop light, landing → handoff → office session → time picker in the skin (steps, office photo in an arch) → details (phone first) → confirmation with the calm glow; am phone dark, an online session (`lang="am"` link) to the time picker with the desk photo. | Passed, 0 console, 0 network errors |
| BQA-2026-00486 | `holiday-moments.yaml`: each of the six templates with `?preview-holiday` (en desktop, am phone dark), the real date logic (9 September 2026 → Enkutatash 2019) and an ordinary day without a moment. | Passed, 0 console, 0 network errors |

Earlier runs on the same day (BQA-2026-00416, 00418, 00420, 00422, 00423, 00427, 00429) found and fixed: the kind-words photo hidden on phones, strict-mode selectors in the journey, an Abugida timing flake. The screenshot review found and fixed: the needs rail widening the phone page, the FAQ question repeated by the showcase refresh, the drawn path crossing the approach cards, a pale booking band in dark mode, the duplicate booking action in the phone header, the success glow over the confirmation heading, and the Bloom holiday card touching the poster word.

### Existing manifests run again

| Run | Manifest | Result |
|---|---|---|
| BQA-2026-00438 | `template-ergata.yaml` (now asserts the v2 markup) | Passed, 0 console, 0 network errors |
| BQA-2026-00442 | `template-ergata-dark.yaml` | Passed, 1 console message (the known framer-motion reduced-motion notice) |
| BQA-2026-00462 | `template-ergata-chooser.yaml` (the card shows the v2 hero) | Passed, 4 console messages (sandboxed preview iframe). The first run, BQA-2026-00443, failed on the v1 hero file name. |
| BQA-2026-00463 | `online-location.yaml` | Passed, 2 console messages (reduced-motion notice). The first run, BQA-2026-00445, failed during a stack restart (connection refused). |
| BQA-2026-00446 | `online-location-guest.yaml` | Passed, 4 console messages (reduced-motion notice) |
| BQA-2026-00449 | `online-location-reception-am-dark.yaml` | Passed, 2 console messages (reduced-motion notice) |
| BQA-2026-00452 | `provider-page-branded.yaml` | Passed, 2 console messages (reduced-motion notice) |
| BQA-2026-00465, BQA-2026-00468 | `website-editor.yaml`, `website-editor-am-dark.yaml` (selectors now `.eg2-`; `restore()` after each) | Passed, 0 network errors; console: the known sandboxed preview notices. The first runs (BQA-2026-00454, 00456) failed during the same stack restart. |
| BQA-2026-00471 | `template-gallery.yaml` | Passed, 0 console, 0 network errors. The first run, BQA-2026-00459, timed out on the Bloom preview frame during the restart. |

### Review

Reviewed at 1440 and 390, light and dark, English and Amharic, full page and per section. The hero reads as the same calm room, and the lamp-lit night photo makes dark mode feel designed rather than dimmed. On a phone the arch now starts at about 450 px of 844. The deep-sage band gives the page the pulse it lacked. Open points: the night hero is a closer crop than the day hero (the edit came back zoomed in), so the switch between them is not pixel-matched; the "Your first session" band keeps v1's generous empty space above and below; the credentials card keeps v1's cut arch outline in its corner.

## Performance

Measured with Agent D's proxy and `measure.py` (`~/template-v3-work/phase3-speed/scripts/`) on production builds: `develop` 72c22ea (`dist-base`) and this work (`~/template-v3-work/phase3-ergata/perf/dist-new`, which also holds the other phase 3 agents' changes at that moment). Phone: 390 px, DPR 2, 9 Mbps, 170 ms, CPU 4x, cache off. Other agents used the machine at the same time.

| Page | Before (72c22ea) | After |
|---|---|---|
| Independent time picker, office session (4 rounds) | LCP 4.20 s median (3.83–4.87), CLS 0.007 | LCP 4.33 s median (4.05–5.54), CLS 0.007, 51 KB images |
| Ergata v2 landing, phone (3 rounds) | Not comparable: the old build has no `ergata-therapy@2` package, so the v2 release fails closed | LCP 3.22 s median, CLS 0, 249 KB images; LCP element: the hero photo (`hero-m.avif`, 34 KB) |
| Ergata v2 landing, Amharic, phone (3 rounds) | | LCP 4.19 s median, CLS 0 |
| Ergata v2 landing, desktop 1440 (2 rounds) | | LCP 1.11–1.48 s, CLS 0.009, 234 KB images |
| `/book` handoff, phone (3 rounds) | | LCP 2.13 s median, CLS 0.02 |

The time picker did not get slower; the difference is within the noise, and its LCP element is still the booking note text. A first measurement showed CLS 0.027 on the time picker (the place photo arriving after the design) and 0.028 on the landing (the next free line arriving after the availability answer). The picker now keeps an empty frame while the design loads, and the landing reserves the line's space while the answer loads; both are back to 0.007 and 0. Ergata v1 measured LCP 5.3 s on the phone in phase 1 (`BLOOM_V3.md`).

## Files

- Package: `frontend/src/public-experience/templates/ergata-v2/` (`ErgataTemplate.tsx`, `parts.tsx`, `illustrations.tsx`, `icons.tsx`, `holiday.tsx`, `ErgataMoment.tsx`, `booking.tsx`, `ergata.css`, `holiday.css`, `moment.css`, `booking.css`), registered as `ergata-therapy@2` with `Loading`; the moment in `templates/moments.tsx`; the skin in `templates/booking-skin.ts`.
- Recipe and primitives: `recipes/ergata-therapy.v2.json`, `layouts/ergata-therapy.v2.json`, `surfaces/ergata-therapy.v2.json`, `imagery/ergata-rooms.v2.json`, `content/ergata-therapy.v2.json`, `recipes.py`.
- Booking: `pages/public-experience/independent-booking.tsx`, `independent-booking-parts.tsx`, `pages/booking-v2/components/skin/index.tsx` (`formatPhotoSource`).
- Showcase: `appointment/demo/ergata_showcase.py`, `independent_showcase.py`, `catalog.v1.json`.
- QA: `qa/manifests/growth/template-ergata-v2.yaml`, `-dark.yaml`, `-states.yaml`, `booking-journey-ergata.yaml`, `holiday-moments.yaml`; `appointment/tests/template_ergata_v2_qa_fixtures.py`. The v1 manifests `template-ergata*.yaml` and `website-editor*.yaml` now read the v2 markup of the showcase.
- Tests: `frontend/tests/public-template-packages.test.mjs`, `booking-skin.test.mjs`, `holiday-moments.test.mjs`; `appointment/tests/test_template_v3.py`.
