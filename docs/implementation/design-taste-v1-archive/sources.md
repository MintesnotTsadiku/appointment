# Sources: what was kept and what was rejected

On 2026-09-30 we reviewed the skills compared on [whichai.dev](https://www.whichai.dev/). That site runs one design prompt through many models, with and without each skill. The skills disagree with each other in places, so this file records each decision.

| Source | Link | Best at |
|---|---|---|
| Anthropic frontend-design | [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | Process and restraint: ground in the subject, plan tokens, review the plan against defaults, spend boldness in one place, write plain copy. |
| Taste Skill v2 | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill), [tasteskill.dev](https://tasteskill.dev/) | Mechanical rules for landing pages: hero discipline, eyebrow ration, layout-family variety, CTA intent, pre-flight list. |
| Taste Skill redesign | same repo, `skills/redesign-skill` | Audit-first order for existing projects: scan, diagnose, fix without rewriting. |
| Uncodixfy | [cyxzdev/Uncodixfy](https://github.com/cyxzdev/Uncodixfy) | "Keep it normal" for internal tools: sidebars, headers, tables, and forms like Linear or GitHub. |

## Kept

- From Anthropic: the design read, subject grounding, the token plan and its review pass, the list of generated-page traits, "remove one accessory", and the copy guidance. This is the backbone of `SKILL.md`.
- From Taste Skill: hero limits (fits the viewport, at most four text elements, subtext at most 20 words), the eyebrow ration (one per three sections), at least four layout families, one label per intent, one accent, one radius system, one theme per page, the copy self-audit, and a pre-flight list that is run, not read.
- From the redesign skill: the audit-first order. Our templates exist, so we diagnose before we rebuild.
- From Uncodixfy: the "keep it normal" table for the staff app, and its bans on dashboard heroes, decorative dots, and slogan headers.

## Rejected, and why

- **Uncodixfy palette tables.** Canned palettes produce the sameness we want to avoid. Palettes come from the recipe manifests.
- **Uncodixfy "no serif, no Inter" as absolute rules.** The staff app keeps Inter for consistency. Public templates may use a serif when the subject justifies it.
- **Taste Skill default dials (8/6/4) and GSAP scroll set pieces.** Our recipes expose `motion: calm | standard`. Heavy scroll choreography conflicts with the `calm` promise and with reduced motion.
- **Picsum or Unsplash images, Simple Icons logo walls, remote fonts.** The public CSP is `default-src 'self'`, and assets must be checksummed in the showcase catalog.
- **Redesign-skill surface tricks: grain overlays, glassmorphism, spotlight borders, custom cursors.** These are decoration, which the Anthropic skill tells us to cut.
- **Taste Skill "no em dash anywhere" as a global writing rule.** We apply it to interface chrome and template copy. It does not govern tenant-authored content, which we render as written.
- **Lucide as a tell.** Lucide is already the staff app's icon set. Swapping icon libraries adds weight for no user benefit.

## Additions of our own

These rules are not in any source. They come from what this product is.

- A template renders a real business, so it must not invent copy, alt text, prices, times, places, or claims.
- Amharic and Ethiopic script are first class. No uppercase or tracking on text that may be Amharic, and every face needs Ethiopic coverage.
- Fonts must be bundled with a license because of the CSP.
- Recipe descriptions are user-facing copy in the design gallery.
