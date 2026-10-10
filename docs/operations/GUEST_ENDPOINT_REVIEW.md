---
tags: [review, appointment, operations, go-live, security]
created: 2026-10-10
plan: GO_LIVE_PREPARATION_PLAN.md (parts D and F)
---

# Guest endpoint review and clean-clone build

This document gives the results of parts D and F of [the go-live preparation plan](GO_LIVE_PREPARATION_PLAN.md).

## Scope

The review covers every `@frappe.whitelist(allow_guest=True)` method in `appointment/`, tests excluded. There are **49** guest endpoints in 21 modules. For each endpoint, the review checked:
- the rate limit;
- the input validation;
- the token or signature check, and the slug or owner scope;
- leaks across businesses, and enumeration of emails, bookings or customers;
- side effects: emails, records and payments;
- whether error messages show internals.

Frappe keys each rate-limit counter by the function's dotted path and the client IP. A rate limit applies only during an HTTP request, so server code and tests that call the function directly are not limited.

Result values:
- **ok**: no defect found.
- **fixed**: a clear defect, fixed in this review, with a test.
- **decision**: a finding that needs a product decision. See [Open decisions](#open-decisions).

## Endpoints

| Module | Method | Rate limit | Authorization | Result |
|---|---|---|---|---|
| `content/staff_invitations` | `accept` (POST) | 20/60 s | Hashed invitation token; checks the invited account, the inviter's manager role and an active business | ok |
| `content/public_api` | `get_article_index` (GET) | none (read) | Published site slug only; page size max 50 | ok |
| `content/public_api` | `get_article_detail` (GET) | none (read) | Published site; route prefix checked, `..` refused | ok |
| `content/public_api` | `get_gallery_index` (GET) | none (read) | Published site slug only; page size max 50 | ok |
| `content/public_api` | `get_gallery_detail` (GET) | none (read) | Published site; route prefix checked, `..` refused | ok |
| `content/upstream` | `legacy_subscription_unavailable` | none | Always refuses | ok |
| `content/newsletter/public_api` | `signup_status` (GET) | none (read) | Site slug; returns only a boolean | ok |
| `content/newsletter/public_api` | `subscribe` (POST) | 20/60 s | Site slug; consent and locale validated; same answer for known and unknown addresses; 30-minute resend gap | ok |
| `content/newsletter/public_api` | `confirm` (POST) | 30/60 s | Hashed one-time token with expiry | ok |
| `content/newsletter/public_api` | `unsubscribe` (POST) | 30/60 s | Hashed token | ok |
| `content/newsletter/public_api` | `verify_sender` (POST) | 20/60 s | Hashed token | ok |
| `scheduler/notifications` | `unsubscribe` | none | Frappe signed URL (`verify_request`) | ok |
| `scheduler/api/quote` | `get_booking_quote` | none (read) | None: any Service by name | decision (D2) |
| `scheduler/booking` | `book` (POST) | 60/60 s | Offering resolved with `public=True`; `organization_id` must match; request id idempotency | decision (D1) |
| `scheduler/booking` | `slots` | 120/60 s | Offering resolved with `public=True`; one-year window | ok |
| `scheduler/receipts` | `download` | none | Manage-link HMAC token; receipt must belong to the booking | ok |
| `scheduler/registration` | `public_settings` | none (read) | Global flags only | ok |
| `scheduler/registration` | `signup` (POST) | **10/600 s (added)** | Sign-up mode; email length and format | **fixed** (F1); enumeration is decision (D3) |
| `scheduler/membership` | `context` | none (read) | Session only; a guest gets no business data | ok |
| `scheduler/self_service` | `view` | 30/60 s | Manage-link HMAC token, version and slug | ok |
| `scheduler/self_service` | `slots` | 120/60 s | Manage-link token | ok |
| `scheduler/self_service` | `reschedule` (POST) | 10/60 s | Manage-link token; policy window; two self-reschedules max | ok |
| `scheduler/self_service` | `cancel` (POST) | 10/60 s | Manage-link token; late fee must be accepted | ok |
| `scheduler/my_bookings` | `request_link` (POST) | 5/600 s | Same answer for known and unknown addresses; 120 s resend gap per address | ok |
| `scheduler/my_bookings` | `open_link` (POST) | 20/600 s | HMAC one-time nonce, owner key checked | ok |
| `scheduler/my_bookings` | `bookings` | 60/60 s | HMAC session token for owner and email; max 100 rows | ok |
| `scheduler/independent` | `public_offering` | none (read) | Offering resolved with `public=True`; must be an independent provider | ok |
| `scheduler/payments_chapa` | `start` (POST) | 10/60 s | Manage-link token; open Chapa payment only | ok |
| `scheduler/payments_chapa` | `confirm_return` (POST) | 20/60 s | Manage-link token; settles only after Chapa verify | ok |
| `scheduler/payments_chapa` | `callback` | 60/60 s | Unsigned, but only starts a verify call to Chapa | ok |
| `scheduler/payments_chapa` | `webhook` (POST) | none | HMAC `x-chapa-signature` with the collector's webhook secret; settles only after verify | ok (see D7) |
| `scheduler/payments` | `checkout` | 60/60 s | None: any EventType, published or not | decision (D2) |
| `scheduler/payments` | `submit_proof` (POST) | 10/60 s | Manage-link token; file type and 5 MB limit; private file | ok |
| `scheduler/translation` | `messages` | none (read) | Public Translation rows | ok |
| `scheduler/translation` | `languages` | none (read) | Public | ok |
| `scheduler/translation` | `set_language` (POST) | none | Writes only for a signed-in user | ok |
| `scheduler/doctype/landing_page_settings/api` | `get_landing_page_settings` | none (read) | Public platform content | **fixed** (F4) |
| `public_experience/api` | `get_public_ui_config` (GET) | none (read) | Resolved from the request host and path | ok |
| `public_experience/api` | `get_public_experience_snapshot` (GET) | none (read) | Resolved from host and path; booking path only for a public offering | ok |
| `overrides/event_override` | `create_event_for_appointment_group` | **10/60 s (added, shared)** | Any Appointment Group | **fixed** (F2); decision (D4) |
| `overrides/event_override` | `check_one_time_schedule` | none | Any Appointment Group; tells whether events link to a given document name | decision (D4) |
| `api/group_meet` | `get_time_slots` | none (read) | Any Appointment Group | ok |
| `api/group_meet` | `book_time_slot` | **10/60 s (added, shared)** | Any Appointment Group | **fixed** (F2); decision (D4) |
| `api/personal_meet` | `get_meeting_windows` | none (read) | Slug pattern; falls back to any EventType name | decision (D5) |
| `api/personal_meet` | `get_time_slots` | 120/60 s for the organization path (through `booking.slots`); none for the legacy path | Organization path: as `booking.slots`. Legacy path: any slot duration | ok |
| `api/personal_meet` | `book_time_slot` (POST) | Organization path: 60/60 s (through `booking.book`). Legacy path: **10/60 s (added, shared)** | Organization path: as `booking.book`. Legacy path: any slot duration | **fixed** (F2, F3); decision (D4) |
| `api/personal_meet` | `get_all_timezones` | none (read) | Static list | ok |
| `api/personal_meet` | `get_organization_services` | none (read) | Active business with public booking; each offering resolved with `public=True` | ok |
| `api/personal_meet` | `get_organization_meeting_windows` | none (read) | Offering resolved with `public=True`; slug must match | ok |

"Shared" means that the three legacy booking endpoints count against one counter on `_create_event_for_appointment_group`.

## Fixes

All fixes are minimal and keep the existing behaviour apart from the defect. No new translatable strings were added. The tests are in `appointment/tests/test_guest_endpoints.py`. They mock every lookup and create no records.

### F1. Public sign-up had no rate limit

`appointment.scheduler.registration.signup` creates a `User` for each call and had no rate limit. A guest could create accounts without limit, or probe email addresses at full speed (see D3).

Fix: `@rate_limit(limit=10, seconds=600, methods=["POST"])`, the same style as `my_bookings`.

Test: `test_signup_is_rate_limited`. In a guest POST, ten calls run and the eleventh gets `RateLimitExceededError`. Sign-up is turned off with a mock, so no account is created.

### F2. The legacy booking endpoints had no rate limit

`group_meet.book_time_slot`, `event_override.create_event_for_appointment_group` and the legacy path of `personal_meet.book_time_slot` (no `organization_id`) create a `Booking Event` and email every participant. None of them had a rate limit.

Fix: `@rate_limit(limit=10, seconds=60)` on the shared helper `_create_event_for_appointment_group`. All three legacy endpoints use this one counter. The organization booking path of `personal_meet.book_time_slot` calls `booking.book` and does not use this helper, so its limit does not change.

Test: `test_legacy_booking_event_creation_is_rate_limited`.

### F3. A legacy booking conflict returned other customers' bookings

When the requested time was taken, the legacy path of `personal_meet.book_time_slot` returned HTTP 409 with `conflicts`: the names, references, times and status of the other bookings, and the subjects of calendar events, which contain customer names. A guest could probe any time of a provider and read the names of that provider's customers. The frontend does not read `conflicts`.

Fix: the 409 response keeps `error` and no longer includes `conflicts`.

Test: `test_legacy_booking_conflict_does_not_name_other_customers`.

### F4. The landing-page settings error returned the exception text

`get_landing_page_settings` returned `"error": str(e)` to guests. This can show internal names and paths. The exception stays in the Error Log. The frontend falls back to its own message when `error` is absent.

Fix: the `error` key is removed from the failure response.

Test: `test_landing_settings_error_hides_the_exception`.

### Test results

On `meet-beta-integration-analytics-operatio-a5df2b.localhost`:

| Module | Result |
|---|---|
| `appointment.tests.test_guest_endpoints` | 4 tests, OK |
| `appointment.tests.test_registration` | 8 tests, OK |
| `appointment.tests.test_app_identity` | 18 tests, OK (1 skipped) |
| `appointment.tests.test_scheduling_workflows` | 9 tests, OK |
| `appointment.tests.test_pools` | 13 tests, OK |

## Open decisions

**D1. Booking rate and email to any address.** `booking.book` allows 60 bookings a minute from one IP. Each booking holds a real slot and emails the address that the guest typed, without verification. One client can fill a business's day, or send confirmations to addresses that did not ask for them. The per-address daily email limit in `notifications` reduces the email risk, but not the slot holds. Options: lower the limit (for example 10 a minute), add a per-business limit, or add a challenge (CAPTCHA) for many bookings from one client.

**D2. Prices of unpublished offerings.** `payments.checkout` and `quote.get_booking_quote` accept any EventType or Service name. They do not check that the offering or business is public or active. Names come from naming series, so a guest can step through them and read the prices, deposit and cancellation terms, and payment methods of unpublished offerings. `get_booking_quote` also returns policy names. The frontend does not call `get_booking_quote`. Options: resolve the offering with `offering(..., public=True)` in `checkout`, and remove `get_booking_quote` or make it staff-only.

**D3. Sign-up tells whether an account exists.** `signup` answers "An account already exists for this email address." This lets a guest learn whether an email has an account. F1 limits the speed, but the leak stays. Without email verification, any sign-up shows this, because a new address succeeds and a known one cannot. Frappe's own `sign_up` now returns a generic message. Options: keep the message, which is simple for real users; use a generic message; or build the reserved "Verified" sign-up mode, which emails a link and gives the same answer in both cases.

**D4. Retire or restrict the legacy booking flow.** The legacy Appointment Group and personal-meeting endpoints (`group_meet.*`, `event_override.create_event_for_appointment_group`, `event_override.check_one_time_schedule`, and the legacy paths of `personal_meet.*`) are upstream code. They also have these issues:
- `other_participants` has no maximum, so one request can email many addresses.
- The guest sets `custom_doctype_link_with_event`, so a Booking Event can link to any document name, and `event_info` stores all request arguments.
- `check_one_time_schedule` tells a guest whether events link to a given document name.

The dev site has no `User Appointment Availability` records, and the current booking pages use the organization and independent paths. Options: remove the legacy guest endpoints; or keep them with a maximum number of participants and a server-built link list.

**D5. Legacy meeting-window fallback.** When no availability slug matches, `personal_meet.get_meeting_windows` treats the slug as an EventType name. It returns the provider's name and durations, with no check that the offering, provider or business is active or public. A guest can step through naming-series names and list providers of unpublished businesses. Options: resolve the fallback with `offering(..., public=True)`, or remove the fallback with D4.

**D6. Dev comment in the production HTML.** `frontend/index.html` ends with `<!-- http://localhost:8000/api/method/appointment.onboarding.add_organization_provider -->`. It ships in the built `index.html` and in every page that includes it. It is harmless, but it shows a dev URL and an internal method name. Remove the line. **Done (2026-10-10):** the line is removed from `frontend/index.html`.

**D7. Chapa webhook has no rate limit.** The webhook checks the HMAC signature before it changes anything, and a rate limit could drop Chapa's retries. No change is recommended. If abuse appears, add a limit at nginx for unsigned requests.

**Production setting.** `personal_meet.get_time_slots` adds debug messages to its response when `developer_mode` is on. The readiness report already fails when `developer_mode` is on. Keep it off in production.

## Part D: production build from a clean clone

### Procedure

1. `git clone --branch develop https://github.com/MintesnotTsadiku/appointment.git` into a temporary directory. The clone was at `0536995`.
2. `export PATH=$HOME/.nvm/versions/node/v22.22.2/bin:$PATH`
3. `cd frontend && npm ci && npm run build`
4. Check the output, then delete the clone.

### Results

| Check | Result |
|---|---|
| `npm ci` | Pass. 797 packages added. The lockfile is complete. |
| `npm run build` | Pass. `vite build --base=/assets/appointment/frontend/`, then `copy-pwa-assets`. |
| Output location | `appointment/public/frontend/`, with `index.html`, `assets/` (130 hashed files), `icons/`, `manifest.webmanifest`. The directory is in `.gitignore`, so each deployment must build it. |
| PWA files | `sw.js` (9.9 KB), `workbox-*.js`, `offline.html` (4.5 KB), `privacy-cache-cleanup.js`. The service worker precaches 151 entries (3151 KiB), and `offline.html` is one of them. |
| Asset URLs | `index.html` loads `/assets/appointment/frontend/assets/<name>-<hash>.js` and `.css`. |
| `www` includes | `appointment/www/index.html` and `appointment/www/schedule/index.html` are each `{% include "appointment/public/frontend/index.html" %}`. |
| Dev hosts | No `127.0.0.x` and no dev API base URL. Two kinds of `localhost` match: library fallbacks in axios and socket.io-client (`http://localhost` when there is no `window.location`), which are harmless; and one HTML comment with `http://localhost:8000/...` from `frontend/index.html` (D6). |

| Measure | Value |
|---|---|
| Node version | Built with Node 22.22.2 and npm 10.9.7. The minimum is Node 20: `react-router` needs `>=20.0.0`, and Vite 6 supports `^18 \|\| ^20 \|\| >=22`. The repository has no `engines` field and no `.nvmrc`. Use Node 22 LTS on the server. |
| `npm ci` time | 1 min 54 s (cold npm cache for this directory) |
| Build time | 19.4 s in total; Vite reports 14.3 s |
| Output size | 3.5 MB in total; `assets/` 3.2 MB, of which JavaScript is 2.9 MB and CSS is 348 KB |
| Largest chunks | `index-*.js` 523.9 kB (167.1 kB gzip); `react-vendor` 234.2 kB; `ui-vendor` 187.9 kB; `WorkspaceDashboard` 143.0 kB; `registry-*.css` 141.6 kB |

### Warnings

- Vite: "Some chunks are larger than 500 kB after minification", for the main `index-*.js` chunk (523.9 kB). It does not block the build. More code splitting or `manualChunks` would remove it.
- `npm ci`: deprecated packages `source-map@0.8.0-beta.0`, `glob@10.5.0` and `eslint@9.39.5`.
- `npm audit`: 16 vulnerabilities (3 moderate, 13 high). Review them before go-live.
- `copy-pwa-assets` copies `public/offline.html`, but Vite already copies `frontend/public/` into the output. The step is redundant but harmless.

The stack's shared assets were not rebuilt. No `bench build` was run.
