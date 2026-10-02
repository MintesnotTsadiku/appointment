# Themes v2: design-taste v2, motion and variation

> **Note (2026-10-02):** the Tizita Sound and Wana Swim templates were later removed, with their seeded showcase businesses. Mentions of them below are historical.

> **Note (2026-10-02):** the `design-taste` skill and its `taste-lint.mjs` checker were retired from this repository because they made designs converge. References below are historical. The procedure now lives as an opt-in prompt outside the repo, and its design log is in `docs/implementation/design-log.md`.

## Why

A runner audit of all seven public templates (`BQA-2026-00313`, evidence in `qa/evidence/theme-audit-v1/`) confirmed the review "they look like they came out of one factory":

| Measure, all 7 templates | Before |
|---|---|
| `@keyframes`, animations, scroll reveals | 0 |
| Hover states that did more than recolor | 0 |
| React state or effects for interaction | 0 |
| Header pattern | the same bar on all 7; sticky on 1 |
| Section headings shared word for word by all 7 businesses | 4 ("How a visit works", "Small details that make the visit easier", "Reviews", "At a glance") |

The cause was the `design-taste` skill. Every taste rule was a ban, motion was only described by what not to do, `calm` was read as "no motion", and the seeder gave every business the same section copy.

## What changed

### 1. design-taste v2 (`.claude/skills/design-taste/`)

v1 is archived in `docs/implementation/design-taste-v1-archive/`.

- **Hard rules vs taste defaults.** Content ownership, both languages, contrast, reduced motion, the CSP and the package contract stay hard. Everything else is a default the model may break with a logged reason.
- **Creative latitude** (`SKILL.md`): the model chooses page structure, invents the visual components, picks the motion character, and must ship one idea no rule asked for ("the model's move").
- **Motion plan** (`references/motion.md`, new): character, entrance, reveal grammar, signature interaction and required micro-interactions, with a character-to-timing table, the technical rules, and a starter vocabulary marked as a prompt, not a menu.
- **Page rhythm and header behavior** (`references/public-templates.md` section 5): the page is designed, not the sections; two templates must not share a rhythm; at least half the sections are not "title, intro, grid".
- **Tells** (`references/tells.md`): a new "too little" section next to the "too much" one: zero motion, schema-order pages, the shared header, copied headings, a static bold element.
- **Package contract** written down (root attributes, chrome calls, specificity traps, eager images, references for templates without a board).
- **Lint** (`scripts/taste-lint.mjs`): reads every `.tsx` and `.css` in a package; ignores JSX ternaries (the v1 false positive); new rules `no-motion` (error), `hidden-without-js` (error), `no-interaction` and `no-reveal` (warnings). On the old templates it reported `no-motion` on five of seven.

### 2. Shared headless motion (`frontend/src/public-experience/templates/motion.ts`)

`useReveal(root)` marks `[data-reveal]` children `data-revealed` as they enter the viewport, and also sweeps anything a fast jump carried past (found in testing: an anchor jump skipped Meron's tape). `useScrollState()` gives one frame-throttled scroll reading for header behavior. Both only set data attributes; each template owns how states look. Content is visible without JavaScript, and reduced motion reveals everything at once.

### 3. Motion and interaction in all seven templates

| Template | Character | Header | Entrance | Reveal | Signature | The model's move |
|---|---|---|---|---|---|---|
| Selam | breathing | hides on scroll down, returns on scroll up | headline rises, panorama opens from its middle | slow rise | pace bars draw to each session's length | pace bar under each tempo numeral |
| Bloom | crisp poster | sticky, reading-progress line (CSS scroll timeline) | photo settles, panel wipes up | wipe from the left | price rows fill in; the hovered row lights aubergine | printed offset shadow on buttons |
| Meron | measured | sticky, condenses | headline settles, triptych unfolds from the centre | chalk line draws over each heading | the tape measures out, marks drop in order | tacking stitch around a fitting slip |
| Abugida | inked | red rubric underline draws in when scrolled | red rule draws down, text inks in | ink running down | rubric rules, Ge'ez numerals and contents leaders draw in | leader turns red under the pointer |
| Tena | crisp | sticky, gains a shadow | fast rise | short rise | reception board flips its rows in, plates slide into slots | teal edge on the highlighted row |

Every template has hover, focus-visible and pressed states on buttons, links, choosable rows and accordions; reads `design.motion` (`calm` is shorter and smaller, not absent); and shows its final state under reduced motion.

Page rhythm: Tizita moved the proof facts above the console as a meter bridge and folded the benefits into the liner notes; Wana moved the facts to the pool edge under the hero and folded the benefits into the poolside story.

### 4. Per-business copy

`appointment/demo/showcase_public.py` now holds `SECTION_COPY` (process, benefits, testimonials and proof titles; providers, process and locations intros) and `PROCESS_STEPS` for the first five businesses, in English and Amharic. No heading or intro repeats between businesses. The seeder (`CONTENT_VERSION` 5, `PUBLIC_EXPERIENCE_VERSION` 15) republished all seven sites.

Seeder bug fixed on the way: a content-only upgrade never republished, because `enrich_seeded_records` marks the content current before `configure_public_experience` checks it. The upgrade path now forces the republish.

## Verification

- `taste-lint` v2: 0 errors, 0 warnings on all seven templates.
- `tsc --noEmit`, ESLint on `templates/`, and `tests/public-template-packages.test.mjs` pass.
- Frappe: `test_public_experience_contracts` 14 OK, `test_showcase_catalog` 5 OK.
- Runner, static (reduced motion, full pages, 1440 and 390, light, `en`): `BQA-2026-00314`, 14 scenarios passed, 0 console and network errors. Evidence: `qa/evidence/theme-audit-v2/static/`.
- Runner, motion (`reduced_motion: no-preference`, 1440, scrolls the page in four viewport steps and waits for each template's signature element to reveal): `BQA-2026-00318`, 7 scenarios passed, 0 console and network errors. The frames catch animations in flight (Tizita faders travelling, Wana lane lines drawing, Abugida rows inking, Tena plates sliding). Evidence: `qa/evidence/theme-audit-v2/motion/`. Earlier attempts `00315` to `00317` failed on a selector that matched several revealed elements and on the fast-jump bug above.
- Runner, dark and `am` for all seven (landing, `/book`, scheduler at 1440 and 390): every run passed with 0 console errors, 0 network errors and no horizontal scroll. Evidence: `qa/evidence/theme-audit-v2/dark-am/`.

| Template | Run |
|---|---|
| Selam | BQA-2026-00319 |
| Bloom | BQA-2026-00320 |
| Meron | BQA-2026-00321 |
| Abugida | BQA-2026-00322 |
| Tena | BQA-2026-00323 |

## What is still open

- The five older templates kept their section order and layouts in this pass; their difference now is motion and copy, not structure. Giving each a new page rhythm is the next step, and v2's rules require it for the next redesign.
- The shared scheduler (`/schedule/...`) has no template motion and still reuses the accent in its gradients.
- The runner cannot hover, so hover states were verified in code, not in captures.
