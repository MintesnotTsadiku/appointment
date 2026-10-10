---
tags: [plan, appointment, reception, walk-ins, i18n]
created: 2026-10-10
status: built and verified 2026-10-10
---

# Walk-in assignment within open hours, and translated policy templates

## Decision (2026-10-10)

The user chose this as the next step: close the known gaps before new features.

## 1. Organization walk-ins respect open times

**Problem:** `api/desk.assign_walk_in_to_slot` assigns an organization's walk-in with `_next_desk_slot`. That search takes the next half hour that has no clash and rounds up to the full hour. It ignores the location's, service's and provider's opening hours, holidays, buffers and room capacity, so it can book a walk-in while the business is closed.

Independent providers already get the first truly open time from `booking.open_slots`.

**Design:**
- An organization walk-in is assigned to the first open time from `booking.open_slots`, within the next 24 hours from now.
  - **Offering:** the event type that matches the walk-in's service, location and preferred provider.
  - **No preferred provider:** consider every active offering of that service at that location, and take the earliest open time across them. When two times are equal, take the provider with fewer bookings that day.
- **Rules applied:** because `open_slots` is used, opening hours, holidays, buffers, quantity and room capacity are all respected.
- **Explicit time:** when staff pass a start time to the endpoint, check that time with the same rules and refuse it when it is not open.
- **No open time:** when nothing is open in the next 24 hours, refuse with a clear, translated message. Do not book outside open hours.
- **Remove `_next_desk_slot`** if nothing else uses it.
- **Response:** the response shape stays the same, so reception keeps working.

**Tests:**
- An assignment falls inside open hours, even when it is requested at night.
- A preferred provider is used when they have a free time.
- Without a preferred provider, the earliest provider is chosen.
- An explicit start time outside opening hours is refused.
- When nothing is open in the next 24 hours, the assignment is refused with the message.
- Independent provider walk-ins are unchanged.

## 2. Translated policy templates

**Problem:** `appointment/scheduler/helpers/policy_templates.py` keeps the template names and descriptions as module-level data, so they are always English.

**Design:**
- Translate them when the API serves them, with `_()` at run time, not at import.
- Add the English text and the Amharic to the catalog under `server.policyTemplates`.
- Template keys and stored policy values stay the same.

**Tests:** the policy manager tests pass. When the template endpoint is called as a user whose language is Amharic, it returns Amharic names.

## Verification

- **Backend:** the full backend regression.
- **Agent Plane:**
  - Reception adds and assigns an organization walk-in. The resulting booking is inside opening hours (`staff-ui/reception-light` and a new short manifest).
  - The policy template list in Amharic.

## Run record

### What was built

- **Open-time check:** `booking.is_open` checks one time of an offering: opening hours, holidays, notice, buffers, provider capacity and rooms. `booking.open_slots` now uses it for each slot, so the listed times do not change.
- **Organization walk-ins:** `assign_walk_in_to_slot` books an organization's walk-in with `_organization_slot`. It looks at the active offerings of the walk-in's service at its location. A preferred provider (from the request, else from the walk-in) narrows them to that provider. Each offering's first open time in the next 24 hours comes from `open_slots`. The earliest time wins; on equal times, the provider with fewer active bookings that day wins. The booking uses the chosen offering.
- **Explicit time:** an organization's `preferred_time` is checked with `is_open` and booked as given. When it is not open, the API refuses it (400, "This time is not open for the walk-in's service. Choose another time.").
- **Nothing open:** the API refuses (404, "Nothing is open for this service in the next 24 hours.") and the walk-in stays in the queue.
- **Removed:** `_next_desk_slot`. Nothing else used it.
- **Independent walk-ins:** unchanged. `_independent_slot` keeps its rules (a time outside the hours moves to the next open time) and now shares `_first_open` with organizations.
- **API:** `provider_name` and `location_name` are optional. The response shape is the same.
- **Reception:** the queue no longer stops a walk-in without a preferred provider. The server chooses the provider.
- **Policy templates:** `get_policy_templates` translates the names and descriptions with `_()` when it serves them. The template keys, the values and `apply_template_to_policy` are unchanged. The policy form fetches the templates again when the language changes.
- **Translations:** 12 strings in `server.desk` and `server.policyTemplates`. Patch `import_walkin_hours_translations` imports them. No DocType changed, so no migrate was needed.
- **QA:** fixture `appointment/tests/org_walkin_qa_fixtures.py` gives the first open time of each walk-in, and its cleanup removes the run's walk-ins, bookings, notification rows and customer profiles. New manifests are `develop-features/org-walkin.yaml` and `develop-features/policy-am.yaml`.

### Tests

| Suite | Result |
|---|---|
| `test_walkin_hours` | 8 passed. A walk-in requested at 02:00 gets the first open time, inside the effective hours. The preferred provider is used. Without a preference, the earliest provider is chosen. On equal times, the provider with fewer bookings is chosen. An explicit time at 03:00 is refused, and an open explicit time is booked as given. On a closed Monday at 00:30, the API refuses and the walk-in stays waiting. An independent walk-in at night takes the first open time, and its explicit 03:00 still moves to the next open time. The templates come back in English and in Amharic. |
| `test_policy_manager`, `test_independent_followups`, `test_scheduling_workflows`, `test_resources`, `test_pools` | 7, 8, 9, 15 and 13 passed |
| Full backend regression (`--app appointment`) | 467 tests: 465 passed, 1 skipped. 1 failure, `test_data_preservation`, compares the counts with a fixed baseline from another site (70 bookings, 3 organizations). This change does not affect it. |
| Frontend (the unused `staff.receptionDesk.toast.selectProvider` key was removed) | `tsc` stays at 178 errors. `test:dom` passes. `vite build` succeeds. |

### Agent Plane runs

| Run | Manifest | Result |
|---|---|---|
| BQA-2026-00142 | develop-features/org-walkin: Bloom adds and assigns a walk-in with Hanna (en desktop) and one without a preferred provider (am mobile). The booking date and start match the first open time. | Passed, 0 console and 0 network errors |
| BQA-2026-00147 | develop-features/policy-am: the template list in Amharic | Passed, 0 and 0 |
| BQA-2026-00144 | staff-ui/reception-light (regression) | Passed. The 4 console entries are framer-motion warnings that the manifest's reduced-motion option causes. |

### Open

- Bloom is closed on Mondays. From Sunday after closing until Monday morning, nothing is open in the next 24 hours, so `org-walkin.yaml` fails in that window by design.
- `test_data_preservation` is for sites cloned from production data. It checks counts against that clone's baseline, so it fails on a seeded dev site whatever the code.

