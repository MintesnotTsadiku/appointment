# Selam v3, "Tempo"

Selam v3 is the phase 2 redesign of Selam Movement (`TEMPLATE_REIMAGINATION.md`, section 5.2). It is a new versioned package: recipe `selam-movement` v3, renderer `selam-movement@3`. Selam v1 and v2 stay registered. A site published on v2 does not change until its owner switches the template and publishes again. The Selam showcase (`/selam-studio`) now uses v3. New sites that choose Selam get v3, because the gallery and website setup offer the latest recipe version.

The behavior comes from the headless kit (`TEMPLATE_V3_KIT.md`). Every visual is in the package. The package imports nothing from another template, Bloom v3 included.

## Concept

A sports and wellness magazine in motion: fresh morning air, breath and rhythm. After dark (Addis Ababa time) and in dark mode the studio is "5:30 am": the same room before sunrise, with one warm paper lantern, a deep blue-moss sky and lime glows on the numbers.

- Palette: the v2 palette (chalk sage, moss `#3b5a1c`, lime `#cde27a`). Lime is the energy colour only: tempo numerals, pace bars, the motion arc, the reading line and the booking action. A deep moss band in the middle of the page gives the page a pulse.
- Type: Figtree at weight 900 for display, with tight tracking. In Amharic, Menbere Bold (kept from v2), with more line height and no tracking.
- Shape: the long pill (tall pills for portraits and photos, a horizontal stadium for the hero and the visit photo) and the motion arc (a thin lime line that rises like a body from the floor to standing).
- Rhythm: hero light, five-frame scene, sessions light, Entoto story photo, coach soft, session beats and proof deep, benefits light, reviews lime, FAQ light, visit soft, booking band photo, footer deep.

## Sections

| Section | What it shows | Content source |
|---|---|---|
| Bar | Logo, name, nav, booking action, mode switch (circular reveal), and the "tempo line": a ruler of ticks that fills with lime as you read | Identity, chrome |
| Hero | Greeting by Addis time, open-now badge, the headline as an opening spread (the words rise in turn), lede, booking action (magnetic), next free time | `hero`, `placeHours`, live availability |
| One movement, five frames | Desktop with motion: the stage pins for about 140 vh and the scroll plays five stills of one mobility flow (kneel, reach, twist, rise, stand) in a long stadium window. The lime arc draws along, and the frame ticks fill in turn. Phone: a swipe rail of tall pills with a caption per frame and dots. No motion: a still contact strip of five tall pills with the drawn arc. An owner hero photo replaces the scene with one still. | `hero` (photo, else `hero.selam`), roles `flow2–5.selam` |
| Sessions | One card per session: a tall pill photo, the length as a giant tempo numeral that counts up (a lime marker sweeps under it on hover and it pulses), a pace bar that fills to the session's share of the longest one, the price, the next free time and "Book this session" | `services` (photo, else `session1/2.selam`) |
| Story | A full-bleed Entoto sunrise with slow parallax and the story on a chalk card with a numbered ledger | `about` (photo, else `interlude.selam`) |
| Coach | The portrait in a tall pill that breaks the band's top edge, with a drawn arc; name, tags, next free time, "Book with Selam" | `providers` |
| Session beats | A deep band: a tall pill photo per step, outline numerals, an arc that links the steps and draws on scroll; a swipe rail on phones | `process` (photo per step, section photo, else `beat1–3.selam`) |
| Proof | Lime numerals that count up on the same deep band | `proof` |
| Benefits | A bento with a tall pill photo, drawn tiles (breath, metronome, window, mat) and one lime tile | `benefits` (photo, else `benefit.selam`) |
| Reviews | The first review as a magazine pull quote on the lime band, with a client silhouette that breaks the band's top edge. From three reviews, the others run in a marquee with a pause button (a still grid without motion). | `testimonials` (photo, else `quote.selam`) |
| FAQ | A numbered accordion and a card with a drawn tempo dial, the call link and the weekly hours with the International / Habesha switch (Habesha by default in Amharic) | `faq`, `contact.phone`, `placeHours` |
| Visit | The blue gate in a long stadium photo, the open-now badge, the address, a copy-address chip, the phone and the directions; tabs when there are several places | `locations` (photo, else `studio.selam`) |
| Booking band | The studio before the session (night photo after dark) with the lime arc, a glass card, the next free time and "N times left today" when 8 or fewer are left | `booking_cta` (photo, else `band.selam`) |
| Footer | A full-width ruler of beats, the name with a lime dot, hours, links, booking action, credit | `footer`, credit |
| Phone | A booking bar in the thumb zone after the hero, hidden while the booking band is in view. It takes the shorter booking label. | |
| Desktop | Section progress ticks on the right after the hero (addition A6) | |

