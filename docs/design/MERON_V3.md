# Meron v3, "The Fitting Room"

Meron v3 is a phase 2 package of the template reimagination (`TEMPLATE_REIMAGINATION.md`, section 5.5). It is a new versioned package: recipe `meron-atelier` v3, renderer `meron-atelier@3`. Meron v2 stays registered. A site published on v2 does not change until its owner switches the template and publishes again. The Meron showcase (`/meron-studio`) now uses v3. New sites that choose Meron get v3, because the gallery and website setup offer the latest recipe version.

The behavior comes from the headless kit (`TEMPLATE_V3_KIT.md`). Every visual is in the package. Bloom v3 (`BLOOM_V3.md`) is the reference. Meron v3 imports nothing from it.

## Concept

Quiet luxury tailoring in a Kazanchis courtyard atelier. The page is a fitting room under a spotlight. After dark the room turns "navy velvet": a deep navy stage, a warm spotlight and the night photos.

- Palette: the v2 palette (chalk grey, navy wool `#1f2e4d`, chalk blue `#c9d6ea`). Deep wine `#5b1f2b` marks small details (eyebrows, numerals, stitches). Tibeb gold `#a37b34` and `#d6b26a` draws borders and the brass rail. Navy fills the booking actions.
- Type: EB Garamond with small caps for eyebrows and labels, and Noto Serif Ethiopic for Amharic (both from the v2 typography, family "Meron Garamond"). The package adds the EB Garamond italic (OFL, latin subset, 59 KB, `fonts/meron/eb-garamond-italic.woff2`). The browser loads it only for italic text: the pull quote and the folio numerals.
- Amharic: no small caps, no tracking, a line height of 1.3 for headings and 1.75 for text.
- Shape: the garment tag (cut top corners, a punched hole with a brass eyelet, a thread) and the stitch line (a dashed thread that a mask draws).
- Radius: 0 everywhere. Only the punched holes are round.
- Rhythm: spotlit hero, tags on a light band, the story on paper, the maker, the lookbook on a velvet band, the atelier photo, proof on navy between tibeb borders, benefits, reviews on chalk blue, FAQ, visit, the booking band in a tibeb frame, the navy footer.

## Sections

| Section | What it shows | Content source |
|---|---|---|
| Bar | Logo, name, nav, booking action, mode switch (circular reveal). A tape measure along the foot of the bar fills as the visitor reads (scroll-driven CSS). | Identity, chrome |
| Hero | Greeting by Addis time and open-now badge, the headline inside a stitch line that draws on load, the lede, the booking action, the next free fitting. Below: the folding screen. Two side panels open on reveal and stay at an angle. The centre panel is the ken-burns film of three stills (measure, cut, fit) with a pause button. | `hero`, `placeHours`, live availability, the hero photo, then `loop2.meron`, `loop3.meron`; side panels from the lookbook |
| Services | Garment tags that hang from a brass rail by a thread. Each tag has the number, a photo, the name, the summary, a stitched rule, the duration, the price, the next free time and "Choose a time". On a fine pointer the tag swings and a cloth swatch with a pinked edge slides out. | `services` (photo, else `loop1`, `story1`, `loop3`) and `swatch.meron` |
| From cloth to fitting | A sticky photo frame on the left that follows the step in the middle of the screen, with a Roman folio ("ii / iv"). The steps on the right have italic Roman numerals and a stitch line that draws on scroll. On phones each step shows its own photo. | `process` (photo per step, else `story1–4.meron`) |
| The maker | A portrait with the specialties as small tags pinned to its edge, a drawn tape measure, the role in small caps, the next free time and "Book with Meron". It tilts and glows under a fine pointer. | `providers` |
| Lookbook | A rail of finished pieces with tag captions and arrow buttons, and the before/after alteration slider (a native range input). | `gallery`, else `look1`, `look2`, `story4` and `before`/`after` |
| The atelier | A wide photo with a garment label card over its corner. The photo moves a little on scroll. | `about` (photo, else `atelier.meron`) |
| Proof | Numerals that count up on navy, between two tibeb borders. | `proof` |
| Benefits | One photo tile and drawn tool tiles (tape, chalk, shears, thread, button). | `benefits` (photo, else `loop2.meron`) |
| Reviews | The first review as a big italic pull quote with a photo. From three reviews, the others run as fitting slips in a slow row with a pause button. | `testimonials` (photo, else `story3.meron`) |
| FAQ | An accordion with stitched plus marks, and a card with a call link and the weekly hours with the International / Habesha switch. | `faq` (photo, else `story2.meron`), `contact.phone`, `placeHours` |
| Visit | The courtyard drawn as a small map (street, gate, courtyard, jasmine tree, fitting room, pin, route), and per place the photo and a label card with open-now, the address, copy address, phone and directions. | `locations` (photo, else `atelier.meron`) |
| Booking band | The empty fitting room (the night photo after dark) inside a tibeb frame, with a tag-shaped card, the booking action, the next free fitting and "N times left today" when 8 or fewer are left. | `booking_cta` (photo, else `band.meron`) |
| Footer | A seam with a needle, the name in Garamond small caps, the open-now badge, links, the booking action and the credit. | `footer`, credit |
| Phone | A booking bar in the thumb zone after the hero, hidden while the booking band is in view. | |
| Desktop | Section progress marks (small diamonds) on the right after the hero. | |

