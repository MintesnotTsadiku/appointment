# Design log

> **Note (2026-10-02):** the Tizita Sound and Wana Swim templates were later removed, with their seeded showcase businesses. Mentions of them below are historical.

One entry per template design pass. Read this before starting a new template so it does not repeat an earlier one.

Format: template, date, palette family, type pairing, layout families used, the one bold thing, and notes.

## Baseline (2026-09-30, before the taste pass)

Values from the light palettes and typography manifests.

| Template | Canvas | Primary / accent | Typography manifest | Face in template CSS |
|---|---|---|---|---|
| selam-movement | #f8ded0 peach | #521348 plum / #9b3d6a | warm-vitality | Warm Vitality Body, Arial fallback |
| bloom-hair | #fffaf2 cream | #b40821 red / #a20a23 | warm-vitality | Georgia hard-coded |
| meron-atelier | #f2f0e7 cream | #6d1215 oxblood / #8b3a2c clay | crafted-editorial | Crafted Editorial Display |
| abugida-language | #f4efe2 cream | #113db5 cobalt / #c43d1b vermilion | crafted-editorial | Crafted Editorial Display, Georgia |
| tena-clinic | #f7f5ee cream | #263a22 green / #a55238 terracotta | quiet-trust-editorial | Quiet Trust Display, Georgia |

Shared problems:

- All three typography manifests point to the same three files: `dejavu-serif.ttf`, `dejavu-serif-bold.ttf`, `noto-sans-ethiopic.ttf`. The five designs differ in names only.
- Four of five canvases are warm cream, and three accents are clay, terracotta, or vermilion. This is the most common generated-page palette.

## tena-clinic v2 (2026-09-30, Taste v1 pilot)

**Design read.** Reading this as: a booking site for a small family clinic in CMC, Addis Ababa, for parents and adults who want a scheduled consultation, with a plain and well-signposted language, leaning toward public-information and wayfinding design. The one job: choose a consultation and know how to arrive.

**Subject grounding.**

1. Wayfinding signs in a clinic corridor: a room name on a plate, a colored band, one arrow where it means a direction.
2. The appointment slip from reception: service, duration, room, time, in a fixed order with tabular figures.
3. The clinic register and intake form: ruled rows, a label above each field, nothing decorative.

**Token plan.**

| Role | Light | Dark |
|---|---|---|
| canvas | #f2f6f7 cool mineral white | #0c1a1f deep slate |
| surface | #ffffff | #12262d |
| text | #0f2a33 slate ink | #e8f2f3 |
| primary (scrub teal) | #0b5563 | #86d3dc |
| accent (signal yellow, fills only) | #f2c14e | #f2c14e |
| border | #c3d2d6 | #2e505a |

- Type: Atkinson Hyperlegible Next (Braille Institute, OFL) for display, body and UI. It is designed for readers with low vision, which fits a clinic better than a "premium" serif. Ethiopic partner: Noto Sans Ethiopic, variable weight, matched by weight. Display 700, body 400, labels 600. No uppercase, no tracking.
- Radius system: controls 6px, panels and images 10px, nothing else.
- Accent rule: signal yellow marks "when and where" facts only: durations, step numbers, the open question in the FAQ. It is never text color and never a section background.
- Layout, one family per section:
  - Header: brand, four section links, mode switch, one primary action.
  - Hero: split. Headline, subtext and two actions left; hero photo right at 4:5.
  - Services: a timetable board. Full-width rows: name and summary, duration plate, price, book link.
  - About: asymmetric. Owner photo large left; story, facts (proof as a definition list) right.
  - Benefits: three short notes set as a ruled list under the about text, not cards.
  - Team: staff directory. A compact list of portrait, name, role, specialties.
  - Process: a numbered stepper on one rule line (a real sequence).
  - Review: one quote, set large, attribution on its own line.
  - Questions: accordion, title left, list right.
  - Visit: an arrival card with labeled fields (address, hours, phone, email) next to the location photo.
  - Booking band: primary color band with the booking title and action.
- Hero wireframe (1440x900):

```
+--------------------------------------------------------------------------+
| [logo] Tena Family Clinic   Services Team Visit Questions   (Dark) [Book] |
+--------------------------------------+-----------------------------------+
|                                      |                                   |
|  Scheduled family appointments,      |        hero photo 4:5             |
|  clearly explained                   |        radius 10                  |
|                                      |                                   |
|  A small CMC clinic offering ...     |                                   |
|                                      |                                   |
|  [Choose a consultation time]  Read arrival information                  |
+--------------------------------------+-----------------------------------+
| Services board begins at the fold                                         |
```

