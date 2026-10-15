# Abugida v3, "Living Manuscript"

Abugida v3 is the phase 2 redesign of the language template (`TEMPLATE_REIMAGINATION.md`, section 5.4). It is a new versioned package: recipe `abugida-language` v3, renderer `abugida-language@3`. Abugida v2 stays registered. A site published on v2 does not change until its owner switches the template and publishes again. The Abugida showcase (`/abugida-studio`) now uses v3. New sites that choose Abugida get v3.

The behavior comes from the headless kit (`TEMPLATE_V3_KIT.md`). Every visual is in the package. Bloom v3 (`BLOOM_V3.md`) is the reference. The package imports nothing from it.

## Concept

An illuminated Ethiopic manuscript that comes to life. After dark it is a candle-lit study.

- Palette (`palettes/abugida-language.v3.json`): parchment `#f4ecdc`, iron-gall ink `#231a12`, one rubric red `#9e1c17`, and gold leaf `#b8892b` for ornaments only. Gold text uses `#8a6416` (AA on parchment). Dark mode: deep ink brown `#17100b`, a warm candle glow in two corners, rubric `#f07f6b`, and gold that glows.
- Type: Alegreya and Abyssinica SIL (typography v2, unchanged). Headings have a rubric initial. The story opens on a drop cap. Eyebrows use small caps. Amharic headings get more line height, no tracking and no small caps. Amharic body text is one step larger.
- Ge'ez numerals number the contents (folios), the steps, the FAQ, the room tabs, the proof items and the section dots. Every numeral is decorative (`aria-hidden`). The text next to it, or a hidden label ("Step 1"), gives the number to screen readers.
- Shape: the fidel. The hero photo opens inside the letter ሀ (an arch on two legs with a notch between the feet). Other photos sit in manuscript windows: an arch with a gold line, a parchment mat and two illuminated corners.
- Signature motion: ink. Headings write in from the left like a pen stroke. Rules, the contents border, the steps rule, the window outline and the marginal pointer draw as lines.
- Texture: a 320 px parchment tile (1 KB), multiplied over the canvas. It is centred near white, so it adds only fibre.
- Rhythm: parchment bands, one soft band (phrase and glosses), one deep band (the colophon), a photo band (booking) and a deep footer.

## Sections

