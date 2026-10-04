---
tags: [plan, appointment, scheduling, resources, payments]
created: 2026-10-04
status: built and verified 2026-10-04
---

# Booking quantity and resource follow-ups plan

Follows [counted pools and resource-only bookings](POOLS_AND_RESOURCE_ONLY_PLAN.md). This closes its open items except per-resource hours, which stay out (decided 2026-10-04: location and service hours plus blocks are enough for now).

## Decisions (2026-10-04)

1. **Customers choose a quantity (party size, seats) with price per unit.** A service can allow it, up to a maximum. The quantity multiplies the price and the resource units the booking takes.
2. Per-resource opening hours: not now.

## Design

### Quantity

| Where | Field | Notes |
|---|---|---|
| `Service` | `allow_quantity` (Check), `max_quantity` (Int, default 1) | Off by default; the maximum applies when on. |
| `Appointment` | `quantity` (Int, default 1) | 1 for every existing booking. |

- **Units:** a booking takes `need.units × quantity` of each needed resource, from one resource. With no needs, the quantity only changes the price.
- **Price:** the quote uses `price × quantity`, with the offering's price override when it has one (the quote ignored it until now). The deposit follows the policy on that total: a percentage scales and a fixed amount stays fixed. A percentage late-cancellation fee uses the total.
- **Slots:**
  - `booking.slots(…, quantity)` offers a time only when the units for that quantity fit.
  - The public scheduler shows a "How many" control above the times, and the booking form and checkout carry it.
- **Booking:** `book(…, quantity)` checks 1 ≤ quantity ≤ max, or quantity = 1 when the service does not allow it. Staff create accepts a quantity too.
- **Changes:** reschedule keeps the quantity. Self-service shows it, and its slots use it.
- **Records:**
  - Emails show a "Quantity" row when it is more than 1.
  - The receipt names the service with "× n".
  - Reception cards and the booking dialog show "× n".
  - The statement is unchanged; its amounts already include the quantity.

### Follow-ups

- **Service page:** a service booked without staff hides the "Service providers" section and explains that rooms are offered instead.
- **Business without staff:** a business without providers can create a service. It is created without offerings, and turning on "Customers book it without staff" creates the room offerings. Creating a service with providers still makes their offerings as before.
- **Room usage in Insights:** a "Room and equipment use" panel per resource:
  - the units booked over the period's open hours (location and service hours per day, times the count);
  - managers see every resource, receptionists see those in their scope, and providers do not see the panel.
- **Per-room view in reception:** a "Room or equipment" filter shows the bookings that hold the chosen resource. This is the staff view chosen earlier, inside reception rather than a separate calendar.

## Tests

- **Quantity:**
  - units = need × quantity, and a time is refused when they do not fit;
  - slots depend on the quantity;
  - the maximum is enforced, and quantity is 1 when not allowed;
  - the quote and deposit use price × quantity and the price override;
  - the late fee uses the total;
  - the receipt and emails show the quantity;
  - reception creates with a quantity;
  - reschedule keeps it.
- **Follow-ups:**
  - service creation without providers;
  - the room usage numbers;
  - the room filter;
  - the providers section is hidden.
- **Browser QA through Agent Plane:**
  - a guest picks 3 seats, and the price and the slots follow;
  - reception shows "× 3";
  - Insights shows room use;
  - the reception room filter;
  - in English and Amharic, at desktop and mobile.

## Out of scope

Per-resource hours, a separate resource calendar page, and quantity discounts.

## Run record

### What was built

- Fields `Service.allow_quantity`, `Service.max_quantity`, `Appointment.quantity` (existing bookings are 1). Backup `20261004_191302` was taken before the migrate.
- **Booking:**
  - `booking.quantity_for` enforces the switch and the maximum.
  - The booking takes `units × quantity`, and a change of quantity is a strict allocation.
  - `book`, `slots` and `get_time_slots` / `book_time_slot` take a quantity.
- **Price:**
  - `payments.quote_for` / `checkout` use the offering's price override when there is one, times the quantity. The response returns `unit_price` and `quantity`.
  - The percentage late fee uses the total.
- **Records:**
  - The receipt names the service "× n".
  - Emails have a Quantity row.
  - The manage page shows the quantity and the room; its reschedule times use the quantity.
- **Public scheduler:**
  - A "How many" stepper sits above the date picker for services that allow it. Slots, checkout and booking use it, and the summary shows "× n".
  - The summary also names the provider or room being booked.
- **Settings:**
  - The service page has "Customers choose how many" with "Most per booking".
  - A service booked without staff hides the providers section and shows a note instead.
- **Reception:**
  - Create has a "How many" field when the service allows it, and cards show "× n".
  - A "Room or equipment" filter shows only the bookings holding that resource (server side, `get_desk_appointments(resource=)`); the filter summary line names it.
- **Insights:** a "Room and equipment use" widget, in the default layout. It shows booked unit-hours over open unit-hours per resource, for managers and reception (within their locations). Providers see a short note instead.
- **Business without staff:** `create_service` and the create form no longer require a provider when the business has none. The service has no offerings until it is set to be booked without staff.
- Patch `import_quantity_translations`.

### Tests

| Suite | Result |
|---|---|
| `appointment.tests.test_quantity` | 7 passed:<br>• quantity takes units and shapes the slots; the maximum and the switch;<br>• price, deposit basis and late fee; email and reception create;<br>• room use numbers and the provider exclusion; the reception room filter; a service for a business without staff. |
| Pools, resources, payments, Chapa, payments admin, self-service, receipts, notifications, SMS, profiles, scheduling workflows, analytics maths, workspace overview, policies | passed |
| `npm run -s test:dom` | passed |

### Agent Plane runs

`appointment.tests.quantity_qa_fixtures.setup` gives Bloom a QA "Group studio session (QA)" booked without staff from a 6-seat pool, up to 4 seats at 200 ETB. `cleanup` removes it.

| Run | Manifest | Result |
|---|---|---|
| BQA-2026-00488 | `quantity/guest.yaml` | Passed, 2 of 2 (English desktop, Amharic mobile). The stepper sets 3, the times follow, the summary shows "× 3", and the booking is confirmed. |
| BQA-2026-00489 | `quantity/owner.yaml` (bloom.owner) | Passed, 2 of 2:<br>• Insights shows "Studio seats (QA)".<br>• The service page shows the quantity switch on and the providers section hidden.<br>• Reception shows both bookings "× 3", and the room filter keeps them. |

Both runs had 0 console and 0 network errors. Database check: the two bookings hold 3 units each of the 6-seat pool at 09:00, so the pool is full at that time.

The filter summary line naming the room was added after these runs. It was typechecked and built, but not captured in the browser.

### Left open

- Per-resource opening hours (decided: not now).
- Quantity discounts, and a separate resource calendar page.
- Two existing lint errors in `booking-v2/hooks` (an unused `enabled` option in `useTimeSlots`, an `any` in `useBookingSubmit`). They are older than this work.
