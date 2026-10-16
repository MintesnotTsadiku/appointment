# Enkua Image Studio — Enkua Experimental

Approved reference: [02-enkua-experimental.png](../design-references/public-experience/enkua/02-enkua-experimental.png).

Package `enkua-v3`, recipe `enkua-photography@3`, showcase `/enkua-studio`.
Dawit Girma is the independent photographer. Liya Tadesse is the authored studio producer, not a second bookable provider.

## Reference rebuild — 2026-10-16

The first implementation changed the reference composition too much. This revision restores its white layered hero, yellow circles, blue category ribbon, five-frame portfolio, compact service rows, photographer introduction, studio photographs, yellow booking strip and oversized footer.

The reference is 724 × 2172. The rebuilt English desktop capture is 1440 × 4358. At equal widths, its height is within 1% of the reference. This is a composition comparison, not a claim that generated photographs or font rendering match every pixel.

English headings use Anton with deliberate line breaks and section-specific width adjustments. Karla supplies body copy. Caveat Brush supplies handwritten annotations. The local Caveat Brush subset has an OFL license beside it. Amharic uses the existing Ethiopic font assets, stronger heading weight and separate responsive proportions. Mono labels fall back to the compiled body family for Ethiopic glyphs.

## Necessary adaptations

- The header retains language, theme, time-of-day and owner-enabled holiday controls.
- The hero and booking strip show live availability when enabled by the owner.
- Three main service rows retain the reference hierarchy. The existing planning call remains a secondary link and a selector option.
- A shadcn service selector hands the chosen service to the shared scheduler. Date, time and location selection happen there. The landing page does not promise a reservation.
- Opening hours, Habesha time and location details expand beneath the studio photographs. FAQs expand in the closing editorial strip.
- Clients face away in photographs. Staff portraits can face the camera.
- Studio statements occupy the reference's testimonial area. No fabricated customer endorsements are published.
- The phone composition retains the layered portraits, numbered mosaic and compact rows. It does not shrink desktop text to unreadable sizes.

## Package and expression

The package owns its JSX, styles, responsive composition, content pages, booking handoff, booking skin, loading state and success acknowledgement. It imports no other template's visual components. The shared scheduler interaction remains unchanged.

`imagery: mixed` combines ten distinct photographs with poster typography, a numbered grid, geometric arrows, circles and handwritten annotations. Each section has a specific composition.

`motion: calm` uses hover, press, focus and disclosure feedback. Reduced motion disables transitions. Static lettering and annotations retain their positions.

`darkMode: tonal` uses an ink canvas, pale-blue actions, muted yellow surfaces and the same photographs. The transparent portrait blends into both canvases. No night photographs are declared.

`holiday: greeting` and `greeting: header` keep short translated lines in the compact header. Holiday content follows the owner setting.

`success: static` retains the camera-aperture confirmation mark. The booking flow keeps Enkua's square framing, photographs and palette.

## Images and reproducibility

Ten individual photographs were generated with the Codex CLI, model `gpt-6.1-sol`, using its built-in image tool. The approved board supplied composition guidance only. It is never used as a page background or a rasterized website.

The prompt set is [asset-prompts-r2.txt](../design-references/public-experience/enkua/asset-prompts-r2.txt). Source files remain under `~/template-new/enkua-rebuild/raw/`. The founder portrait supplied the identity reference for the working photograph. The hero retains alpha transparency.

New `*-r2.webp` and AVIF files live in `appointment/public/brand-experience/support/enkua-v3/`, with proportional phone variants. Existing asset files remain available for older published content. The imagery manifest, showcase catalog and `provenance-r2.json` record checksums. The catalog also records the handwritten font checksum.

Only Enkua's showcase revision changes, from 6 to 7. The scoped `enkua_showcase.refine_sections` function restores the revised bilingual copy through the idempotent seeder. It preserves existing provider, location and service IDs. The other six definitions and catalog entries remain unchanged.

## Verification

