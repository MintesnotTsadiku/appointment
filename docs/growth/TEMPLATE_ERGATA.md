# Ergata Therapy template

Ergata ("እርጋታ", calm) is a public website template for counsellors, psychologists, psychotherapists and small group practices. It is a certified recipe (`ergata-therapy` v1) with its own template package, primitives, starter copy, imagery and fonts. Independent providers and organizations can choose it in website setup.

## Design decisions

- The visitor is often anxious and private. The page must feel calm, warm, safe and professional. It must never feel clinical or like a sales page.
- One recurring shape: the arched window. It frames the hero photo, the portrait, the image slots, the safety drawing and the booking band.
- No section is only text on a flat ground. Each section has a photo or a drawing: original photos in arches, soft organic shapes behind them, a fine paper grain on the soft bands, and line drawings in the template palette. The drawings use `currentColor` and palette custom properties, so all three palettes and dark mode recolour them. There are no faces except the provider portrait.
- Palette "linen, sage and clay": linen canvas `#f5f0e8`, deep sage actions `#3b5a4b`, clay `#9c5436` for small marks only (eyebrow, free price, notice). Dark mode is a deep forest night `#121916` with pale sage actions. All text roles pass WCAG AA (body text 12.2:1 light, 14.4:1 dark; muted text 6.1:1 and 9.1:1; button text 7.5:1 and 10:1). Two more palettes: "Soft canvas" (deep teal and sage) and "Paper & ink".
- Type: Fraunces with the SOFT axis at 100 for headings (warm, round terminals) joined with Noto Serif Ethiopic; Source Sans 3 for reading at 18 px joined with Noto Sans Ethiopic. Amharic headings get more line height and no negative tracking. "Clear sans" is the alternative font choice.
- Spacious density by default. Generous section spacing; reading measure near 36 em.
- Motion is quiet: the hero arch opens like a curtain, copy rises, sections fade up 14 px. Under `prefers-reduced-motion` all animation and transitions stop and every section shows at once.
- The safety notice uses clay, not alarm red, with large tap targets (`tel:` links) for the numbers.
- Focus rings use the palette focus colour (3 px). Tap targets are 44 px or more. No autoplay.

## Sections and content model

The recipe requires 15 sections, in this order: `hero`, `benefits`, `approaches`, `about`, `process`, `services`, `providers`, `proof`, `testimonials`, `faq`, `notice`, `locations`, `contact`, `booking_cta`, `footer`.

### Art direction per section (review of 2026-10-13)

The product owner said that some sections were "just text and background". The review of the `/tsion-counselling` showcase (desktop 1440 and mobile 390, English and Amharic, light and dark) found these plain sections: who we help (cards with small icons, empty left column), approaches (a text table on a flat band), first session (numbers and text), sessions (text cards), FAQ (empty left column), safety notice (a plain card), where we meet (a text card next to a photo), booking band (a flat green band) and the footer. The table gives the new design.