- The one bold thing: the timetable board of services, with yellow duration plates and tabular prices. It reads like the board at reception and it is all real data.

**Review against tells.md.** The baseline was cream with a terracotta accent, a DejaVu Serif display and a trust strip under the hero. Changes: cool mineral and scrub teal replace cream and terracotta. A legibility sans replaces the "premium" serif. The trust strip becomes the proof list inside About. Three equal service columns become board rows. Floating corner captions and the leaf ornament are removed. Motion stays `calm`: no entrance animation.

**Booking handoff.** The same board, reduced: the booking title and body, the service rows with duration and price, the first location as an arrival card, and one action to the scheduler.

## selam-movement v2 (2026-09-30, Taste v1)

**Design read.** Reading this as: a booking site for a one-to-one movement coach in Gerji, for desk-bound professionals who want to move again, with an unhurried and bodily language, leaning toward a sports and movement magazine rather than a spa. The one job: book a first consultation.

**Subject grounding.**

1. The mat and the studio floor: long horizontal lines, a low horizon, tall windows over the city. Wide panoramic crops.
2. The working week: sessions are built to fit around real work. Duration is the fact people check first.
3. Tempo: a session is paced, counted and repeated. Big, calm numerals for minutes.

**Token plan.**

| Role | Light | Dark |
|---|---|---|
| canvas | #eef1e8 chalk sage | #131a10 |
| surface | #fafbf6 | #1a2216 |
| text | #1d2418 | #eef2e6 |
| primary (moss olive) | #3b5a1c | #b9da7e |
| accent (spring lime, fills only) | #cde27a | #cde27a |
| border | #cbd3bf | #34412c |

- Type: Figtree (OFL), a friendly geometric sans with a real 800 weight, for display, body and UI. Menbere (OFL, a modern rounded Ethiopic sans) is the Ethiopic partner. No serif: the subject is bodily and contemporary, not editorial heritage.
- Radius system: controls full pill, images 0 (cinema crops), panels 16px.
- Accent rule: lime fills one surface only, the review band, plus the list markers of the session facts.
- Layout families:
  - Hero: stacked. Very large headline across the page, subtext and actions in one row under it, then a full-bleed panoramic photo strip filling the rest of the first view.
  - Sessions: split for two items (auto grid for more). Each block leads with its duration as a large tempo numeral.
  - Story: a single prose column with highlights as an inline list.
  - Coach: portrait and text split.
  - Process: a ledger list with large step numerals in the margin.
  - Review: lime band, one quote centered.
  - Questions: a stacked accordion under the heading.
  - Visit: a typographic address block beside the location photo at full height.
  - Booking band.
- Hero wireframe (1440x900):

```
+--------------------------------------------------------------------------+
| [logo] Selam Movement Practice       Services Team Visit  (Dark) (Book)   |
+--------------------------------------------------------------------------+
|  A steadier way back                                                      |
|  into movement                                                            |
|  Quiet one-to-one coaching in Gerji ...        (Start with a consultation)|
|                                                 See the two session options|
+--------------------------------------------------------------------------+
|############### panoramic studio photo, full bleed, 0 radius #############|
+--------------------------------------------------------------------------+
```

- The one bold thing: the panoramic photo strip under a very large headline. It reads like the opening spread of a movement magazine.

**Review against tells.md.** The baseline was peach to cream gradient with plum, a lime rotating badge, fake class times, 9 radius values and 9 eyebrows. Changes: no gradient, a chalk sage canvas with moss olive. Radii reduce to three. Badges, times, "spots left" and eyebrows are gone. Durations come from the services content.

## bloom-hair v2 (2026-09-30, Taste v1)

**Design read.** Reading this as: a booking site for a natural-hair salon in Bole, for clients planning a wash day, a cut or a calmer styling visit, with a warm and confident language, leaning toward a salon campaign poster. The one job: pick a service and a stylist.

**Subject grounding.**

1. The price board on the salon wall: service names on the left, prices on the right, read at a glance.
2. The chair and the mirror: people framed as portraits, the stylist beside the client.
3. Texture: curls, twists and hands at work, seen close.

**Token plan.**

