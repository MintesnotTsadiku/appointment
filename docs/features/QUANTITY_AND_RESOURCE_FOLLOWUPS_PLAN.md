---
tags: [plan, appointment, scheduling, resources, payments]
created: 2026-10-04
status: decided 2026-10-04; building
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
