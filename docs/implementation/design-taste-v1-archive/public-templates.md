# Public template and recipe rules

A public template is a certified package: one landing page, one booking handoff, and one private stylesheet (see `docs/implementation/independent-public-template-packages.md`). A recipe binds a template to a palette, typography, imagery, layout, and surface, plus a few guarded adjustments. The rules below sit on top of those contracts. They never loosen them.

## 1. Content ownership (hard rules)

A template renders a real business. Anything a template invents appears on that business's site as a claim they did not make.

- Every visible string comes from one of two places: the release content (`snapshot.sections`, read through `localized()`), or a translated platform string for chrome (nav labels, "Back to site", mode toggle).
- No hard-coded place names, prices, times, staff names, patient claims, or fees. "Arat Kilo · Addis Ababa", "09:00", "Clear, upfront fees" and "Sample clinic location" are defects.
- No hard-coded `alt` text that describes a specific place. Use the asset's own `alt` from the catalog or the content, or `alt=""` for decoration.
- No fake controls. A `<select>` with one invented option, or a `<form>` that goes nowhere, is a broken promise. Either wire it to the booking contract or remove it.
- If a section has no content, hide it. Do not fill it with board copy.
- Design-board text is reference only. The boards in `docs/design-references/` show layout and tone. Their words are not page copy.

## 2. Language and script

- Test every template with `am` content. Amharic runs about 20 to 40 percent longer than English in headings.
- Every display and body face needs Ethiopic coverage, or a named Ethiopic partner with matched x-height and weight. Do not let Ethiopic fall back to a system font by accident.
- Do not use `text-transform: uppercase` or wide letter-spacing on text that may be Amharic. Ethiopic has no case, and tracking breaks syllable shapes. Scope such styles to Latin-only chrome.
- Do not force line breaks (`<br/>`) into headings that come from content. Use `text-wrap: balance` instead.

## 3. Typography

Typography carries most of a template's personality. Today all five templates share DejaVu Serif and Noto Sans Ethiopic, so they read as one family. Fixing that is the highest-impact change.

- Each template gets its own type pairing. One family, or two clearly distinct families. No two templates share a display face.
- The public CSP is `default-src 'self'`, so remote font services are blocked. Bundle font files under `appointment/public/` with an open license (OFL or similar), record the license in the typography manifest, and subset to Latin plus Ethiopic when the file is large.
- Serif is a choice, not a default for "premium". Use one only when the subject is editorial, heritage, or craft, and write down why this serif fits this business.
- Avoid the model-favorite defaults as display faces: Fraunces, Instrument Serif, Inter, and Georgia or Arial as the visible face.
- Set a real scale: display line-height about 1.0 to 1.1, body 1.5 to 1.65, body measure under 70 characters. Italic display type with descenders needs line-height 1.1 or more.
- Use `font-variant-numeric: tabular-nums` for prices, times, and durations.

## 4. Color and theme

- One accent per page, used the same way in every section. Status colors stay reserved for booking state.
- Avoid the default families unless the business brief names them: warm cream (#F4F1EA family) with terracotta or brass, near-black with one acid accent, and purple-to-blue gradients.
- Rotate palette families across templates. Check `design-log.md` first.
- One theme per page. Light mode never gets a sudden dark section, and dark mode never gets a cream band.
- Dark mode is designed, not inverted. Validate text, muted text, focus, and button contrast in both themes (AA: 4.5:1 body, 3:1 large text).
- No pure `#000`. Tint shadows toward the surface hue instead of using gray.

## 5. Layout

- The hero fits the first viewport at 1440x900 and 390x844: headline at most 2 lines on desktop, subtext at most 20 words, primary action visible without scrolling.
- The hero holds at most four text elements: an optional label, the headline, the subtext, and the actions (one primary, at most one secondary). No taglines under the buttons, no trust strips, no decorative word strips.
- Use at least four layout families across a full landing page. No family appears twice. Never three image-and-text splits in a row.
- Do not default to three equal cards. Choose the form from the content count: 2 items as a split, 3 as asymmetric (1 large + 2), 5 as 2 + 3.
- No floating corner captions. Small text belongs directly under the heading it explains, or it goes.
- Declare the phone layout for every multi-column section. Use `grid-template-columns: minmax(0, 1fr)`, never a bare `1fr` that expands to content.
- One corner-radius system per template, written down (for example: buttons full pill, images 0, inputs 8px).

## 6. Imagery

- Use the checksummed assets from the showcase catalog or tenant uploads that passed media policy. No remote images.
- Every image has a job: show the place, the people, or the work. Do not put tags or pills over photos. Captions are functional or absent.
- Crop with `object-fit: cover` and a declared aspect ratio so tenant uploads of any shape keep the composition.

## 7. Actions

- One label per intent on the whole page. If the hero says "Book a fitting", the nav and footer say "Book a fitting" too. Use the release's action label, not a hard-coded variant.
- Action labels fit on one line at desktop. Three words or fewer for the primary.
- Do not append arrows (→, ↗) to every link. Use an icon only when it adds meaning, such as an external link.
- Primary buttons are filled and pass contrast in both themes.

## 8. Motion

- `motion: calm` means no ambient animation. `standard` allows one orchestrated entrance on the hero.
- Animate only `transform` and `opacity`. No scroll listeners. Wrap everything in `prefers-reduced-motion`.
- No fade-and-slide on every section, no hover lift on every card.

## 9. Recipe manifests

- `description` must say what the design is for and how it looks. It is shown to business owners in the design gallery. "An independently implemented, art-directed public template package" says nothing to them.
- `audience` names real business types.
- Adjustments stay guarded. Add a choice only when every value in it passes the pre-flight.
- A recipe change is a new version. Never edit a published version's primitives in place, because releases fingerprint them.

## Pre-flight for a template change

Run `node .claude/skills/design-taste/scripts/taste-lint.mjs` first. Then tick each box honestly.

- [ ] Design read and token plan written, and reviewed against `tells.md`.
- [ ] No invented copy, alt text, prices, times, places, or claims (lint: `literal-copy`, `literal-alt`).
- [ ] No fake controls.
- [ ] `am` content renders with no clipping, overflow, or wrong font.
- [ ] Type pairing is distinct from every other template and bundled with a license.
- [ ] One accent, one theme per page, one radius system.
- [ ] Hero fits the viewport on desktop and phone, with at most four text elements.
- [ ] At least four layout families, none repeated, no floating corner captions.
- [ ] One label per action intent, no wrapped primary labels, no decorative arrows.
- [ ] No em dash or en dash as a separator in template chrome (lint: `dash`).
- [ ] Contrast AA in light and dark for text, buttons, inputs, and focus rings.
- [ ] Reduced motion respected, no ambient motion under `calm`.
- [ ] Runner captures for landing and booking handoff: 1440 and 390, light and dark, zero console and network errors.
- [ ] Browser output compared with the design reference board, and differences written down.
- [ ] Design log entry added.