The booking handoff (`/meron-studio/book`) uses the fitting room photo as its stage, a tag-shaped label card with the greeting, the booking action and the next free fitting, and the services as tag rows. Each row is a link to `snapshot.bookingPaths[item.id]` (the service's time picker with any provider). The label card is the target of the booking view transition (`data-vt-book`).

### The hero no longer depends on the viewport height

The v2 hero used `min-height: calc(100dvh - bar)` and stretched the triptych into the rest of the screen. A tall full-page capture then showed no side photos. In v3 every panel has an aspect ratio (3:4 for the centre, 88 % of its height for the sides). The hero has the same shape in a 900 px window and in a full-page capture. `public-template-packages.test.mjs` checks that the stylesheet has no `100dvh` hero height.

### Night photos (addition A1)

- Dark mode always shows the night photos of the film and the booking band.
- Light mode shows them from 18:00 to 06:00 Addis Ababa time. Then the hero stage also turns navy velvet, so the night photos sit on a dark stage.
- The side panels have no night photo. At night they are dimmed under a navy vignette.

### Motion

Showcases use `expressive`. `standard` keeps the film (8 s per still), the reveals, the stitch drawing, parallax, count-ups, the review row and pointer effects. `expressive` makes the film faster (7 s) with a deeper zoom, and the reveals travel further. `calm` keeps short reveals and shows the first still only. Reduced motion shows the final state of everything: the stitches are complete, the film is one still without a pause button, the review row is a still grid and nothing follows the pointer.

The film loads only its first still with the page (the LCP image). The other two stills join after 1.8 s. The film stops while it is off screen and while the tab is hidden, and the visitor can pause it (WCAG 2.2.2).

### Success moment and loading screen (A2, A5)

- "A stitch" (`MeronMoment.tsx`, loaded only after a booking): a needle runs a line of stitches across the confirmation header and ties it off with a small tag. With reduced motion the stitched line and the tag rest in place.
- The loading screen (`MeronLoading`) is the fitting room before the lights come up: a stitch runs around the title bones, a needle waits at the corner, and three bones stand like the folding screen. It shows on the site and on the handoff, in light and dark.

### Other additions

- A3: zoom and pan under a fine pointer on every photo frame (`data-pan`).
- A4: the shared scheduler calls `haptic("select")` on a time pick and `haptic("success")` after a booking.
- A6: section progress marks on desktop (`useSectionProgress`).
- Live availability (`useNextAvailability`): the hero chip, the tags, the maker, the band and the phone bar. The hero reserves the chip row while the answer loads, so nothing below it moves (CLS 0).

## Booking skin

`meron-v3/booking.tsx` and `booking.css`, registered as `meron-atelier@3` in `SKINS`. Every rule is scoped under `[data-bk-skin="meron-v3"]` or uses the `.m3k-` prefix.

| Page | Meron's skin |
| --- | --- |
| Header (all steps) | Navy wool in light and dark, with a dashed gold stitch line along its foot. The steps are small garment tags joined by a stitch line: gold for the current step, chalk blue with a cross-stitch for a done step. On phones the steps are the shared thin progress line, in gold. |
| Page background | A faint, blurred echo of the fitting room (`band-w640`, 6 KB AVIF; `band-night-w640`, 5 KB, in dark mode). No grid pattern. |
| Frames | Square corners everywhere (cards, times, days, chips, fields). Service photos are garment tags: cut top corners, a punched hole with a gold eyelet and a dashed inner line. |
| Service chooser | Garamond headings, small-caps wine eyebrows, the tag-framed photos (`loop1`, `story1`, `loop3` by place when the website item has no photo). |
| Time picker | The service photo in a tag frame in the summary. The chosen time is navy with a stitched inner line. The chosen day has a wine (gold in dark mode) underline. |
| Actions | Navy with a stitched inner line in light mode, chalk white with navy text in dark mode. Radius 0. |
| Confirmation | The stitch (`MeronMoment`). |

The skin moves nothing. The only motion on the booking pages is the shared selection feedback, the view transition into the handoff and the stitch.

## Images

All photos are original and generated for this package with the Codex CLI (`codex exec --skip-git-repo-check -m gpt-6.1-sol --sandbox workspace-write -C <dir> "<prompt>"`), with the built-in image tool and no drawing code. Three runs on 2026-10-15: six landscape and portrait scenes, six portrait scenes, and the edits. Codex looked at each image against the rules and regenerated any that broke them. The four night photos and the "after" photo are edits of the day photos and the "before" photo, so the composition matches.

A Pillow script (bench Python, AVIF support) crops each image to its slot and saves WebP (quality 76, `method=6`) and AVIF (quality 52) for the desktop file, the smaller widths and the mobile crop. The imagery manifest `manifest/design/imagery/meron-fitting-room.v1.json` records 14 roles with the alt text, focal point, sizes, `darkSrc`, `formats`, `widths` and the SHA-256 of every file. The showcase catalog (`catalog.v1.json`, site `meron`) lists every file with its checksum in `templateAssets`. The showcase content gives each photo an Amharic description (`showcase_public.V3_SCENES["meron"]`).

18 generated photos (14 section subjects, 3 night stills of the film and the night band; the "after" photo is one of the 14), 138 files, 5.7 MB in `appointment/public/brand-experience/support/meron-v3/`.

| File | Desktop | Mobile | AVIF (desktop) |
|---|---|---|---|
| `loop1` (hero film, LCP) | 960x1280, 76 KB | 600x800, 38 KB | 53 KB |
| `loop1-night` | 960x1280, 77 KB | 600x800, 36 KB | 52 KB |
| `loop2`, `loop2-night` | 960x1280, 88–92 KB | 600x800, 40–41 KB | 56–58 KB |
| `loop3`, `loop3-night` | 960x1280, 71–82 KB | 600x800, 37–42 KB | 46–51 KB |
| `story1` … `story4` | 1040x1300, 59–145 KB | 640x800, 26–67 KB | 49–92 KB |
| `look1`, `look2` | 900x1200, 87–94 KB | 600x800, 51 KB | 59–61 KB |
| `before`, `after` | 880x1100, 34–36 KB | 600x750, 18 KB | 26–29 KB |
| `swatch` | 800x800, 130 KB | 480x480, 51 KB | 71 KB |
| `band`, `band-night` | 1536x658, 35–40 KB | 720x900, 37–43 KB | 23–26 KB |
| `atelier` | 1440x960, 104 KB | 720x540, 42 KB | 69 KB |

Each desktop file also has `-w480`/`-w720` (film), `-w560`/`-w800` (story), `-w480`/`-w640` (looks), `-w560` (before/after), `-w480` (swatch) or `-w640`/`-w960` (band, atelier) versions for `srcset`.

The before/after pair is generated showcase imagery of one jacket on a dressmaker's form. The copy makes no claim about it. The template shows it only when the owner's gallery is empty.

### Prompts

Every prompt starts with the shared art direction:

> Quiet luxury tailoring atelier in a Kazanchis courtyard in Addis Ababa, Ethiopia. Navy wool, chalk grey, deep wine, white habesha cotton with tibeb borders, brass tools, tailor's chalk, measuring tape. Moody editorial fashion photography, 50 mm lens feel, directional window light, deep soft shadows, tactile close-ups, slightly matte film look, rich Ethiopian skin tones. Calm and precise, never posed, no stock smiles. Rules: fictional people only; no text, letters, numbers, logos, signage, brand marks, garment labels with writing, ruler or tape-measure numerals that are legible, clocks or readable screens anywhere (any measuring tape must be blank or its marks too small and soft to read); the tailor (staff) may show her or his face; clients are seen from behind, in profile turned away, or with the face out of frame, and mirrors never show a client's face. Photorealistic, no illustration look, no extra fingers, natural hands.

The night prompts add: "The same atelier after dark. The windows are deep navy blue night with a few soft city lights far away; the room is lit by one warm focused spotlight from above that pools on the subject, with a soft vignette into deep navy-black velvet shadows; a faint warm brass glint on metal; deep wine tones richer. Calm, luxurious, never murky: the subject stays clearly visible." Each edit keeps the composition, camera, people, poses, objects and aspect ratio of its source.

| File | Scene |
|---|---|
| `loop1` | The tailor, a woman in a navy apron, measures the shoulder of a client who stands with her back to the camera in a white habesha dress with a tibeb border. |
| `loop2` | Hands cut navy wool with brass-handled shears along a chalk line on a wide wooden table. No faces. |
| `loop3` | The tailor kneels and pins the hem of a deep wine dress. The client stands on a fitting block, her head out of frame. The mirror shows only the hem. |
| `loop1-night`, `loop2-night`, `loop3-night` | Edits of `loop1`–`loop3` in the night look. |
| `story1` | Hands rest on a fan of swatches: navy wool, grey flannel, wine wool and white cotton with a tibeb border. |
| `story2` | A hand draws a curved chalk line on pattern paper over navy wool, a curved ruler without numerals. |
| `story3` | A tailor (a man in a navy waistcoat) adjusts the back seam of a basted navy jacket on a client seen from behind. |
| `story4` | A finished white habesha kemis with a wine, gold and navy tibeb border on a form in the courtyard doorway. |
| `look1` | A finished navy wool suit on a form in the courtyard, jasmine on the stone wall. |
| `look2` | A finished deep wine wrap dress with a gold tibeb trim on a form under the arcade. |
| `before` | A navy wool jacket too big for the form: long sleeves, drooping shoulders, a loose waist. |
| `after` | An edit of `before`: the same jacket, form, wall, light and camera, altered to fit. |
| `swatch` | Navy wool twill crossed by a band of white cotton with a woven tibeb border, overhead and even. |
| `band` | An empty fitting room: a brass-framed mirror, a navy garment bag on a brass rail, a fitting block and a wine velvet curtain. The left side is calm for text. |
| `band-night` | An edit of `band` in the night look. |
| `atelier` | The atelier in daylight from the courtyard door: a cutting table with rolls of wool, a white dress on a form, open steel windows and jasmine. |

## Showcase

The seeder moved the showcase to v3 (`appointment/demo/showcase.py`, `PUBLIC_EXPERIENCE_VERSION` raised by one). Nothing was changed by hand.

- The catalog site `meron` has `heroRole: loop1.meron`, `detailRole: atelier.meron`, the v3 hero checksum and `templateAssets`.
- The brand profile uses motion `expressive` (the seeder picks the most expressive level that the recipe offers).
- The content uses the v3 photos for the hero, the two services, the atelier and the place, with Amharic descriptions (`showcase_public.V3_SCENES["meron"]`). It has five consented reviews (`EXTRA_TESTIMONIALS["meron"]`) and an empty gallery.
- The process has a fourth step, "Collect the finished piece", so the story shows all four scenes.
- The gallery previews were captured again with `scripts/capture_template_gallery.py` (Meron only) and recorded in the catalog.

## Browser QA (Agent Plane, 2026-10-15)

Fixture: `appointment.tests.template_meron_v3_qa_fixtures` (setup before, cleanup after). The success scenario and the journey book appointments for one QA client. `cleanup()` deletes them by the client's exact email, or by the exact phone and name.

| Run | Manifest | Result |
|---|---|---|
| BQA-2026-00353 | `template-meron-v3.yaml`: en and am, 1440 and 390, light, full motion. The hero with the running film and its pause button, the tags, the story (step iii in the middle of the screen), the maker, the lookbook and the before/after slider (keyboard), the atelier, proof, benefits, the review row with pause, the FAQ and the Habesha clock (`ከጠዋቱ 4 ሰዓት` for 10:00), the visit map, the band, the footer, a full page, the handoff after the view transition, the scheduler and the time picker. | Passed, 0 console, 0 network errors |
| BQA-2026-00345 | `template-meron-v3-dark.yaml`: en and am, 1440 and 390, dark, reduced motion. The night film still without a pause button, the still review grid, the night band, a full page, the mode switch both ways, the handoff and the scheduler. | Passed. Console: the known reduced-motion notice of the scheduler (one per scenario). 0 network errors. |
| BQA-2026-00358 | `template-meron-v3-states.yaml`: navy velvet and night photos in light mode after 18:00, the morning (closed until 10:00), live availability on, off and empty, the loading screens (site light, handoff dark, Amharic phone), and a booking from the landing page to the confirmation with the stitch. | Passed, 0 console, 0 network errors |
| BQA-2026-00351 | `booking-journey-meron.yaml`: English desktop light and Amharic phone dark. Landing, the handoff tag row (a real link, `with=any`, `lang=am`), the time picker with the tag-framed photo, back to the chooser (two cards with photos, the business logo), a time, the details (phone first, "Addis Ababa time" / "የአዲስ አበባ ሰዓት") and the confirmation with the stitch. | Passed, 0 console, 0 network errors |

Earlier runs on the same day found and fixed these problems: BQA-2026-00341 (the stitch drawing around the headline caught the click, and the desktop film wait used `data-running`; the manifest now waits for the pause button, and the film watches the hero section, outside the 3D context of the folding screen), and BQA-2026-00349 (the stitch of the success moment ran through the "Booking Confirmed" title; it now runs along the top edge and ends in a tag beside the close button).

## Performance

Measured with a Playwright script on the production build (`npm run build`, served by the stack's web port), phone 390 px, 9 Mbps, 170 ms, CPU 4x, cache off. The build of `develop` (ad7c51f) and the new build ran in turn, three rounds, on the same machine. Four agents ran browser QA on the machine at the same time, so the absolute times are higher than in `BOOKING_LAYOUT.md`. Compare the pairs, not the absolute values.

| Page | Before (develop ad7c51f): LCP per round, CLS, images | After: LCP per round, CLS, images |
|---|---|---|
| Service chooser `/schedule/org/meron-studio` | 7.54, 7.42, 7.63 s (median 7.54 s), 0.014, 148 KB | 9.08, 7.14, 5.57 s (median 7.14 s), 0.014, 154 KB |
| Time picker, `with=any` | 10.13, 11.82, 9.50 s (median 10.13 s), 0.003, 72 KB | 10.27, 7.98, 6.13 s (median 7.98 s), 0.003, 78 KB |
| Landing `/meron-studio` (v3 only) | | 8.44, 6.70, 6.19 s (median 6.70 s), CLS 0, 257 KB |

The chooser and the time picker are not slower, and their CLS does not change. They load 6 KB more images: the faint fitting-room backdrop (`band-w640.avif`). The landing page keeps the guardrails for CLS (at most 0.05) and the image weight on first load (at most 500 KB). Its LCP does not meet 2.5 s, the same as every template (`BLOOM_V3.md`, "Performance"): the time goes to the app shell before the first paint.

The LCP element of the chooser is still the business description, and of the time picker the summary text. The service photos are lazy, tag-framed and small, so a photo is never the largest paint. The landing LCP element is the first still of the film (the AVIF mobile crop, 25 KB). The first measurement found a layout shift of 0.066 on the landing page: the live availability chip arrived after the first paint and pushed the folding screen down, and the spotlight pseudo-element moved with it. The hero now reserves the chip row, and the spotlight is a background of the stage. CLS is now 0.

## Review

Reviewed at 1440 and 390, light and dark, English and Amharic, with full-page and mid-scroll captures. The first view reads as a fitting room: the stitched title under a soft spotlight, and a folding screen of the work with the measuring still in the centre. The garment tags on the brass rail are the strongest new section. The sticky "cloth to fitting" story carries the four scenes well at mid-scroll. Navy velvet (dark mode and light mode after dark) keeps the photos clear and gives the gold stitches and tibeb borders their place. The Amharic pages keep the Noto Serif Ethiopic headings with more leading. The booking pages are clearly the same atelier (navy bar, tag steps, square frames, tag-framed photos) and add no motion. Fixed during the review: the narrow title box (a `ch` width on the wrong element), the side panels that did not fill their frames, a column-count attribute that the kit's count-up read as a number, unreadable light text on the light buttons of the band and the footer, a night grade that turned the wine dress green, and the handoff rows that took the stage text colour. Open points: the side panels have no night photo, so they are dimmed; the maker card shows the showcase's one credential line, so its text column is short; the brand name stays in English on Amharic pages because the showcase content has no Amharic name.

## Files

- Package: `frontend/src/public-experience/templates/meron-v3/` (`MeronTemplate.tsx`, `parts.tsx`, `art.tsx`, `MeronMoment.tsx`, `booking.tsx`, `meron.css`, `moment.css`, `booking.css`), registered as `meron-atelier@3` with `Loading`, the moment and the skin.
- Recipe and primitives: `recipes/meron-atelier.v3.json`, `layouts/meron-atelier.v3.json`, `surfaces/meron-atelier.v3.json`, `imagery/meron-fitting-room.v1.json`, `recipes.py`. The palette and typography stay `meron-atelier` v2.
- Font: `appointment/public/fonts/meron/eb-garamond-italic.woff2` (OFL, the license file `eb-garamond.OFL.txt` covers it).
- Showcase: `appointment/demo/showcase.py`, `showcase_public.py`, `catalog.v1.json`.
- QA: `qa/manifests/growth/template-meron-v3.yaml`, `-dark.yaml`, `-states.yaml`, `booking-journey-meron.yaml`, `appointment/tests/template_meron_v3_qa_fixtures.py`.
- Tests: `appointment/tests/test_template_meron_v3.py`, `frontend/tests/public-template-packages.test.mjs`, `booking-skin.test.mjs`, `appointment/tests/test_public_experience_contracts.py`.