The booking handoff (`/selam-studio/book`) shows the greeting, the booking heading, the booking action and the next free time, the studio photo in a long stadium with the arc, and one row per session: the photo in a tall pill, the length as a tempo numeral with its pace line, the name, the price and the next free time. Each row is a real link to the session's time picker with any provider (`snapshot.bookingPaths[item.id]`); in Amharic the row has `lang="am"` and the path continues in Amharic. The panel is the target of the booking view transition (`data-vt-book`).

### Additions A1–A6

- A1: the greeting follows the Addis Ababa clock. Dark mode always shows the night photos of the five frames and the booking band. Light mode shows them from 18:00 to 06:00, and the hero becomes the dark "5:30 am" stage.
- A2: the success moment is the "tempo burst" (`SelamMoment.tsx`, loaded only after a booking). Three lime rings beat out from the success icon and twelve tempo ticks spring out; the last ring and the ticks settle as a quiet halo. With reduced motion the halo rests without movement.
- A3: photos zoom and pan under a fine pointer (`data-pan`).
- A4: the shared scheduler vibrates on a time pick and after a booking; the phone frame dots also give `haptic("select")`.
- A5: the loading screen (`SelamLoading`) is the long pill with a dashed arc and five beats that pulse in turn. It shows while the published design loads, on the site and on the handoff.
- A6: section progress ticks on long pages (desktop).

### Motion

Showcases use `expressive`. `standard` keeps the five-frame scrub, parallax, count-ups, the marquee and pointer effects. `calm` keeps short reveals and shows the five frames as the still contact strip. Reduced motion shows the final state of everything, the contact strip, a still review grid and no pointer effects. The scrub uses CSS `view-timeline` where the browser has scroll-driven animations, and the kit's `--p` elsewhere. Frames 2 to 5 load after the first scroll, touch or a quiet moment after the page load, so they never compete with the first paint.

## Booking skin

`selam-v3/booking.tsx` and `booking.css` (every rule under `[data-bk-skin="selam-v3"]` or `.s3k-`), registered in `SKINS` as `selam-movement@3`.

| Page | Selam's skin |
| --- | --- |
| Header (all steps) | Deep moss in both modes, with the tempo line (ticks and a lime line) along the bottom edge. The steps are small beat pills: lime for the current step, green with a tick for a done step. |
| Page background | A faint, blurred echo of the booking band (`band-w640`, 10 KB AVIF; `band-night-w640` in dark mode). No grid pattern. |
| Service chooser | Figtree 900 headings (Menbere Bold in Amharic), the brand logo, service photos in pill frames with a lime line (`session1/2.selam`, the same photos as the landing page). |
| Time picker | The service photo at the top of the summary, pill-shaped times and days. The chosen time uses the palette primary; lime is for the booking action only. |
| Details | The service photo in the summary and the lime confirm button. |
| Confirmation | The tempo burst. |

## Images

All photos are original and generated for this package with the Codex CLI (`gpt-6.1-sol`), the same method as Bloom v3 (`BLOOM_V3.md`, "Images"):