| Check | Result |
| --- | --- |
| English/Amharic, 1440/390, light | BQA-2026-00735 — passed |
| English/Amharic, 1440/390, dark | BQA-2026-00736 — passed |
| Holiday, loading and state coverage | BQA-2026-00734 — passed |
| Booking through confirmation; Amharic dark handoff | BQA-2026-00732 — passed |
| Service selector, hours, image loads, horizontal overflow | Both languages and sizes passed; no booking submitted |
| TypeScript | 123 existing errors, unchanged baseline; none in Enkua |
| DOM suite and production build | Passed |
| Focused Frappe tests | 2 Enkua refresh tests and 5 collection tests passed |
| Legacy showcase catalog suite | 3 passed; 1 existing assertion still expects six sites instead of thirteen |

The booking fixture removed its one created appointment. Screenshot evidence stays in Agent Plane. The persistent side-by-side review is `~/template-new/enkua-review/rebuilt-comparison.html`. Only Enkua's product gallery previews are refreshed.

Phone measurements use the production build, cache disabled, 390 × 844, DPR 2, 9 Mbps down, 3 Mbps up, 170 ms latency and 4× CPU throttling. Three cold browser loads per language:

| Language | Median LCP | Range | Maximum CLS |
| --- | --- | --- | --- |
| English | 2196 ms | 1528–2620 ms | 0.0001 |
| Amharic | 2296 ms | 2068–2492 ms | 0.0068 |

Both medians meet the established 2500 ms phone budget. One English load exceeded it. Functional passes do not replace the user's visual approval. This revision awaits that approval before pushing.

The legacy catalog failure occurs after asset validation succeeds. Its unchanged test asserts the original six-site set. The same thirteen-site catalog keys exist in HEAD, so this failure predates the Enkua rebuild. The test was not changed in this scope. A repeat seed left all record counts unchanged.

## Experience refinement — 2026-10-16

The approved composition stays intact. The portfolio alone uses the kit's `useReveal` with a 10 px, 320 ms reveal, once per photo. The hero and category ribbon appear immediately. Arrow feedback takes 160 ms; service rows gain an inset line on hover or keyboard focus. Reduced motion removes movement, including button displacement. No new motion library or image asset is loaded.

The loading screen repeats the headline blocks, yellow circle, two portrait frames and blue ribbon. It is a static skeleton, not an introduction with a minimum duration. It has its own light/dark fallback colors because the compiled design is not yet available. The localized status remains accessible.

The booking skin uses numbered marks, square photo frames and controls, the display face for service names and prices, blue selection/actions and the existing yellow time summary. The generic grid and blurred photo backdrop are removed. Shared date, time, contact and booking behavior remain unchanged. Enkua's booking links now set the selected language before entering the scheduler; its translation provider does not read the existing `lang` query parameter.

The success declaration remains `static`: a blue crop frame, check, small yellow circle and the bilingual “You’re in the frame.” line. The shared confirmation still owns booking status, reference, time and management links. These choices continue the reference's photographic and typographic language without introducing a camera flash or celebration effect.

Verification: TypeScript remains at 123 errors. Reduced-motion visibility, overflow and loading colors pass in both languages, themes and viewport sizes. Service selection and language handoff pass at 390 and 1440 px. Final booking confirmation passes in English/light on phone and Amharic/dark on desktop (Agent Plane BQA-2026-00743). The earlier repeated booking run BQA-2026-00740 exceeded the guest contact rate limit; the normal fixture reset and subsequent run passed, with protection unchanged. Fixture cleanup removes only the records owned by the fixture.

Review artifact: `~/template-new/enkua-review/experience-review.html`, beside the previous scheduler. Landing/reference comparison remains in `rebuilt-comparison.html`. No evidence screenshots are committed. No other template was changed, and this revision is not pushed.

Final refinement gates: DOM suite and production build passed after the language handoff change. The 16-screen loading/booking matrix passed as BQA-2026-00744 (English/Amharic, light/dark, 390/1440). Both created appointments were cleaned up. The prior phone LCP measurements above were not rerun for this interaction-only refinement.

The user approved the final screenshot review and authorized committing and pushing Enkua to develop. Main and the other templates remain unchanged. The next template follows TEMPLATE_REFINEMENT_STANDARD.md.
