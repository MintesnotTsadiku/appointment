# Buna Bet — Field Atlas

Approved reference: [05-Field-Atlas-Desktop.png](../design-references/public-experience/buna/05-Field-Atlas-Desktop.png).

Package `buna-v3`, recipe `buna-experiences@3`, showcase `/buna-studio`. Selamawit Bekele is the independent provider. This refinement follows the approved [comparison analysis](../design-references/public-experience/buna/REFINEMENT_ANALYSIS.md).

## Reference and adaptations

The page follows the reference's sequence: a narrow navigation rail, illustrated terrain hero with four circular origin photographs, people, bean-to-cup specimens, three compact experience rows, booking panel, studio visit, four visible FAQs, and a compact footer. White paper, fine gray rules, restrained red route marks, compact sans-serif headings, and italic editorial notes replace the earlier large cream panels and arched compositions.

The English desktop is approximately 4,210 px tall at 1440 px wide. The reference scales to approximately 4,137 px at that width. The generated terrain and photography are separate assets; the concept board is never sliced into website content.

The adaptations preserve the business model:

- Selamawit remains the only bookable educator. Dawit Tesfaye is a display-only brewing colleague, with no provider ID or booking action. The staff photograph shows one woman and one man.
- The three paid experiences retain their service IDs, prices, durations, and private appointment capacity. The free online planning call remains a secondary link and a selectable service.
- The booking panel uses a shadcn service selector. Date and time selection continues in the real scheduler. It does not invent a guest counter, seat inventory, or timetable.
- The studio address and opening hours come from the existing Bole location. The reference's unverified street map and coordinates are omitted. A city photograph carries the same visual column; the atlas is explicitly labeled as an illustration.
- On phones, the rail becomes a compact header and menu; the hero text follows the map. People, services, booking controls, hours, and FAQs stack without shrinking desktop text. The hero grows to fit holiday copy.

## Expression and product contract

`imagery: mixed`: the illustrated atlas and photographs establish place and process. A continuous dotted route, specimen layout, typography, spacing, and fine rules connect every section.

`motion: calm`: the headless kit provides restrained section reveals and time-aware behavior. Links and buttons have focus, hover, and press feedback. Reduced motion removes transforms, animation, and transitions. Motion does not interrupt reading or shift the map while a visitor chooses an experience.

`darkMode: tonal`: charcoal paper, pale ink, coral actions, and a continuous shaded hero retain the atlas composition. The photographs remain daytime photographs. White specimen panels deliberately resemble cards on a dark field desk. No night-photo variant is declared.

`greeting: hero`: the large greeting changes with local time and uses the current language. `holiday: greeting`: a translated line appears in the hero only when the owner enables holiday greetings. Both use the shared kit.

`success: static`: a cup with a check mark accompanies the scheduler's localized booking confirmation. The loading state uses a quiet dotted route and two stops. Neither needs a celebration animation.

The booking skin owns its sans-serif font aliases, square photographs, fine dotted rules, flat cards, restrained actions, and confirmation mark. Booking logic remains shared. Availability follows the owner setting. Actual location hours support international and Habesha time. English and Amharic copy comes from the starter manifest, showcase definition, and translation catalogs.

## Package and assets

The package owns the landing page, content pages, booking handoff, booking skin, loading state, and confirmation mark. It imports no other template's visual components. It shares headless contracts, behavior, and licensed font files.

Thirteen individual assets were generated through Codex CLI with `gpt-6.1-sol`. [Asset prompts](../design-references/public-experience/buna/asset-prompts-r2.txt) record the brief. AVIF quality 58 and WebP quality 83 variants include smaller phone files. The terrain and staff photograph are up to 1600 px wide; small specimens and origin views use smaller files. Images and checksums are recorded in the imagery manifest, showcase catalog, and `support/buna-v3/provenance-r2.json`.

Showcase revision 8 is applied through the idempotent, ownership-checked `appointment.demo.showcase_refinement.refresh` entry point with `key="buna"`. Other showcase records are not refreshed. Product gallery previews use the standard capture script. Browser evidence stays in Agent Plane, outside Git.

## Authored services

| Service | Minutes | ETB | Format |
| --- | ---: | ---: | --- |
| Guided coffee tasting | 90 | 1200 | In person, one person |
| Private brewing lesson | 90 | 3000 | In person |
| Introduction to barista skills | 180 | 4500 | In person |
| Planning call | 20 | 0 | Video |

## Verification

Verified on 2026-10-17. Final Agent Plane captures cover English and Amharic at 1440 px and 390 px, light and dark, reduced motion, holiday greetings, loading, mobile navigation, service selection, Habesha hours, and booking through confirmation.

| Run | ID | Result |
| --- | --- | --- |
| Light | BQA-2026-00784 | Passed |
| Dark and reduced motion | BQA-2026-00786 | Passed |
| Holidays, loading, mobile controls | BQA-2026-00787 | Passed |
| Booking journey | BQA-2026-00783 | Passed |

All final runs have zero console errors. Visual runs record canceled responsive-image requests (`net::ERR_ABORTED`); the final captures show the images loaded. The booking journey has zero network errors. The named fixture created and cleaned up one appointment.

The production build was measured with cache disabled, 390×844 viewport, DPR 2, 9 Mbps down, 3 Mbps up, 170 ms latency, and 4× CPU throttling. No build or browser QA job ran concurrently. The budget is a three-load median LCP of at most 2500 ms.

| Language | Median LCP | Range | Worst CLS |
| --- | ---: | --- | ---: |
| English | 2036 ms | 2004–3276 ms | 0.0004 |
| Amharic | 2192 ms | 2128–2384 ms | 0.0429 |

The first English request had a 1282 ms server response time and exceeded 2500 ms; the three-load median passes. The full sample is retained in the local performance log.

Frontend gates: TypeScript has 123 errors, unchanged from the starting baseline, with none in Buna. The DOM suite and production build pass. Eight focused Frappe tests pass across `test_buna_reference`, `test_new_template_collection`, and `test_enkua_reference`; they cover preserved booking IDs, display-only staff, closed content schemas, checksums, AA palette pairs, and showcase revisions. `git diff --check` passes. The full app suite was not rerun; its known `test_data_preservation` failure is outside this change.

The comparison viewer at `http://localhost:47914/comparison.html?review=buna-rebuilt` shows the approved reference or previous implementation beside the rebuild. It also links to booking and state captures. Evidence paths and scripts remain under `~/template-new/buna-review/`. No review screenshots are committed. Main and the other templates remain outside this change; the user approved this rebuild for develop on 2026-10-17.

The shared independent scheduler still displays the stored English service name on its Amharic page. This existing shared-flow limitation is outside the Buna visual refinement; the landing page and booking handoff use localized service names.