| Section | What it shows | Content source |
|---|---|---|
| Bar | Logo, name, nav, the pressed-ink booking action, the mode switch (circular reveal) and a rubric double rule as the reading progress | Identity, chrome |
| Hero | Greeting by Addis time, the headline with a rubric initial, the booking action, next free time, open now. A fidel table (eight consonants in seven orders, Ge'ez order numbers on top). One block of the table opens as the ሀ window with the hero photo (the night photo after dark). | `hero`, `placeHours`, live availability, role `hero.abugida` |
| Contents | The lessons as a contents page inside a bordered page with four illuminated corners. A row has the folio numeral, the name, a dotted leader, the duration and price, the summary and the next free time. A manuscript window in the margin shows the lesson photo. The whole row is a link. | `services` (photo, else `lesson1`/`lesson2.abugida`) |
| Coaches | Portraits in manuscript windows, role, tags, next free time, "Book with Kalkidan" | `providers` |
| Story | A wide photo with a text leaf over its edge, a drop cap and the highlights with ፨ marks | `about` (photo, else `section.detail`) |
| Phrase and glosses | The phrase card over a coffee-ceremony photo: the proverb ቀስ በቀስ እንቁላል በእግሩ ይሄዳል on the front, its sound and meaning on the back. A button turns the card (`haptic("select")`). The benefits are glosses with drawn icons. | `benefits` (photo, else `phrase.abugida`), chrome |
| Steps | Each step has a manuscript window, a Ge'ez numeral on a gold disc, the title and the text. A dotted rubric rule draws from one numeral to the next. | `process` (photo per step, else `step1–3.abugida`) |
| Colophon | The deep band: a woven tibeb border, gold Ge'ez numerals and the proof values, which count up | `proof` |
| Marginalia | The first review is the page text. The reviewer's name is a note in the margin with a red pen line. From three reviews the other notes run in a marquee with a pause button. Below `standard` motion the notes are a still grid. | `testimonials` |
| FAQ | A glossary with Ge'ez numbers and a plus that turns to a minus. Beside it: the FAQ photo and a card with the call link, the email and the weekly hours with the International / Habesha switch. | `faq` (photo, else `faq.abugida`), `contact`, `placeHours` |
| Plates | The owner's gallery as arched plates on a rail. Only when the gallery has photos. | `gallery` |
| Visit | Room tabs that change the photo, a drawn Arat Kilo map, open now, the address with a copy chip, the phone and directions | `locations` (photo, else `room1`/`room2.abugida`) |
| Booking band | The study desk (the candle-lit desk after dark) with a parchment leaf, the booking action, the next free time and "N times left today" when 8 or fewer are left | `booking_cta` (photo, else `band.abugida`) |
| Footer | A tibeb border, the name with ፠, the hours, links, the booking action and the credit | `footer`, credit |
| Phone | A booking bar in the thumb zone after the hero. It hides while the booking band is in view. | |
| Desktop | Section folios (Ge'ez numerals) in the right margin after the hero | `useSectionProgress` |

### Additions A1 to A6

- A1: the greeting follows the Addis Ababa clock. Dark mode always shows the night photos of the hero and the band. Light mode shows them from 18:00 to 06:00. Day photos get a warm candle grade in dark mode.
- A2: the success moment is the "ink flourish" (`AbugidaMoment.tsx`). A rubric pen stroke writes across the confirmation header, then three gold ፠ marks settle. With reduced motion the stroke is already drawn. `data-done` turns true when the ink is dry, so browser QA can capture the end state.
- A3: photos zoom and pan under a fine pointer (`data-pan`). Near the pointer, the letters of the fidel table lift (`data-glow`, pure CSS from `--glow-x` and `--glow-y`).
- A4: the shared scheduler calls `haptic` on a time pick and after a booking. The phrase card calls it when it turns.
- A5: the loading screen (`AbugidaLoading`) is a parchment page whose fidel letters ink in and fade in a loop. It shows on the site and on the handoff.
- A6: section folios on desktop.

### Motion

Showcases use `expressive`. New sites start at `standard`. `calm` keeps short reveals only. Reduced motion shows the final state of everything: the letters, the window, the drawn lines and a still review grid.

The kit's reveal observer cannot see an element that a clip path hides completely. The ink start state therefore keeps 18 % of the heading visible (`clip-path: inset(0 82% 0 0)`).

## Booking skin

The skin is `abugida-v3/booking.tsx` and `booking.css`, registered in `SKINS` as `abugida-language@3`.

| Page | Abugida's skin |
| --- | --- |
| Handoff (`/abugida-studio/book`) | The template's own page: the study desk as the stage, a parchment leaf (the view transition target) and a contents leaf. Each lesson row links to `snapshot.bookingPaths[item.id]` with any coach. |
| Header (all steps) | Parchment (ink brown in dark mode) with a rubric double rule. The steps are small manuscript windows with Ge'ez numerals: rubric for the current step, gold for a done step. The marks are decorative. The flow announces "Step 2 of 4: Time". |
| Page background | A faint echo of the band photo (`band-w640`, the night file in dark mode). No grid pattern. |
| Chooser | Alegreya headings (Abyssinica SIL in Amharic), cards with an inner gold rule, lesson photos in arch frames, the brand logo. |
| Time picker | The lesson photo in an arch frame at the top of the summary. Ruled time cells, arch-topped days. |
| Actions | The pressed-ink rubric button. It darkens like ink soaking into paper and presses in on click. |
| Confirmation | The ink flourish. |

## Images

All photos are original and generated for this package with the Codex CLI (`gpt-6.1-sol`), with the method of `BLOOM_V3.md`, "Images":

1. Three runs on 2026-10-15: `codex exec --skip-git-repo-check -m gpt-6.1-sol --sandbox workspace-write -C <scratch dir> "<prompt>"` with the built-in image tool. Run A made the hero, the band, the story, the conversation room and the two night photos. Run B made the lessons, the phrase, the steps, the FAQ and the parchment. Run C made the learning room. Codex checked each image for text, logos, client faces and extra fingers. The night photos are edits of the day photos, so the composition matches.
2. A Pillow script (bench Python, Pillow 12) crops each image to its slot and saves WebP (quality 74–76, `method=6`) and AVIF (quality 50) for the desktop file, the mobile crop and the smaller widths. The parchment tile is made seamless and centred near white.
3. The imagery manifest `imagery/abugida-living-manuscript.v1.json` records 13 roles with alt text, focal point, sizes, `darkSrc`, `formats`, `widths` and the SHA-256 of every file. The catalog (site `abugida`) lists all 104 files with their checksums in `templateAssets`. The showcase content gives each photo an Amharic description.

The hero crop now has both people in the frame. The v2 hero cut the second person out.

15 generated images (12 section subjects, the night hero, the night band and the learning room), 104 files, 4.5 MB in `appointment/public/brand-experience/support/abugida-v3/`.

| File | Desktop | Mobile | AVIF (desktop) |
|---|---|---|---|
| `hero` | 1024x1280, 113 KB | 720x900, 66 KB | 69 KB |
| `hero-night` | 1024x1280, 84 KB | 720x900, 49 KB | 57 KB |
| `band` | 1536x658, 74 KB | 720x720, 38 KB | 49 KB |
| `band-night` | 1536x658, 52 KB | 720x720, 30 KB | 34 KB |
| `story` | 1440x960, 142 KB | 720x900, 67 KB | 82 KB |
| `room1` | 1440x960, 99 KB | 720x540, 37 KB | 61 KB |
| `room2` | 1440x960, 141 KB | 720x540, 48 KB | 84 KB |
| `lesson1`, `lesson2` | 720x960, 34–60 KB | 480x640, 19–31 KB | 22–36 KB |
| `faq` | 720x960, 92 KB | 480x640, 39 KB | 50 KB |
| `phrase` | 900x900, 95 KB | 600x600, 51 KB | 57 KB |
| `step1`, `step2`, `step3` | 900x900, 55–75 KB | 600x600, 30–40 KB | 36–44 KB |
| `parchment` | 320x320 tile, 1 KB | – | 1 KB |

The hero has `-w480`, `-w640` and `-w800` files. The scenes have `-w640` and `-w960`. The portrait and square photos have `-w480`.

### Prompts

Every prompt starts with the shared art direction:

> Warm scholarly study rooms near Arat Kilo, Addis Ababa, Ethiopia. Parchment, dark wood, red and black ink, handwritten Ge'ez manuscripts as texture only (no legible writing), woven baskets, clay coffee cups, soft window light. Painterly editorial photography with a slight film grain, 35 mm lens feel. Palette: warm parchment cream, iron-gall brown-black, rubric red accents, a touch of gold. Rules: Ethiopian context; fictional people only; no text, letters, numbers, logos, signage, brand marks, clocks or readable screens anywhere (any writing on paper must be soft, out of focus, abstract strokes that cannot be read); learners (clients) are seen from behind, in profile turned away, or with the face out of frame; only a language coach may show his or her face; no stock smiles; photorealistic, no illustration look, natural hands, no extra fingers.

| File | Scene |
|---|---|
| `hero` | A coach in a white habesha shawl with a red tibeb border, face visible, mid-gesture, and a learner seen from behind sit at a dark table by a tall window. Both people near the centre with space on every side for the arch window. |
| `hero-night` | The same scene and camera, candle-lit: one beeswax candle, a brass lamp, a dark blue window with city lights. An edit of `hero`. |
| `band` | A desk by a window in late afternoon: a blank notebook, a fountain pen, an ink pot, two clay cups, a lit brass lamp, a woven basket. The objects in a strip across the middle. |
| `band-night` | The same desk at night, lit by the lamp and one candle. An edit of `band`. |
| `story` | The learning room: bookshelves, a long table, baskets, an abstract parchment page and a window toward eucalyptus trees and the old stone university gate. No people. |
| `room1` | The learning room seen from the top of a narrow stair: a long table set with notebooks, chairs with tibeb cushions, low bookshelves. No people. |
| `room2` | The conversation room: two armchairs, a low table with two cups, a mesob basket, a tibeb cushion, a linen curtain. No people. |
| `lesson1` | A coach in a grey scarf, face visible, and a learner seen from behind at a café table with two macchiatos. |
| `lesson2` | Over a learner's shoulder: a hand traces soft, unreadable letters in a notebook. The face is out of frame. |
| `phrase` | A coffee ceremony: a black clay jebena, cups on a carved tray, roasted beans, fresh grass, frankincense smoke. |
| `step1` | A notebook open to a blank page, a fountain pen, a red pencil and a red ribbon. |
| `step2` | Two people in a role-play, from the chest down, their hands about to meet. |
| `step3` | A phone with a black screen, a blank folded note and a pencil on a desk. |
| `faq` | Cloth-bound books with plain spines, a basket, an ink pot with a dip pen, a linen curtain. |
| `parchment` | A seamless parchment texture with no marks. |

## Showcase

The seeder moved the showcase to v3. Nothing was changed by hand.

- The catalog site `abugida` has `heroRole: hero.abugida`, `detailRole: story.abugida`, the v3 hero checksum, `templateAssets` and new gallery previews (`scripts/capture_template_gallery.py http://localhost:47800 abugida-language`).
- `showcase_public.V3_SCENES["abugida"]` gives the hero, the story, the two lesson photos and the two rooms, each with an Amharic description. No photo repeats on the page.
- `EXTRA_TESTIMONIALS["abugida"]` adds four consented reviews, so the marginalia marquee runs. The reviews heading is "In the learners' words".
- `PUBLIC_EXPERIENCE_VERSION` went up by one for each seeder run of this work (19 and 23 at the time of the runs).

## Browser QA (Agent Plane, 2026-10-15)

Fixture: `appointment.tests.template_abugida_v3_qa_fixtures` (setup before, cleanup after). The QA client is Lidya Assefa (`lidya.assefa@example.test`, `0900 000 026`). `cleanup()` deletes only her bookings and customer profile at the Abugida showcase, by exact name.

| Run | Manifest | Result |
|---|---|---|
| BQA-2026-00337 | `template-abugida-v3.yaml`: en and am, 1440 and 390, light, full motion. Every section, the phrase card turned, the review pause, the FAQ and the Habesha clock, the room tabs and the map, the band, the footer, a full page, the handoff, the chooser and the time picker. | Passed, 0 console, 0 network errors |
| BQA-2026-00343 | `template-abugida-v3-dark.yaml`: en and am, 1440 and 390, dark, reduced motion. Night photos, the phrase card, the still review grid, a full page, the mode switch both ways, the handoff and the chooser. | Passed. Console: the known framer-motion reduced-motion notice of the scheduler. 0 network errors. |
| BQA-2026-00346 | `template-abugida-v3-states.yaml`: night photos in light mode after 18:00, the morning (closed until 10:00), live availability on, off and empty, the loading screens (site, handoff dark, Amharic phone) and a booking with the ink flourish. | Passed |
| BQA-2026-00348 | `booking-journey-abugida.yaml`: landing, handoff row, time picker with any coach, back to the chooser (one card per lesson), the coach filter (Amharic phone dark), a time, the phone-first details form and the confirmation with the ink flourish. | Passed |

After the last fixes (the live chip row, the photo start state, the skin heading metrics, the flourish marks) all four ran again and passed: BQA-2026-00364 (`template-abugida-v3`), BQA-2026-00366 (`-states`), BQA-2026-00368 (`booking-journey-abugida`) and BQA-2026-00369 (`-dark`). The cleanup after them deleted the three QA bookings.

BQA-2026-00335 failed first: `text_contains` reads the rendered text, and the greeting was `text-transform: uppercase`. The greeting and the eyebrows now use `font-variant: all-small-caps`. One manifest selector matched six hour rows and now uses `:nth-match`.

### Review

Reviewed at 1440 and 390, light and dark, English and Amharic, as an art director and as a conversion designer.

- The hero reads as a manuscript at first sight. The fidel table, the rubric first order and the ሀ window carry the concept. Both people are in the window. On a phone the headline, the booking action and the next free time come first, and the window shows in the first screen.
- The contents page is the clearest lesson list of the five templates: the price and duration sit on the leader line, and the whole row books.
- The candle-lit night photos make dark mode its own scene. Amharic in Abyssinica SIL is the strongest typographic moment of the page.
- Fixed during review: a paragraph reset that beat the class margins, a background that tiled in dark mode, a contents border drawn with an SVG dash that broke at odd sizes (now four edges that scale), an empty steps line (now a rule between the numerals on a named view timeline), the phone booking band that hid the desk, and the handoff on a phone, where the photo pushed the booking action below the first screen.
- Open points: the coach portraits are the older daylight showcase portraits, cooler than the new photos. The Amharic page shows the coach names in English, because the showcase has no Amharic names. The scheduler shows 12-hour times on Amharic pages (shared flow).

## Performance

Measured with a Playwright script on production builds. The develop build (`ad7c51f`) and the current tree were each built into a private folder and served through the same local proxy in front of the stack's web port, so both builds load the same way. Phone: 390 px, DPR 2, 9 Mbps, 170 ms, CPU 4x, cache off. Desktop: 1440 px, no throttling. The builds ran in turn. Other agents used the same machine at the same time, so single values vary by about 1.5 s. Compare the medians.

| Page | Profile | Develop `ad7c51f` (median LCP, CLS, images) | This build (median LCP, CLS, images) |
| --- | --- | --- | --- |
| Service chooser `/schedule/org/abugida-studio` (10 runs each) | Phone | 3.90 s, 0.013, 233 KB | 4.02 s, 0.014, 244 KB |
| Time picker, `with=any` (5 runs each) | Phone | 4.28 s, 0.015, 94 KB | 4.32 s, 0.015, 105 KB |
| Landing `/abugida-studio` (3 runs) | Phone | v2 not measurable (the showcase release pins v3) | 4.45 s, 0, 312 KB |
| Landing `/abugida-studio` (3 runs) | Desktop | – | 0.82 s, 0.003, 333 KB |
| Bloom v3 landing, reference (3 runs) | Phone | – | 4.77 s, 0.012, 448 KB |

The chooser and the time picker stay within the run-to-run spread (about 0.4 s between single runs). The new build also carries the other phase 2 skins, so a difference of 0.1 s is not all Abugida's. The CLS of both builds comes from the shared flow: the service card text and the provider rail move when the brand font arrives (chooser), and the summary block moves when the slots load (time picker, in some runs of both builds).

Two fixes came from these runs. The live "next free" chip arrived after the first paint and pushed the fidel table down on a phone (CLS 0.018). The chip row now keeps its height. The hero photo was the phone LCP element and waited for its reveal (5.4 s). The photo now starts partly open, and the LCP element is the headline (4.45 s).

The LCP element of the chooser is the business description, and of the time picker the summary text, in both builds. The skin adds one backdrop file (`band-w640.avif`, 11 KB). The lesson photos load lazily in small arch frames. The skin keeps the shared heading weight and size, so a late font does not rewrap a heading.

The phone LCP of the landing page is above 2.5 s, as for every template. The time goes to the app shell (`BLOOM_V3.md`, "Performance"). The first load has 312 KB of images on a phone: the hero mobile AVIF (43 KB), the parchment tile, the logo and the lazy photos that Chrome fetches early on a fast connection.

## Files

- Package: `frontend/src/public-experience/templates/abugida-v3/` (`AbugidaTemplate.tsx`, `parts.tsx`, `art.tsx`, `copy.ts`, `AbugidaMoment.tsx`, `booking.tsx`, `abugida.css`, `booking.css`, `moment.css`), registered as `abugida-language@3` with `Loading`, the skin and the moment.
- Recipe and primitives: `recipes/abugida-language.v3.json`, `palettes/abugida-language.v3.json`, `layouts/abugida-language.v3.json`, `surfaces/abugida-language.v3.json`, `imagery/abugida-living-manuscript.v1.json`, `recipes.py`.
- Strings: `publicSite.abugida.*` in `en.json` and `am.json`.
- Showcase: `appointment/demo/showcase.py` (version), `showcase_public.py`, `catalog.v1.json`, the two gallery previews.
- QA: `qa/manifests/growth/template-abugida-v3.yaml`, `-dark.yaml`, `-states.yaml`, `booking-journey-abugida.yaml`, `appointment/tests/template_abugida_v3_qa_fixtures.py`.
- Tests: `appointment/tests/test_template_abugida_v3.py`, `frontend/tests/public-template-packages.test.mjs`, `booking-skin.test.mjs`.