1. `codex exec --skip-git-repo-check -m gpt-6.1-sol --sandbox workspace-write -C <scratch dir> "<prompt>"`, with the built-in image tool and no drawing code. Five runs on 2026-10-15: the five frames, nine scenes, the six night photos, a second guided-session photo, and the studio gate. Codex looked at each image and regenerated any with text, a client face, an awkward angle or wrong anatomy (it regenerated `flow4` for the trouser hems, `session1` for the mat colour and `quote` for a darker silhouette). The art director's review replaced the first `session2` (shot from behind the client's hips) with a dignified side view.
2. `flow2` to `flow5` are edits of `flow1`: the same camera, room, light and clothes, and only the pose changes. Every night photo is an edit of its day photo: the light and the time change, and the pose, the camera and the room do not.
3. The coach in every photo is the showcase's coach, Selam Bekele: the prompt of the first frame attached her existing portrait (`providers/selam-bekele.webp`) as a reference.
4. A Pillow script (bench Python, Pillow with AVIF) crops each image to its slot and saves WebP (quality 74–76, `method=6`; the busy gate photo 66) and AVIF (quality 46–52) for the desktop file, the mobile crop and the smaller widths.
5. The imagery manifest `manifest/design/imagery/selam-tempo.v1.json` records 15 roles with the alt text, focal point, sizes, `darkSrc` (the five frames and the band), `formats`, `widths` and the SHA-256 of every file. The showcase catalog (site `selam`) lists every file with its checksum in `templateAssets`. The showcase content gives the hero, sessions, story, visit and step photos an Amharic description (`showcase_public.V3_SCENES["selam"]`). The mood photos of the bento and the pull quote are decorative.

21 generated photos (15 day subjects including the five frames, plus six night edits), 154 files, 5.2 MB in `appointment/public/brand-experience/support/selam-v3/`. The plan counted 14; the scene needs a night photo for each of the five frames, so the scrub stays in one light in dark mode, and the visit and the sessions got their own photos instead of repeats.

| File | Desktop | Mobile | AVIF (desktop) |
|---|---|---|---|
| `hero` (frame 1, kneel) | 1536x864, 68 KB | 720x900, 30 KB | 48 KB |
| `flow2`–`flow5` | 1536x864, 60–67 KB | 720x900, 27–31 KB | 44–49 KB |
| `hero-night`, `flow2-night`–`flow5-night` | 1536x864, 36–40 KB | 720x900, 16–19 KB | 31–34 KB |
| `session1`, `session2`, `beat1`–`beat3`, `quote` | 880x1320, 42–76 KB | 600x900, 23–43 KB | 30–53 KB |
| `benefit` | 900x900, 58 KB | 600x600, 28 KB | 37 KB |
| `interlude` | 1536x960, 65 KB | 720x900, 30 KB | 59 KB |
| `studio` | 1536x864, 180 KB | 720x540, 75 KB | 101 KB |
| `band` | 1536x768, 63 KB | 720x900, 46 KB | 41 KB |
| `band-night` | 1536x768, 29 KB | 720x900, 19 KB | 25 KB |

Each desktop file also has `-w640`/`-w960` (frames, interlude, studio, band) or `-w560`/`-w480` (portraits, benefit) versions for `srcset`.

### Prompts

Every prompt starts with the shared art direction:

> Shared art direction (Selam Movement, "Tempo"): a fresh morning movement studio in Gerji, Addis Ababa, Ethiopia, with tall windows that look toward the green Entoto hills. Soft cool morning daylight, chalk sage walls, moss green and oat linen textiles, warm wood floor, one lime-green accent object (a lime mat or a lime towel). Editorial sports-and-wellness magazine photography, 35 mm lens feel, airy negative space, calm focus, a slight natural motion blur on moving limbs only. Real Ethiopian people with natural skin tones. Rules: fictional people only; no text, letters, numbers, logos, signage, brand marks, product labels, clocks or readable screens anywhere; no gym machines; no stock smiles or posing for the camera. The coach (staff) may show her face. A client is always seen from behind, in profile turned away, as a silhouette, or with the face out of frame. Photorealistic, natural hands with five fingers, natural anatomy, no illustration look.

