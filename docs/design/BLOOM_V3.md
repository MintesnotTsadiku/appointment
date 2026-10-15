# Bloom v3, "Golden Hour Salon"

Bloom v3 is the phase 1 flagship of the template reimagination (`TEMPLATE_REIMAGINATION.md`, section 5.1). It is a new versioned package: recipe `bloom-hair` v3, renderer `bloom-hair@3`. Bloom v2 stays registered. A site published on v2 does not change until its owner switches the template and publishes again. The Bloom showcase (`/bloom-studio`) now uses v3. New sites that choose Bloom get v3, because the gallery and website setup offer the latest recipe version.

The behavior comes from the headless kit (`TEMPLATE_V3_KIT.md`). Every visual is in the package.

## Concept

A glossy beauty campaign at golden hour in a Bole natural-hair salon. After dark the same salon is "after hours": the mirror bulbs are on and the actions glow marigold.

- Palette: the v2 palette (aubergine `#4a1f55`, marigold `#f5a524`) with rose and rose-gold highlights and a warm mesh gradient (aubergine, plum, amber) on the dark stages. Marigold fills booking actions only.
- Type: Anton for display, Karla for text. In Amharic, the display face is Noto Sans Ethiopic Condensed at weight 900, so the headings keep the poster weight. Amharic headings get more line height and no tracking.
- Shape: the round-top salon mirror with a thin rose-gold line and a crown of bulbs.
- Rhythm: deep and light bands change down the page (hero deep, menu light, lookbook deep, team light, story photo, steps light, proof deep, benefits light, reviews blush, FAQ and rooms light, band photo, footer deep).

## Sections

| Section | What it shows | Content source |
|---|---|---|
| Bar | Logo, name, nav, booking action, mode switch (circular reveal), reading progress line | Identity, chrome |
| Hero | Greeting by Addis time, open-now badge, the brand's short name huge and filled with a braids photo (with an outline twin), headline, booking action (magnetic, offset shadow), next free chair, the mirror photo with bulbs (day or night), a stack of three looks that a button or a swipe changes | `hero`, `placeHours`, live availability, roles `hero.bloom`, `look1–3.bloom` |
| Price menu | A printed menu card: a photo per service, the name, dotted leader and an oversized price, the duration, the summary and the next free time. On a fine pointer the service photo follows the pointer. | `services` (photo, else `menu1–3.bloom`) |
| Lookbook | A rail of mirror-arched looks with arrows, and a before/after slider (a native range input) | `gallery` items, else `look1–3.bloom` and `before.bloom`/`after.bloom` |
| Chairs | Stylist cards that tilt and glow, with tags, the next free time and "Book with Hanna" | `providers` |
| Story | A wide salon photo with a card over its corner | `about` (photo, else `story.bloom`) |
| Steps | A sticky mirror photo that changes with the step in view, outline numerals, and a curl line that draws on scroll | `process` (photo per step, section photo, else `menu3`, `menu1`, `look3`) |
| Proof | Oversized numerals that count up on a deep band | `proof` |
| Benefits | A bento of drawn tiles and one photo tile | `benefits` (photo, else `look2.bloom`) |
| Reviews | Three or more quotes: a two-row marquee with a pause button. Fewer: one pull quote with a photo. | `testimonials` (photo, else `look3.bloom`) |
| FAQ | An accordion with a plus that turns to a minus, and a card with a call link and the weekly hours with the International / Habesha switch | `faq` (photo, else `menu3.bloom`), `contact.phone`, `placeHours` |
| Rooms | Tabs that change the photo, the open-now badge, the address, a copy-address chip, the phone and the directions | `locations` (photo, else `room1.bloom` / `room2.bloom`) |
| Booking band | The lit chair and mirror (night photo after dark) with a glass card, the next free chair and "N times left today" when 8 or fewer are left | `booking_cta` (photo, else `band.bloom`) |
| Footer | The short name as a giant outline word, hours, links, booking action, credit | `footer`, credit |
| Phone | A booking bar in the thumb zone after the hero, hidden while the booking band is in view | |
| Desktop | Section dots on the right after the hero | |

The booking handoff (`/bloom-studio/book`) uses the band photo as its stage, a glass panel with the greeting, the booking action and the next free chair, and the service list with photos and next free times. The panel is the target of the booking view transition (`data-vt-book`).

Each service row on the handoff is a link to that service's time picker with any stylist. The booking pages after the handoff wear Bloom's booking skin (`bloom-v3/booking.tsx`, `booking.css`): see `docs/growth/BOOKING_LAYOUT.md`, "Booking skins".

