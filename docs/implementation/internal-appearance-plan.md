# Internal appearance implementation

Scope: this worktree and the existing isolated content runtime. Existing website changes remain in place.

## Delivered behavior

Settings → Appearance provides Codex, Violet, Ocean and Forest palettes, light/dark/system mode, typography, text size and density.
Choices preview immediately. Cancel and leaving the page restore saved choices. Reset previews defaults and requires Save.
Existing mode shortcuts save changes outside Appearance. System mode follows device changes live.

The backend stores validated preferences under `appointment:appearance:v1` for the authenticated user.
Preferences persist across sessions, devices, organizations and roles. Navigation preferences and public releases use separate stores.
The API rejects Guest access, arbitrary CSS, unknown fields, unsupported values and requests to target another user.
No schema migration is required. The browser cache uses the authenticated identity only for first paint.

Packaged Noto Sans Ethiopic and DejaVu Serif fonts provide Latin and Ethiopic choices without remote font requests.
Density changes panel and row spacing. Timed booking geometry stays intact. Mobile toolbar controls keep 44px touch targets.
Home, Insights, Reception, Schedule and Settings use the selected palette, typography, size and density.
Mobile panels stretch within their containers. Reception filters and Schedule controls wrap.

## Validation

Focused backend checks, frontend DOM checks, production build and whitespace checks pass.
The build writes only to `/tmp`. TypeScript reports 249 existing errors outside the touched modules.
The managed journey passes keyboard controls, preview/Cancel/Reset, failure recovery, persistence, user isolation and both coordinator roles.
Desktop/mobile checks cover five representative internal routes and independent public design.

The capture harness masks changing freshness and wait-time text, settles animation frames, and reveals sections before full-page screenshots.
A fixed-clock experiment stalled existing Framer Motion transitions and was removed.
BQA-2026-00290 established reviewed complete-page captures. BQA-2026-00291 passed all behavior checks but reported four visual differences.
The exported evidence preserves the failed visual status. Exact cleanup and public-release audit passed.

Template appearance BQA-2026-00282 and website setup BQA-2026-00283 passed all assertions without flakes.
Their overall results report baseline drift, with 50 and 30 changes. Existing website baselines were not updated.

See [acceptance evidence](../../qa/evidence/internal-appearance/README.md) for screenshots, run metadata and test details.
Existing-site Frappe CLI profile provisioning awaits user approval. No dedicated account or role grant was created.

## Codex reference follow-up

The supplied light and dark screenshots now guide a fourth palette called Codex, which is the default.
New navigation preferences default to an expanded sidebar. Existing saved choices remain available.
The shell now has an icon rail, muted navigation rows, a thin header and an avatar account popover.
Settings uses grouped rows. The current-user profile saves name and phone number, with Save and Cancel.
Provider details and policies remain available on their own route. Account APIs accept only personal fields and reject Guest access.
Managed suite `codex-shell` checks modes, navigation, profile persistence, staff isolation, mobile layout and logout.
See [Codex shell evidence](../../qa/evidence/codex-shell/README.md).
