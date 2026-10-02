---
name: design-taste
description: Design and taste rules for Appointment UI work. Use before designing, reviewing, or changing a public template package, a curated recipe, the booking handoff, or any signed-in staff page. Covers design reads, token plans, AI-default tells, copy, and a pre-flight check with a mechanical lint.
---

# Design taste for Appointment

This skill turns "make it look good" into a procedure. It merges the parts of four public design skills that fit this product and drops the parts that do not. `references/sources.md` records what was kept, what was rejected, and why.

## Pick the surface first

The product has two surfaces with opposite goals. Decide which one the task touches before anything else.

| Surface | Code | Goal | Rules |
|---|---|---|---|
| Public site | `frontend/src/public-experience/templates/*`, recipe manifests in `appointment/public_experience/manifest/design/` | A distinct brand for one business. Every template looks like nobody else's. | `references/public-templates.md` |
| Staff app | Everything behind sign-in (`data-surface="staff"`) | A calm tool. It looks like Linear, Stripe, or GitHub. It never performs. | `references/staff-app.md` |

Copy rules apply to both: `references/copy.md`. The catalog of AI-default patterns applies to both: `references/tells.md`.

## Procedure

Do these in order. Color and decoration come last.

1. **Write a design read.** One line: "Reading this as: <page kind> for <audience>, with a <vibe> language, leaning toward <aesthetic family>." For a public template, name the business type, the customer, and the one job of the page (usually "book a first visit").
2. **Ground it in the subject.** List three things from the business's own world: materials, places, rituals, vocabulary. Distinct choices come from there, not from a generic "premium" look. A tailor's atelier and a clinic must not share a layout family.
3. **Plan tokens before code.** Write a compact plan:
   - Color: 4 to 6 named hex values, light and dark.
   - Type: the families and their roles. Check that the family covers Ethiopic, or name the Ethiopic partner face.
   - Layout: one sentence per section plus an ASCII wireframe of the hero.
   - The one bold thing: the single element that makes the page memorable.
4. **Review the plan against the defaults.** Read `references/tells.md`. If any part of the plan matches a listed default, and the brief does not ask for it, change it. Write down what you changed and why.
5. **Build.** Follow the surface's rule file. Keep changes inside the surface's existing structure (template package boundaries, shadcn primitives, staff tokens).
6. **Render and look.** Capture the page through the Agent Plane runner (see the repository `AGENTS.md`). Check desktop 1440px, phone 390px, light and dark, `en` and `am`. A picture shows collisions, overflow and weak hierarchy that code review misses.
7. **Run the pre-flight.** Run `node .claude/skills/design-taste/scripts/taste-lint.mjs` and fix every error. Then walk the pre-flight list in the surface's rule file. If one box cannot be ticked honestly, the work is not done.
8. **Remove one accessory.** Before you finish, find the one decoration that does the least work and delete it.

## Principles that hold everywhere

- **Spend boldness in one place.** One memorable element per page. Everything around it stays quiet.
- **Structure is information.** Borders, numbers, labels, and dividers must encode something true about the content. Numbered markers (01, 02) only mark a real sequence.
- **The business owns the words.** Visible text on a public site comes from the tenant's content or from translated platform strings. A template never ships invented facts about a real business.
- **Both languages are first class.** Amharic text is longer and uses Ethiopic script. Every layout must hold `am` content without clipping, overflow, or a fallback font that breaks the design.
- **Quality floor, never announced.** Responsive to 360px, visible keyboard focus, reduced motion respected, WCAG AA contrast in both themes, no horizontal scroll.
- **Motion answers people.** Motion that shows what changed after an action is welcome. Ambient motion is limited to one orchestrated moment per page.

## Keep a design log

Distinct templates need memory. After a design pass, add a short entry to `references/design-log.md`: the template, the palette family, the type pairing, the layout families, and the one bold thing. Read the log before starting a new template so the next one does not repeat the last one.