The booking success moment is petals that drift over the confirmation header (`BloomMoment.tsx`, loaded only after a booking). With reduced motion six petals rest without movement.

The loading screen is the mirror stage with shimmering bones and glowing bulbs (`BloomLoading`). It shows while the published design loads, on the site and on the handoff.

### Night photos (addition A1)

- Dark mode always shows the night photos of the hero and the booking band.
- Light mode shows them from 18:00 to 06:00 Addis Ababa time. The hero and the band are dark stages in both modes, so a night photo reads well there. The rest of the page stays light.
- Other photos have no night version. In dark mode they get a soft plum grade.

### Motion

Showcases use `expressive`: the bulbs light up in sequence, the mirror photo and the braids inside the word drift slowly, and the reveals travel further. `standard` keeps the reveals, parallax, count-ups, the marquee and pointer effects. `calm` keeps short reveals only. Reduced motion shows the final state of everything, a still review grid, and no pointer effects.

## Images

All photos are original and generated for this package with the Codex CLI, the same method as Ergata (`docs/growth/TEMPLATE_ERGATA.md`, "Images and how they were made"):

1. `codex exec --skip-git-repo-check -m gpt-6.1-sol --sandbox workspace-write -C <scratch dir> "<prompt>"`, with the built-in image tool and no drawing code. Three runs on 2026-10-15: six landscape scenes, eight portrait and square scenes, and one more room. Codex looked at each image and regenerated any with text, labels, a client face or extra fingers. The night photos and the "after" photo are edits of the day photo and the "before" photo, so the composition matches.
2. A Pillow script crops each image to its slot, then saves WebP (quality 74–76, `method=6`) and AVIF (quality 52) for the desktop file, the mobile crop and the smaller widths.
3. The imagery manifest `manifest/design/imagery/bloom-golden-hour.v1.json` records 13 roles with the alt text, focal point, sizes, `darkSrc`, `formats`, `widths` and the SHA-256 of every file. The showcase catalog (`catalog.v1.json`, site `bloom`) lists every file with its checksum in `templateAssets`. The showcase content gives each photo an Amharic description.

15 generated photos (12 section subjects, the night hero, the night band, and one more room), 104 files, 4.3 MB in `appointment/public/brand-experience/support/bloom-v3/`.

| File | Desktop | Mobile | AVIF (desktop) |
|---|---|---|---|
| `hero` | 1536x960, 92 KB | 720x900, 61 KB | 61 KB |
| `hero-night` | 1536x960, 90 KB | 720x900, 57 KB | 59 KB |
| `band` | 1600x686, 56 KB | 720x900, 32 KB | 38 KB |
| `band-night` | 1600x686, 45 KB | 720x900, 32 KB | 32 KB |
| `story` | 1440x960, 153 KB | 720x900, 79 KB | 101 KB |
| `room1` | 1440x960, 125 KB | 720x540, 50 KB | 79 KB |
| `room2` | 1440x960, 80 KB | 720x540, 31 KB | 54 KB |
| `look1`, `look2`, `look3` | 880x1100, 71–81 KB | 600x750, 37–45 KB | 46–53 KB |
| `menu1`, `menu2`, `menu3` | 900x900, 73–85 KB | 600x600, 37–45 KB | 46–56 KB |
| `before`, `after` | 880x1100, 42–52 KB | 600x750, 20–23 KB | 31–38 KB |

Each desktop file also has `-w640`/`-w960` (scenes) or `-w560`/`-w480` (looks, menu) versions for `srcset`.

The before/after pair is generated showcase imagery of one fictional client. The copy makes no claim about it. The template shows it only when the owner's gallery is empty. An owner replaces it by adding photos to the gallery.

### Prompts

Every prompt starts with the shared art direction:

> Golden-hour beauty campaign in a Bole natural-hair salon in Addis Ababa, Ethiopia. Warm amber light, aubergine and plum walls, marigold and rose-gold accents, round mirrors with soft bulb light, lush plants. Glossy editorial beauty photography, 50 mm lens feel, shallow depth of field, rich Ethiopian skin tones, natural textured hair (braids, coils, silk press). Confident, joyful, not posed, no stock smiles. Rules: fictional people only; no text, letters, numbers, logos, signage, brand marks, product labels, clocks or readable screens anywhere (product bottles must be plain and unlabelled); clients are seen from behind, in profile turned away, or with the face out of frame; only a stylist may show her face. Photorealistic, no illustration look, no extra fingers, natural hands.