| Section | Shown as | Picture |
|---|---|---|
| `hero` | Eyebrow, headline, lede, "Book a first session", softer second action, format badges ("Online video", "In person") when the sessions have more than one format, reassurance line | Arched photo on a sage organic shape, a drawn olive sprig at its shoulder, the lead practitioner card overlapping. Optional owner photo (`image`, `imageAlt`). |
| `benefits` | Illustrated tiles in three washes (sage, sand, clay) with a soft round shape in the corner | One line drawing per `icon` name (stone in water, cloud with sun, low candle, falling leaf, two cups, sheltering arch, path to a door, open hand). A sticky arched photo of hands holding a cup (`needs.ergata`) beside the tiles. New optional `image`, `imageAlt`. |
| `approaches` | A walk: each way of working is a stepping stone on a dotted path, in a card | An arched photo of a eucalyptus walking path (`approach.ergata`), a stone drawing per item, grain and an organic shape on the band. New optional `image`, `imageAlt`. |
| `about` | Practitioner story and highlight chips with a leaf mark | The room photo in a tall arch on a sand shape, with a small arched window detail (`window.ergata`) overlapping. |
| `process` | Four stops on a winding dotted path (vertical on phones) | A drawing per step (calendar, two speech shapes, key under an arch, sprout in a pot) in a round stop with its number. |
| `services` | Session cards with a scene band, a format badge, duration, fee and "Book this session" | A drawing per format: office (arched window, chair, plant), online (screen with an arch), phone, introductory call (speech shapes). Each card links to the scheduler of its own offering (see below). |
| `providers` + `proof` | Practitioner card with an arched portrait on a clay shape, a sprig, specialties, short credentials and "Book with …" | Credentials list with a round mark per row and a thin arch outline. Starter copy never invents credentials: `proof` items start empty and the section is hidden. |
| `testimonials` | Anonymised quotes in sage and clay washes | Empty and hidden by default. The schema requires `consent: true` on each quote. |
| `faq` | Numbered questions in soft cards; the open one turns sage | A sticky arched photo of a coffee table by a window (`faq.ergata`) with the "Prefer to ask a question first?" card resting on it. New optional `image`, `imageAlt`. |
| `notice` | "This is not an emergency service" in a clay-washed card with grain; round call buttons with a phone mark | A drawing of an arched window with a low sun and two cupped hands holding a small light. Clay, never alarm red. Phone values allow digits, spaces and `+()-` only. The numbers (991 police, 907 ambulance) are owner content, never template logic. New optional `image`, `imageAlt`. |
| `locations` + `contact` | One card per place. Office: photo, a stylised area map card with the pin, address, landmark note, notes with ticks, hours, phone, "Get directions". Online: photo, a drawn desk card, the video-link line, numbered "how it works" steps, a privacy note, hours. A contact strip with the message note and phone/email links follows. | Office photo (`office.ergata`), online photo (`online.ergata`), map drawing (`AreaMap`), desk drawing (`OnlineArt`). The map is a drawing, not a real street plan; the address and the directions link carry the facts. |
| `booking_cta` | Sage band with grain, an organic shape and the booking action | An arched dawn window (`band.ergata`). The booking handoff page uses the same window. New optional `image`, `imageAlt`. |
| `footer` | Brand, short line, links, "Website by" credit | A drawn line of hills over a sand ground. Credit uses `useTemplateCredit` (honours `template_credit_enabled`, `?source=template_credit`). |

### Schema changes

- `services.items[].format`: optional, `in_person`, `online` or `phone`. The template draws the badge and the scene from it. Without it, the template reads the session name in English or Amharic ("online", "video", "ኦንላይን", "phone", "ስልክ"); anything else is in person.
- `locations.items[]`: new optional `format` (`in_person` or `online`), `body` (a localized note, at most 600 characters: a landmark or a privacy note) and `notes` (up to six localized lines: what to know, or the steps of a video session). The template shows places with `format: online` in the online card; all other places are offices. The first place still feeds the directions action, so put the office first.
- `benefits`, `approaches`, `faq`, `notice` and `booking_cta`: new optional `image` and `imageAlt`, the same image slot as `hero` and `about`. An owner photo replaces the template photo for that slot. Image paths must be packaged `/assets/appointment/` assets.

Each image slot falls back to the template's imagery role (`hero.primary`, `section.detail`, `window.ergata`, `needs.ergata`, `approach.ergata`, `faq.ergata`, `office.ergata`, `online.ergata`, `band.ergata`). So every practitioner who uses Ergata gets the full set of pictures, and the showcase is not special. The drawings are part of the template package and do not need content.

Starter copy: `appointment/public_experience/manifest/content/ergata-therapy.v1.json` (English and Amharic). Guided website setup (`setup.prefill_sections`) applies it to a new draft for this recipe. Facts from the business records (sessions, locations, people, contact details) stay. Lists that are still empty take the starter lists. The hero's second action is "Free 15-minute introductory call" only when the business has a free session of 20 minutes or less; otherwise it is "Questions before you book". A group practice with more than one provider gets "Our therapists". Setup skips a Location without a street address, so an online room does not become an office card by accident; the owner adds the online card with `format: online`.

## Online and office sessions

The app has no "online" Location type and no meeting-link field on Location or EventType (the only meeting links are on the personal calendar, `User Appointment Availability.meeting_link`). The organization booking API sends `location.is_online`, but always `false`, and the booking pages already have a branch for it. So the showcase models the two formats with real records and the smallest support in the template:

- Two Location records of the independent provider: "Bole counselling office" (street address, Monday to Saturday 09:00–18:00) and "Online video room" (no street address, Monday to Saturday 08:00–20:00).
- One offering (EventType) per session and format. Each offering links to the right Location, so its scheduler uses that place's hours.
- `get_public_experience_snapshot` now also returns `bookingPaths`: for an independent provider with public booking, the scheduler path of each bookable offering, by Service. `bookingPath` (the main path) is still the first offering the owner made. An offering that `booking.offering(public=True)` refuses is left out instead of failing the snapshot.
- The template links each session card to its own scheduler, and the booking handoff lists every session with its format as a link. So a visitor chooses online or office before the time picker.
- `independent.public_offering` returns `location` (`name`, and `address` only when the place has a street address). The independent scheduler shows the office name and address under the session name (`data-qa="independent-booking-place"`).
- Content: `format` on sessions and places, the online card's steps and privacy note.

