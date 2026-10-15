# Template v3 kit

The v3 template packages share one kit of behavior: `frontend/src/public-experience/templates/kit/`. The kit has hooks, timing and data only. It has no visual component and no stylesheet. Each template package draws its own markup and CSS, as the repository rules require (`AGENTS.md`, "Public experience rules").

Bloom v3 ("Golden Hour Salon") is the first package that uses the kit. See `BLOOM_V3.md`.

## Rules

- Import behavior from `../kit`. Do not import a component, a stylesheet or a helper file from another template package. A pure helper that you need in two packages goes in the kit, or each package keeps its own copy (Bloom v3 keeps its own `ink.ts`).
- Do not add an animation library. Do not use `framer-motion` in a public template.
- Animate only `transform`, `opacity`, `clip-path` and `filter`.
- Make the page complete without JavaScript. Put every hidden start state under `[data-motion-ready]`. Only the kit sets this attribute.
- Reduced motion always wins. Under `prefers-reduced-motion`, the motion level is `none`: every reveal shows at once, nothing moves, and a marquee is a still grid. Also stop all animation in CSS under `@media (prefers-reduced-motion: reduce)` and under `[data-motion-level="none"]`.
- Keep pointer effects for fine pointers. The kit does not run them on touch screens.
- Keep the kit under 8 KB of gzipped JavaScript. On 2026-10-15 the whole kit, with `lib/time.ts`, is 6.4 KB gzipped (esbuild, minified, React external). A template loads only the parts it imports.
- Development-only query values (`preview-time`, `preview-availability`, and the existing `preview-state`) read `import.meta.env.DEV`. Production builds ignore them. Keep these reads out of the pure files in `kit/core/`.

## Files

| File | What it contains |
|---|---|
| `kit/core/motion.ts` | Motion levels, stagger and mask timing, view progress, easing. Pure. |
| `kit/core/numbers.ts` | Ge'ez numerals and count-up frames. Pure. |
| `kit/core/pointer.ts` | Math for the magnetic pull, tilt, pointer glow and the circular reveal radius. Pure. |
| `kit/core/picture.ts` | `<picture>` sources from an imagery asset, and loading attributes. Pure. |
| `kit/core/clock.ts` | The Addis Ababa clock, the part of the day, "after dark", opening hours and the Habesha clock. It uses `lib/time.ts`. |
| `kit/core/availability.ts` | Validation and labels for the next-availability answer. Pure. |
| `kit/motion.ts` | `useMotionLevel`, `useReveal`, `useScrollProgress`, `useCountUp`. |
| `kit/pointer.ts` | `usePointerEffects`. |
| `kit/marquee.ts` | `useMarquee`. |
| `kit/transitions.ts` | `circularModeSwitch`, `bookingTransition`. |
| `kit/time.ts` | `useTimeOfDay`. |
| `kit/availability.ts` | `useNextAvailability`. |
| `kit/haptics.ts` | `haptic`. |
| `kit/progress.ts` | `useSectionProgress`. |
| `kit/index.ts` | One import point for all of the above. |

`frontend/tests/template-kit.test.mjs` tests every pure file. It is part of `npm run test:dom`.

## Motion level

The compiled design has `motion`: `calm`, `standard` or `expressive`. A recipe offers its levels in the `motion` adjustment. New sites get the recipe default. Bloom v3 offers all three and starts at `standard`. Showcases use `expressive` when the recipe offers it.

- `useMotionLevel(design.motion)` returns the level for the page. It returns `none` while the visitor asks for reduced motion, and it follows a change of that setting.
- `allows(level, needed)` tells if a level permits an effect. Parallax, count-ups, pointer effects and the marquee need `standard`.
- Put `data-motion-level={level}` on the template root. Use it in CSS for the distances and durations of each level.

## Reveal

`useReveal(root, level, key)` sets `data-revealed` on each `[data-reveal]` element when it enters the viewport.

- The value of `data-reveal` names the look, for example `rise`, `mask` or `mirror`. The template CSS draws each look.
- The children of a `[data-reveal-stagger]` element get `--i` and `--reveal-delay` (70 ms steps, at most 420 ms).
- A fast jump (an anchor link, a full-page capture) shows every element above the bottom of the viewport.
- `maskTiming(index, level)` gives the delay and the duration of a clip-path mask.

