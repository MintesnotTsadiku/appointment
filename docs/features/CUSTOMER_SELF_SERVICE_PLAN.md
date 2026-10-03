---
tags: [plan, appointment, customers, self-service]
created: 2026-10-03
status: built and verified 2026-10-03
---

# Customer self-service plan

## Problem

A customer gets confirmation and reminder emails, but cannot change the booking. Every reschedule or cancel needs a call to the business. The business's booking policy (cancellation window, reschedule window, late fee, refund policy) exists, but nothing applies it to the customer.

This slice gives each booking a secure manage link. The customer can reschedule or cancel, and the business's policy decides what happens. It is item 9.3 of [the customer profile plan](../feature/customer-profile-resource-capacity-implementation-plan.md).

## Decisions (2026-10-03)

1. Customers may reschedule and cancel.
2. The link stops working when the appointment starts. It also stops after a cancel, and after any change of time or status. A new link arrives in the next email.
3. Without a policy, the customer may reschedule or cancel up to the start time. With a policy, the platform enforces it.
4. Incentives are aligned:
   - A cancel inside the cancellation window is allowed. The page shows the late fee and the refund before the customer confirms, and the booking records both.
   - A reschedule inside the reschedule window is not offered. A late reschedule must not avoid the late cancellation fee. Inside the window, the page offers cancel, with its fee, or the business's contact details.
   - A customer may reschedule one booking at most 2 times. After that, the page shows the business's contact details.
   - No money moves. The platform has no payment processing yet. The fee and refund are records for staff.

## What exists now

| Area | Code | Fact |
|---|---|---|
| Staff change | `booking.change()` | Reschedule or cancel with `require_access` and a stale-edit check. |
| Validation | `booking.validate_document` | Calls `require_access` for every non-public write. |
| Policy lookup | `policy_engine.get_applicable_policies` | Provider, then service, then location, then business-wide policy. |
| Fee rules | `policy_engine.validate_cancellation` | Fixed or percentage late fee, refund policy. It uses the system time zone, not the booking's. |
| Fields | `Appointment` | `amount_paid`, `cancellation_reason`, `starts_at` (UTC), `booking_timezone`. |
| Public slots | `booking.slots(offering_id, date)` | Guest, rate limited. |
| Scheduler UI | `DateTimeSelector`, `useTimeSlots`, `useBookingBrand` | The public booking interaction model and the business brand. |
| Emails | `notification_email.render` | One link: the business booking page. |

## Design

### The link

`appointment/scheduler/self_service.py` builds and checks the token:

- Token: `<appointment name>.<manage_version>.<signature>`. The signature is HMAC-SHA256 of the name and version with the site's encryption key.
- `Appointment.manage_version` (Int, hidden) goes up by one in `validate_document` when the start time or the status changes. Old links then fail.
- The token is stateless. Emails sent for the same version share one link.
- A check fails, with one generic "This link no longer works" message, when the signature is wrong, the version is old, the booking is not Pending or Confirmed, or the start time has passed.
- The page lives at `/<business slug>/booking/<token>`. The slug must match the booking's business.

### Guest APIs (all rate limited)

| Method | Purpose |
|---|---|
| `self_service.view(token)` | Booking facts, business contact, and what the customer may do now: reschedule (or why not), cancel with fee preview. |
| `self_service.reschedule(token, start_time, end_time)` | Moves the booking through `validate_document` (hours, capacity, duration). Returns the new token. |
| `self_service.cancel(token, accept_fee)` | Cancels. If a fee applies, `accept_fee` must be 1. Records the fee and refund. |

Writes use a narrow server-owned flag. With it, `validate_document` skips `require_access` for this one booking, like the public-create flag. All other checks stay.

### New Appointment fields

| Field | Type | Purpose |
|---|---|---|
| `manage_version` | Int, hidden | Invalidates old links. |
| `self_reschedules` | Int, read-only | Counts customer reschedules (limit 2). |
| `last_changed_by` | Select Staff/Customer, read-only | Shown to staff and used by the email copy. |
| `cancellation_fee` | Currency, read-only | Late fee at the moment of cancel. |
| `refund_due` | Currency, read-only | What the business owes back from `amount_paid`. |

### Policy and fee rules

The rules are in `self_service.decide(doc, now)`:

- The policy is the first one `get_applicable_policies` returns for the booking's service, location, provider and local date.
- Hours left = `starts_at` (UTC) minus now (UTC).
- Reschedule is allowed when the booking is open, hours left are more than 0, there are fewer than 2 self reschedules, and hours left are at least the policy's `reschedule_window_hours` (0 means no window).
- Cancel is allowed when the booking is open and hours left are more than 0. It is late when hours left are below `cancellation_window_hours`.
- A late fee is `late_cancellation_fee_amount`, or the percentage of the service price. No policy or not late means no fee.
- The refund follows the policy's `refund_policy`: Full Refund gives paid minus fee, Partial Refund gives half of paid minus fee, No Refund gives 0. It is never below 0.

### Emails and staff view

- Confirmation, reschedule and reminder emails get a second button, "Manage your booking". Cancellation emails do not.
- When the customer made the change, the copy says so: "You moved your booking", "You cancelled your booking". A late cancel email states the fee and the refund.
- SMS keeps its short text without the link. This keeps Amharic SMS within two parts.
- The reception booking dialog shows "Changed by the customer", and the fee and refund when they exist.

