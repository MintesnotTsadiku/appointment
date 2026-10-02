> **Note (2026-10-02):** the `design-taste` skill and its `taste-lint.mjs` checker were retired from this repository because they made designs converge. References below are historical. The procedure now lives as an opt-in prompt outside the repo, and its design log is in `docs/implementation/design-log.md`.

You are working on the Appointment Frappe app. Level up the five certified public templates and the staff app by carrying out the five-step plan in `docs/features/PUBLIC_TEMPLATE_TASTE_AUDIT.md`, in the order given. Finish every step. Stop only when blocked on a decision that belongs to me.

## Environment

- Worktree: `/home/minte/projects/training-apps/.worktrees/frappe-appointment-analytics-operations` (branch `feat/analytics-operations`). Work only here.
- App: `http://127.0.0.84:44430`. Site: `meet-beta-feat-analytics-operations-f2ca8e.localhost`.
- Bench: `/home/minte/.local/state/frappe-worktree-stack/feat-analytics-operations-f2ca8e/bench`.
- Node: prefix commands with `export PATH=$HOME/.nvm/versions/node/v22.22.2/bin:$PATH`.
- The dev server does not reload Python. After a Python change, restart with `frappe-worktree stop`, then `frappe-worktree up --no-seed`.
- Translations: add every string to `en.json` and `am.json` with no case-only duplicates. Sync with `bench --site <site> execute appointment.patches.v0_1.import_landing_world_translations.execute`.

## Read first

1. `AGENTS.md` and `CONTEXT.md`.
2. `.claude/skills/design-taste/SKILL.md` and every file in its `references/` folder. This skill is the design standard for all of this work. Follow its procedure: design read, subject grounding, token plan, review against `tells.md`, build, render, pre-flight.
3. `docs/features/PUBLIC_TEMPLATE_TASTE_AUDIT.md`. This is the plan.
4. `docs/implementation/independent-public-template-packages.md`.

## The five steps

### Step 1: content ownership (all five templates)

Remove every invented fact from the templates in `frontend/src/public-experience/templates/`.

- Move business-specific copy (taglines, section labels, captions, claims, quotes, places, times, prices) into release content, so the owner can edit it. Extend the section schemas in a backward-compatible way. Published releases are immutable, so templates must hide or gracefully omit anything a release does not contain.
- Move template chrome (nav labels, "Back to site", mode toggle) to translated platform strings.
- Replace hard-coded `alt` text with the asset's catalog alt, content alt, or `alt=""` for decoration.
- Remove Bloom's fake booking form, or wire it to the real booking contract.
- Update the showcase seeder content (`appointment/demo/showcase.py`) so the demo businesses keep equivalent copy through content. Do not run the seeder yourself. Ask me first, and tell me exactly what it will change.
- Done when `taste-lint` reports zero `literal-copy`, `literal-alt`, and `fake-control` errors, and the Amharic pages show no English chrome.

### Step 2: Tena pilot, full redesign

Take `tena-clinic` through the whole skill procedure. Write the design read, the subject grounding, and the token plan into the design log before writing code.

- Give it its own licensed, bundled font pairing with Ethiopic coverage. The public CSP blocks remote fonts, so place the files under `appointment/public/`, record the license, and subset if large.
- Choose a palette family that is not cream with clay or terracotta.
- Rebuild the landing page and booking handoff to the layout rules: hero fits the viewport, at least four layout families, one label per intent, the eyebrow limit, no floating captions, no forced line breaks.
- New typography and palette primitives are new manifest versions. Never edit a published version in place.
- Show me the pilot before step 3. Send the desktop and phone captures in light and dark, then continue unless I object.

### Step 3: the other four templates

Redo `selam-movement`, `bloom-hair`, `meron-atelier`, and `abugida-language` one at a time, the same way as Tena. Read `design-log.md` before each one. No two templates may share a display face, a palette family, or a hero composition. Log each one when done.

### Step 4: recipe v2 manifests

Publish new recipe versions for all five, pointing to the new primitives. Write real `description` and `audience` text: what the design is for and how it looks, in plain words, because owners read it in the design gallery. Make sure existing published sites keep rendering on their pinned versions, and that the gallery and editor offer the new versions.

### Step 5: staff app pre-flight

Run the `references/staff-app.md` pre-flight on these priority pages: home, calendar, reception, analytics, settings, and team. Fix what fails. Do not change routes, permissions, API contracts, or `data-qa` attributes.

## Verification (every step)

- Run `node .claude/skills/design-taste/scripts/taste-lint.mjs`. Errors block the step.
- Run focused tests (frontend `tsc` and eslint on changed files, relevant Frappe tests) before broad suites.
- Verify in a real browser only through the Agent Plane runner: `bench --site <site> execute appointment.qa_runner.run --kwargs '{"manifest_name": "...", "base_url": "http://127.0.0.84:44430", "fixture_scope": "rich_demo"}'`. Never invoke Playwright directly. The `legacy` fixture scope fails with QueueOverloaded, so use `rich_demo`.
- For every template: landing page, `/book`, and scheduler, at 1440px and 390px, light and dark, `en` and `am`, with zero console and network errors and no horizontal scroll. Add or update manifests under `qa/manifests/` and store evidence under `qa/evidence/taste-v1/`.
- Compare the browser output with the design reference boards in `docs/design-references/public-experience/`, and write down the deliberate differences.
- `qa/manifests/rich-demo/public-dark.yaml` already fails because it waits for `booking-service`, which no template renders. Update it to the new structure instead of treating it as a regression.

## Constraints

- Never read or print credentials. They are in the stack's `credentials.json`. Do not open that file.
- Do not reseed, migrate, or touch other sites without asking me.
- No direct SQL. Do not bypass permissions.
- Do not commit or push.
- Keep template packages independent: no visual imports between templates.
- No new heavy dependencies.

## Final report

Write a "Taste v1" section into `docs/features/PUBLIC_TEMPLATE_TASTE_AUDIT.md`. For each step, list what changed, the lint results, the runner run IDs, the evidence paths, and anything left undone and why. Then give me a short summary with the URLs and logins to review, using persona usernames only.