| Role | Light | Dark |
|---|---|---|
| canvas | #f6f1f6 lilac white | #1a0f1d |
| surface | #fffbff | #221526 |
| text | #2a1430 aubergine ink | #f7eef8 |
| primary (aubergine) | #4a1f55 | #e2b4ee |
| accent (marigold, action fills) | #f5a524 | #f5a524 |
| border | #dccbe0 | #46304c |

- Type: Anton (OFL), a condensed poster sans, for display only; Karla (OFL) for body and UI. Ethiopic: Noto Sans Ethiopic in its condensed width for display, normal width for body. No uppercase transform: Anton's own shapes carry the poster feel.
- Radius system: 4px everywhere (controls, panels, images).
- Accent rule: marigold fills every booking action and nothing else. Its ink is the aubergine text color (8.3:1).
- Layout families:
  - Hero: poster. The hero photo fills the first view; a solid aubergine panel anchored bottom left holds the headline, subtext and actions. On phones the panel sits under the photo.
  - Services: a price board. Name and duration left, price right, one ruled row each.
  - Stylists: asymmetric, one large portrait and two smaller ones (the 1 + 2 rule for three people).
  - Story: image and text split with the about photo.
  - Care notes: three statements set large in the display face, stacked.
  - Visit: two room cards side by side (two items as a split).
  - Questions, review and booking band.
- Hero wireframe (1440x900):

```
+--------------------------------------------------------------------------+
| Bole Bloom Hair Studio     Services Team Visit    (Dark) [Choose ...]     |
+--------------------------------------------------------------------------+
|################### hero photo, full bleed ################################|
|##########################################################################|
|  +--------------------------------------+                                 |
|  | Natural hair care,                   |                                 |
|  | with time to breathe  (Anton)        |                                 |
|  | A Bole neighbourhood studio ...      |                                 |
|  | [Choose your studio appointment]     |                                 |
|  +--------------------------------------+                                 |
+--------------------------------------------------------------------------+
```

- The one bold thing: the poster hero, with condensed display type on a solid aubergine panel over the photograph.

**Review against tells.md.** The baseline was cream with a red primary, Georgia, a rotated yellow "Come as you are" badge, a fake booking form and a trust tagline. Changes: lilac white and aubergine with marigold actions. Anton and Karla replace Georgia. The badge, the form and every tagline are gone. The panel is anchored to the hero grid, not a floating caption.

## meron-atelier v2 (2026-09-30, Taste v1)

**Design read.** Reading this as: a booking site for a one-person tailoring atelier in Kazanchis, for people preparing an occasion outfit or refining a garment, with a measured and precise language, leaning toward a tailor's order book and a classic garment label. The one job: reserve a first fitting.

**Subject grounding.**

1. The order book: each fitting written as a slip with the garment, the date and the next step.
2. The measuring tape: fine ticks along one line, read left to right.
3. Cloth: chalk marks on navy wool, pins, a straight seam.

**Token plan.**

