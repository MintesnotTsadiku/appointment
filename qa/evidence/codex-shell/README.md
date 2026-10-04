# Codex palette and workspace shell

The supplied light and dark screenshots guide this internal application design.
The Codex palette uses white content, an off-white sidebar and a pale icon rail in light mode.
Dark mode uses `#181818` content, `#1b1b1b` sidebar, `#202022` rail and `#2f2f2f` selections.
The app retains semantic appointment status colors. Chart marks use a brighter neutral color for contrast in dark mode.
These colors match the supplied JPEG references. They are not claimed as official Codex design tokens.

Codex is the default palette. New navigation preferences default to an expanded sidebar.
Existing saved palette and placement choices remain available. Reset appearance previews Codex and requires Save.
Top navigation remains an option in Settings. The sidebar supports collapse and a mobile drawer.
Top links no longer render in sidebar mode.

The avatar shows the existing user image, with initials when no image loads.
Its accessible account popover links to Profile, Appearance and Sign out.
The profile saves first name, last name and phone number for the signed-in user only.
The server rejects arbitrary fields, other-user requests, roles, email and enabled-status changes.
The existing provider details and appointment policy screens remain at `/settings/profile/details`.

Settings uses grouped personal and workspace rows, thin borders and restrained typography.
Settings links respect the current workspace role. Public website design remains separate.

## Validation

Focused backend checks cover default values, strict fields, persistence, current-user isolation and Guest rejection.
Frontend DOM checks and the isolated production build pass. Build output remains under `/tmp`.
TypeScript still reports existing diagnostics outside touched modules.
Managed browser checks cover both modes, sidebar collapse, the account menu, profile Save/Cancel and reload, staff access, mobile containment, drawer focus and logout.
The fixture restores account fields, appearance, navigation and workspace choices and audits public releases.

See `validation.json` for the final managed run, actual visual status, cleanup audit and screenshot inventory.
[Visual comparison](comparison.html) shows the captured desktop and mobile layouts.
No credentials, storage state or browser traces are exported.

## Final managed result

BQA-2026-00296 passed all behavior assertions with no failures or flakes.
Its overall result reports `baseline_drift` for one screenshot. Eight captures match the reviewed baseline exactly.
[Pixel differences](visual-drift.json) records the remaining text raster difference. `strict_visual_pass` remains false in the exported result.
The fixture cleanup and publication audit passed. Account and preference data were restored, and the browser session was released.
The TypeScript log contains 249 existing diagnostics outside touched modules.
