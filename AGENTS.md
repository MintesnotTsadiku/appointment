# Appointment Repository Guidance

Read [CONTEXT.md](CONTEXT.md) before changing the scheduling or public-experience domains.

## Public experience rules

- Treat one business as one public site. A solo provider may be the business.
- Build against the new Public Site, Experience Release, and compiled-design contracts. Do not add synchronization or migration logic for the retired branding setup.
- Keep the public landing page, `/book` handoff, and `/schedule/org/:orgSlug` scheduler visually continuous. The scheduler keeps one stable interaction model, while each certified template owns its landing and booking presentation.
- Treat each certified public design as an independent versioned template package that owns its JSX, CSS, responsive composition, visual components, and booking handoff. Do not import visual layout components from another template; share only headless content, security, publishing, and booking contracts.
- Offer curated recipes with a small set of guarded adjustments. Do not accept arbitrary CSS, raw HTML, executable templates, or unapproved remote assets.
- Keep shipped showcase assets local, versioned, checksummed, and recorded in `appointment/public_experience/manifest/showcase/catalog.v1.json`.
- Keep design sources in `docs/design-references/public-experience/`. Compare browser output with these sources; do not treat generated images as page assets or editable copy.
- Seed showcase records only through the explicit, idempotent production seeder. Never auto-seed demo businesses during installation or migration, and never adopt or delete records the seeder does not own.
- Preserve tenant isolation, capability checks, published-release immutability, safe URL handling, accessible contrast and focus, reduced motion, and fail-safe defaults.

## Acceptance rules

- Verify public changes in a real browser at desktop and mobile sizes.
- Capture the landing page, `/book`, and scheduler for every seeded business.
- Store final evidence under `qa/evidence/`; include source-versus-browser comparisons for design work.
- Run focused frontend and Frappe tests before broad suites. Report unrelated existing failures separately.
- Do not claim visual completion from code inspection alone.

## Worktree runtime

For an isolated Frappe worktree, follow the `run-frappe-worktree-stack` skill. Keep bench state outside the repository, use dynamic ports, and record commands rather than credentials in repository files.
