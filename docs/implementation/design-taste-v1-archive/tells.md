# AI-default tells

These patterns show up whatever the subject, which makes a page look generated. Each one is legitimate when the brief asks for it. It is a defect when it arrives by default. Check the design plan and the output against this list.

The lint column names the `taste-lint.mjs` rule that catches it mechanically, when one exists.

## Palette and surface

| Tell | Lint |
|---|---|
| Warm cream background (#F4F1EA family) with a terracotta or brass accent | |
| Near-black background with one acid-green or vermilion accent | |
| Purple-to-blue "AI gradient" as the brand | |
| Pure `#000` or tinted near-black standing in for a chosen dark | `pure-black` |
| Gray drop shadows under everything, glows, glass panels, blurred blobs | |
| A section that flips theme in the middle of a page | |

## Type

| Tell | Lint |
|---|---|
| Serif display chosen because it "feels premium" | |
| Fraunces, Instrument Serif, Inter, Georgia, or Arial as the visible face on a brand page | `default-font` |
| One word in a headline set in italic, bold, or a different color | |
| Uppercase, wide-tracked micro-labels above every heading (eyebrows) | `eyebrow` |
| Headlines broken into stanzas with `<br/>` | `forced-break` |
| Monospace for small data labels without a data reason | |

## Layout

| Tell | Lint |
|---|---|
| Three equal cards as the feature row | |
| Every section in the same card kit: one radius, one shadow, one border | `radius-sprawl` (the opposite failure) |
| Numbered markers (01, 02, 03) on content that is not a sequence | `numbering` |
| Small floating caption in a corner of the hero or a section header | |
| Left headline with a small explainer paragraph floating on the right | |
| Three image-and-text splits in a row | |
| Hero overflowing the first viewport | |
| `100vh` sections that jump on mobile | `100vh` |

## Chrome and copy

| Tell | Lint |
|---|---|
| Arrows appended to every link and button (→, ↗) | `arrow` |
| Em dash or en dash as a separator ("People — Hair — A brighter you") | `dash` |
| Meta strings joined with middle dots ("Speak · listen · belong") | `middot` |
| Poetic section labels ("Kind words", "Field notes") | |
| Two labels for one intent ("Book a fitting", "Our approach", "Start a conversation") | |
| Decorative word strips under the hero | |
| Invented facts: places, prices, times, fees, claims | `literal-copy` |
| Fake controls: selects with invented options, forms that go nowhere | `fake-control` |

## Motion

| Tell | Lint |
|---|---|
| Fade-and-slide-up on every section | |
| Hover lift or translate on every card and nav link | |
| Animation without a reduced-motion guard | `motion-guard` |

## Staff app specific

| Tell | Lint |
|---|---|
| Hero section or slogan inside a dashboard | |
| KPI card grid as the default first view | |
| Status badges on every table cell | |
| Decorative colored dots before nav items or rows | |
| Raw hex or Tailwind palette colors instead of tokens | |
