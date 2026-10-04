# Template palette and font choices

Status: Implemented and validated. User selected B with richer palette/font cards. Existing work checkpoint: `89bb48f`.

## Scope

Let website owners keep their selected template while choosing an approved color palette and font pairing. Keep existing content editing in Website setup and Website content; make these destinations clear in the chosen UI.

## Implementation

1. Define compatible palette and font-pairing options for each of the five templates. Preserve template defaults, Latin/Ethiopic coverage and readable contrast. Do not offer arbitrary system fonts or raw CSS.
2. Add validated palette and typography identifiers to the backend brand configuration. Compile approved selections, preserve existing sites when identifiers are absent, and retain owner permissions and version checks.
3. Implement the chosen UI in Website setup → Brand: selectable palette previews, font samples, template-default reset and links to content editors. Support keyboard access, mobile layouts and light/dark settings screens.
4. Connect choices to the existing draft, preview and publish workflow. Preview must reflect saved choices; published pages change only through publication. Verify landing, booking and content surfaces retain each template's visual identity.
5. Test defaults, compatibility rejection, persistence, permissions and publication behavior. Validate all five templates in the managed browser and save screenshots under qa/evidence/template-appearance/.

## Acceptance

Owners can select compatible palettes and font pairings without switching templates. Defaults and existing content remain intact. Preview and published output use the declared selections, with readable contrast and supported language glyphs.

## Decisions for UI iteration

Choose the placement, palette-card pattern, font-pairing presentation, preview behavior and default-reset interaction. Exploration produces a selected mockup and interaction notes; implementation follows in a separate session.

## Boundaries

No workspace theme editor, new page builder, arbitrary font uploads, or redesign of the existing content backend. Reuse the isolated runtime. On 2026-09-27, the user authorized final validation, completion, commit, merge and push to develop. Deployment is outside this request.

## Selected interactions

Preview-led desktop layout; mobile controls plus full-screen saved preview. Palette and heading/body cards use custom radio controls, with keyboard and focus support. Save & preview persists the draft before refreshing; unsaved choices and saved preview are distinct. Reset palette & fonts only changes local choices, supports Undo and preserves content/identity images. Public output changes only on publish. Do not use native select, dropdown or time controls in the new interface.

## Progress

Checkpoint committed and clean before implementation. Versioned appearance manifests, compiler selections and frontend controls are implemented. All 30 backend combinations pass.

The backend now provides three palette choices and two font pairings per template (30 validated combinations). Defaults retain the existing compiled hash. New appearance uses custom radio cards and a custom keyboard-operated combobox, with a saved-preview pane and mobile focus-trapped preview. Reset/Undo preserves content and identity images. Renderer font overrides are template-local and only activate for alternate choices.
Initial browser setup failed because the fixture snapshot contained datetime values; serialization was corrected. The first interaction run reached draft saving and public-output immutability, then caught a dropdown label/selection issue; the custom listbox labeling and event handling were corrected. The five-template matrix is being rerun. Publication/permission regression and final visual comparisons remain outstanding.

Five-template browser run `BQA-2026-00234` passed desktop/mobile and light/dark modes, persistence, reset/Undo, permissions and draft immutability. Evidence and selected-reference comparison are under `qa/evidence/template-appearance/`. Initial recommendation preview and explicit viewport retention regressions were corrected. The broader publication journey and existing public surface checks are in progress.

Full website setup run `BQA-2026-00251` passed publication with nondefault appearance, guest booking, saved article/history, newsletter and workbook import. Read-only public template matrix `BQA-2026-00255` is running.

Public template matrix completed: 19/20 passed. The Meron mobile scheduler screenshot-stability failure passed focused rerun `BQA-2026-00256`. Final appearance evidence refresh `BQA-2026-00257` is running. No schema migration, runtime configuration change, push, merge or deployment.

Final appearance run `BQA-2026-00257` passed and completed exact cleanup with no baseline changes. It includes explicit viewport retention, custom controls, permissions, persistence and desktop/mobile light/dark evidence. Implementation acceptance is complete. Project TypeScript errors remain outside the changed appearance modules.

## Preview correction

User reported oversized logos and overlapping identity text in preview. Preview imported template packages without the public platform stylesheet. Load the same stylesheet used by public pages. Keep one renderer for preview and published output. Add desktop fullscreen viewing around the existing iframe. Tighten settings header, tabs, status and actions. Browser run `BQA-2026-00258` passed all five templates, logo sizing, fullscreen Escape and existing appearance interactions. Final run `BQA-2026-00259` passed with completed cleanup. Evidence is in `qa/evidence/template-appearance/preview-correction/`. Focused ESLint, DOM checks and final Vite build pass.

## Direct entry and live appearance preview

Open the selected business website at Brand when entering settings. Keep explicit business/website selection for owners managing several businesses. Show setup only for businesses without a website. Compile approved unsaved appearance choices through the existing permission/version-scoped preview API without database writes. Show an unsaved preview label. Palette alternatives now change primary, accent and link colors in addition to canvas tones. The original palette remains unchanged. Browser acceptance must verify visible rendered color changes before saving and unchanged draft/public data. Validation is in progress.

Browser run `BQA-2026-00260` passed direct entry and visible pre-save palette changes for all five demo businesses. It verified unchanged saved inputs and draft versions. Full website journey `BQA-2026-00261` passed publication, guest booking, article history, newsletter and switching to a business without a website. Final appearance run `BQA-2026-00265` adds actual CTA color checks, unsaved screenshots and invalid/cross-business preview rejection. No preview endpoint writes brand or site documents.

Final live-preview run `BQA-2026-00267` passed all five businesses and completed exact cleanup. It checks actual CTA color changes before saving, direct entry without Resume, unchanged draft fields/versions, invalid choices, unsupported preview inputs and cross-business denial. Earlier failures were iframe remount timing and an incorrect Abugida test selector. The frame now stays mounted during appearance changes. Final evidence: `qa/evidence/template-appearance/live-preview/`. Focused ESLint, DOM checks, Vite build and 30 compiler combinations pass. Direct-entry/live-preview acceptance is complete.

## Final integration review

Reviewed real browser screenshots after the Codex defaults were implemented. Fixed Meron hero copy being covered by the inset detail photograph, constrained the hero grid tracks, and removed a duplicate Journal label. Added a browser assertion that the copy and detail photograph do not overlap. Capture settings now return to the top before full-page images and use viewport captures for mobile dialogs, so sticky preview positions and background document content do not distort the review images. Tena’s hero and booking-handoff primary actions now use the template palette, matching the navigation button. Browser assertions verify visible primary backgrounds. Public matrix BQA-2026-00300 passed all 20 behavior scenarios with no failures or flakes and unchanged publication inventory. Its 12 screenshot changes match the Meron landing and Tena landing/booking fixes; strict visual status remains baseline_drift. Final five-template appearance run BQA-2026-00305 passed all behavior checks and exact cleanup. The owner workflow BQA-2026-00301 passed publication, guest booking, article history, newsletter and staff isolation; cleanup left no fixture records. Screenshot review found preview control styles were only imported by Website setup, so the shared WebsitePreview now owns its stylesheet. Final owner workflow BQA-2026-00306 passed after the shared stylesheet correction, with complete cleanup and no remaining temporary records. Reviewed browser captures, behavior results and baseline differences are in qa/evidence/template-appearance/final-review/. All requested website source changes are ready for integration into develop. Current TypeScript checking reports 249 existing errors outside the changed modules.
