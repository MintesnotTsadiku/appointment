# Template palette and font choices

Status: Proposed. Select the UI pattern in a separate session before implementation.

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

No workspace theme editor, new page builder, arbitrary font uploads, or redesign of the existing content backend. Reuse the isolated runtime and preserve existing changes. Do not push, merge or deploy.
