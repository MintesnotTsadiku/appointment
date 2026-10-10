---
tags: [plan, appointment, frontend, security, tailwind]
created: 2026-10-10
status: built and verified 2026-10-10
---

# Tailwind CSS 4 migration

## Decision (2026-10-10)

After the npm audit fix, the user asked for the Tailwind CSS 4 migration. The 8 remaining audit findings (`braces`, `micromatch`, `fast-glob`, `chokidar`, `postcss-selector-parser`, `postcss-nested`, `tailwindcss` and `tailwindcss-animate`) all come from Tailwind 3's build tooling. Tailwind 4 removes them.

## Scope

- **Dependencies:** `tailwindcss` 3 → 4.
  - Use the Vite plugin `@tailwindcss/vite`, or `@tailwindcss/postcss`, whichever fits the current Vite and PostCSS setup with less change.
  - `tailwindcss-animate` → `tw-animate-css`.
  - Drop `autoprefixer` and `postcss-nested` if Tailwind 4 makes them unnecessary.
- **Configuration:** move `tailwind.config.js` into CSS: `@import "tailwindcss"`, `@theme`, `@custom-variant dark`, `@source` for content paths, and `@plugin`/`@utility` where needed. Keep the shadcn design tokens, the staff surface tokens, the dark-mode strategy (class based), and the public template tokens exactly as they are.
- **Class renames in source:** handle the renamed and changed utilities, using the official upgrade tool (`npx @tailwindcss/upgrade`) where it applies:
  - `shadow-sm` → `shadow-xs`, `shadow` → `shadow-sm`;
  - the same shift for `rounded-*` and `blur-*`;
  - `outline-none` → `outline-hidden`;
  - `ring` default width 3px → 1px;
  - default border colour `currentColor`;
  - `bg-opacity-*` and the other opacity utilities;
  - `space-*` selector changes;
  - the `!` important prefix moving to a suffix.
  - Review every change the tool makes.
- **Public templates:** the template CSS under `frontend/src/public-experience/templates/` is mostly hand-written CSS with tokens. Check that it is untouched, or still renders the same.

## Visual check

- **Baseline:** before the migration, an Agent Plane batch took screenshots of the main staff pages (light and dark), the design gallery, dialogs, the public templates (light and dark, English and Amharic) and the booking form. The batch is in `scratchpad/visual_batch.sh`; its window is in `visual-before.start` and `visual-before.end`.
- **After the migration:** run the same batch again, then compare with `scratchpad/visual_diff.py`. Inspect every screenshot that changed by more than 1%. A difference is accepted only when it is a known Tailwind 4 default change that we choose to keep. Otherwise, fix it to match the baseline.

## Done when

- `npm audit` shows no findings from Tailwind.
- `npm ci`, `npm run build`, `npm run -s test:dom` and the typecheck pass, and the typecheck stays at 178 errors.
- The after batch passes, and the screenshot comparison is reviewed.
- The full backend regression passes. The backend is unchanged, but it runs as the release gate.

## Run record

| Part | Result | Details |
|---|---|---|
| Upgrade tool | Run, reviewed | `npx @tailwindcss/upgrade@4.3.3`: 160 source files had class renames. 26 wrong edits were reverted or fixed (see below). |
| Pipeline | `@tailwindcss/postcss` | The tool chose it, and it keeps `postcss.config.js` and `vite.config.ts` as they were. `tailwind.config.js` is deleted; the theme is in `src/global.css`. |
| Animation plugin | Replaced | `tailwindcss-animate` → `tw-animate-css` 1.4.0. |
| `tailwind-merge` | 2.6.0 → 3.7.0 | Needed for v4 class names (for example, v2 drops `bg-linear-to-r` when merged with `bg-white`). The 90 static `cn()` strings give the same result with v2 and v3. |
| `npm audit` | 8 → 0 | Before: 3 moderate, 5 high, all from Tailwind 3 tooling (`braces`, `micromatch`, `fast-glob`, `chokidar`, `postcss-selector-parser`, `postcss-nested`, `tailwindcss`, `tailwindcss-animate`). After `npm ci`: 0 vulnerabilities. |
| Typecheck | 178 | Unchanged. |
| `npm run -s test:dom` | Pass | |
| `npm run build` | Pass | Main CSS 139.02 kB (gzip 23.51 kB) → 175.14 kB (gzip 27.12 kB). All CSS 340.0 kB → 376.1 kB. The other CSS chunks (templates, landing, platform, grid) are byte-identical, except one selector fix in `platform.css`. |
| Smoke check | Pass | BQA-2026-00185 (design gallery) and 00186–00188 (guest booking form). See "Visual check" below. |

### Configuration

- `src/global.css` imports `tailwindcss/theme.css`, the v3 Preflight and `tailwindcss/utilities.css` as separate layers, then `tw-animate-css` and `src/styles/tailwind-v3-compat.css`.
- `@source` uses the same globs as the old `content` (`index.html` and `src/**/*.{ts,tsx,js,jsx}`). There is no safelist, as before.
- The tokens are in `@theme inline`, so that utilities use `hsl(var(--token))` directly, as in v3. A token that a page sets on an inner element still applies to the utilities below it. All CSS variables, the staff surface tokens and the public template tokens are unchanged.
- Dark mode: `@custom-variant dark (&:is(.dark *))`. This is the v3 selector, with the same specificity. `:where(.dark, .dark *)` was not used, because it lowers the specificity of `dark:` utilities, and hand-written CSS would then win over them.
- `autoprefixer` stays. Tailwind 4 prefixes only the CSS that it compiles. The hand-written CSS (templates, landing, platform, react-grid-layout) still needs prefixes such as `-webkit-user-select`. `postcss-nested` was never a direct dependency; it left with Tailwind 3.
- `components.json` has `"config": ""`, as shadcn needs for Tailwind 4.