| File | Scene |
|---|---|
| `hero` | A stylist in a plum top, face in three-quarter view, finishes long knotless braids on a client seen from behind, by a tall window with low golden sun. A round mirror with bulbs, an aubergine wall, a marigold stool, a rose-gold trolley, plants. The people on the right third, a calm dark wall on the left for the headline. |
| `hero-night` | The same scene and camera after hours: the bulbs on, deep blue night and city lights in the window, a marigold table lamp. An edit of `hero`. |
| `band` | One empty plum salon chair facing a round mirror ringed with bulbs (off) on an aubergine wall, golden light from the right. |
| `band-night` | The same scene at night: the bulbs glow, a marigold pool of light on the chair. An edit of `band`. |
| `story` | The whole salon at golden hour with no people: three chairs facing bulb mirrors, two wash basins, a plum sofa, hanging plants, sun stripes on terrazzo. |
| `room1` | The main studio from the front door: a terrazzo reception counter with a brass bell and marigolds, two plum chairs facing bulb mirrors, a stylist from behind in soft focus. |
| `room2` | The small quiet styling room: one chair, an oval brass mirror, a linen curtain with late sun, a rose-gold trolley, one plant. |
| `look1` | Long knotless braids with gold cuffs, from behind, golden rim light. |
| `look2` | A tapered natural cut with defined coils, a young man seen from behind his shoulder. |
| `look3` | A glossy silk press with soft movement, from behind. |
| `menu1` | Hands lather coily hair at a black wash basin. |
| `menu2` | Hands with scissors and a comb at a precise cut line on coils. |
| `menu3` | A wooden wide-tooth comb parts thick natural hair for a scalp check. |
| `before` | A client from behind in a plum chair, natural unstyled shoulder-length coily hair, plain aubergine wall. |
| `after` | The same client, chair, pose and light after a silk press. An edit of `before`. |

## Showcase

The seeder moved the showcase to v3 (`appointment/demo/showcase.py`, `PUBLIC_EXPERIENCE_VERSION = 17`). Nothing was changed by hand.

- The catalog site `bloom` has `heroRole: hero.bloom`, `detailRole: story.bloom`, the v3 hero checksum and `templateAssets`.
- The brand profile uses motion `expressive` (the seeder picks the most expressive level that the recipe offers) and the short name "Bloom".
- `booking_json.liveAvailability` is on for every showcase.
- The content uses the v3 photos for the hero, the story, the services and the two rooms, with Amharic descriptions (`showcase_public.V3_SCENES`). It has five consented reviews (`EXTRA_TESTIMONIALS`) and an empty gallery.

## Browser QA (Agent Plane, 2026-10-15)

Fixture: `appointment.tests.template_bloom_v3_qa_fixtures` (setup before, cleanup after). The success scenario books one appointment for the QA client. `cleanup()` deletes it by the client's exact email.

| Run | Manifest | Result |
|---|---|---|
| BQA-2026-00256 | `template-bloom-v3.yaml`: en and am, 1440 and 390, light, full motion. Every section, the look stack, the before/after slider, the review pause, the FAQ and the Habesha clock, the room tabs, the band, the footer, a full page, the handoff after the view transition, the scheduler and the time picker. | Passed, 0 console, 0 network errors |
| BQA-2026-00257 | `template-bloom-v3-dark.yaml`: en and am, 1440 and 390, dark, reduced motion. Night photos, the still review grid, a full page, the mode switch both ways, the handoff and the scheduler. | Passed, 4 console messages (the known framer-motion reduced-motion notice of the scheduler), 0 network errors |
| BQA-2026-00258 | `template-bloom-v3-states.yaml`: night photos in light mode after 18:00, the morning (closed until 09:00), live availability on, off and empty, the loading screens (site light, handoff dark, Amharic phone), and a booking from the landing page to the confirmation with the petals. | Passed, 0 console, 0 network errors |

Earlier runs on the same day (BQA-2026-00245, 00246, 00250, 00253 to 00255) found and fixed: the outline word that touched the headline, bulbs too far from the mirror, portraits that did not fill their frames, a second review row narrower than the screen, a three-tile bento with a hole, proof values that broke over two lines, a crowded phone booking bar, duplicate room photos (a new `room1` photo), a `<p>` inside a `<p>`, and manifest selectors that matched three elements. Agent Plane's `scroll` action ignores its selector, so the manifests click a section heading to bring a section into view.