| File | Scene |
|---|---|
| `hero` (`flow1`) | One movement flow in five frames from one fixed camera at hip height: the coach (the attached portrait; plum tank top, oat linen trousers, barefoot) alone on a lime mat that runs across the lower middle, a chalk sage wall on the left, two tall steel windows with the hazy Entoto hills on the right, a moss cushion and an oat towel at the left edge, a plant in a clay pot at the right edge. Frame 1: she kneels upright, hands on her thighs, about to begin. |
| `flow2`–`flow5` | Edits of `flow1`, pose only: a kneeling overhead reach; a half-kneeling lunge that twists open toward the windows; rising from the lunge with the arms swinging forward; standing tall at the centre of the mat. |
| `*-night` | Edits of each day photo: deep blue hour before dawn outside, the hills as dark silhouettes, a thin pale teal band of first light, a few warm city lights; inside dim and cool, lit by one plain paper floor lantern by the left wall in the same place in every frame. |
| `session1` | A first consultation on moss floor cushions: the client from behind in an oat sweater, the coach listening with an open hand, two glasses of water on a low wooden tray. |
| `session2` | A guided half-kneeling stretch by the window, seen from the side: the client's face turned away toward the hills, the coach guiding her shoulder and lower back. |
| `beat1` | Past a client's blurred shoulder: the coach's hands on a closed notebook, a cup of tea on the floor. |
| `beat2` | The coach's hands adjusting a client's knee and ankle on the lime mat (no faces). |
| `beat3` | A client's hands sketching a short routine as stick figures (no letters or numbers) beside a rolled lime mat and an unlabelled bottle. |
| `benefit` | A plain glass bottle, a folded oat towel and the edge of the lime mat in long morning shadows. |
| `quote` | A client silhouette at the tall window, facing the misty hills, face not visible. |
| `interlude` | Sunrise over the misty eucalyptus ridges of Entoto, a few rooftops at the bottom edge. |
| `band` | The empty studio before a session: one lime mat, a cushion, a towel and a glass of water by the windows in the right half; a calm sage wall in the left half for text. |
| `studio` | A quiet Gerji lane: a plain blue metal gate half open in a cream wall with bougainvillea and a jacaranda branch, a stone path to a building with tall windows, a glimpse of a sage wall and a lime mat upstairs, the hills in the distance; no people, numbers or signs. |

## Showcase