| Role | Light | Dark |
|---|---|---|
| canvas | #f1f1ef chalk grey | #121419 |
| surface | #fbfbfa | #191c23 |
| text | #1f2126 | #eceef2 |
| primary (navy wool) | #1f2e4d | #b8c8e6 |
| accent (tailor's chalk blue, fills only) | #c9d6ea | #c9d6ea |
| border | #cfd1d4 | #343b48 |

- Type: EB Garamond (OFL) for display and body. A serif is right here: tailoring is a heritage craft and its labels, order books and shop signs are set in book faces. Noto Serif Ethiopic is the Ethiopic partner. Display weight 500, body 400, italic Garamond only for the review.
- Radius system: 0 everywhere. Tailoring is cut straight.
- Accent rule: chalk blue fills the fitting slips (the service cards) and nothing else.
- Layout families:
  - Hero: centered headline, subtext and actions, with a triptych of three photographs of the work under it, all in the first view.
  - Services: two fitting slips side by side (a pair split), each with duration and price as a small definition list.
  - Story: a text split, the story on the left and the three notes on the right.
  - Founder: portrait and text split.
  - Process: a measuring tape. Steps sit along one ruled line with fine tick marks.
  - Review: one italic quote set wide and left aligned.
  - Questions: a single-column accordion.
  - Visit: a label block (name, address, hours) over a wide photograph.
  - Booking band.
- Hero wireframe (1440x900):

```
+--------------------------------------------------------------------------+
| Meron Tailoring Atelier        Services Team Visit    (Dark) [Reserve...] |
+--------------------------------------------------------------------------+
|                 Clothes that fit the person wearing them                  |
|        A Kazanchis atelier for careful fittings, thoughtful ...           |
|                 [Reserve a fitting]   Compare the atelier ...             |
|   +-------------+   +---------------------------+   +-------------+       |
|   |  work photo |   |        hero photo         |   |  cloth photo|       |
|   +-------------+   +---------------------------+   +-------------+       |
+--------------------------------------------------------------------------+
```

- The one bold thing: the triptych under a centered Garamond headline, like a garment label over three swatches.

**Review against tells.md.** The baseline was cream with oxblood and clay, DejaVu Serif, an invented founder quote, corner captions and forced three-line stanzas. Changes: chalk grey and navy, a real Garamond with a written reason, no invented quote, no captions, no forced breaks. The serif is chosen for the subject, not for "premium".

## abugida-language v2 (2026-09-30, Taste v1)

**Design read.** Reading this as: a booking site for a small language studio in Arat Kilo, for learners preparing a real conversation at work or in class, with a literate and patient language, leaning toward an Ethiopic manuscript and a well-set textbook. The one job: book a first practice session.

**Subject grounding.**

1. Ge'ez manuscripts: black ink, headings and marks in red (rubrics), ruled margins.
2. The fidel chart: an ordered grid of syllables, learned in sequence. Ge'ez numerals (፩ ፪ ፫) mark real steps.
3. The textbook contents page: lessons listed in order with what each one covers.

**Token plan.**

| Role | Light | Dark |
|---|---|---|
| canvas | #f7f7f3 paper white (neutral, not cream) | #141312 |
| surface | #ffffff | #1c1b19 |
| text | #161513 ink | #f1efe9 |
| primary and accent (rubric red) | #a11d1d | #ff8a7a |
| border | #d6d3ca | #3b3833 |

- Type: Alegreya (OFL), a literary serif with calligraphic roots, for display and body. Abyssinica SIL (OFL, SIL International) is the Ethiopic partner, drawn in the Ge'ez manuscript tradition. The serif is chosen because the subject is script and literature.
- Radius system: 2px everywhere.
- Accent rule: rubric red marks headings' rules, step numerals, the hero rule and actions. Body text is always ink.
- Why red is allowed: tells.md lists cream with vermilion as a default. Here the red comes from the subject (manuscript rubrication), and the canvas is a neutral paper white, not cream.
- Layout families:
  - Hero: the photo bleeds off the left edge at full first-view height; the copy sits right of a red vertical rule.
  - Lessons: a contents page. Lesson name with a dotted leader to duration and price, summary underneath.
  - Coaches: two people side by side (a pair split).
  - Story: two-column prose, like a book page.
  - Notes: asymmetric, one large note and two smaller.
  - Process: Ge'ez numerals in red on one line of steps.
  - Questions: a phrasebook grid, question left and answer right, always open.
  - Visit: rooms listed as text beside one photo.
  - Review and booking band.
- Hero wireframe (1440x900):

```
+--------------------------------------------------------------------------+
| Abugida Language Studio          Services Team Visit  (Dark) [Choose ...] |
+-----------------------------------+--+-----------------------------------+
|###################################|  |                                   |
|### photo, bleeds off the left ####|R | Language practice for the         |
|###################################|E | moments that matter               |
|###################################|D | Practical English and Amharic ... |
|###################################|  | [Choose your first practice]      |
+-----------------------------------+--+-----------------------------------+
```

- The one bold thing: the edge-bleed photograph against a single red manuscript rule, with the headline set in Alegreya and Abyssinica.

**Review against tells.md.** The baseline was cream with cobalt and vermilion, DejaVu Serif, a word marquee ("WORK ● STUDY"), a vertical "01", a floating caption and 8 eyebrows. Changes: paper white with ink and one red, no marquee, no numbering except the real process steps, no captions, no eyebrows.

## Taste v1 build notes (2026-09-30)

What changed between the plan and the browser, per template. Read these before the next pass.

| Template | Palette family | Display face / Ethiopic | Hero composition | The one bold thing |
|---|---|---|---|---|
| tena-clinic v2 | cool mineral, scrub teal, signal yellow | Atkinson Hyperlegible Next / Noto Sans Ethiopic | contained split, photo right 4:5 | services as a reception board |
| selam-movement v2 | chalk sage, moss olive, spring lime | Figtree / Menbere | stacked type, then a full-bleed panoramic strip | the panoramic strip under a very large headline |
| bloom-hair v2 | lilac white, aubergine, marigold | Anton + Karla / Noto Sans Ethiopic Condensed | full-bleed photo poster with an anchored panel | the poster panel over the photograph |
| meron-atelier v2 | chalk grey, navy wool, chalk blue | EB Garamond / Noto Serif Ethiopic | centered label over a triptych | the triptych of the work |
| abugida-language v2 | paper white, ink, rubric red | Alegreya / Abyssinica SIL | edge-bleed photo left, copy right of a red rule | the manuscript rule beside the photograph |

- Tena: the filled buttons first rendered with dark text because `.tc a { color: inherit }` beat `.tc-btn`. Every v2 template now scopes the link reset with `a:not(.<prefix>-btn)`. The headline needed a wider copy column to stay on two lines at 1440. The heavy teal rule over the steps was removed as the extra accessory.
- All: the dark-mode booking or review band must not turn into a bright block (Tena band, Selam lime band). Dark mode uses the strong surface color there.
- All: faces of one family must share one `font-weight` descriptor in `@font-face`. With different ranges, Chrome picked the Ethiopic-only face for Latin text and fell back to DejaVu Sans (seen on Abugida). The v2 manifests now assert that each landing page requests its Latin face, and its Ethiopic face in `am`.
- All: images use eager loading. The runner's full-page capture does not scroll, so lazy images were missing from evidence.
- Bloom: the poster panel needed 920px so the headline holds two lines; the two smaller stylist tiles read better as photo over name.
- Menbere ships as two static weights (246 KiB) instead of the variable file (372 KiB).

## New themes v1: businesses chosen (2026-09-30)

The five recipes cover movement, hair, tailoring, language and a clinic. The two new ones are chosen to sit as far apart as possible in audience and mood:

| | tizita-sound | wana-swim |
|---|---|---|
| Business | Rehearsal and recording rooms in Piassa | A children's swim school at a covered pool in Old Airport |
| Who books | Bands, singers and session players, 18 to 40 | Parents booking lessons for children aged 4 to 12, plus adult beginners |
| When | Afternoons and nights | Mornings, after school and weekends |
| Mood | Nocturnal, tactile, a little melancholy | Daylight, bright, reassuring |
| What the page must do | Get a room and a time on the calendar | Get a first lesson booked and calm a nervous parent |

## tizita-sound v1 (2026-09-30, New themes v1)

**Design read.** Reading this as: a booking site for a rehearsal and recording studio in Piassa, for working bands, singers and session players who book rooms by the hour, with a nocturnal, tactile language, leaning toward 1970s Addis record sleeves and the labelling on studio hardware. The one job: book a room for a session.

**Subject grounding.**

1. The mixing console. Channel strips stand side by side. Each has a fader on a long vertical track and a scribble strip of white tape with a name on it. The fader position is a real reading, not decoration.
2. The record sleeve. A square photograph, a wide heavy title, liner notes set in columns on the back, and credits that list who played what.
3. Tizita, the mode and the song form that people in Addis call the blues: longing, night, blue. The recording lamp over the door is the one warm light in the room.

**Token plan.**

| Role | Light | Dark |
|---|---|---|
| canvas (daylight mist / night room) | #eceef7 | #0e0f28 |
| surface | #f8f9fd | #16183b |
| text (midnight ink) | #17183b | #eceefd |
| primary (tizita indigo) | #2e3192 | #b4b7ff |
| accent (recording lamp, fills only) | #e23d68 | #ff6f94 |
| border | #c3c7e0 | #34386e |

Contrast (computed): text on canvas 14.7 light and 16.3 dark. Muted text 7.3 and 9.0. White on primary 10.7, night ink on dark primary 9.5. The lamp is a graphic, never text: 3.6:1 on the light canvas and 7.1:1 on the dark canvas.

- Type: Archivo (Omnibus-Type, OFL). Display is Archivo at width 125 and weight 800, which gives the wide, heavy title of a record sleeve and of the engraved labels on hardware. Body and UI are Archivo at width 100. Ethiopic partner: Noto Sans Ethiopic, variable weight, at 800 for display and 400 for body, so Amharic headings carry the same mass. Archivo has tabular figures for durations and prices. No uppercase transform, no tracking.
- Radius system: 2px on buttons, inputs and panels. Photographs 0. Hardware is machined, not rounded.
- Accent rule: the lamp color fills the fader caps on the console and the small recording lamp beside the booking panel title. Nothing else. Buttons use indigo.
- Layout, one family per section:

```
Header      [logo] Tizita Sound Rooms    Services Team Visit Questions   (Dark) [Book]

Hero        +-------------------------+  Headline in Archivo Wide,
(sleeve)    |                         |  at most two lines
            |   square photo 1:1      |  Subtext, at most 20 words
            |   (the record sleeve)   |  [Primary]  Secondary link
            +-------------------------+  (copy sits on the sleeve's baseline)

Services    +-------------+----+----+----+   master section: title and intro on the left,
(console)   | Title       | || | || | || |   one channel strip per service on the right.
            | intro       | [] | || | || |   The cap position is duration / longest duration.
            |             | || | [] | || |   Under each track: minutes (tabular), price,
            |             |120 | 240| 60 |   the name on a scribble strip, summary, book link.
            +-------------+----+----+----+   Phone: strips turn into rows with horizontal tracks.

About       wide 21:9 photo, full content width
(liner      Title
notes)      prose in two columns (one on phones), highlights as a plain list after it

Providers   Name (display)       Name (display)       two people: a pair split.
(credits)   role                 role                 square portrait over each name,
            specialties, comma   specialties          like the credits on a back sleeve

Benefits    +----------------------+-----------+       three notes: one large, two small
(1 + 2)     | large note           | note      |
            |                      +-----------+
            |                      | note      |
            +----------------------+-----------+

Process     Step 1 ---------- Step 2 ---------- Step 3     a real sequence, so real numbers
(tape)      title             title             title      along one horizontal rule
            text              text              text       (stacked on phones)

Review      one quote in the display face, left aligned, attribution on its own line

Proof       value | value | value        three facts in one row, label under each value

Rooms       [photo 4:3]      [photo 4:3]      two rooms side by side, name, address,
(pair)      name, address    name, address    hours, phone, directions link

Questions   Title (left, sticky)   | accordion list (right)

Booking     panel on the surface color: [lamp] title, body, [Primary]
Footer      name, body, footer links
```

- The one bold thing: the console. Services are channel strips, and the fader cap on each strip sits at the session length. A two-hour rehearsal and a four-hour recording read differently before anyone reads a number.

**Review against tells.md.** What the first draft had, and what changed:

- A near-black canvas with an acid-green meter accent. That is the "near-black with one acid accent" default. Changed to a deep indigo night and a single warm lamp color, both from the subject (tizita as the blues; the recording lamp).
- A monospace face for the console labels, "because studios". That is "monospace for small data labels without a data reason". Dropped. Archivo's tabular figures carry the numbers.
- The console as three equal columns. That is "three equal cards". Changed: the section title and intro take a master column on the left, the strips share one panel with no card borders, and the strip count follows the content.
- "Side A" and "Side B" labels over sections. Eyebrows and invented copy. Dropped.
- The booking band as a full indigo block in light mode. That is a section that flips the theme. Changed to a panel on the surface color with the lamp as the only warm mark.
- Kept a wide display face even though it costs line length. It is the subject's own type (sleeves and hardware), and the scale is set so the headline holds two lines at 1440px.

**Booking handoff.** The console reduced to rows, the first room with address and hours, and one action to the scheduler.

## wana-swim v1 (2026-09-30, New themes v1)

**Design read.** Reading this as: a booking site for a small swim school at a covered pool in Old Airport, for parents booking lessons for children aged 4 to 12 and for adults who never learned, with a bright and reassuring language, leaning toward pool signage and the swimming-badge card. The one job: book a first lesson.

**Subject grounding.**

1. The pool from the side: lane ropes of alternating floats, the dark line on the pool floor that ends in a T at the wall, pale aqua tiles.
2. The progress card: a child's card that gets a stamp for each step, kept in a swim bag.
3. The poolside routine: cap, towel, the shower before the water, the parents' bench behind the glass.

**Token plan.**

| Role | Light | Dark |
|---|---|---|
| canvas (pool tile / night pool) | #e2f4f5 | #062335 |
| surface | #fbfefe | #0b2e45 |
| text (deep end) | #0b2545 | #e6f6f9 |
| primary (lane-line blue) | #0b57ad | #86c8ff |
| accent (float orange, fills only) | #e5600b | #ff8f3d |
| border | #9fcdd4 | #285a78 |

Contrast (computed): text on canvas 13.6 light and 14.6 dark. Muted text 7.1 and 8.8. White on primary 7.0, dark ink on dark primary 9.2. The float is a graphic at 3.1:1 on the light canvas and 7.1:1 on the dark. Step numerals on the float use the deep-end ink at display size (4.4:1).

- Type: Fredoka (OFL), a rounded sans, for display, body and UI. Its round terminals echo the painted, rounded letters of pool signs, and it reads well at the large sizes a parent scanning on a phone needs. Ethiopic partner: Menbere (OFL), a rounded Ethiopic sans that matches the round terminals. Display 600, body 400. No uppercase, no tracking.
- Radius system: buttons full pill, panels and photos 24px (a pool corner), inputs 12px.
- Accent rule: float orange fills the lane-rope floats between service lanes and the stamps on the progress card. Buttons use lane-line blue.
- Layout, one family per section:

```
Header      [logo] Wana Swim School    Services Team Visit Questions   (Dark) (Book)

Hero        Headline in Fredoka,              +-----------------------------+
(split)     at most two lines                 |                             |
            Subtext                           |   pool photo 4:3, radius 24 |
            (Primary)  Secondary link         |                             |
                                              +-----------------------------+

Services    Title, intro
(lanes)     ==o==o==o==o==o==o==o==o==o==o==   lane rope (floats alternate orange and white)
            Name                      45 min      one full-width lane per service:
            summary     ------------T  ETB 750    name and summary, the floor line ending
            ==o==o==o==o==o==o==o==o==o==o==   in a T at the wall, then duration and price
            ...                                 and the book link at the wall end

Process     Title
(card)      (1)  (2)  (3)     stamps along a progress card, a real sequence
            title title title
            text  text  text

Providers   (portrait)  Name        (portrait)  Name      two coaches: a pair split,
(pair)      circle      role        circle      role      round portraits like a cap
                        specialties             specialties

Benefits    +--------------------+   three notes: one large, two small
(1 + 2)     | large              | +----------+
            |                    | | small    |
            +--------------------+ +----------+

About       photo 4:5 left, story and highlights as a ticked list right

Review      one quote inside a rounded panel, attribution on its own line

Proof       three facts as a row on one surface

Pool        photo 16:9, then name, address, hours, phone in a two-column definition list,
(visit)     directions link

Questions   single-column accordion under the title

Booking     rounded panel on the surface color with title, body, (Primary)
Footer      name, body, links
```

- The one bold thing: the lanes. Each service is a pool lane, separated by a lane rope and marked by the floor line that ends in a T at the wall, where the duration and price sit. Parents compare lessons the way they would read a pool from the side.

**Review against tells.md.** What the first draft had, and what changed:

- Wave dividers between every section and a wave clip on the hero photo. Decoration that says "water" and does no work. Dropped. The lane rope appears only between lanes.
- Fredoka paired with Nunito. Two soft rounded sans faces read as the default "kids" kit. Changed to Fredoka alone, with Menbere for Ethiopic.
- Age tags as pills over the class photos. That is "tags over photos". Dropped. Ages live in the service names that the business writes.
- Three equal level cards. That is "three equal cards". Changed to full-width lanes, and the benefits use the 1 + 2 rule.
- A hover lift on every card and bubble fade-ins on scroll. That is "hover lift on every card" and "fade-and-slide on every section". Dropped. Motion is calm.
- The first float orange (#ff7a1a) was 2.3:1 on the aqua canvas, which fails as a graphic. Darkened to #e5600b.
- Kept the 4:3 split hero. It is the plainest composition, and the lanes are where the boldness goes.

**Booking handoff.** The lanes reduced to rows, the pool's address and hours, and one action to the scheduler.

## New themes v1 summary

| Template | Palette family | Display face / Ethiopic | Hero composition | The one bold thing |
|---|---|---|---|---|
| tizita-sound v1 | indigo night, midnight ink, recording-lamp rose | Archivo Expanded 800 / Noto Sans Ethiopic 800 | square sleeve photo left, copy right on its baseline | services as a mixing console, fader position = session length |
| wana-swim v1 | pool-tile aqua, lane-line blue, float orange | Fredoka 600 / Menbere | copy left, 4:3 pool photo right, 24px corners | services as pool lanes with lane ropes |

Neither palette uses a cream canvas, and neither display face appears in the baseline or in the five v2 packages.

## New themes v1 build notes (2026-10-01)

What changed between the plan and the browser. Read these before the next pass.

- Package contract: the root needs `data-pe-root` (or `data-pe-booking`), `data-pe-recipe` and `data-pe-mode={mode}`, and the switch label must be written as `chrome.modeSwitchLabel(mode)`. `tests/public-template-packages.test.mjs` enforces this; the first build used `data-mode` and failed it.
- `max-width` on an element that also carries the `-wrap` class centers it, because the wrap sets `margin-inline: auto`. Put the measure on the children. Seen on Tizita contact and Wana contact and questions.
- Tizita: at 1440 the Archivo Expanded headline holds two lines in the 6/11 column. On phones the header wraps, so the booking action sits on its own row.
- Tizita: the fader cap reads correctly as a length (60, 120 and 240 minutes). On phones the faders lie down.
- Wana: the float orange needed 3:1 as a graphic, which the written rules do not ask for.
- Wana: Fredoka has no tabular figures. Durations and prices sit right-aligned at the lane's wall end instead.
- Both: the shared scheduler maps the recipe accent into its own gradients and glows (`bookingTheme.ts`), so the "accent only on X" rule cannot hold on `/schedule`.
- Remove one accessory: Tizita lost the sticky FAQ heading; Wana lost the tint on the large benefit tile.
- Showcase photos were generated with Codex image generation and reviewed for text, logos and setting before they were checksummed.

## Taste v2 motion and rhythm pass (2026-10-01)

The theme audit (`qa/evidence/theme-audit-v1/`) found no motion in any template, one header pattern everywhere, and four section headings shared by all seven businesses. This pass applied design-taste v2 to all seven. Every template now reads `design.motion`, uses `templates/motion.ts` for reveals and scroll state, and shows its final state at once under reduced motion. The seeder now gives each business its own headings, intros and process steps.

| Template | Motion character | Header behavior | Entrance | Reveal grammar | Signature interaction | The model's move |
|---|---|---|---|---|---|---|
| selam v2 | breathing | sticky; hides on scroll down, returns on scroll up | headline rises, the panorama opens from its middle | slow rise | pace bars draw to each session's true length | the pace bar under each tempo numeral |
| bloom v2 | crisp poster | sticky with a reading-progress line (CSS scroll timeline) | photo settles, the aubergine panel wipes up | wipe from the left | price rows fill in; the hovered row lights aubergine | the printed offset shadow on buttons |
| meron v2 | measured | sticky, condenses | headline settles, triptych unfolds from the centre | a chalk line draws over each heading | the tape measures out, step marks drop in order | the tacking stitch on a fitting slip |
| abugida v2 | inked | sticky; a red rubric underline draws in once scrolled | the red rule draws down, text inks in | ink running down (opacity plus downward clip) | rubric rules draw, Ge'ez numerals ink in order, leaders draw to the facts | the leader turns red under the pointer |
| tena v2 | crisp | sticky, gains a shadow | fast rise | short rise | the reception board flips its rows in; plates slide into slots | the teal edge on the highlighted row |
| tizita v1 | mechanical | sticky, condenses | the photo slides out of its sleeve | slide along the reading axis | faders travel to each session's length; the hovered strip lights its cap | the mode switch is a console toggle whose lamp lights in dark mode |
| wana v1 | liquid | transparent, then solid; on phones the booking action docks at the bottom | the photo rises out of the water | liquid rise | lane lines swim out to the lesson's length; ropes bob under the pointer; stamps press in | the facts are painted on the pool edge like depth markings |

Page rhythm changes: Tizita moved the proof facts above the console as a meter bridge and folded the benefits into the liner notes. Wana moved the facts to the pool edge under the hero, folded the benefits into the poolside story, and moved the progress card after the coaches. The five older templates kept their order in this pass; changing their rhythm is the next step.

Lessons:

- The generic `.x [data-reveal]` transition outranks a component's own `transition`, so a component that animates other properties too needs one combined rule with a higher selector.
- A content-only seeder upgrade never republished: `enrich_seeded_records` marks the content current before `configure_public_experience` checks it. The seeder now forces the republish.
- Copy can be the factory tell even when the design is not: identical headings across seven businesses made them look like one product.
