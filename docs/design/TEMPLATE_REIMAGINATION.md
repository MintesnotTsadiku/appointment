# Template reimagination: assessment and plan

Date: 2026-10-15. Status: the owner approved the plan. Phase 0 and phase 1 are done: the showcase copy, the headless kit (`TEMPLATE_V3_KIT.md`), the next-availability endpoint, the new image slots and gallery, and Bloom v3 (`BLOOM_V3.md`).

Scope: the public website templates of the appointment app. Bloom Hair, Selam Movement, Tena Clinic, Abugida Language and Meron Atelier (the showcases render the **v2** packages, `templates/<name>-v2/`), and Ergata Therapy (`templates/ergata/`, v1, the reference).

Owner feedback, in short: the templates are plain. Most sections are a solid background with text and an occasional photo. Ergata is in a much better state. Make every template a stunning website, with more imagery, motion and micro-interactions. First give an assessment and many ideas, then build the ideas we agree on.

## Contents

1. [How the review was done](#1-how-the-review-was-done)
2. [Summary of findings](#2-summary-of-findings)
3. [Assessment per template](#3-assessment-per-template)
4. [Idea catalog (110 ideas)](#4-idea-catalog)
5. [Reimagination per template](#5-reimagination-per-template)
6. [Image generation plan](#6-image-generation-plan)
7. [Shared engine](#7-shared-engine)
8. [Phased plan and effort](#8-phased-plan-and-effort)
9. [Decisions for the owner](#9-decisions-for-the-owner)

---

## 1. How the review was done

- Playwright (Chromium 1234) opened each showcase on `http://localhost:47800`: `/bloom-studio`, `/selam-studio`, `/tena-studio`, `/abugida-studio`, `/meron-studio`, `/yared-counselling`, each also in `/am`. Each was captured at desktop 1440×900 and mobile 390×844, in light and dark mode (`?display=light|dark`), English and Amharic. The page was scrolled to the end before each full-page capture, so all reveal animations had finished. Mid-scroll captures at 25 %, 50 % and 75 % of the page show the reveal states.
- I read each template package (TSX and CSS), `templates/motion.ts`, `templates/content.ts`, the recipes, the imagery manifests in `appointment/public_experience/manifest/design/`, the assets in `appointment/public/brand-experience/`, `docs/growth/TEMPLATE_ERGATA.md`, `docs/growth/TEMPLATE_GALLERY.md`, `section_schemas.py` and `section_editor.py`.

The review captures are not in the repository (repository rule: no committed screenshots). The capture method was a direct Playwright script, not an Agent Plane manifest, so these captures have no run IDs. The files (WebP, each under 400 KB) are kept outside the repository, in the session scratchpad `template-review/<template>/`. The names are `<device>-<mode>-<locale>-<view>.webp`. The view is `hero` (first screen), `full` (full page; desktop is downscaled to 720 px wide), or `scroll25`, `scroll50` or `scroll75` (light English only). Two overview strips (`overview-desktop-light.webp`, `overview-desktop-dark.webp`) show the six full pages side by side, in the order Bloom, Selam, Tena, Abugida, Meron and Ergata.

To make the captures again: open each showcase on the development stack at desktop 1440×900 and mobile 390×844, with `?display=light` and `?display=dark`, in `/` and `/am`; scroll to the end before each full-page capture. From phase 1, all browser evidence comes from Agent Plane manifests (`qa/manifests/growth/template-<name>-v3*.yaml`), and the run IDs are recorded in the template's design document (for Bloom: `docs/design/BLOOM_V3.md`).

## 2. Summary of findings

The owner's diagnosis is correct. The five v2 templates have good bones: clear concepts, AA contrast, real Ethiopian context, two languages and tidy code. But they are all built the same way: a hero photo, then a stack of flat colour bands with a heading on the left and text on the right. Only 3 or 4 of the 10 visible sections have a picture. Ergata gives every section (13 of 13) a photo or a drawing, and this is the main reason it feels richer.

Problems that all five templates share:

1. **Imagery coverage of 30–40 %.** Each template has only one hero photo plus three "scene" photos, and the scene photos are used only as owner content in the showcase. In the imagery manifests, `detail.<template>` is **the same file as** `hero.<template>`, and `mobileSrc` is the same file as `src`. Bloom shows the same salon photo twice, side by side, in "Choose your Bole room".
2. **The middle of each page is text only.** Benefits, process, testimonial, FAQ, booking band and footer are text on a flat band in every one of the five.
3. **Dark mode is a recolour, not a design.** The canvas goes dark, but the photos stay bright daylight scenes without treatment. The bands become slightly different near-blacks. There is no glow, no night imagery and no change of mood.
4. **Motion is present but timid.** The v2 packages already have a reveal hook, hover underlines, Bloom's scroll progress bar and price-row fill, Selam's pace bars and Meron's tape ruler. But nothing moves with the scroll (no parallax), nothing is cinematic in the hero, and there is no page-load choreography beyond a fade.
5. **Testimonials are one quote in a wide empty band.** In Selam the lime band is 70 % empty. In Bloom the quote is a narrow column in the centre.
6. **Booking CTAs are flat bands with a button.** There is no picture, no live availability and no sense of urgency or delight.
7. **Footers are generic** (name, line, © and credit) in all five.
8. **Mobile is the desktop stacked.** There is no sticky booking bar, no swipe galleries, and section padding is still desktop-sized.
9. **v2 photos are not responsive.** There is no `srcset`, no `loading="lazy"` and no width or height attributes (Ergata has all three). Every visitor downloads the 1672 px hero.
10. **Showcase copy breaks the realistic-data rule.** Testimonial captions say "Fictional demo client" and "Fictional feedback for this demonstration site", and the footers say "All details on this demonstration site are fictional". Placeholder phones show as "000 000 0103". This makes the showcases look like mock-ups. It is content, not template, but it hurts the impression.
11. **Bloom and Tena do not render `process` and `proof`**, although these are required sections in the recipe. The owner can edit content that never appears.

### Scores

Scale 1–10. Imagery coverage counts the visible sections that have a photo or a drawing, out of all visible sections.

| Template | Visual wow | Imagery coverage | Motion and interaction | Typography | Brand distinctiveness | Mobile | Dark mode | Overall |
|---|---|---|---|---|---|---|---|---|
| Bloom Hair v2 | 5 | 4/10 | 4 | 6 | 5 | 5 | 3 | **4.6** |
| Selam Movement v2 | 4 | 4/10 | 4 | 6 | 4 | 5 | 4 | **4.4** |
| Tena Clinic v2 | 3 | 4/10 (small) | 3 | 5 | 3 | 5 | 3 | **3.6** |
| Abugida Language v2 | 4 | 3/10 | 3 | 7 | 5 | 4 | 3 | **4.1** |
| Meron Atelier v2 | 5 | 4/10 | 4 | 7 | 5 | 4 | 4 | **4.7** |
| Ergata Therapy v1 | 7 | 13/13 | 6 | 8 | 8 | 6 | 6 | **7.0** |

## 3. Assessment per template

### 3.1 Bloom Hair v2: "salon campaign poster"

Screenshots: desktop light (`bloom/desktop-light-en-full.webp`), desktop dark (`bloom/desktop-dark-en-full.webp`), mobile light (`bloom/mobile-light-en-full.webp`), mobile dark (`bloom/mobile-dark-en-full.webp`), Amharic hero (`bloom/desktop-light-am-hero.webp`), Amharic mobile (`bloom/mobile-light-am-hero.webp`).

What it wants to be: a bold salon campaign. Aubergine panel over a full-bleed photo, Anton poster type, marigold only on booking actions, and a price board.

| Section | What is there | Plain spots |
|---|---|---|
| Hero | Strong salon photo; the aubergine panel wipes up; the photo settles from a 1.08 scale | Good start, but static after the load. The panel covers the photo's subject on a 1440 × 900 screen. No secondary imagery and no hint of the looks the salon makes. |
| Services (price board) | Anton names, prices, and a primary fill on row hover | Text only. No image of the service. The left column is empty below the heading. |
| Team | Large portrait plus two smaller ones | Good photos. Flat captions; no specialties as visual tags; no "book with" action. |
| Story | Photo and text | Uses the hero role again (`detail.bloom` = `hero.bloom`). |
| Benefits | Three rows on a lilac band | Text on a flat band. |
| Testimonial | A huge Anton quote in a narrow centred column | Wide empty sides. One quote only. "Fictional demo client" caption. |
| FAQ | Native `details` with triangle markers | Text only; browser-default markers. |
| Rooms | Two cards | **The same photo twice.** Phone "000 000 0103". |
| Booking band | Lilac band with a heading and a button | Flat. |
| Footer | Name, line, © and credit | Generic. |

Amharic: the Anton headline falls back to a regular-width Ethiopic sans, so the poster punch is lost (compare the English (`bloom/desktop-light-en-hero.webp`) and Amharic (`bloom/desktop-light-am-hero.webp`) heroes). The package already ships `noto-sans-ethiopic-condensed.woff2`, but the display role does not use it for headings at weight 700 and above. Dark: the panel becomes `#3b2641` on a near-black canvas, and the daylight photos are unchanged. Mobile: the hero photo is a short strip above a tall panel. The booking action is in the panel, but it disappears once the visitor scrolls.

### 3.2 Selam Movement v2: "movement magazine opening spread"

Screenshots: desktop light (`selam/desktop-light-en-full.webp`), desktop dark (`selam/desktop-dark-en-full.webp`), mobile light (`selam/mobile-light-en-full.webp`), mobile dark (`selam/mobile-dark-en-full.webp`), Amharic hero (`selam/desktop-light-am-hero.webp`).

What it wants to be: a magazine spread. A very large headline, a panoramic studio strip, durations set as tempo numerals with pace bars, and lime only on the review band.

| Section | What is there | Plain spots |
|---|---|---|
| Hero | Huge Figtree headline, then a full-bleed photo strip that "breathes" open | The best type moment of the five, but the photo is static and cut at the bottom. There is no sense of movement in a movement brand. |
| Sessions | Tempo numerals, pace bars and session photos | Good idea. The photos are flat rectangles of the same height. |
| Story | Text and three ledger rows, pushed to the right | **The left half of the screen is empty.** No image. |
| Coach | Portrait, name and tags | Portrait and name float in a large empty band. |
| Steps | Numbers 1–3 in a list | Text only. |
| Testimonial | Lime band with the quote in the left third | **70 % of the band is empty.** |
| FAQ | Narrow centred accordion | Text only, with large side margins. |
| Visit | Text and studio photo, side by side | Fine. |
| Booking band | Centred heading and button | Flat. |
| Footer | Generic | Generic. |

Amharic: Menbere Bold is excellent at display size (see the Amharic hero (`selam/desktop-light-am-hero.webp`)). Keep it. Dark: deep moss with lime actions is a good start, but the bands are indistinguishable. Mid-scroll captures (mobile 25 % (`selam/mobile-light-en-scroll25.webp`)) show slow reveals: content is still at half opacity while it is in view.

### 3.3 Tena Clinic v2: "wayfinding page"

Screenshots: desktop light (`tena/desktop-light-en-full.webp`), desktop dark (`tena/desktop-dark-en-full.webp`), mobile light (`tena/mobile-light-en-full.webp`), mobile dark (`tena/mobile-dark-en-full.webp`), Amharic hero (`tena/desktop-light-am-hero.webp`).

What it wants to be: a calm, clear clinic page. Mineral canvas, scrub teal, signal-yellow plates for "when and where" facts, and a services board.

| Section | What is there | Plain spots |
|---|---|---|
| Hero | Text on the left, a small portrait photo on the right | **The weakest hero of all six.** The photo fills about 15 % of the screen, with a large empty band under the copy. Nothing says "wayfinding". |
| Services board | Table rows, yellow duration plates, prices, and a three-fact footer row | Clear, but it looks like an admin table. Atkinson's slashed zeros ("ETB 7ø0") look technical on prices. |
| About | Team photo and text with three notes | Fine. |
| Team | Three 48 px thumbnails with text | People are the trust signal of a clinic, and they get the least space. |
| Steps | Yellow numbered plates 1–3 | Text only. The wayfinding idea is not drawn. |
| Testimonial | Centred quote | Text only. |
| FAQ | Accordion | Text only; the left column is empty. |
| Visit | Fact card and reception photo | Good. The other two rooms are only chips. |
| Booking band | Teal band, button on the right | Flat. |
| Footer | Links | Generic. |

Dark: the near-black `#0d1a1f` canvas with a bright daylight clinic photo looks pasted on (desktop dark hero (`tena/desktop-dark-en-hero.webp`)). Mobile: the hero uses a different, landscape image (mother and child), which is good art direction. Elsewhere it is a long text column.

### 3.4 Abugida Language v2: "Ethiopic manuscript page"

Screenshots: desktop light (`abugida/desktop-light-en-full.webp`), desktop dark (`abugida/desktop-dark-en-full.webp`), mobile light (`abugida/mobile-light-en-full.webp`), mobile dark (`abugida/mobile-dark-en-full.webp`), Amharic hero (`abugida/desktop-light-am-hero.webp`).

What it wants to be: a manuscript page. Black ink, one rubric red, Alegreya with Abyssinica SIL, lessons as a contents page, and Ge'ez numerals.

| Section | What is there | Plain spots |
|---|---|---|
| Hero | Photo bleeding off the left edge, a red vertical rule, and a serif headline | On desktop the photo is cropped so that the second person is cut out. The manuscript idea is only a red line. |
| Contents (lessons) | Dotted leaders and minutes and price | A lovely idea, but at small size in a narrow column. |
| Coaches | Two square portraits | Small. |
| Story and benefits | Two-column text on a grey band | Text only. |
| Steps | Ge'ez numerals ፩ ፪ ፫ in red | **The one truly Ethiopic moment.** It is small. |
| Testimonial | Italic quote with a red quote mark | Text only. |
| FAQ | Question and answer table | Text only. |
| Visit | Room photo and text | Fine. |
| Booking band | White band with a red top rule | Flat. |
| Footer | Generic | Generic. |

This template has the richest unused idea: the Ge'ez script itself (fidel tables, manuscript ornaments, rubrics, illuminated borders, parchment). It shows almost none of it. Amharic is beautiful in Abyssinica SIL. Dark: a plain black page with salmon red.

### 3.5 Meron Atelier v2: "garment label over three swatches"

Screenshots: desktop light (`meron/desktop-light-en-full.webp`), desktop hero (`meron/desktop-light-en-hero.webp`), desktop dark (`meron/desktop-dark-en-full.webp`), mobile light (`meron/mobile-light-en-full.webp`), Amharic hero (`meron/desktop-light-am-hero.webp`).

What it wants to be: a quiet luxury atelier. A centred EB Garamond headline, a triptych of the work, fitting slips in chalk blue, and a tape-ruler process.

| Section | What is there | Plain spots |
|---|---|---|
| Hero | Centred headline and a three-photo triptych that unfolds | The most "editorial" hero. But the triptych sits low, so the first view is mostly grey canvas and type. In a full-page capture (tall viewport) the side photos are not shown, because the layout depends on the viewport height. |
| Fitting slips | Two chalk-blue cards | Flat boxes. |
| Approach | Text and three rows | Text only. |
| Maker | Portrait and text | Good portrait, floating in space. |
| Process | Tape ruler with steps 1–3 | Good motif, but too small. |
| Testimonial | Large italic Garamond quote | Text only; the right half is empty. |
| FAQ | Narrow accordion | Text only. |
| Visit | Fact table and a wide shop photo | Fine. |
| Booking band | Centred heading and button | Flat. |
| Footer | Generic | Generic. |

Dark: navy-black with chalk-blue actions. Calm, but not "velvet". The photos are dark already, so dark mode works better here than elsewhere.

### 3.6 Ergata Therapy v1: the reference

Screenshots: desktop light (`ergata/desktop-light-en-full.webp`), desktop dark (`ergata/desktop-dark-en-full.webp`), mobile light (`ergata/mobile-light-en-full.webp`), Amharic mobile (`ergata/mobile-light-am-hero.webp`).

Why it works:

- **One recurring shape** (the arch) frames the photos, the portrait, the drawings and the booking band.
- **Every section has a picture**: 9 role photos plus inline SVG drawings that recolour with the palette and the mode.
- **Depth**: soft organic shapes behind the photos, paper grain on the soft bands, and overlapping cards (the practitioner card on the hero, the map card on the office photo).
- **Content-aware design**: format badges, a drawing per session format, and a map card.
- **Quiet motion**: the arch opens like a curtain, the shapes "breathe", and the map pin has a halo.
- **Responsive images**: `srcset`, lazy loading and a desktop and a mobile crop per slot.

What Ergata should still gain:

1. On mobile the hero photo is below the fold, and the mobile page is 15,900 px long, the longest of all. Make the arch peek into the first screen, and turn sessions and needs into swipe rails.
2. The colour rhythm is the same linen and sand all the way down. One deep-sage "night" band in the middle would give the page a pulse.
3. Dark mode dims the daylight photos (`brightness(.88)`). Night variants of the hero and the band (a lamp-lit room at dusk, an evening window) would make dark mode feel designed.
4. There is no sticky booking bar on mobile, and no live availability.
5. The hero is still static after the load. A slow ken-burns on the arch photo and parallax on the sprig and the blob would add life.
6. Testimonials are hidden until there is consent. When they are filled, a gentle marquee or a card stack would suit them.

## 4. Idea catalog

Effort: **S** up to half a day, **M** 1–2 days, **L** 3 or more days (one agent, including tests and QA). "Fits" uses B Bloom, S Selam, T Tena, A Abugida, M Meron, E Ergata. Every motion idea has a `prefers-reduced-motion` fallback: the final state, shown at once.

### 4.1 Hero concepts

| # | Idea | What it looks like | Effort | Fits |
|---|---|---|---|---|
| H1 | Cinematic split | A 60/40 split: a full-height photo on one side, and on the other side the headline over a deep colour field with grain; the seam is a soft diagonal or arch | M | B T M |
| H2 | Layered parallax photo stack | 3 photos at different depths (a back plate, a mid portrait, a front detail crop) that drift at different speeds on scroll and pointer move | M | B M E |
| H3 | Ken-burns loop from stills | 3–4 stills cross-fade with a slow 14 s zoom and pan, like a video, without video weight; it pauses when off-screen | M | B S M |
| H4 | Kinetic bilingual type | The headline builds word by word; a ghost Amharic line slides behind the English one (and the reverse on `/am`) | M | S A B |
| H5 | Masked image reveal | The photo is revealed through a growing shape (an arch, a fidel letter, a needle-stitch path, a circle) on load | M | A M E T |
| H6 | Photo inside giant type | A huge display word (for example "BLOOM", "ሰላም" or a fidel glyph) is filled with the hero photo through `background-clip: text`, with a solid fallback | M | B S A |
| H7 | Scroll-scrubbed scene | The hero is pinned for about 120 vh while a sequence of 4–6 stills plays on scroll (a movement flow, a garment being made) | L | S M |
| H8 | Day-to-night hero | The light mode shows the morning photo and the dark mode a night variant of the same scene, cross-faded on the mode switch | M | all |
| H9 | Hero booking widget | A glass card on the photo that shows "Next free: today 15:30", 3 slot chips and a "See all times" link to the scheduler | M | T E B |
| H10 | Lookbook swipe stack | A deck of 3–5 tilted photo cards on the hero; drag or swipe to the next card; it auto-advances slowly | M | B M |
| H11 | Wayfinding arrow hero | An oversized signage arrow (an SVG line that draws) points from the headline to the booking button; a building silhouette sits behind | S | T |
| H12 | Fidel grid hero | A full-width grid of Ge'ez syllables (ሀ ሁ ሂ ሃ ሄ ህ ሆ …) that ripples in rubric red under the pointer; the photo is masked into one cell block | L | A |
| H13 | Centred atelier stage | The headline sits on a soft spotlight; the triptych opens like a folding screen; the slow drift of a fabric-swatch texture | M | M |

### 4.2 Section compositions

| # | Idea | What it looks like | Effort | Fits |
|---|---|---|---|---|
| C1 | Bento benefits | Benefits as a 2×3 bento with mixed tile sizes: one photo tile, one counter tile, one drawing tile and text tiles | M | all |
| C2 | Overlapping editorial | A photo bleeds behind text panels that overlap it by 80–120 px, with offset captions as in a magazine | M | M S B |
| C3 | Sticky story scroll | The left image is sticky and changes per step while the right steps scroll (process, "your visit") | M | T S M E |
| C4 | Horizontal scroll gallery | A section pinned while photos travel sideways on vertical scroll; a swipe rail on mobile | M | B M S |
| C5 | Before/after slider | A drag handle reveals the before and after photos of a hair or tailoring change; keyboard accessible | M | B M |
| C6 | Marquee testimonials | Two rows of quote cards that drift in opposite directions; they pause on hover and focus | S | all |
| C7 | Magazine pull quote | One quote set at 6–8 rem across the screen, with a portrait cut-out and a big quotation glyph | S | S M B |
| C8 | Map-like location art | A drawn neighbourhood map (Bole, Gerji, Kazanchis, Arat Kilo, CMC) with the pin and landmark labels from the content | M | all |
| C9 | Process path | Steps on an SVG path that draws as the visitor scrolls (a winding road, a tape measure, a manuscript rule) | M | T M A E |
| C10 | Printed price menu | Services as a printed menu card on textured paper with a deckled edge, dotted leaders and a stamp | S | B A M |
| C11 | Service cards with scene photos | Each service card leads with a photo or drawing; on hover it swaps to a second photo | M | all |
| C12 | Team as contact sheet | Portraits on a film contact sheet with frame numbers and a grease-pencil circle on hover | M | B S |
| C13 | Provider cards with live availability | A portrait card with "Next free: Tue 10:00" and a "Book with Hanna" button | M | all |
| C14 | Split FAQ with image | The questions on one side, a sticky photo and a "Still unsure? Call us" card on the other (the Ergata pattern) | S | all |
| C15 | Numbers band | 3–4 oversized proof numerals ("12 years", "2 rooms", "1 coach per session") that count up | S | T S M |
| C16 | Full-bleed photo interlude | A 70 vh photo break between sections with one line of type; slow parallax | S | all |
| C17 | Booking band as a scene | The booking CTA is a full-bleed photo band (a dawn window, a lit salon chair) with a glass card and the next free slot | M | all |
| C18 | Rich footer | A big wordmark, hours, a mini map, "open now" and a last booking button over a drawn skyline or textile border | M | all |
| C19 | Room selector cards | Locations as large tabbed cards: switching the room swaps the photo, hours and directions | M | B T A |
| C20 | Garment tag services | Services as hanging tags on a thread that swing slightly on hover | M | M |
| C21 | Contents page with folio numbers | Lessons as a manuscript contents page with Ge'ez folio numerals and drawn leaders | S | A |
| C22 | Phrase card flip | A "phrase of the week" card: Amharic on the front, transliteration and English on the back | S | A |
| C23 | "A session in four beats" | Four stills with tempo numerals that show the shape of a session | M | S |
| C24 | Clinic directory board | Team and rooms as a lit lobby directory board (white letters on teal, slot-board feel) | M | T |

### 4.3 Imagery

| # | Idea | What it looks like | Effort | Fits |
|---|---|---|---|---|
| I1 | A generated photo per section role | Every section gets its own role photo (`benefits.<t>`, `process.<t>`, `faq.<t>`, `band.<t>`, `visit.<t>`), as Ergata has | L (images) | all |
| I2 | Night variants | A dusk or night version of the hero and the booking band for dark mode | M | all |
| I3 | Duotone treatment | Photos mapped to two palette colours in quiet sections (an SVG filter or a CSS `mix-blend-mode`) | S | S T A |
| I4 | Film grain overlay | A fine SVG noise on photos and bands, multiply in light and screen in dark (Ergata's token) | S | all |
| I5 | Halftone dots | Halftone dot pattern on secondary photos, poster style | S | B S |
| I6 | Tibeb border band | A woven Ethiopian textile pattern (tibeb) as an SVG border on cards, dividers and photo frames, in palette colours | M | M A B |
| I7 | Hand-drawn line overlays | Thin line drawings over photos: scissors and a stitch line, a hair-comb curl, a movement arc, a fidel stroke | M | all |
| I8 | Cut-out subjects | A transparent-background cut-out of a person or object that breaks out of its frame | M | B S M |
| I9 | Mask shapes | Arch (E), fidel letter (A), garment tag and buttonhole (M), soft pill (S), rounded signage plate (T), mirror oval (B) | S | all |
| I10 | Shadow and depth layers | A photo, a colour block offset by 24 px behind it, and a caption card overlapping the edge | S | all |
| I11 | Drawn icon sets | An SVG drawing set per template for benefits and steps (Ergata has one; the five have none) | M | all |
| I12 | Manuscript ornaments | Illuminated corner pieces and rubric initials for headings and cards | M | A |
| I13 | Ethiopian landscape plates | Wide plates of Entoto, Addis rooftops and jacaranda streets as section interludes | S (images) | S T E |

### 4.4 Motion

| # | Idea | What it looks like | Effort | Fits |
|---|---|---|---|---|
| X1 | Reveal variants | `data-reveal="rise|mask|wipe|ink|scale|blur"`; each template picks 2–3, so pages do not all fade the same way | M | all |
| X2 | Staggered headline | Words or lines rise in sequence; Amharic splits on word spaces, never inside a syllable | S | all |
| X3 | Parallax depth | Photos move 6–12 % slower than the page; shapes faster. CSS `animation-timeline: view()` with a JS fallback | M | all |
| X4 | Number counters | Prices, minutes and proof numbers count up once on reveal; Ge'ez numerals for Abugida | S | S T A |
| X5 | SVG line drawing | Paths draw with `stroke-dashoffset` tied to the scroll (process paths, ornaments, stitch lines) | S | all |
| X6 | Section transitions | The next section's colour field rises with a curved or angled edge (a clip-path) as it enters | M | all |
| X7 | Page-load choreography | 600–900 ms: the bar fades, the headline lines rise, the photo mask opens, the CTA pops last | S | all |
| X8 | Scroll progress motifs | Bloom's bar becomes the motif: a tape measure (M), a manuscript rule (A), a tempo line (S), a route line (T) | S | all |
| X9 | Sticky pinned sequences | One pinned scene per template at most (H7 or C3) | M | S M T |
| X10 | Ambient loops | Very slow loops (18 s or more): blob breathing, a fabric sway, a candle flicker glow in dark mode | S | E M A |
| X11 | Mode switch transition | The light/dark switch is a circular reveal from the switch (View Transitions API, with an instant fallback) | S | all |
| X12 | View transitions to booking | The booking button morphs into the booking handoff header (same-document view transition) | M | all |

### 4.5 Micro-interactions

| # | Idea | What it looks like | Effort | Fits |
|---|---|---|---|---|
| U1 | Magnetic buttons | Primary buttons lean 4–8 px toward the pointer; fine pointers only | S | B S M |
| U2 | Cursor-follow highlight | A soft radial light follows the pointer over cards (a CSS variable updated on `pointermove`) | S | B T M |
| U3 | Tilt cards | Team and service cards tilt up to 4° with a specular sheen; off on touch | S | B S |
| U4 | Hover image swap | A service row shows its photo floating next to the pointer on hover (the Bloom menu, the Meron tags) | M | B M |
| U5 | Animated underlines | Underlines draw from the left and leave to the right; the colour per template | S | all |
| U6 | Service card flip | The card flips to show duration, price, format and "Book this" | S | S A |
| U7 | Playful booking button states | Hover: an arrow slides; press: a squash; on navigation: a short "Opening times…" label with a spinner | S | all |
| U8 | "N slots left today" hint | A small toast-like chip near the CTA, from real availability; hidden when the count is unknown | M (backend) | all |
| U9 | Live open/closed badge | "Open now · closes 18:00" with a pulsing dot; it shows East Africa Time and Habesha time ("ከቀኑ 6 ሰዓት") in Amharic | M | all |
| U10 | Copy-address and call chips | Tapping the address copies it, with a "Copied" tick; phone chips ring on hover | S | all |
| U11 | FAQ with custom markers | Plus-to-minus morph, the open item tinted, smooth height animation (`interpolate-size` or a grid-rows trick) | S | all |
| U12 | Pressed-ink buttons | Abugida buttons darken like ink soaking into paper; Bloom's offset shadow (keep it) | S | A B |
| U13 | Fabric swatch hover | Meron slips show a fabric texture swatch that slides in from the side | S | M |
| U14 | Tempo pulse | Selam tempo numerals pulse once at the session's beat when hovered | S | S |

### 4.6 Texture and depth

| # | Idea | What it looks like | Effort | Fits |
|---|---|---|---|---|
| D1 | Gradient mesh fields | Soft multi-stop mesh gradients behind the hero and the booking band, in palette colours | S | B S E |
| D2 | Noise and paper tokens | `--tx-grain`, `--tx-paper`, `--tx-linen`, `--tx-parchment` as shared tokens | S | all |
| D3 | Tasteful glass | Glass cards (backdrop blur, 1 px light border) only on photos: the hero booking card and the location map card | S | T B E |
| D4 | Layered shadows | Three-layer soft shadows for lifted cards, with a tinted shadow colour per palette | S | all |
| D5 | Ethiopian motif borders | Tibeb strips, meskel-cross lattices and basket-weave (mesob) circles as SVG dividers | M | A M B |
| D6 | Shape dividers | Curved, torn-paper, stitched, ruler and wave edges between sections, picked per template | S | all |
| D7 | Colour rhythm | Each page alternates light, deep and photo bands (at least one deep band in the middle) | S | all |

### 4.7 Typography

| # | Idea | What it looks like | Effort | Fits |
|---|---|---|---|---|
| Y1 | Ethiopic display pairing | Each template gets a matched Ethiopic display face: Noto Sans Ethiopic Condensed Black (B), Menbere (S), Noto Sans Ethiopic (T), Abyssinica SIL (A), Noto Serif Ethiopic (M) | S | all |
| Y2 | Oversized numerals | Prices, durations and steps at 5–9 rem as graphic elements | S | S T B |
| Y3 | Variable font motion | The weight or width animates on hover or reveal (Fraunces SOFT and WONK, Figtree weight) | S | E S |
| Y4 | Outline and solid pairs | Outline-stroke words over solid ones in Bloom posters | S | B |
| Y5 | Ge'ez numerals everywhere | Step numbers, folios and the counter in Ge'ez for Abugida (with an accessible Arabic-digit label) | S | A |
| Y6 | Amharic line-height rules | Heading line height 1.25–1.35 for Ethiopic, no negative tracking, `text-wrap: balance` | S | all |
| Y7 | Small caps and eyebrows | Letter-spaced small-caps eyebrows (Meron, Abugida) with a rubric red mark | S | M A |

### 4.8 Product-tied delights

| # | Idea | What it looks like | Effort | Fits |
|---|---|---|---|---|
| P1 | Live "next available" chip | "Next free: today 15:30" from real slots, on the hero, the booking band and the sticky bar | M (backend + front) | all |
| P2 | Mini calendar preview | A 7-day strip in the hero or the booking band, with dots on days that have free slots; a tap opens the scheduler on that day | L | T E B |
| P3 | Provider availability | Each team card shows the provider's next free slot | M | B T S |
| P4 | Hours with a clock toggle | Opening hours with an "International / ሀበሻ" toggle that converts 09:00 to "ከጠዋቱ 3 ሰዓት" | S | all |
| P5 | Testimonial carousel | When there are more than 2 consented quotes: a carousel or marquee; with 1, a pull quote | S | all |
| P6 | Gallery lightbox | Owner photos (from the media library) in a grid with an accessible lightbox | M | B M S |
| P7 | Sticky book bar | A thumb-zone bar on mobile and a slim top or bottom bar on desktop after the hero: service, next slot and "Book" | M | all |
| P8 | Directions deep link | "Open in Maps" with the address, plus a ride-hail hint ("Tell the driver: …" in Amharic) | S | all |
| P9 | Online-session badge flow | Format badges and the online/office choice (from Ergata) for any template whose business has online locations | M | all |

### 4.9 Dark mode as a designed experience

| # | Idea | What it looks like | Effort | Fits |
|---|---|---|---|---|
| N1 | Night photography | The hero and the booking band switch to night variants (see I2) | M | all |
| N2 | Glow accents | The accent colour glows softly on buttons, numerals and active rules (a `box-shadow` or `text-shadow` with the accent at 30 %) | S | all |
| N3 | Photo grading | Non-night photos get a palette-tinted grade in dark mode (a slight blue or plum shadow lift), not only a dim | S | all |
| N4 | Deep-band hierarchy | Three dark surfaces with clear steps, plus a subtle top highlight on cards | S | all |
| N5 | Starfield or lamp texture | Very subtle noise "stars" (Selam, Tena) or warm lamp vignettes (Bloom, Meron, Abugida) | S | all |

### 4.10 Mobile-first wow

| # | Idea | What it looks like | Effort | Fits |
|---|---|---|---|---|
| Mo1 | Thumb-zone sticky CTA | A bottom bar 64 px high with the booking action; it hides on scroll down and shows on scroll up and near the end | S | all |
| Mo2 | Swipe rails | Services, team, benefits and testimonials become snap-scrolling rails with the next card peeking | S | all |
| Mo3 | Collapsing header | The bar shrinks to the logo and a book button after 80 px | S | all |
| Mo4 | Mobile art direction | A separate mobile crop for every image (4:5 or 3:4) via `<picture>` | S (with images) | all |
| Mo5 | Tighter rhythm | Section padding at 56–72 px on phones (now often 96 px or more); the page gets shorter | S | all |
| Mo6 | Tap-to-call hero chip | A "Call" chip next to the booking button on phones | S | T E |

### 4.11 Performance and accessibility guardrails

| # | Rule |
|---|---|
| G1 | LCP at most 2.5 s on a mid-range phone over 4G. The hero image is at most 180 KB on mobile and 260 KB on desktop, preloaded, with `fetchpriority="high"` set as a lowercase DOM attribute (the React prop failed before). |
| G2 | Every image has `width` and `height`, a `srcset` (640, 960, 1440 and 1920), AVIF with a WebP fallback, and `loading="lazy"` below the fold. CLS at most 0.05. |
| G3 | Animate only `transform`, `opacity`, `clip-path` and `filter`. Use scroll-driven CSS animations where supported, with IntersectionObserver otherwise. No scroll-jacking. Pinned scenes are under 150 vh. |
| G4 | `prefers-reduced-motion`: no parallax, no loops, no marquee movement (it becomes a static grid), and reveals show at once. Keep the existing pattern: the page is complete without JavaScript. |
| G5 | Contrast AA for all text, including text on photos (scrim or glass). Focus rings of 3 px in the palette colour. Tap targets of 44 px or more. Marquees and carousels have pause controls (WCAG 2.2.2). |
| G6 | The shared kit adds at most 8 KB of gzipped JavaScript per template. No animation library; framer-motion stays out of public templates. |
| G7 | Fonts: subset Ethiopic, `font-display: swap`, and preload only the display face of the active locale. |

## 5. Reimagination per template

Each template gets one signature hero, one signature motion, 2–3 signature sections, a shape language and a dark-mode idea. No two share a hero, a signature motion or a mask shape. Ergata's patterns (a picture in every section, one recurring shape, drawings that recolour, overlapping cards, role photos with fallbacks) go to all of them, each in its own vocabulary.

### 5.1 Bloom Hair → "Golden Hour Salon"

- **Mood:** a glossy beauty campaign shot at golden hour. Warm, confident and a little loud.
- **Palette:** keep aubergine `#4a1f55` and marigold `#f5a524`. Add rose-gold highlights and a warm mesh gradient (aubergine to plum to amber). Dark mode: "after hours". The salon at night, with lit mirror bulbs and a marigold glow on the actions.
- **Type:** Anton, plus Noto Sans Ethiopic Condensed Black for Amharic display. Outline and solid word pairs (Y4). Oversized prices.
- **Shape language:** the mirror oval. A round-top mirror mask with a thin gold frame line.
- **Signature hero (H6 + H10):** "BLOOM" (or the business's short name) set across the full width in Anton, filled with the photo. Under it, a swipe stack of 3 looks (braids, a fresh cut, a silk press) in mirror-oval frames. Then the headline and the booking button on a glass panel, with a "Next free chair: today 14:30" chip (P1).
- **Signature motion:** a mirror-oval mask reveal on every photo, plus the existing price-row colour fill extended with U4 (the service photo floats next to the pointer).
- **Signature sections:** (1) the "Menu board" (C10 + U4), a printed salon menu with a photo per service on hover, and a swipe rail of photos on mobile. (2) The "Lookbook" (C4), a horizontal-scroll gallery of 6 styles with before/after on 2 of them (C5). (3) "Chairs" (C13), stylist cards with tilt and the next free slot.
- **Also:** a marquee of reviews (C6), the rooms as a tabbed room selector (C19) with **two different** photos, and the booking band as a scene with lit mirrors at night (C17).
- **Keep:** the poster type, the marigold-only rule for actions, the offset button shadow, the scroll progress bar and the AA ink logic (`ink.ts`).
- **Images (12 subjects + 2 night):** listed in 6.2.

### 5.2 Selam Movement → "Tempo"

- **Mood:** a sports and wellness magazine in motion. Fresh morning air, breath and rhythm.
- **Palette:** chalk sage and moss, with lime as an energy colour (used more boldly: tempo numerals and pace lines). Dark mode: "5:30 am", the studio before sunrise, with a deep moss sky gradient and lime glows on the numerals.
- **Type:** Figtree Black for display, Menbere Bold for Amharic (keep). Giant tempo numerals (Y2) with variable-weight animation on hover (Y3).
- **Shape language:** the long pill and the motion arc. Photos in tall pills; a thin lime arc drawn over photos to show a movement path (I7).
- **Signature hero (H7):** "One movement, five frames". The hero headline stays big, then a pinned scroll scene scrubs 5 stills of one mobility flow (a kneel, a reach, a twist, a rise, a stand) with a lime motion arc drawing across them. On mobile it becomes a swipe sequence with progress dots. Reduced motion shows a 5-frame contact strip.
- **Signature motion:** pace bars and tempo numerals that count up and fill on reveal (X4), and a lime scroll progress "tempo line" (X8).
- **Signature sections:** (1) "A session in four beats" (C23), four stills with tempo numerals from the process steps. (2) A magazine pull quote (C7) with a portrait cut-out of the client silhouette (no face) over the lime band, filling the empty 70 %. (3) A bento of benefits (C1) with one movement photo tile and one counter tile.
- **Also:** the coach as a big cut-out portrait breaking the band edge (I8), a full-bleed Entoto morning interlude (C16, I13), and the hours with the Habesha clock toggle (P4).
- **Keep:** the opening-spread headline, the pace bar idea, lime only as energy, and the Menbere Amharic.

### 5.3 Tena Clinic → "Clear Path"

- **Mood:** a modern, calm private clinic with excellent signage. Reassuring, bright and orderly. Never cold.
- **Palette:** mineral white, scrub teal and signal yellow (for wayfinding plates). Add a soft teal-to-mint gradient for glass cards. Dark mode: "after-hours clinic", with lit windows at dusk, teal glows and yellow plates that look backlit.
- **Type:** Atkinson Hyperlegible Next. Switch prices to a figure set without slashed zeros (or use `font-variant-numeric: normal`). Large signage numerals.
- **Shape language:** the rounded signage plate and the route line. A dashed teal route that connects sections like floor markings.
- **Signature hero (H1 + H9 + H11):** a cinematic split. A large photo of the clinic entrance and reception on the right (60 %). On the left, the headline, an animated signage arrow (H11), a glass "Next appointment" card with 3 slot chips (H9, P2-lite), and an "Open now" badge (U9).
- **Signature motion:** a route line that draws down the page as you scroll (X5 + X8). It passes each section like a floor marking and ends at the booking band.
- **Signature sections:** (1) "Your visit, door to door" (C3), a sticky scroll with 4 photos (street entrance, reception, waiting corner, consultation room) that swap as the steps scroll. (2) A clinic directory board (C24) for the team and rooms, with bigger portraits and the next free slot (C13). (3) A numbers band (C15) from `proof` content (which is required but not rendered today).
- **Also:** an FAQ split with a photo (C14), a drawn CMC area map (C8), the booking band as a glass card over a dusk clinic photo (C17), and a tap-to-call chip (Mo6).
- **Keep:** the services board idea (restyle it as an illuminated departure board with yellow plates), the strict "yellow marks when and where only" rule, and the plain-language tone.

### 5.4 Abugida Language → "Living Manuscript"

- **Mood:** an illuminated Ethiopic manuscript come to life. Scholarly, warm and playful with the script.
- **Palette:** parchment `#f4ecdc` (warmer than now), iron-gall ink, rubric red, and a small gold leaf accent. Dark mode: "candle-lit study". Deep ink brown, warm candle vignette, gold leaf that glows, and red rubrics.
- **Type:** Alegreya and Abyssinica SIL (keep). Ge'ez numerals for all numbering (Y5). Drop-cap rubric initials (I12).
- **Shape language:** the fidel. Photos are masked inside large Ge'ez letter shapes or in manuscript arch windows with ornament corners.
- **Signature hero (H12 + H5):** a fidel table (the 7 orders of a few consonants) fills the right half. On load, the letters ink in one by one in rubric red and black. One block of the table opens to reveal the hero photo through a fidel mask. Under the pointer the nearby letters lift. The headline sits on parchment with a rubric initial.
- **Signature motion:** "ink" reveals (X1 `ink`): text and rules draw like a pen stroke. Ornament borders draw around sections (X5).
- **Signature sections:** (1) The contents page (C21) at full width with Ge'ez folios, drawn leaders and a photo per lesson in the margin. (2) The "Phrase of the week" card flip (C22, U6), Amharic on the front and English on the back. Owner content can use FAQ-like items. Until a schema change, a benefit item can be used. (3) The testimonial as marginalia: a handwritten-style note in the margin with a red pointer line.
- **Also:** tibeb and manuscript border dividers (D5), coaches in arched manuscript windows, a drawn Arat Kilo map (C8), and the booking band as a candle-lit desk scene (C17).
- **Keep:** Ge'ez numerals, the one-rubric rule, the contents-page idea and Abyssinica SIL.

### 5.5 Meron Atelier → "The Fitting Room"

- **Mood:** quiet luxury tailoring. A lookbook in a Kazanchis courtyard atelier. Slow, tactile and precise.
- **Palette:** chalk grey, navy wool and chalk blue. Add a deep wine `#5b1f2b` (from the logo) for small marks, and a tibeb gold for borders. Dark mode: "navy velvet". A spotlit fitting room, with a soft spotlight vignette on the triptych and a gold stitch line.
- **Type:** EB Garamond with small caps (Y7), and Noto Serif Ethiopic. Big italic pull quotes.
- **Shape language:** the garment tag and the stitch line. Tags with a punched hole and a thread; a dashed stitch line that sews around photos and headings.
- **Signature hero (H13 + H3):** a centred headline on a spotlight, with the triptych opening like a folding screen. The centre panel is a slow ken-burns loop through 3 stills (measure, cut, fit). A stitch line draws around the headline on load.
- **Signature motion:** stitch-line drawing (X5) as the section divider and the scroll progress tape measure (X8, from the existing tape ruler).
- **Signature sections:** (1) Garment tag services (C20, U13), hanging tags that swing, with a fabric swatch on hover. (2) "From cloth to fitting" (C3 + H7-lite), a sticky story with 4 images (fabric chosen, pattern drawn, first fitting, finished piece). (3) A lookbook rail (C4) of finished pieces with a before/after alteration (C5).
- **Also:** the maker portrait with overlapping tags and a tape measure drawing (I7, I10), a magazine pull quote (C7), a tibeb border on the booking band (I6), and the Kazanchis courtyard as a drawn map (C8).
- **Keep:** the centred editorial hero, the triptych idea, Garamond and the radius-0 discipline.

### 5.6 Ergata Therapy: what it should still gain

Keep everything listed in 3.6. Add N1 (night hero and band), Mo1 (sticky book bar), Mo2 (swipe rails for needs and sessions on phones), D7 (one deep-sage band for approaches), X3 (gentle parallax on the arch, the sprig and the blob), P1 (next free introductory call), and C6 or P5 for testimonials when they exist. Fix the mobile hero so the arch peeks into the first screen.

### 5.7 How the concepts differ

| | Bloom | Selam | Tena | Abugida | Meron | Ergata |
|---|---|---|---|---|---|---|
| Hero | Photo in giant type + look stack | Pinned 5-frame movement scrub | Cinematic split + booking glass card | Fidel table with masked photo | Spotlit triptych with ken-burns | Arch window |
| Shape | Mirror oval | Tall pill + motion arc | Signage plate + route line | Fidel letter + manuscript window | Garment tag + stitch line | Arch |
| Signature motion | Mask reveals + floating menu photos | Tempo count-ups + tempo line | Route line drawing | Ink reveals + ornament drawing | Stitch drawing + tape progress | Curtain open + breathing shapes |
| Texture | Warm mesh gradient, halftone | Air, light grain | Glass, clean | Parchment, gold leaf | Wool, tibeb | Linen grain |
| Dark mode | After-hours salon, mirror bulbs | 5:30 am studio | Lit clinic at dusk | Candle-lit study | Navy velvet spotlight | Lamp-lit room |

## 6. Image generation plan

### 6.1 Method

The same method as Ergata (`TEMPLATE_ERGATA.md`, "Images and how they were made"):

1. Codex CLI image generation, one run per template batch: `codex exec --sandbox workspace-write -C <scratch dir> "<shared art direction> <scene prompt>"`. Built-in image generation, no drawing code. One run makes 6–8 images; review each one, and regenerate any with text, logos, readable screens, extra fingers or a stock look.
2. Pillow crops each image to its slot: desktop (for example 1600×1000 or 1200×1500) and mobile (`-m`, 4:5 or 3:4, about 720×900). Save WebP (quality 74–80, `method=6`) **and** AVIF (quality about 50). Target under 200 KB desktop and under 120 KB mobile. Hero files are under 180 KB on mobile.
3. Record each role in the template's imagery manifest (`src`, `mobileSrc`, alt, focal point, size, checksum and provenance "generated"), with an Amharic alt in the showcase content.
4. Night variants are generated from the same prompt with "at dusk / at night, warm interior lamps, deep shadows", and keep the same composition.

Rules for every prompt (shared with Ergata): Ethiopian context in Addis Ababa; no text, letters, numbers, logos, signage, brand marks or readable screens; editorial photography with a 35 mm or 50 mm lens feel; no stock smiles; no faces unless stated (portraits and service scenes with a stylist or coach may show faces; client faces are hidden or turned away in sensitive templates); fictional people only.

### 6.2 Art direction per template

| Template | Shared prompt style |
|---|---|
| Bloom | "Golden-hour beauty campaign in a Bole natural-hair salon. Warm amber light, aubergine and plum walls, marigold and rose-gold accents, round mirrors with soft bulb light, lush plants. Glossy editorial beauty photography, shallow depth of field, rich skin tones, natural textured hair (braids, coils, silk press). Confident, joyful, not posed." |
| Selam | "Fresh morning movement studio in Gerji with views of the Entoto hills. Soft cool daylight, chalk sage walls, moss green and oat textiles, a lime accent object. Editorial sports-wellness photography with motion: a slight motion blur on limbs, airy negative space, calm focus. No gym machines, no logos." |
| Tena | "Modern, calm private family clinic in CMC, Addis Ababa. Bright clean daylight, mineral white walls, teal and warm wood, a few signal-yellow details, plants. Documentary healthcare photography, reassuring and orderly; no medical gore, no needles, no readable charts or screens." |
| Abugida | "Warm scholarly study rooms near Arat Kilo. Parchment, dark wood, red and black ink, handwritten Ge'ez manuscripts as texture only (no legible writing), woven baskets, coffee cups, soft window light. Painterly editorial photography with a slight film grain." |
| Meron | "Quiet luxury tailoring atelier in a Kazanchis courtyard. Navy wool, chalk grey, deep wine, white habesha cotton with tibeb borders, brass tools, tailor's chalk, measuring tape. Moody editorial fashion photography, directional window light, deep shadows, tactile close-ups." |

### 6.3 Images needed

Aspect ratios are given as desktop / mobile. "N" marks a night variant for dark mode.

**Bloom (12 + 2 N = 14)**

| Role | Section | Subject and composition | Ratio |
|---|---|---|---|
| `hero.bloom` | Hero | Keep the current stylist photo, recropped (subject on the right third) | 16:10 / 4:5 |
| `look1.bloom` … `look3.bloom` | Hero stack, lookbook | Three finished looks from behind or in three-quarter view: knotless braids, a tapered cut, a silk press | 4:5 / 4:5 |
| `menu1.bloom` … `menu3.bloom` | Menu hover photos | Wash basin and hands with lather; scissors at a cut line; a scalp consultation with a comb | 1:1 / 1:1 |
| `before.bloom`, `after.bloom` | Before/after | The same client from behind, before and after a silk press, with the same pose and light | 4:5 / 4:5 |
| `story.bloom` | Story | The salon wide shot at golden hour, with empty chairs | 3:2 / 4:5 |
| `room2.bloom` | Rooms | The quiet styling room (a different photo from the main studio) | 3:2 / 4:3 |
| `band.bloom` | Booking band | A single lit salon chair facing a round bulb mirror | 21:9 / 4:5 |
| `hero.bloom.night`, `band.bloom.night` | Dark mode | The same scenes at night, with the mirror bulbs on | as above |

**Selam (12 + 2 N = 14)**

| Role | Section | Subject and composition | Ratio |
|---|---|---|---|
| `flow1.selam` … `flow5.selam` | Hero scrub | One coach, one flow in 5 frames, with a fixed camera and the same light: kneel, reach, twist, rise, stand | 16:9 / 4:5 |
| `beat1.selam` … `beat3.selam` | "Four beats" (process) | A conversation on floor cushions; hands adjusting a stance; a client writing a routine in a notebook (no face) | 3:4 / 3:4 |
| `benefit.selam` | Bento | A water bottle, a towel and a lime mat on a wood floor in morning light | 1:1 |
| `quote.selam` | Pull quote | A client silhouette against the window, facing away | 3:4 |
| `interlude.selam` | Photo break | The Entoto hills at sunrise, with mist | 21:9 / 4:5 |
| `band.selam` | Booking band | The studio with a single mat laid out, before the session | 21:9 / 4:5 |
| `hero.selam.night`, `band.selam.night` | Dark mode | The studio at 5:30 am, blue hour, one warm lamp | as above |

**Tena (12 + 2 N = 14)**

| Role | Section | Subject and composition | Ratio |
|---|---|---|---|
| `hero.tena` | Hero split | The clinic entrance and reception, wide, with a clinician welcoming a family (faces allowed) | 4:5 / 4:5 |
| `visit1.tena` … `visit4.tena` | "Door to door" | The street entrance with a gate; the reception desk; the waiting corner with plants; the consultation room with a desk and two chairs | 4:5 / 4:5 |
| `faq.tena` | FAQ | A clipboard, a water glass and a pen on a wooden side table (nothing readable) | 3:4 |
| `benefit.tena` | Bento | A clinician's hands explaining with a simple paper diagram (nothing readable) | 1:1 |
| `room2.tena`, `room3.tena` | Rooms | Two other consultation rooms | 3:2 |
| `team.tena` | Directory | A wide team photo in the corridor (replaces the 48 px thumbnails as the backdrop) | 21:9 / 4:5 |
| `band.tena` | Booking band | The clinic's front window in late afternoon | 21:9 / 4:5 |
| `proof.tena` | Numbers band | A detail of the clean reception counter with plants | 21:9 |
| `hero.tena.night`, `band.tena.night` | Dark mode | The same clinic at dusk, windows lit | as above |

**Abugida (12 + 2 N = 14)**

| Role | Section | Subject and composition | Ratio |
|---|---|---|---|
| `hero.abugida` | Hero fidel mask | Recrop the current photo so both people are in frame | 4:5 / 4:5 |
| `lesson1.abugida`, `lesson2.abugida` | Contents margin | Two people practising a conversation at a café table; a learner tracing letters in a notebook (illegible) | 3:4 |
| `story.abugida` | Story | The learning room with bookshelves and a window toward the Arat Kilo university gate | 3:2 / 4:5 |
| `phrase.abugida` | Phrase card | A coffee ceremony detail: a jebena, cups and a coffee-bean tray (a phrase prop) | 1:1 |
| `step1.abugida` … `step3.abugida` | Process | A notebook and a pen; two people in a role-play gesture; a phone on a desk with a dark screen (the "prompt to try") | 1:1 |
| `faq.abugida` | FAQ | Stacked books, a basket and an ink pot by a window | 3:4 |
| `parchment.abugida` | Texture | A seamless parchment and manuscript texture (no legible text) | 1:1 tile |
| `band.abugida` | Booking band | A desk lit by a lamp, with an open notebook and two cups | 21:9 / 4:5 |
| `hero.abugida.night`, `band.abugida.night` | Dark mode | A candle-lit study | as above |

**Meron (12 + 2 N = 14)**

| Role | Section | Subject and composition | Ratio |
|---|---|---|---|
| `loop1.meron` … `loop3.meron` | Hero ken-burns | Measuring a shoulder; cutting navy wool with shears; pinning a hem in the mirror | 3:4 |
| `story1.meron` … `story4.meron` | "From cloth to fitting" | A fabric choice with swatches; chalk on a pattern; a first fitting from behind; the finished habesha kemis on a form | 4:5 / 4:5 |
| `swatch.meron` | Tag hover texture | A navy wool and tibeb cotton swatch close-up (a seamless tile) | 1:1 |
| `look1.meron`, `look2.meron` | Lookbook | Finished pieces on forms in the courtyard light | 3:4 |
| `band.meron` | Booking band | An empty fitting room with a mirror and a hanging garment bag | 21:9 / 4:5 |
| `hero.meron.night`, `band.meron.night` | Dark mode | The fitting room in a navy spotlight | as above |

**Ergata (4 new)**

| Role | Section | Subject | Ratio |
|---|---|---|---|
| `hero.ergata.night` | Dark hero | The same room at dusk, with a table lamp and a curtain | 4:5 |
| `band.ergata.night` | Dark band | The arched window at evening, with lights over the hills | 3:4 |
| `testimonial.ergata` | Testimonials | Two cups on a windowsill in the late afternoon | 1:1 |
| `contact.ergata` | Contact strip | A hand writing in a notebook next to a phone (dark screen) | 3:2 |

**Total: 74 source images** (5 × 14 + 4). With desktop and mobile crops in WebP and AVIF, about 270 delivered files, roughly 22 MB in the app (heroes are the largest). Plus drawn SVG art per template (about 8–12 icons and ornaments each), made in code as Ergata's `illustrations.tsx`.

### 6.4 Manifest changes needed for images

- Section role names per template, as Ergata already does (`benefits.<t>`, `process.<t>`, `faq.<t>`, `band.<t>`, and so on). Every role falls back to `section.detail`, then `hero.primary` (the existing `asset()` order).
- **Night variants:** a new optional `darkSrc` and `darkMobileSrc` on an imagery asset (contract `appointment-imagery.v1`, compiler change), used by the `<Picture>` component when `data-pe-mode="dark"`. Owner photos have no night variant; they get the N3 grade instead.
- The duplicated `detail.<t>` = `hero.<t>` entries are replaced by their own photos.

## 7. Shared engine

### 7.1 Build once: `frontend/src/public-experience/templates/kit/`

| Module | What it does | Notes |
|---|---|---|
| `Picture.tsx` | `<picture>` with AVIF and WebP, `srcset`, desktop and mobile art direction, width and height, lazy loading, focal point, night variant, mask class | It replaces raw `<img>` in all v2 code. It takes a `ContentImage` from `content.ts`. |
| `reveal.ts` | It extends `useReveal` with `data-reveal` variants (`rise`, `mask`, `wipe`, `ink`, `scale`, `blur`) and `--i` stagger; shared CSS in `kit/reveal.css` | Templates choose variants; it keeps the "complete without JS" rule. |
| `scroll.ts` | `useScrollProgress(ref)`, which writes `--p` (0–1) on an element; `@supports (animation-timeline: view())` uses pure CSS | It drives parallax, path drawing, pinned scenes and progress motifs. |
| `Parallax.tsx` | A wrapper that sets `translateY(calc(var(--p) * N))` | Off under reduced motion and on coarse pointers if needed. |
| `Magnetic.tsx` | Pointer-lean for buttons and links (fine pointer only) | Under 1 KB. |
| `Marquee.tsx` | An accessible marquee with a pause button; static under reduced motion | For testimonials and logos. |
| `MaskReveal.tsx` | Clip-path or SVG mask shapes (`arch`, `oval`, `pill`, `plate`, `tag`, `fidel`) | Shape registry; templates add their own. |
| `KenBurns.tsx` | A cross-fade of 2–5 stills with slow zoom and pan; pauses off-screen and when the tab is hidden | The first frame is the LCP image. |
| `ScrubSequence.tsx` | A pinned scroll scene of N frames (Selam's hero, Meron's story) | Swipe on mobile; a strip under reduced motion. |
| `BeforeAfter.tsx` | A slider with a keyboard and an ARIA value | Bloom and Meron. |
| `dividers/` | SVG section edges: `wave`, `arch`, `torn`, `stitch`, `ruler`, `rule`, `tibeb`, `route` | `currentColor` and palette variables, as Ergata does. |
| `textures.css` | `--tx-grain`, `--tx-paper`, `--tx-parchment`, `--tx-linen`, `--tx-halftone` and the dark-mode blend rules | Generalises `--eg-grain`. |
| `StickyBookBar.tsx` | The mobile thumb bar and the desktop slim bar; it shows after the hero and hides near the booking band | Uses `useScrollState`. |
| `NextSlot.tsx` + `useNextSlot` | The "Next free: …" chip, "N left today", and the per-provider variant | Needs the backend below. It renders nothing when there is no data. |
| `OpenNow.tsx` | An open/closed badge and an hours list with the International / Habesha toggle | Uses the location hours; the Habesha clock is EAT minus 6 hours, with day/night words in Amharic. |
| `CountUp.tsx` | A number count-up, with an option for Ge'ez numerals | Accessible: the final value is in the DOM. |
| `Lightbox.tsx` | Gallery lightbox (Radix Dialog) | For owner galleries. |

Budget: the kit is tree-shaken per template; under 8 KB gzipped JavaScript for any template.

### 7.2 Backend additions

- `public_experience.api.get_next_availability(public_path, locale)`: guest, GET, cached 60 s per site, rate-limited. It returns, for the site's bookable offerings, the next free slot, the number of free slots today, and optionally the next slot per provider. It reuses the scheduler's slot logic (`scheduler.booking.slots`) for the next 7 days only. It returns nothing when booking is closed. This exposes availability publicly; see decision Q5.
- Imagery contract: optional `darkSrc` and `darkMobileSrc`.
- Section schemas (small, optional, backward compatible): an image slot (`image`, `imageAlt`, `imageFocus`) on `process`, `testimonials` and `contact`; an optional `image` on `process.items[]` (for sticky story scenes); and a new optional `gallery` section (up to 12 images with alt) or `about.gallery`. `section_editor.py` gets the matching entries, so the owner can replace every new photo. All new fields fall back to the template role photos, so an owner who does nothing still gets a full set.

### 7.3 How it fits the content model

- **Owner content stays the source of truth.** Every new visual reads existing fields: services feed the menu, the tags and the hover photos (`services.items[].image`, else the role photo); process feeds the sticky stories and paths; proof feeds the numbers band; testimonials feed the marquee or the pull quote; locations feed the maps, open-now and the room selector.
- **Decoration is template-owned.** Drawings, masks, dividers, textures and night variants are part of the package and need no content.
- **No new required content.** A section with fewer items degrades well (1 testimonial gives a pull quote, 3 or more give a marquee; 1 location gives a single map card, and so on).
- **Render every required section.** Bloom and Tena must render `process` and `proof`, or the recipe must stop requiring them.

### 7.4 v1 and v2 packages

The registry pins a renderer version per published release ("a redesign never changes a live site until the owner republishes").

Recommendation:

1. **Build the redesign as v3** (`<name>-v3/`, `layouts/<name>.v3.json`, recipe v3). Ergata gets its additions in place as v1 (it is the newest), or as v2 if the owner wants the same safety.
2. **Freeze v2.** Keep it registered for releases published on it. After launch, offer "Upgrade your website design" to owners on v2.
3. **Retire v1** from the registry once a query shows no published release uses it. Delete the v1 packages and manifests in the same change. If a release still pins v1, migrate it to v2 first with the existing switch flow.
4. Republish the six showcases on v3 and rerun `scripts/capture_template_gallery.py`.

## 8. Phased plan and effort

Effort is in agent-days (one agent working; parallel phases run at the same time).

| Phase | Work | Effort | Parallel |
|---|---|---|---|
| **0. Decide** | Owner answers section 9; fix the showcase copy ("Fictional demo client", "demonstration site", "000 000 …" phones) | 0.5 d | – |
| **1. Shared engine + flagship** | `kit/` (7.1); the imagery contract `darkSrc`; the next-availability endpoint with tests; schema and editor slots (7.2); **Bloom v3 end to end**: Bloom's images (14), sections, motion, dark mode, mobile, Amharic; QA. Bloom is the reference for the others. | 8–10 d (kit 3, backend 2, Bloom 4–5) | backend and kit can be two agents |
| **2. The other four** | Selam v3, Tena v3, Abugida v3 and Meron v3, one agent each, from the Bloom reference; each makes its own 14 images with Codex | 4–5 d each | 4 agents in parallel → about 5 calendar days |
| **3. Polish** | Night variants review, dark mode pass (N2–N5), mobile pass (Mo1–Mo6), Ergata additions (5.6, 4 images), performance pass, gallery screenshots, v1 retirement | 4–5 d | 2 agents |
| **Total** | | **about 34–40 agent-days, about 3 calendar weeks with 4–5 agents** | |

### QA per template (at the end of phases 1–3)

- Agent Plane manifests (`qa/manifests/growth/template-<name>-v3.yaml`, plus `-dark`): desktop 1440 and mobile 390, light and dark, English and Amharic, plus a reduced-motion run. Flow: landing, then a service card, then the booking handoff, then the time picker.
- Screenshot review in the style of this document (full page and mid-scroll), read by an art director. Keep the screenshots in the Agent Plane run artifacts and record the run IDs in the template's design document. Do not commit screenshots.
- A performance budget check with Lighthouse in headless Chromium (mobile preset): LCP at most 2.5 s, CLS at most 0.05, total image weight on first load at most 500 KB, and the JavaScript kit at most 8 KB gzipped. Record the results in the template doc.
- Accessibility: axe run with zero serious issues; keyboard pass on the sliders, marquee pause, lightbox and accordions; AA contrast check on text over photos.
- Frontend gate (from the brief): typecheck error count at most 156, `npm run -s test:dom` and `npm run -s build` pass; `public-template-packages.test.mjs` updated for the v3 keys.

## 9. Decisions for the owner

| # | Question | Recommendation |
|---|---|---|
| Q1 | Build the redesign as new **v3** packages (live v2 sites unchanged until republish) or replace v2 in place? | **v3.** It matches the registry's pinning rule and lets us compare before and after. |
| Q2 | Retire **v1** packages? | **Yes**, after a query confirms no published release pins v1. |
| Q3 | Which template is the **flagship** for phase 1? | **Bloom.** It is the most visual industry, it is first in the gallery, and it uses most kit modules (mask reveals, menu hover photos, lookbook, before/after, marquee). |
| Q4 | Are the **concepts** in section 5 right ("Golden Hour Salon", "Tempo", "Clear Path", "Living Manuscript", "The Fitting Room")? | Approve or swap single ideas per template; the catalog has alternatives. |
| Q5 | Show **live availability** ("Next free: 15:30", "3 left today") on public pages? It needs a new guest endpoint and reveals how busy a business is. | **Yes, with an owner setting** (on by default for the showcases, off by default for new sites until the owner turns it on), cached for 60 s and rate-limited. |
| Q6 | Add **dark-mode night photos** (`darkSrc`) to the imagery contract? | **Yes.** It is the single biggest dark-mode improvement. |
| Q7 | Add the optional **image slots** (process, testimonials, contact, process items) and a **gallery** section to the content model and the editor? | **Yes.** They are optional, with template fallbacks. |
| Q8 | **Faces policy:** may Bloom, Selam, Tena and Meron images show (fictional) client faces? Ergata shows none. | Faces for staff portraits and stylists or coaches at work; **clients are seen from behind or turned away**. Tena: no patient faces. |
| Q9 | **Before/after** images for Bloom and Meron: acceptable as generated showcase imagery? | **Yes for the showcase**, with the owner able to replace them; no claims in the copy. |
| Q10 | Default **motion level**: keep "calm" as the default, or add an "expressive" choice that turns on pinned scenes and ken-burns? | Add **"expressive"** to the recipe's `motion` adjustment (calm / standard / expressive). Showcases use expressive; the default for new sites stays standard. Reduced motion always wins. |
| Q11 | Show **Habesha time** next to the opening hours? | **Yes, in Amharic pages by default**, with a toggle in English. |
| Q12 | Image budget: about **74 generated images** (about 22 MB in the app). OK? | **Yes.** If size is a concern, move template images to a CDN-backed `/files` path later. |
| Q13 | Showcase copy: replace "Fictional demo client" and "demonstration site" lines and the "000 000 …" phone numbers with realistic content? | **Yes, now** (phase 0). It costs little and immediately makes every template look more real. |