## Scroll progress

`useScrollProgress(root, level, needed)` drives parallax layers, drawn SVG paths and progress motifs.

- When the browser has CSS scroll-driven animations, the root gets `data-scroll="css"`. The template CSS uses `animation-timeline: view()` or a named `view-timeline`.
- When it has not, the root gets `data-scroll="js"`. One passive listener writes `--p` (0 to 1) on each visible `[data-scroll]` element. The CSS uses `var(--p)`.
- Below `needed`, the root gets `data-scroll="off"` and nothing moves.
- For a drawn path, set `pathLength={1}` on the `<path>` and use `stroke-dashoffset: calc(1 - var(--p))`.

## Count-up

`useCountUp(root, level, locale)` counts each `[data-count]` element up once. The final text is in the DOM before and after the count, so screen readers and reduced motion get the real value. `data-count="geez"` counts in Ge'ez numerals. `toGeez(value)` converts a positive integer (`toGeez(2026)` is "፳፻፳፮").

## Pointer effects

`usePointerEffects(root, level)` writes custom properties. The template CSS uses them:

| Attribute | Properties | Use |
|---|---|---|
| `data-magnetic="6"` | `--mag-x`, `--mag-y` (px, at most the value) | A button that leans to the pointer |
| `data-glow` | `--glow-x`, `--glow-y` (%) | A soft light under the pointer |
| `data-tilt="3"` | `--tilt-x`, `--tilt-y` (degrees, at most the value) | A card that tilts |
| `data-pan` | `--pan-x`, `--pan-y` (-1 to 1) | Zoom and pan inside an image frame |

## Marquee

`useMarquee(track, level)` returns `{ state, paused, userPaused, toggle }` and sets `data-marquee` on the track to `running`, `paused` or `static`.

- It pauses while the pointer or the focus is inside, while the track is off screen, and while the tab is hidden.
- `userPaused` is the visitor's own choice. Use it for the pause button (WCAG 2.2.2).
- Below `standard`, the state is `static`. The template shows a still grid.
- Write the CSS so that a track without `data-marquee` (no JavaScript) is also a still grid.

## View transitions

- `circularModeSwitch(origin, update, level)` switches light and dark with a circle that grows from the switch. `update` must set the mode at once. It runs in `flushSync`.
- `bookingTransition(event, href, navigate, level, options)` morphs the clicked booking action into the booking page header. The target element on the booking page has `data-vt-book` and `view-transition-name: pe-book` in the template CSS. The helper uses the router, so it works only for a same-site path. It returns false, and the link navigates as usual, when the browser has no View Transitions API, the level is below `standard`, or a modifier key is down.

## Responsive pictures

`pictureSet(asset, { night, sizes })` returns the `<source>` list and the `<img>` attributes for one imagery asset:

- the mobile crop (`mobileSrc`, `mobileWidth`, `mobileHeight`) below 640 px,
- the night photos (`darkSrc`, `darkMobileSrc`) when `night` is true,
- AVIF sources when the asset has `formats: ["avif"]` (a `.avif` file next to each `.webp` file),
- a `srcset` with the smaller files in `widths` (`<name>-w<width>.webp`),
- `width` and `height`, so the page reserves the box.

An owner photo (`/files/…`) has none of these. It gives a plain image. `loadingAttributes(eager)` gives `loading`, `decoding` and, for the LCP image, `fetchpriority="high"` as a lowercase DOM attribute.

## Time of day and opening hours

- `useTimeOfDay()` returns the Addis Ababa wall clock, `part` (`morning` 05–11, `afternoon` 12–16, `evening` 17–20, `night` 21–04) and `afterDark` (18:00 to 06:00). It updates each minute. In development, `?preview-time=HH:MM` sets the clock.
- The chrome keys `greetingMorning`, `greetingAfternoon`, `greetingEvening` and `greetingNight` give the greeting in English and Amharic.
- `openState(days, clock)` tells if a place is open, when it closes, or when it opens next. The days come from `snapshot.placeHours` (by location id). The guest snapshot API sends the weekly hours of each active place.
- `habeshaPhrase("13:30")` returns "ከቀኑ 7:30 ሰዓት". Show the Habesha clock by default on Amharic pages and behind a switch on English pages.