### Public page

A route at `/:slug/booking/:token`, with the business brand from `useBookingBrand`, in English and Amharic, at desktop and mobile. It shows:

- the booking (service, provider, location, date and time in the booking time zone, status);
- "Reschedule": the scheduler's `DateTimeSelector` for the same offering, then a confirm step;
- "Cancel": the fee and refund preview, a required confirmation when a fee applies, then the result;
- when an action is not allowed: the reason and the business's phone and email.

### Tests

- Token: signature, wrong slug, old version after a change, a cancelled booking, a past start.
- Rules: no policy (allowed until start), reschedule window, cancellation window with a fixed fee and with a percentage fee, refund policies, the reschedule limit.
- Writes: the reschedule keeps the duration and runs capacity checks, cancel needs `accept_fee`, and both record `last_changed_by`, the fee and the refund. A guest cannot change another booking.
- Emails: the manage link appears in confirmation and reminder, and the customer-change copy is used.
- Browser QA through Agent Plane at 1440×900 and 390×844, in English and Amharic: open the link from a booking, reschedule, cancel with and without a fee, a blocked reschedule inside the window, and an expired link.

## Out of scope

Payment collection and refunds, waiting lists, customer accounts, SMS links.

## Run record

### What was built

- Appointment fields `manage_version`, `self_reschedules`, `last_changed_by`, `cancellation_fee`, `refund_due`. Backup `20261003_160613` was taken before the migrate.
- `self_service.py`: signed tokens, `decide()` (policy windows, reschedule limit, fee, refund), and the guest methods `view`, `reschedule` and `cancel`. `view` allows 30 requests a minute; the two writes allow 10.
- `booking.validate_document`: the `CUSTOMER_CHANGE` flag skips only the staff access check. A new time or status raises `manage_version` and sets `last_changed_by`.
- Emails: "Manage your booking" in confirmation, reschedule and reminder emails. Customer wording ("you moved", "you cancelled"), and fee and refund rows on a late cancel.
- Public page `/:slug/booking/:token`: the business brand, English and Amharic, the booking summary, reschedule through the scheduler's `DateTimeSelector` (new `embedded` mode), cancel with the fee preview and a consent box, invalid-link and result states. `isPublicExperiencePath` treats the page as a standalone public page.
- Reception booking dialog: "Last changed by the customer" and the fee and refund line.
- Patch `import_self_service_translations` imports the Amharic copy.

### Found and fixed during QA

- The reused date picker brought its own sticky header with a theme toggle, a page title and an info box that said "contact the business to change your booking". The `embedded` mode leaves these out on the manage page.
- Test and QA fixture bookings queued confirmation emails to synthetic addresses, and their cleanup left 15 Email Queue rows. Both fixtures now set `skip_customer_notification`, and the 15 rows were deleted.

### Tests

| Suite | Result |
|---|---|
| `appointment.tests.test_self_service` | 12 passed |
| `appointment.tests.test_customer_profiles` | 19 passed |
| `appointment.tests.test_customer_notifications` | 13 passed (link checks updated for the manage link) |
| `appointment.tests.test_customer_sms` | 12 passed |
| `appointment.tests.test_policy_manager` | 7 passed |
| `appointment.tests.test_workspace_overview` | 1 passed |
| `appointment.tests.test_scheduling_workflows` | 9 passed |
| `npm run -s test:dom` | passed, with new route cases in `public-experience-routes.test.mjs` |

### Agent Plane runs

`appointment.tests.self_service_qa_fixtures.setup` makes the QA bookings, and `cleanup` removes them. "Late" bookings fall inside a temporary 72-hour Scalp care policy (100 ETB fee, 300 ETB paid). "Free" bookings have no policy.

| Run | Manifest | Result |
|---|---|---|
| BQA-2026-00390 | `self-service/customer.yaml` | Passed, 4 of 4 (1440×900 and 390×844, English and Amharic). Late booking: reschedule blocked, cancel with consent. Free booking: reschedule, then free cancel. Invalid link. 0 console, 0 network errors. |
| BQA-2026-00391 | `customer.yaml`, after the `embedded` picker change | Passed, 4 of 4. 0 console, 0 network errors. |
| BQA-2026-00392 | `self-service/staff.yaml` (bloom.manager) | Passed, 2 of 2. Reception shows "Last changed by the customer" and "Late cancellation fee: ETB 100.00 · Refund due: ETB 200.00". |

Database check after run 00391:
- Late booking: Cancelled, `last_changed_by` Customer, fee 100, refund 200, `manage_version` 1.
- Free booking: `self_reschedules` 1, then Cancelled, `manage_version` 2.
- Each event queued one email. The late-cancel email reads "you cancelled your booking" with both fee rows.

Fixture cleanup left no QA bookings, policies, extra profiles or emails.

### Left open

- No payment collection. The fee and refund are records for staff.
- The date picker's own labels (weekdays, "Morning", "Available Times") stay in English, as on the booking page.
- The staff booking history shows the customer's change as "Guest".
- SMS has no manage link (pinned with the rest of SMS).