### v3 defaults kept

- **Preflight:** `src/styles/tailwind-v3-preflight.css` is the v3.4.19 Preflight, with the theme values written in. It keeps the gray-200 default border colour, the gray-400 placeholder, the pointer cursor on buttons, the browser background and radius of form controls, and the per-element margin and padding reset. A computed-style check of 17 element types (button, inputs, select, textarea, table cell, dialog, headings, lists and others) gives identical results with v3 and v4.
- **Colour palette:** the v3 hex values (22 palettes), not the v4 OKLCH values.
- **Ring:** `--default-ring-width: 3px` and `--default-ring-color: rgb(59 130 246 / 0.5)`. The tool also renamed the one bare `ring` to `ring-3`.
- **Line heights:** `text-xs` to `text-4xl` keep the v3 rem line heights.
- **Shadow, radius and blur scales:** the tool renamed `shadow-sm` → `shadow-xs` and `backdrop-blur-sm` → `backdrop-blur-xs`, and so on. It did not rename `rounded-*`, because the project overrides `sm`, `md` and `lg`.
- **`space-*` and `divide-y`:** compatibility utilities restore the v3 selectors (gap on every child after the first, `[hidden]` children skipped), and undo the v4 rule on the first child.
- **Gradients:** `bg-linear-to-*` utilities have `/srgb`, because v4 interpolates in OKLab.
- **`shadow-card`:** in v3 the class also matched the `card` colour, so it drew `0 1px 3px` in the card colour, and the staff `--shadow-card` token never applied. The theme keeps that output.
- **Sonner toasts:** Sonner's styles are not in a cascade layer, so they win over v4 utilities. The toast theme classes now have `!`, which gives the v3 result.

A computed-style comparison of the 1,370 utilities that exist in both builds (base, responsive and `dark:`) found only these remaining differences, which do not change a static screenshot: colours with opacity are written as `oklab()`, translate/scale/rotate use the separate CSS properties, ring and shadow use more `box-shadow` layers, `rounded-full` is `calc(infinity * 1px)`, `sr-only` uses `clip-path`, `transition` lists more properties, and `outline-hidden` replaces the transparent outline.

### Upgrade tool fixes

- 21 `variant="outline"` button values and one `variant !== "outline"` check had become `outline-solid`. They are reverted.
- `'ring'` in the `componentTokens` list of `theme-provider/appearance.ts` had become `'ring-3'`. It is reverted.
- `[&_*_table]` in `calendar-wrapper` had become the wrong `[&*table]`. It is reverted.
- A code comment had `backdrop-blur` changed. It is reverted.
- `bg-black bg-opacity-50` (2 files) was not converted. It is now `bg-black/50`.
- Classes that did nothing in v3 but have a value in v4 were removed, to keep the look: `md:w-4xl` and `md:min-w-sm` (`appointment/components/booking.tsx` and its backup copy), and `border-3` (`VAProfileDetailModal`).
- `platform.css` styled `.booking-experience .backdrop-blur-sm`. After the rename, that selector matched other elements, and the booking form input icons were hidden behind the inputs. The selector is now `.backdrop-blur-xs`.

### Visual check (smoke only)

- Design gallery, desktop and mobile: 0.00% changed pixels against the baseline.
- Guest booking form: the details and home screens match, except the Agent Plane step label and the animated landing sun. The services screens change by 1–4% between two runs of the same build too (card animation), so they need the full batch comparison.
- The full before/after batch was compared; see "Full visual comparison" below.

### Open items

- Run the full visual batch and compare it with the baseline.
- Run the full backend regression as the release gate.
- Decide later whether `shadow-card` should use the staff `--shadow-card` token. That would be a visible design change.
- Cascade layers: hand-written CSS that is not in a layer now wins over all Tailwind utilities. A scan found no element selectors and no plain-CSS class that competes with a variant utility on the same property, so nothing was changed.

### Full visual comparison

The visual batch ran before the migration (BQA-2026-00166 to 00184) and after it (BQA-2026-00189 to 00206). It covers:
- the staff design gallery and dialogs;
- the owner, reception, provider, independent-provider, multi-business and admin pages, in light and dark;
- the staff taste check and the theme audit;
- the guest booking form;
- the Bloom, Tena, Abugida, Selam and Meron public templates, in English and Amharic, light and dark.

Every user's saved theme was reset before each part.

- **Baseline:** some baseline runs captured pages before they had loaded: blank pages or skeletons at viewport height. So `visual_diff.py` uses the newest pre-migration screenshot that rendered fully as the baseline, taken from the same day's earlier runs.
- **Result:** 373 screenshots compared. 350 changed by less than 1%. The 23 others were inspected side by side, with the changed pixels in red, and none is a styling change:
  - **Not loaded:** the baseline still showed a skeleton, a blank page or a shorter loading state (the 9 size differences, staff home, solo services desktop).
  - **Data:** the dashboard numbers and "today's appointments" differ between days (solo home).
  - **Animation:** the public booking cards fade in, and they were captured at different moments (booking form and Bloom scheduler services, 1–4%).
  - **QA tool:** its "Opened page" label is in a different place (services and location on mobile).
- **Page width:** the 1448 px full-page width on the availability and profile settings pages was there before the migration as well. It is not a regression.
- **Statuses:** the taste-v1 template runs fail on older network and blank-page assertions, before and after alike. Their screenshots are compared the same way.

### Release gate

The full backend regression, 39 modules, passes after the migration.