The seeder moved the showcase to v3 (`appointment/demo/showcase.py`, `PUBLIC_EXPERIENCE_VERSION` raised by one in each of two runs, now 24 after the other templates' runs). Nothing was changed by hand.

- The catalog site `selam` has `heroRole: hero.selam`, `detailRole: interlude.selam`, the v3 hero checksum, `templateAssets` and new `previewAssets`.
- The brand profile uses motion `expressive` (the most expressive level that the recipe offers).
- The content uses the v3 photos for the hero, the sessions, the story, the visit and the three steps, with Amharic descriptions (`V3_SCENES["selam"]`). It has four consented reviews (`EXTRA_TESTIMONIALS["selam"]`: a pull quote and a marquee of three) and the practice in numbers (`PROOF["selam"]`: one client in the room, 60 min longest session, 4 moves to take home), with Amharic.
- The gallery preview images were captured again (`scripts/capture_template_gallery.py http://localhost:47800 selam-movement`). The capture uses reduced motion, so the card shows the five-frame contact strip.

## Browser QA (Agent Plane, 2026-10-15)

Fixture: `appointment.tests.template_selam_v3_qa_fixtures` (setup before, cleanup after). The success and journey scenarios book appointments for the QA client; `cleanup()` deletes them by the client's exact email, or exact phone and name.

| Run | Manifest | Result |
|---|---|---|
| BQA-2026-00365 | `template-selam-v3.yaml`: en and am, 1440 and 390, light, full motion. Hero, the five-frame scrub at two points (desktop) or the swipe rail (phone), every section, review pause, FAQ and Habesha clock, visit, band, footer, a full page, the handoff after the view transition, the chooser and the time picker. | Passed, 0 console, 0 network errors |
| BQA-2026-00355 | `template-selam-v3-dark.yaml`: en and am, 1440 and 390, dark, reduced motion. Night frames, the still contact strip, the still review grid, the night band, a full page, the mode switch both ways, the handoff, the skinned chooser. | Passed, 4 console messages (the known framer-motion reduced-motion notice of the scheduler), 0 network errors |
| BQA-2026-00367 | `template-selam-v3-states.yaml`: the 5:30 am stage in light mode after dark, early morning (closed until 09:00), live availability on, off and empty, the loading screens (site light, handoff dark, Amharic phone), and a booking from the landing page to the tempo burst. | Passed, 0 console, 0 network errors |
| BQA-2026-00370 | `booking-journey-selam.yaml`: landing, handoff row (`with=any`), time picker with the summary photo, back to the chooser (two cards with photos, the Selam logo), time picker, details (phone first, "Addis Ababa time", summary photo), confirmation with the tempo burst; English desktop light and Amharic phone dark (`lang=am`). | Passed, 0 console, 0 network errors |

Existing manifests that open the Selam pages, run again: BQA-2026-00371 (`booking-layout.yaml`), BQA-2026-00372 (`booking-layout-am-dark.yaml`; the one network error is the unknown address that the states scenario opens on purpose) and BQA-2026-00373 (`template-gallery.yaml`) passed. Console: only the known reduced-motion notice.

Earlier runs on the same day found and fixed manifest selectors: BQA-2026-00340 and 00344 (a frame selector that matched five images; a session card below the fold after a heading click), BQA-2026-00352 (a skin selector that matched the header and the page), BQA-2026-00360 and 00362 (a team selector for a one-coach business; the details summary photo selector). The passing runs BQA-2026-00347, 00357 and 00363 came before the last style changes (thumb bar label, tempo burst halo).

Full-page captures show a tall empty band under the hero: the pinned five-frame stage stays at the top of its 230 vh scroll track in a full-page capture. In a real scroll the stage pins and plays the frames.

### Review

Reviewed at 1440 and 390, light and dark, English and Amharic, as an art director and as a conversion designer.

- The hero reads as a magazine opening spread. The five frames carry the concept: on desktop the scroll plays the movement and the lime arc draws through it; the reduced-motion contact strip is strong enough to be the gallery card.
- The night frames keep the pose and the camera exactly, so dark mode feels designed, not dimmed. The lantern is in the same place in every frame.
- Every section has a photo or a drawing; the pill shape repeats in the frames, the session photos, the coach, the beats, the bento, the pull quote, the visit and the handoff.
- Conversion: the booking action is the only lime pill on light sections, it repeats in the bar, the hero, each session card ("Book this session"), the coach card, the band, the footer and the phone thumb bar. The next free time is next to every booking action.
- Fixed after review: session and coach photos that did not fill their pills, oversized small headings ("The practice in short", "From a client"), a stretched next-free chip, the secondary hero link squeezed into a narrow column on phones, side-by-side session cards on phones (now stacked), the bento photo with tile padding on phones, a first `session2` photo framed from behind the client's hips, a 209 KB gate photo (now 180 KB), and a tempo burst that ran before the screenshot (now it settles as a halo).
- Open points: the Amharic booking pages show the business description in English, because the business record has no Amharic description. On phones the thumb bar label still truncates when the next free time is long. The marquee cards start cut at the left edge by design (the track masks both edges).

## Performance

Measured with a Playwright script on the production build (`npm run build`, served by the stack's web port 47801), cache off. Phone: 390 px, 9 Mbps, 170 ms, CPU 4x. The build of `develop` (ad7c51f, `index-Wzhq2zkB.js`) and the new build (all four phase 2 packages) were served in turn on the same machine, alternating, in 19–21 rounds.

| Page (phone) | Before: median LCP, CLS, images | After: median LCP, CLS, images |
|---|---|---|
| Service chooser `/schedule/org/selam-studio` | 3.85 s, 0.003, 156 KB | 3.92 s, 0.003, 166 KB |
| Time picker, `with=any` | 4.21 s, 0.004, 75 KB | 4.36 s, 0.004, 85 KB |
| Last controlled set, 6 rounds: Selam time picker / Bloom time picker (control, its skin did not change) | 4.16 s / 4.26 s | 4.17 s / 4.46 s |
| Landing `/selam-studio` | Selam v2 reference (BLOOM_V3.md): 4.5 s, 0, 663 KB | 4.62 s (4.38–4.68), 0.022, 233 KB |
| Landing, desktop 1440, no throttling | | 0.99 s (0.82–1.22), 0.017, 491 KB |

The LCP element of the chooser and the time picker is still text. The extra 10 KB is the skin's backdrop (`band-w640`, AVIF, low priority). The run-to-run spread on this machine was about ±0.3 s while four agents worked on it. In the controlled set the Selam time picker did not change, while the Bloom control moved by +0.2 s, so the small median difference comes from the new build as a whole (the shared booking-skin chunk grew from 0.9 KB to 3.3 KB gzipped CSS with five skins), not from the Selam skin. The backdrop blur is 10 px (Bloom uses 22 px) to keep the paint cheap on slow phones.

The landing page's LCP element on the phone is the first frame (720x900 AVIF, 24 KB). The landing loads 233 KB of images on the phone (guardrail: 500 KB); CLS is 0.022 (guardrail: 0.05). The phone LCP misses 2.5 s, as for every template: the time goes to the app shell before the first paint (see BLOOM_V3.md, "Performance"). The package itself is 6.9 KB of gzipped JavaScript and 10.9 KB of gzipped CSS (esbuild, minified, React and shared modules external); the booking skin CSS is 1 KB gzipped.

## Files

- Package: `frontend/src/public-experience/templates/selam-v3/` (`SelamTemplate.tsx`, `parts.tsx`, `art.tsx`, `copy.ts`, `ink.ts`, `SelamMoment.tsx`, `booking.tsx`, `selam.css`, `moment.css`, `booking.css`), registered as `selam-movement@3` with `Loading`; the moment in `templates/moments.tsx`; the skin in `templates/booking-skin.ts`. Chrome strings under `publicSite.selam.*` in `en.json` and `am.json`.
- Recipe and primitives: `recipes/selam-movement.v3.json`, `layouts/selam-movement.v3.json`, `surfaces/selam-movement.v3.json`, `imagery/selam-tempo.v1.json`, `recipes.py` (palette and typography stay `selam-movement` v2).
- Images: `appointment/public/brand-experience/support/selam-v3/` (154 files); gallery previews `template-gallery/selam-movement-{desktop,mobile}.webp`.
- Showcase: `appointment/demo/showcase.py` (version), `showcase_public.py` (`V3_SCENES["selam"]`, `EXTRA_TESTIMONIALS["selam"]`, `PROOF["selam"]`), `catalog.v1.json`.
- QA: `qa/manifests/growth/template-selam-v3.yaml`, `-dark.yaml`, `-states.yaml`, `booking-journey-selam.yaml`, `appointment/tests/template_selam_v3_qa_fixtures.py`.
- Tests: `appointment/tests/test_template_selam_v3.py`, `test_public_experience_contracts.py`, `frontend/tests/public-template-packages.test.mjs`, `booking-skin.test.mjs`.
