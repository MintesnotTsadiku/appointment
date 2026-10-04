# Production accessibility review

Managed run: `BQA-2026-00160`. Source: `1e22e48`.
The ten scenarios cover seven surfaces per template at desktop/light and
mobile/dark. The compiled Frappe entry enabled service-worker registration. Root worker
control is qualified separately by the production security suite.

All seventy automated WCAG A/AA audits passed. The local navigation measurements
reported zero layout shift and largest paints from 176 to 1,036 milliseconds.
These measurements use an unthrottled local runtime. They do not predict a remote
network or constitute a complete WCAG certificate.

## Rendered colors

The audit left 603 contrast findings for review. The retained calculation uses
computed foregrounds, translucent ancestors, gradient endpoints, and intermediate
stops. Run `python3 qa/contrast-review.py qa/evidence/content-accessibility <output>`
from the repository to reproduce `contrast-review.json`.

No calculated text pair remains below its required ratio. No finding was removed
because its text was short or contained only a symbol.

| Template | Findings | Minimum small text | Minimum large text |
| --- | ---: | ---: | ---: |
| Abugida | 89 | 4.979 | 7.740 |
| Bloom | 143 | 5.518 | 4.352 |
| Meron | 50 | 5.776 | 8.260 |
| Selam | 151 | 5.261 | 8.378 |
| Tena | 170 | 4.982 | 3.483 |

The corrections strengthen secondary booking text and service action labels,
apply each recipe's primary/on-primary pair to action backgrounds, correct the
branded footer link, and use Selam's own muted-text token for its hero note.

## Links and keyboard

The audit left 97 link-in-text findings where overlapping layout prevented its
automatic comparison. The affected links are standalone navigation, article or
collection cards, booking actions, return links, and typed video links.
They have control, card, heading, or navigation context rather than an inline
sentence relying only on color.

A temporary, labelled paragraph tested an inline booking link in each template's
actual article stylesheet. All ten retained probes show an underline and visible
focus. The probe changed no stored draft or release. Desktop and mobile probe
images were visually reviewed. The mobile link wraps with its underline intact.

Actual Tab traversal checked up to five visible controls on every surface.
The reports retain each focused control's tag, accessible name, outline, color,
and shadow. The checks wait for the existing scheduler ring transition.
The retained collection captures also show an actual focused navigation control.

## Review boundary

The color calculation does not model sibling geometry or arbitrary photographs.
Template captures provide the separate review of image captions, card badges,
clamped descriptions, and mobile layout. Source comparison is retained in
`../content-design-review/comparison.html` after the strict template export.
Screen-reader certification and remote performance testing are outside this
recorded browser gate.

## Final template follow-up

Strict matrix `BQA-2026-00164`, source `4918e47`, passed twenty combinations and
280 captures with zero differences from the reviewed production baseline.
The only subsequent visual correction after this accessibility audit separated
Selam's team heading and introduction. Four rendered-text bounds checks passed
at desktop/mobile and light/dark. No color token changed in that correction.
Native scheduler and content review checked badges, clamped descriptions, image
captions, consent copy, and mobile wrapping. The retained source comparison now
resolves all approved-board and final-browser links.

Final compiled matrix `BQA-2026-00173` at QA revision `a810c2b` passed the
complete 280-capture strict comparison after the CSRF-header correction. The
application introduced no further visual or color change. Scheduler capture
requires two identical native frames; its reviewed edge-antialiasing baseline
updates and failed comparisons remain in the operations record.
