---
tags: [plan, appointment, i18n]
created: 2026-10-10
status: built and verified 2026-10-10
---

# Translate develop's server messages

## Problem

Develop's modules raise about 170 errors and return status text as plain English strings. Examples are `frappe.throw("Choose one independent business.")`, readiness check names, and workbook import errors. Staff who work in Amharic see these messages in English.

## How translation works here

- **Source:** `Translation` records are keyed by the English source text. The patch `import_frontend_translations` creates them from `en.json` and `am.json`.
- **Language:** the staff language toggle saves `User.language`. Frappe's `_()` then translates server messages for that user.
- **Result:** a server message is translated when it goes through `_()` and when its exact English text is in `en.json`, with the Amharic at the same key in `am.json`.

## Design

- **Wrap messages:** wrap user-facing server text in `_()`. This covers `frappe.throw`, `frappe.msgprint`, and messages or labels returned to the UI. Placeholders use `_("… {0} …").format(value)`, not f-strings, so that the source text stays fixed.
- **Leave as is:** log text, exception codes, field names, values that the frontend compares, and text stored in records.
- **Catalog:** add each message to `en.json` and `am.json` under `server.<area>.<key>`, where the English is exactly the server text. Import them with a translation patch.
- **Tests stay valid:** tests run as Administrator in English, so message assertions do not change.

## Scope

- `appointment/content/`: newsletter, authoring, staff invitations, upstream, support records.
- `appointment/public_experience/`: setup, identity media, solo setup, and the readiness checks.
- `appointment/organization_import/`.
- `appointment/scheduler/`: independent, analytics_capture, analytics_filters, dashboard_config, appearance, account, reception_state, walk_in, business_membership, and the remaining unwrapped messages in booking and analytics.

## Verification

- **Backend:** the full backend regression.
- **Agent Plane:** a staff user in Amharic gets an Amharic server error. One example is saving the independent provider's settings with an invalid lead time; another is a website readiness message.

## Run record

### What was built

- **Wrapping:** about 480 user-facing server messages are wrapped in `_()`. These are in `content/`, `public_experience/`, `organization_import/` and `scheduler/`, and include about 190 messages that were already wrapped but had no catalog entry.
  - f-strings and joins became `_("… {0} …").format(...)`.
  - Module-level translated constants became functions, so they follow the requester's language: `self_service._invalid()` and `newsletter.audience._generic()`.
  - Variables named `_` that hid the translation function were renamed.
- **Catalog:** 683 strings were added under `server.*` in en.json and am.json. Patch `import_server_message_translations` imports them.
- **Case rule:** the Translation table compares text without case, so no source text may differ only by letter case from another.
  - Analytics definitions now use whole sentences per dimension instead of a bare "service", "provider" or "location".
  - Status and doctype codes whose label differs only by case ("No Show", "Gallery Collection") use their UI label, through `analytics_calculations._code_label`.
  - Two near-duplicate website messages were unified.

### Left in English on purpose

Codes that the frontend compares, text stored in records or sent in customer emails, internal errors that staff cannot act on, design manifest checks, public resolver diagnostics, CSV export column labels, and sheet or column names inside workbook messages.

### Verification

| Check | Result |
|---|---|
| Full backend regression, 34 modules | All pass |
| `test_homepage_analytics`, `test_demo_analytics`, `test_internal_appearance` and `test_template_appearance` (run with `bench execute`) | Pass |
| Frontend DOM tests and typecheck (178, unchanged) | Pass |
| BQA-2026-00128, develop-features/server-am | Passed. The owner, working in Amharic, presses "End service" before the service starts. The server refusal shows as "መጀመሪያ የቀደመውን የእንግዳ መቀበያ ደረጃ ያጠናቅቁ።" The only network error is that intended refusal. |

`test_demo_analytics` needs a paused scheduler, so it ran with the scheduler paused for that check only.
