---
tags: [plan, appointment, independent-providers, self-service, reception]
created: 2026-10-10
status: built and verified 2026-10-10
---

# Independent provider follow-ups

These close the two gaps left by [customers of independent providers](INDEPENDENT_PROVIDER_CUSTOMERS_PLAN.md). The user approved the provider-as-business design and asked to continue.

## 1. Rescheduling with any publish state

**Problem:** the manage page's reschedule time picker reads times from the public offering lookup. An independent provider's offering is public only while it is published. When the provider unpublishes it, their customers can no longer pick a new time, although their manage link still works.

**Design:**
- A new guest endpoint, `self_service.slots(token, date, slug=None, independent=0, quantity=1)`, returns the open times for the booking's own offering. It checks the manage token the same way `view`, `reschedule` and `cancel` do, and does not require the offering to be public.
- It answers only while the booking can still be changed, using the same `decide()` rules as `reschedule`.
- The manage page uses this endpoint for every booking, from organizations and from providers, so there is one path.
- The quantity and room rules stay the same as in `booking.slots`.

**Tests:**
- An unpublished independent offering can still be rescheduled through the manage link.
- A tampered or expired token gets no times.
- A booking that can no longer be changed gets no times.
- Organization reschedules are unchanged.

## 2. Walk-ins for independent providers

**Problem:** develop's independent provider can open reception (`/reception` is allowed for the `individual_owner` state). The walk-in queue and its check work only for organizations, so the provider cannot add or assign a walk-in.

**Design:**
- Walk In gets `independent_provider`, and `organization` is no longer required. Exactly one of the two must be set. This follows the pattern used for Customer Profile and the notification records.
- The desk and walk-in APIs accept the `Provider:<provider>` workspace key through `business_owner`, and check access with `independent.require_owner`.
- Assigning a walk-in to a slot books the provider's own offering. The resulting booking has no organization, the same as any independent booking.
- The change adds schema. Take a backup before the migrate, and restart the stack after it.

**Tests:**
- The provider adds a walk-in, sees it in the queue and assigns it to a time; the booking belongs to the provider.
- Another owner cannot see or change it.
- Organization walk-ins are unchanged.
- **Agent Plane:** the independent provider adds and assigns a walk-in at reception, in English (desktop) and Amharic (mobile).

## Run record

### What was built

- **Rescheduling:** `self_service.slots` gives the times for the booking's own offering. It checks the manage token and does not require the offering to be published. A booking that the customer can no longer move gets an empty list. `booking.slots` and the new endpoint share `booking.open_slots`, so the quantity and room rules are the same. The manage page uses the new endpoint for organizations and providers.
- **Walk In:** gets `independent_provider`. Walk In has no `organization` field: an organization's walk-in belongs to the organization of its location, as before. A walk-in at a provider's location takes that provider. The controller checks that the location, service, preferred provider and customer of a provider's walk-in all belong to that provider, and that the owner does not change.
- **Walk-in APIs:** `get_walk_ins` and `add_walk_in` take `business=Provider:<provider>`, checked by `independent.require_owner`. When the provider adds a walk-in, the server fills in their own location and their own name as the preferred provider. `assign_walk_in_to_slot` books the first open time of the provider's offering in the next 24 hours, so the booking is inside the provider's hours. Organizations keep the half-hour search, moved unchanged into `_next_desk_slot`. The Walk In list permission also covers the provider's own walk-ins.
- **Reception:** the walk-in queue and the add dialog send the provider's key. Organizations send the same requests as before.
- **Migrate:** backup `20261010_040203` was taken first. Patch `import_independent_followups_translations` adds one server message.

### Tests

| Suite | Result |
|---|---|
| `test_independent_followups` | 8 passed: an unpublished offering is rescheduled through the manage link; a changed or expired token is refused; a booking that cannot move gets no times; the provider adds, sees and assigns a walk-in; another owner cannot see or change it; a walk-in has one business; organization reschedule times and walk-ins are unchanged. |
| Regression: 10 modules | All pass. |

### Agent Plane runs

| Run | Manifest | Result |
|---|---|---|
| BQA-2026-00135 | develop-features/indep-walkin: the provider adds and assigns a walk-in (en desktop, am mobile) | Passed, 0 console and 0 network errors |
| BQA-2026-00136 | develop-features/independent-customers (regression) | Passed, 0 and 0 |
| BQA-2026-00137 | staff-ui/reception-light (organization regression) | Passed. The 4 console entries are framer-motion warnings that the manifest's reduced-motion option causes. |

### Fixed before commit

- **Toast messages:** reception's toasts (walk-in added and assigned, appointment created, updated and moved, and their failures) were hard-coded English. They are now translated (`staff.receptionDesk.toast.*`), and the times follow the page language. `indep-walkin.yaml` and `appointment_scheduling_smoke.yaml` were updated for the new English text, which has no exclamation marks.
- **Scope line:** for an independent provider, reception's scope line shows their business, not "All authorized businesses".
- **Rates:** the reception brief shows "—" when the utilization or no-show rate is null, not "null%".

| Check | Result |
|---|---|
| Full backend regression, 35 modules | All pass |
| BQA-2026-00141, develop-features/indep-walkin | Passed, 0 console and 0 network errors |
| BQA-2026-00139 and 00140, develop-features/owner and staff-ui/reception-light | Passed. The console entries are the known framer-motion reduced-motion warnings and the sandboxed website preview. The 2 network entries in 00139 are socket.io polling noise. |