## Next availability

`useNextAvailability(enabled, publicRoot)` reads the guest endpoint once per page. Pass `snapshot.booking.liveAvailability === true` as `enabled`.

- The status is `off` when the setting is off, the request fails, or the answer is not valid. Render nothing then.
- `data.next` is the first free start of the business. `data.todayLeft` counts the free (provider, start) pairs today. `data.services` and `data.providers` give `next` and `todayLeft` by the `id` of a services or providers item.
- `slotLabel(iso, now, zone, locale)` says "today", "tomorrow" or the weekday, and the 24-hour time in the business's zone.
- In development, `?preview-availability=off|empty|loading` forces a state.

### The endpoint

`appointment.public_experience.api.get_next_availability(public_path, locale)`, guest, GET.

- It resolves the published site from the path. A path without a published site, or a site with the setting off, answers `{"enabled": false}`.
- It reads the setting from the published release (`booking.liveAvailability`), so a change goes live with the next publish.
- It reads only offerings that the scheduler shows to a guest (`booking.offering(public=True)` and `enable_public_booking`), and the same slot rule (`open_slots`) for the next 7 days.
- The answer has counts and start times only. It never has a customer, a booking or a note.
- It is cached for 60 seconds per release (`frappe.cache`), and limited to 60 requests per minute per IP address.
- The code is `appointment/public_experience/next_availability.py`. The tests are in `appointment/tests/test_template_v3.py`.

### The owner setting

Website setup, "Website features" step: "Show my next free times on the website". The setting is off for a new site. `setup.save(..., booking={"liveAvailability": true})` stores it in `Public Site.booking_json`, and `setup.state()` returns it as `booking`. The showcase seeder turns it on for every showcase.

## Haptics and section progress

- `haptic("select" | "success")` vibrates on Android browsers and does nothing elsewhere. The organization scheduler calls it when a visitor chooses a time and after a booking.
- `useSectionProgress(root)` returns the `[data-section][id]` sections of the page and the index of the section in the middle of the screen. Use it for section dots or a section nav.

## Booking-success moments and loading screens

- `templates/moments.tsx` maps a renderer key and version to a lazy moment component of a template package. The organization scheduler shows it behind the confirmation header. A template without an entry has no moment.
- A template package can export `Loading`. `PublicSiteHome` and the booking handoff show it while the published design loads, and for `?preview-state=loading` in development.

## Imagery contract additions

`appointment-imagery.v1` takes these optional keys on an asset. Older manifests do not change, and their compiled designs stay byte-identical.

| Key | Meaning |
|---|---|
| `mobileWidth`, `mobileHeight` | The size of the mobile crop (both or neither) |
| `darkSrc`, `darkMobileSrc` | Night photos for dark mode (`darkMobileSrc` needs `darkSrc`) |
| `formats` | `["avif"]` when an AVIF file sits next to each WebP file |
| `widths` | Smaller desktop files, ascending and smaller than `width` |
| `checksums` | SHA-256 of every extra file. It stays in the manifest and is not compiled. |

## Content additions

- `process`, `testimonials` and `contact` have an optional image slot (`image`, `imageAlt`, `imageFocus`). Each `process` step also has one.
- A new optional `gallery` section has up to 12 photos. Each item needs `image`, and an owner upload needs an English `imageAlt`. `caption` is optional. A recipe offers it in `supportedSections`, and setup adds an empty gallery to a new draft for such a recipe. An empty gallery shows the template's own photos.
- The website editor edits all of these (`section_editor.py`, `imageRequired` on the gallery list).
- `Public Site Section.section_type` has the option `gallery` (one migration).

## Booking skins

The booking pages (service chooser, time picker, details, confirmation) are one shared flow with one interaction model. A template package dresses it with a small skin. The skin gives data, tokens and at most a few visual slots. It never imports from another template, and the shared flow never imports a template's page components. The booking pages are conversion pages: speed and clarity first, no parallax, marquee, count-up or large moving image.

### The contract