The real online location feature now exists: see `docs/growth/ONLINE_LOCATIONS.md`. The showcase "Online video room" is an Online location with a fixed Google Meet link, and the template derives each session and place format from `sessionFormats` and `placeFormats` when the content has no `format`.

## Images and how they were made

All images are original and license-clean. Codex CLI image generation made the photos (`codex exec --sandbox workspace-write -C <dir> "<prompt>"`, built-in image generation, no drawing code). Every prompt shares one art direction: "calm, warm, safe, quiet and unhurried. Natural daylight. Soft, low-contrast, slightly matte film look. Palette of sage green, warm sand, clay terracotta, oat linen and soft off-white, with deep green shadows. Real, lived-in Ethiopian middle-class settings in Addis Ababa. No text, letters, numbers, logos, signage, brand marks, clocks or readable screens; no people unless stated. Editorial photography, 35 mm lens feel." Each prompt then describes one scene. The first set (hero, room, window, path, first portrait) was made on 2026-10-12; one room image was regenerated once because it had book-spine lettering. The second set (cup, walk, tea, office, online, dawn, male portrait) was made on 2026-10-13 in one Codex run with the same art direction. Pillow cropped each image to its slot, resized it and saved WebP (quality 74–80, `method=6`). Each slot has a desktop file and a `-m` mobile file; the template sends both through `srcset` and loads every photo below the hero lazily. The drawings are inline SVG in `ergata/illustrations.tsx`.

| File (under `appointment/public/brand-experience/`) | Size | Use | Alt (en) |
|---|---|---|---|
| `heroes/ergata-therapy.webp` (+ `-m`, 640×800) | 1040×1300, 139 KiB | Hero (`hero.ergata`, chooser thumbnail) | Morning light through a linen curtain falls on an olive tree, a clay jug and a glass of water in a quiet room. |
| `support/ergata/room.webp` (+ `-m`, 720×480) | 1440×960, 176 KiB | About (`detail.ergata`) | Two soft armchairs face each other across a small wooden table in a sunlit counselling room. |
| `support/ergata/window.webp` (+ `-m`, 720×480) | 1440×961, 112 KiB | About detail (`window.ergata`) | A small clay cup and a sprig of green leaves on a wooden windowsill in soft light. |
| `support/ergata/needs-cup.webp` (+ `-m`, 640×640) | 1024×1024, 72 KiB | Who we help (`needs.ergata`) | Two hands hold a small clay cup of tea against a soft linen sleeve. |
| `support/ergata/approach-walk.webp` (+ `-m`, 640×800) | 880×1100, 186 KiB | Approaches (`approach.ergata`) | An earth path winds uphill between tall eucalyptus trees in soft morning light. |
| `support/ergata/faq-tea.webp` (+ `-m`, 640×800) | 1024×1280, 75 KiB | Questions (`faq.ergata`) | A black clay coffee pot and two small cups on a low wooden table by a sunlit window. |
| `support/ergata/office.webp` (+ `-m`, 720×480) | 1440×960, 184 KiB | Office card (`office.ergata`) | A wooden door with an arched top stands open at the top of stone steps between large potted plants. |
| `support/ergata/online.webp` (+ `-m`, 720×480) | 1440×960, 73 KiB | Online card (`online.ergata`) | A laptop, a cup of tea and a notebook on a wooden desk by a sheer curtain, ready for a video session. |
| `support/ergata/band-dawn.webp` (+ `-m`, 600×800) | 960×1280, 84 KiB | Booking band and handoff (`band.ergata`) | An arched window opens onto a soft dawn sky over green hills. |
| `support/ergata/path.webp` | 1440×960, 189 KiB | Support asset (no slot now) | A stone path between green plants leads to an open wooden door in a quiet courtyard. |
| `providers/yared-tesfaye.webp` | 768×768, 53 KiB | Showcase portrait of a fictional practitioner | Portrait of Yared Tesfaye in a linen shirt and a sage cardigan, with a calm, attentive expression. |
| `brands/ergata-showcase-logo.webp`, `brands/ergata-showcase-favicon.png` | 512 px, 64 px | Showcase mark | Drawn with Pillow (arched window with a clay leaf). |

