# Internal appearance acceptance

Settings → Appearance controls Violet, Ocean and Forest palettes, light/dark/system mode, typography, text size and density.
Choices preview immediately. Cancel and leaving the page restore saved choices. Reset previews defaults and requires Save.
Preferences belong to the authenticated user and persist across sessions, devices, organizations and roles.
Public website releases and navigation preferences use separate stores.

The managed browser journey covers keyboard radio navigation, save failure and retry, Cancel, Reset and fresh-session persistence.
It checks live system mode, user isolation, both coordinator roles and desktop/mobile Home, Insights, Reception, Schedule and Settings.
Mobile checks enforce viewport containment and minimum toolbar touch targets.

[Visual comparison](comparison.html) pairs the authored screenshots. `validation.json` records the final run, actual visual status, cleanup audit and screenshot checksums.
Only authored screenshots are exported. Browser traces, session files and credentials remain outside this evidence folder.

Focused backend checks and frontend DOM checks pass. The isolated Vite production build passes and writes only to `/tmp`.
[DOM checks](dom-checks.txt) contain the frontend results.
[TypeScript diagnostics](typescript.txt) contain 249 existing errors outside the touched modules. No touched module reports an error.

The existing-site Frappe CLI profile awaits user approval for its dedicated development account. No account or role grant was created.

## Existing website regressions

| Suite | Managed run | Assertions | Visual result |
| --- | --- | --- | --- |
| Template appearance | BQA-2026-00282 | One scenario passed, no failures or flakes | 50 baseline changes |
| Website setup | BQA-2026-00283 | One scenario passed, no failures or flakes | 30 baseline changes |

These overall runs report `baseline_drift`. They are behavior passes, not strict visual passes.
The template suite now uses the appearance API to test both internal modes. Representative light, dark and Ethiopic mobile captures were reviewed.
Existing website baseline files were not updated by this work.

Internal screenshots mask changing analytics freshness and walk-in wait-time text. All appearance controls and layout remain visible.
The suite requires consecutive identical frames before capture. Browser clock overrides are not used because they stalled existing Framer Motion transitions.

## Final internal result

BQA-2026-00291 passed all behavior assertions without failures or flakes. Its overall result is `Failed` with outcome `baseline_drift`.
Four captures differ from reviewed baseline BQA-2026-00290. The screenshots were exported with `strict_visual_pass: false`.
[Visual differences](visual-drift.json) records changed pixel counts and bounds. Reception and Schedule retain some animation or raster differences.
These captures do not establish a strict visual pass. The report preserves that limitation.

Exact cleanup and audit passed. Appearance, navigation and workspace preferences were restored.
Public release inventory remained unchanged. No fixture records remained, and the managed browser session was free.
