---
tags: [plan, appointment, scheduling, resources]
created: 2026-10-04
status: decided 2026-10-04; building
---

# Counted pools and resource-only bookings plan

## Problem

[Rooms and equipment](RESOURCE_CAPACITY_PLAN.md) made every resource exclusive (one booking at a time), and every booking still needs a provider. A business cannot say "we have 10 hair dryers" without naming ten records. A meeting-room or machine rental cannot be booked at all, because every offering needs a person.

## Decisions (2026-10-04)

1. **Counted pool:** a resource has a count (default 1, which is today's behavior). A service takes a number of units of each type it needs (default 1). A booking fits a resource while the overlapping bookings' units plus its own stay within the count. Units come from one resource; they are not split across resources.
2. **Resource-only services:** a service can be booked without staff. On the public page, each bookable room or machine is its own choice, as providers are today. Services that need staff keep automatic assignment.
3. **Hours:** location and service hours apply, without the provider layer. Blocks cover maintenance and closures. Per-resource opening hours stay out of scope.
4. **Staff view:** resource-only bookings appear in reception, with the room or machine where the provider name usually is. Managers and receptionists handle them. Provider analytics leave them out.

## Design

### Schema

| Where | Field | Notes |
|---|---|---|
| `Resource` | `capacity` (Int, default 1) | 1 = exclusive. A block takes the whole resource. |
| `Service Resource Need` | `units` (Int, default 1) | Units taken from one resource of that type. |
| `Appointment Resource` | `units` (Int) | A snapshot of the units held. |
| `Service` | `resource_only` (Check) | Booked without staff. Needs exactly one need row (the bookable type). |
| `EventType` | `resource` (Link Resource), `provider` optional | A resource-only offering is service + location + resource. |
| `Appointment` | `provider` optional | Empty only for resource-only offerings. |

### Allocation (`resources.py`)

- `usage(names, start, end, exclude, lock)` returns the units held per resource over the interval. A blocked resource counts as full.
- A candidate fits when `capacity − used ≥ units`. The current resource is kept when it still fits; otherwise the first that fits by name is used.
- For a resource-only offering, the need's candidates are just the offering's resource.

### Resource-only offerings

- `resources.sync_offerings(service)` keeps one EventType per active resource of the service's type at its location. It creates missing ones and deactivates those whose resource is off or gone. It runs when the service's needs or mode change, and when a resource is saved.
- Switching a service to resource-only deactivates its provider offerings. Switching back reactivates them.
- Upcoming bookings of a service switched to resource-only keep their provider and are given a room, where one is free, like any service that gains a need.

### Booking core (`booking.py`)

- `offering()` accepts an EventType without a provider when its service is resource-only and it has an active resource of the needed type at the offering's location. `provider` is then `None`.
- **Lock anchor:** with a provider, the provider's User row as today; without one, the offering's Resource row. The same order holds everywhere.
- `effective_hours` skips the provider layer. The notice period is the business's.
- Provider capacity checks run only when there is a provider. Resource allocation is the capacity check; it is strict on create, a time change and reactivation, as today.
- `slots` labels each slot with the resource name. `change()` and reception reschedule work without a provider.

### Surfaces

- **Public page:** `get_organization_services` lists resource-only offerings with the resource name where the provider name goes, so the existing service cards and scheduler show "Meeting room A".
- **Emails:** the Provider row is hidden when empty. A "Room or equipment" row lists the resources a booking holds (in every booking email).
- **Reception:**
  - The create form gets a "Room or equipment" choice instead of the provider for resource-only services.
  - Cards and the booking dialog show the resource.
  - Walk-ins stay staff-led, with a provider required.
- **Settings:**
  - The resource dialog gets a "How many" field.
  - Service needs get "Units".
  - The service needs section gets a switch: "Customers book the room or equipment directly, without staff".
- **Analytics:** provider utilization leaves out bookings without a provider.

## Tests

- Pools:
  - 3 dryers: three overlapping bookings fit and a fourth is refused.
  - A need of 2 units with 3 left fits; with 1 left it is refused.
  - Units come from one resource.
  - A block takes the whole pool.
  - Cancelling frees the units.
  - Slots match the allocation.
- Resource-only:
  - Offerings are created per resource and deactivated when a resource is turned off.
  - A guest books room A; room A is refused for an overlapping time while room B is free.
  - Booking without a provider works through public, reception and self-service reschedule and cancel.
  - Payment and receipts work.
  - The emails hide the provider row.
- A concurrency race on the last unit of a pool, over HTTP.
- Analytics ignores provider-less bookings.
- Browser QA through Agent Plane:
  - a guest books a meeting room on the public page;
  - reception creates one;
  - the settings show capacity, units and the resource-only switch;
  - in English and Amharic, at desktop and mobile.

## Out of scope

The customer choosing a quantity (party size), per-resource hours, a separate resource calendar, resource utilization in Insights, walk-ins for resource-only services, and businesses with no staff at all (service creation still needs a provider).