### Existing manifests run again

| Run | Manifest | Result |
|---|---|---|
| BQA-2026-00259 | `booking-layout.yaml` | Passed. Console: the known reduced-motion notice. |
| BQA-2026-00260 | `booking-layout-am-dark.yaml` | Passed. Console: the reduced-motion notice. One expected 404 for the unknown studio address. |
| BQA-2026-00261 | `booking-layout-states.yaml` | Passed. The console and network errors come from the unknown addresses that the manifest opens on purpose. |
| BQA-2026-00262 | `template-gallery.yaml` | Passed, 0 console, 0 network errors |
| BQA-2026-00263, BQA-2026-00264 | `touchpoints-guest.yaml`, `touchpoints-guest-dark.yaml` (fixture `growth_touchpoints_qa_fixtures`) | Passed. Console: the reduced-motion notice. |
| BQA-2026-00267, BQA-2026-00268 | `showoff-credit.yaml`, `showoff-credit-dark.yaml` (fixture `growth_showoff_qa_fixtures`) | Passed, 0 console, 0 network errors. The Bloom button check now reads the v3 markup (`--b3-gold-ink`). The first runs (BQA-2026-00265, 00266) failed on the v2 selector. |
| BQA-2026-00273, BQA-2026-00274 | `website-editor.yaml`, `website-editor-am-dark.yaml` (fixture `website_editor_qa_fixtures`, `restore()` after each) | Passed, 0 network errors. Console: the known sandboxed preview notices. The manifests now type the showcase's new non-dialable number `+251 11 000 0106`. The first runs (BQA-2026-00269 to 00271) failed on the old number. |

### Review

Reviewed at 1440 and 390, light and dark, English and Amharic. The hero reads as a campaign: the braids inside the word, the bulb-crowned mirror and the night version carry the concept, and the Amharic condensed black headings keep the poster weight. Every section has a photo or a drawing. Open points: the stylist portraits are the older daylight showcase portraits, so they are cooler than the rest of the page. The Amharic page shows the stylist names in English, because the showcase content has no Amharic names.

## Performance

Measured with a Playwright script on the production build (`npm run build`, served by the stack's web port), cache off, three runs each.

| Profile | LCP | CLS | Images on first load |
|---|---|---|---|
| Desktop 1440, no throttling | 1.0–1.1 s | 0.005 | 542 KB |
| Phone 390, 9 Mbps, 170 ms, CPU 4x | 3.7–4.4 s | 0.013 | 334 KB |
| Phone 390, 1.6 Mbps, 150 ms, CPU 4x | 11.6–12.4 s | 0.013 | 334 KB |
| Selam v2 (reference), phone, 9 Mbps | 4.5 s | 0 | 663 KB |
| Ergata v1 (reference), phone, 9 Mbps | 5.3 s | 0 | 238 KB |

CLS and the image weight meet guardrails G1 and G2. The phone LCP does not meet 2.5 s, and the same is true for every template. The LCP element is the hero word. The time goes to the app shell: about 200 KB gzipped `index` JavaScript, the React and UI vendor chunks, then the config and snapshot requests and the font wait in `PublicExperienceProvider` before the first paint. The public site needs a smaller entry chunk (or server rendering) to meet G1. That is shell work for phase 3, not template work. The kit is 6.4 KB gzipped.

## Files

- Package: `frontend/src/public-experience/templates/bloom-v3/` (`BloomTemplate.tsx`, `parts.tsx`, `art.tsx`, `BloomMoment.tsx`, `ink.ts`, `bloom.css`, `moment.css`), registered as `bloom-hair@3` with `Loading`.
- Recipe and primitives: `recipes/bloom-hair.v3.json`, `layouts/bloom-hair.v3.json`, `surfaces/bloom-hair.v3.json`, `imagery/bloom-golden-hour.v1.json`, `recipes.py`.
- Showcase: `appointment/demo/showcase.py`, `showcase_public.py`, `catalog.v1.json`.
- QA: `qa/manifests/growth/template-bloom-v3.yaml`, `-dark.yaml`, `-states.yaml`, `appointment/tests/template_bloom_v3_qa_fixtures.py`.
- Tests: `appointment/tests/test_template_v3.py`, `frontend/tests/template-kit.test.mjs`, `public-template-packages.test.mjs`, `bloom-accent-ink.test.mjs`, `website-editor.test.mjs`.