Prompts of the second set, after the shared art direction: the walk ("a quiet earth walking path winds gently uphill between tall eucalyptus trees … on the forested hills above Addis Ababa, soft early morning light with a little haze"); the cup ("two relaxed hands (no face visible) holding a small handleless ceramic cup of tea … oat linen sleeve, a handwoven white cotton throw"); the tea ("a low wooden table by a window with a traditional black clay jebena … two small handleless cups … soft leaf shadows on a warm plastered wall"); the office ("the quiet entrance of a small counselling office in a calm side street in Bole … a solid wooden door with a simple arched top slightly open … no signage, no people, no cars"); the online corner ("a laptop … seen from the side and slightly behind so its screen is NOT visible … earphones, a cup of tea, a small notebook"); the dawn window ("an arched wooden window open onto a soft dawn sky over the green eucalyptus hills of Addis Ababa"); the portrait ("a fictional Ethiopian man in his early forties, a counselling psychologist, with a calm, warm, attentive expression and a gentle closed-mouth expression (not a stock smile, not posed), short natural hair and a neatly trimmed short beard … oat-coloured linen shirt … soft sage cardigan … plain warm sand-coloured plastered background … an invented person").

Amharic alt text is in the showcase content (`imageAlt.am`). The imagery manifest (`imagery/ergata-rooms.v1.json`) keeps the English alt for each role, with a checksum of the desktop file. The earlier portrait `providers/tsion-hailu.webp` is removed. The design reference is `docs/design-references/public-experience/v1/ergata/moodboard-01.webp`.

Fonts: `appointment/public/fonts/ergata/` (Fraunces SOFT 100, Source Sans 3, Noto Serif Ethiopic, Noto Sans Ethiopic; SIL OFL 1.1, licence text next to each file). Built with `scripts/build_public_fonts.py <source-dir> ergata` from the Google Fonts repository.

Motion: the hero arch opens like a curtain, copy rises, sections fade up 14 px, and the organic shapes behind the hero, the cup, the room and the portrait "breathe" over 18 seconds. The map pin has a slow halo. Under `prefers-reduced-motion` all animation and transitions stop.

## Files