`frontend/src/public-experience/templates/booking-skin.ts` defines `BookingSkin`:

| Field | Required | Meaning |
|---|---|---|
| `key` | Yes | `rendererKey@rendererVersion`, for example `bloom-hair@3`. |
| `name` | Yes | The value of `data-bk-skin` on the booking pages, for example `bloom-v3`. |
| `frame` | Yes | The shape of service photos and portraits: `rounded`, `mirror`, `arch`, `circle` or `square` (`data-bk-frame`). |
| `servicePhotoRoles` | Yes | Image roles for service photos when the website item has no photo. The flow uses the role at the item's place in the services section, so the photo is the same as on the landing page. Use `[]` for none. |
| `backdropRole` | No | The image role for the faint page background. The flow uses its smallest width file and its night photo in dark mode. Pick a photo that the handoff already showed. |
| `tokens(brand, mode)` | No | CSS custom properties from the brand variables: `--bk-action-bg`, `--bk-action-ink`, `--bk-action-radius`, `--bk-action-shadow`. Keep AA contrast for the action label. |
| `StepMark` | No | A visual slot: the mark of one step (`index`, `state`: `done`, `current` or `next`). Decorative (`aria-hidden`); the flow writes the step names. |

The skin's stylesheet is `booking.css` in the package. Scope every rule under `[data-bk-skin="<name>"]`, or use a class with the package's own prefix and `k-` (Bloom uses `.b3k-`). The CSS can set these tokens and draw these parts:

| Token or part | Use |
|---|---|
| `--bk-header-bg`, `--bk-header-line` | The page header. Set text colours on `.bk-header-inner` (the header element carries the brand variables inline). |
| `--bk-frame-line` | The line around photo frames. |
| `--bk-backdrop-opacity`, `--bk-backdrop-blur` | The page background echo. |
| `.booking-experience[data-bk-skin=…]` | The page: for example, remove the shared grid pattern. |
| `.bk-card`, `.bk-slot`, `.bk-day`, `.bk-chip`, `.bk-eyebrow`, `h1`, `h2` | Shape and type inside the flow. Do not change their size or order. |

### Rules

- Register the skin in `SKINS` in `booking-skin.ts`. Import only the skin module of the package (`./<package>/booking`). The skin module imports the contract as types only.
- Do not add a hook that moves things: no `useScrollProgress`, `useMarquee`, `useCountUp`, `data-scroll` or `data-count` in a skin. `frontend/tests/booking-skin.test.mjs` checks this and the CSS scope.
- Animate only the selection feedback (the flow owns it) and the template's success moment (`templates/moments.tsx`). Stop all animation with reduced motion.
- Load no extra large image. The backdrop is one small file. Service photos load lazily at the frame size.
- Marigold-style accent rules belong to the skin. Bloom fills only the booking action with marigold; the chosen time stays plum.
- Measure the chooser and the time picker on a phone (390 px, 9 Mbps, 170 ms, CPU 4x) before and after. LCP and CLS must not get worse.
- A template without a skin gets `DEFAULT_BOOKING_SKIN`: the brand tokens only. Its pages do not change.

## Checklist for the next v3 package

1. Add the recipe, layout and surface `v3` manifests, and the imagery manifest with `darkSrc` for the hero and the band. Pin palette and typography versions that exist.
2. Register `<key>@3` in `templates/registry.ts`, with `Loading`. Add the moment to `templates/moments.tsx`.
3. Use the kit for behavior. Draw every visual in the package.
4. Render every required section, `process` and `proof` included.
5. Generate the images with the Codex CLI method (`BLOOM_V3.md`, "Images"). Record every file with its checksum.
6. Move the showcase through the seeder: catalog `heroRole`, `detailRole`, `templateAssets`, and a higher `PUBLIC_EXPERIENCE_VERSION`.
7. Write the three manifests (`template-<name>-v3.yaml`, `-dark`, `-states`), run them, and record the run IDs.
8. Add the booking skin (`booking.tsx`, `booking.css`, a `SKINS` entry), link each service row on the handoff to `snapshot.bookingPaths[item.id]`, and write `booking-journey-<name>.yaml` like `booking-journey-bloom.yaml`.
