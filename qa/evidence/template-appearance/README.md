# Template appearance browser evidence

Checkpoint before implementation: `89bb48f`.

Selected target: `docs/design-references/template-appearance/selected-preview-workspace.png` (Option B).
Open `comparison.html` to compare the selected exploration with real desktop output.

Run `BQA-2026-00234` passed the five-template matrix and completed cleanup.
The 30 screenshots cover desktop, mobile controls and mobile saved preview in light and dark admin modes.
The test checks custom keyboard palette selection, font selection, reset/Undo, save, reload persistence and preserved content.
It checks that draft changes do not change public output, invalid palettes fail atomically and cross-business saves fail.
It checks alternate fonts in the real template iframe and mobile Escape/focus restoration.

The implementation follows the two-column hierarchy and large preview from Option B.
It keeps configured application colors and each template's own visual identity.
Palette variants now provide reviewed primary/accent/link alternatives and canvas tones. The original palette remains unchanged.
The saved preview uses the actual renderer in a scaled viewport. It is not a raster asset.
Mobile uses a separate preview dialog. Admin dark mode does not recolor website samples.

Compiler tests pass all 30 combinations, preserve default hashes and reject unknown choices.
Focused ESLint, 12 frontend DOM checks and Vite build pass.
The project TypeScript build reports 273 errors outside the changed appearance modules. Existing failures include account/task typing and Vite manifest options.
Run `BQA-2026-00251` passed the complete normal-owner website journey and completed cleanup. It covers nondefault appearance publication, identity uploads, guest booking, article preview/history, newsletter consent/suppression and workbook import. Guest landing, booking and saved article screenshots are included.

Public template run `BQA-2026-00255` passed 19/20 scenarios. Meron mobile light failed only the identical-frame scheduler screenshot check. Focused rerun `BQA-2026-00256` passed with no baseline changes. Public landing, book and scheduler screenshots cover all five templates and both viewports/modes.

Final appearance run `BQA-2026-00257` passed with no baseline changes and completed cleanup. It also verifies the explicit mobile preview choice persists when changing surfaces. The screenshots in this directory are from this final run.

Preview correction: `BQA-2026-00259` passed all five templates in desktop/mobile and light/dark modes, including logo dimensions and fullscreen open/Escape. Updated captures are in `preview-correction/`. Preview now explicitly imports the existing public platform stylesheet. One template renderer serves preview and published pages. Settings header and actions are compact. Focused ESLint, DOM checks and final Vite build pass.

Live-preview correction: `BQA-2026-00267` passed all five businesses. Entry opens the selected business website at Brand. Palette/font choices compile through the existing scoped preview API without saving. The iframe remains mounted during appearance changes. Tests verify actual CTA background changes before save, unchanged saved settings/version, invalid adjustments and cross-business rejection. Final screenshots, including unsaved palette states, are in `live-preview/`. The full website workflow passed in `BQA-2026-00261`.

Final integration review (2026-09-27): see [final report](final-review/README.md) and [browser gallery](final-review/comparison.html). This review finishes Meron overlap, Tena primary actions and shared article preview styles. BQA-2026-00300, BQA-2026-00305 and BQA-2026-00306 pass behavior and exact cleanup; their visual baseline differences remain recorded.