- Frontend package: `frontend/src/public-experience/templates/ergata/` (`ErgataTemplate.tsx`, `ErgataContent.tsx`, `ErgataNewsletter.tsx`, `icons.tsx`, `illustrations.tsx`, `ergata.css`, `ergata-newsletter.css`), registered as `ergata-therapy@1` in `templates/registry.ts`. Font faces in `platform.css`. Chrome keys `approach`, `sessions`, `free`, `bookThis`, `callNumber`, `formatInPerson`, `formatOnline`, `formatPhone`, `areaMap`, `goodToKnow` (English and Amharic in `en.json` and `am.json`).
- Recipe and primitives: `manifest/design/recipes/ergata-therapy.v1.json`, `palettes/ergata-therapy{,-soft,-paper}.v1.json`, `typography/ergata-therapy{,-alternate}.v1.json`, `imagery/ergata-rooms.v1.json`, `layouts/ergata-therapy.v1.json`, `surfaces/ergata-therapy.v1.json`, `appearance-options.v1.json`, `recipes.py`.
- Schema: `section_schemas.py` (`approaches`, `notice`, hero photo, image slots, session and place `format`, place `body` and `notes`); `Public Site Section.section_type` options (migrated once).
- Booking: `public_experience/api.py` (`bookingPaths`), `scheduler/independent.py` (`public_offering.location`), `pages/public-experience/independent-booking.tsx` (office line), `public-experience/types.ts`.
- Setup: `setup.py` (catalog entry, industry "therapy", starter copy, fix: an independent provider's draft now lists that provider). Website setup page: industry option "Counselling and therapy" and `data-qa` hooks on the template cards and the preview button.
- Showcase catalog: `manifest/showcase/catalog.v1.json` entry `ergata` (slug `yared-counselling`). `demo/content_world.py` now requires content for every seeded business only, so a catalog showcase made by a fixture does not break the seeder.
- Independent booking: `public_offering` returns `site_slug`; the independent scheduler (`/schedule/individual/<offering>`) wears the published template's colours and type, as organization schedulers do. The public booking path for an independent provider now opens the first offering the owner made.
- Tests: `frontend/tests/public-template-packages.test.mjs`, `appointment/tests/test_public_experience_contracts.py`, `appointment/tests/test_showcase_catalog.py`.
- QA: `appointment/tests/template_ergata_qa_fixtures.py`, `qa/manifests/growth/template-ergata.yaml`, `template-ergata-dark.yaml`, `template-ergata-chooser.yaml`.

## Showcase

The seeder (`appointment.demo.showcase.seed`) needs a paused scheduler and seeds organizations only, and the dev site must not be reseeded. So the showcase is a QA fixture with exact cleanup: `appointment.tests.template_ergata_qa_fixtures`.

- Yared Tesfaye Counselling, an independent counselling psychologist (fictional, owner `yared.tesfaye.counselling@example.test`), at `/yared-counselling`, English and Amharic. He meets clients at an office in Bole (Cameroon Street, Tsehay Building, second floor, office 204; a five-minute walk from the Bole Medhane Alem roundabout; fictional building) and by online video. Six sessions: free 15-minute introductory video call, first session at the office (60 min, ETB 1,500), first session online (60 min, ETB 1,500), individual session at the office (50 min, ETB 1,200), individual session online (50 min, ETB 1,200), couples session at the office (80 min, ETB 2,000). The draft starts from guided setup, so it also tests the starter copy. Amharic third-person copy uses masculine forms ("ፈቃድ ያለው", "የለበሰው", "ያሬድ … ይገናኛል", "ከያሬድ ጋር ቀጠሮ ይያዙ").
- Hiwot Family Therapy Centre, a small group practice (organization) with no website, so its owner sees the template chooser.

`cleanup()` deletes only the records that `setup()` recorded, by exact name (both Locations go with the provider's `independent_provider` filter). The earlier Tsion Hailu showcase was removed with the same `cleanup()` before the new `setup()`.

## QA runs (Agent Plane)

The manifests use `base_url: http://localhost:47800` (the recreated stack). Runs of 2026-10-13:

| Run | Manifest | Result |
|---|---|---|
| BQA-2026-00024 | `template-ergata.yaml`: en and am, 1440 and 390, light; office and online cards, per-session scheduler links; booking from the landing page through the handoff to the time picker (en desktop, am mobile); an online session card to the time picker (en desktop, asserts "Individual session online"); an office session card to the time picker (am mobile, asserts the office address line) | Passed, 0 console, 0 network errors |
| BQA-2026-00022 | `template-ergata-dark.yaml`: en and am, 1440 and 390, dark, reduced motion; booking to the time picker (en mobile) | Passed, 1 console message (known framer-motion reduced-motion notice), 0 network errors |
| BQA-2026-00023 | `template-ergata-chooser.yaml`: group practice owner sees Ergata in the chooser and previews it | Passed, 4 console messages from the existing sandboxed preview iframe ("Blocked script execution in about:srcdoc"), 0 network errors |

Agent Plane needed one local step on the recreated stack: `npm ci` in `apps/agent_harness` (the pinned Playwright runtime was not installed).

Earlier runs (BQA-2026-00453 to 00475 on the old stack) found and fixed: an unsupported `fetchPriority` prop, button text that inherited the link colour, sticky headings in full-page captures, reveal sections that stayed hidden when the viewport grew, an unbranded independent scheduler, the scheduler opening the couples session, the scheduler using light tokens in dark mode, a long practice name in the hero card, and the band arch.

Other checks: typecheck 176 errors (gate 176), `test:dom` pass, build pass. Frappe modules `test_public_experience_contracts` (24) and `test_showcase_catalog` (4) pass; `frontend/tests/public-template-packages.test.mjs` passes. `test_website_setup` and `test_independent_booking` refuse to run on this site ("restricted to the isolated content-publishing implementation site").

## Open points

- Done (2026-10-14): the website section editor edits every field in English and Amharic, edits, reorders and removes list items, sets the session and place `format`, and fills each image slot by upload or from the media library. An English edit keeps the Amharic. See `docs/growth/WEBSITE_EDITOR.md`.
- Organizations still get one booking path; `bookingPaths` is for independent providers only.
- The independent scheduler opens in the visitor's app language, not the page language, and shows the Service name in English. This was already so before this change.
- The shared scheduler draws the selected day with a primary-to-accent gradient (sage to clay); this is shared scheduler styling.
- The showcase lives only while the fixture runs. To ship it permanently, the seeder needs support for independent-provider businesses.
