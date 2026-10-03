---
tags: [plan, appointment, customers, self-service]
created: 2026-10-03
status: decided 2026-10-03, in build
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

Filled in after the build.
