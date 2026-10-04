---
tags: [plan, appointment, scheduling, resources]
created: 2026-10-04
status: built and verified 2026-10-04
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

## Run record

### What was built

- Fields: `Resource.capacity`, `Service Resource Need.units`, `Appointment Resource.units`, `Service.resource_only`, `EventType.resource`. `EventType.provider` and `Appointment.provider` are now optional. Backup `20261004_151650` was taken before the migrate.
- `resources.py`:
  - `usage` counts the units held per resource, and a block fills the resource. `allocate` and `available` fit units within the count.
  - Reception's view shows the units left for the booking.
  - `sync_offerings` keeps one offering per room. `bookable` lists the rooms for reception.
  - Saving a resource re-syncs the services that use its type. Lowering a count, like turning a resource off, is refused while upcoming bookings hold it.
- `booking.py`:
  - `offering()` accepts a resource-only offering (`provider` None). `lock_offering` uses the resource as the lock anchor.
  - Hours, notice, capacity, `book`, `slots` and `change` all work without a provider. Slots carry the room's name.
- The EventType controller validates resource-only offerings.
- The public services and meeting-windows endpoints label a room where a provider would be.
- Emails hide the Provider row when there is none and list "Room or equipment".
- Reception:
  - Create offers a room choice for resource-only services (`resource_name`).
  - The pre-checks for update and drag-reschedule skip bookings without a provider; booking validation covers them.
  - Cards show the room. The edit dialog shows the room as fixed.
- Analytics: provider utilization and top providers leave out bookings without a provider.
- UI:
  - Settings: "How many" on resources, with a count badge, and "Units" on service needs.
  - The service page has the switch "Customers book it without staff". It needs one resource type, with any free one.
  - Reception's move list shows the units left in a pool.
  - The public summary names the provider or the room being booked.
- Patch `import_pool_translations` imports the Amharic copy.

### Found during the build

- Switching an existing service to resource-only gives its upcoming staff bookings a room, by the existing rule that upcoming bookings are assigned where possible. Those bookings keep their provider. The QA fixture therefore uses a dedicated QA service, so no demo booking gets a room.
- The public summary never showed who is booked (`currentService.provider` was never set), for staff offerings as well. It now comes from the meeting-windows response.
- The booking-form manifest clicked "tomorrow", which fails when tomorrow is Monday (Bloom is closed). It now uses `appointment.tests.qa_days` to find the first open day.

### Tests

| Suite | Result |
|---|---|
| `appointment.tests.test_pools` | 13 passed:<br>• pools: units from one resource, room for two, a block fills the pool, cancel frees units, lowering the count is refused, units left in reception;<br>• resource-only: offerings follow the rooms and the mode, one need only, a room holds its time, a staff reschedule and a customer cancel, emails, reception create, the public list;<br>• a race over HTTP for the last units of a pool. |
| Resources, scheduling workflows, self-service, payments, notifications, receipts, analytics maths, workspace overview | passed |
| `npm run -s test:dom` | passed |

### Agent Plane runs

`appointment.tests.pools_qa_fixtures.setup` gives Bloom a QA service "Meeting room hire (QA)" booked without staff, with Room A and Room B, and a 10-unit "Dryers (QA)" pool. `cleanup` removes all of it.

| Run | Manifest | Result |
|---|---|---|
| BQA-2026-00478 | `pools/guest.yaml` | Passed, 2 of 2 (English desktop, Amharic mobile). The service list shows a card per room. The details step names "Room A (QA)", and the booking is confirmed. |
| BQA-2026-00479 | `pools/owner.yaml` (bloom.owner) | Passed, 2 of 2. The resources page shows the "10 units" badge. The service page shows the switch on. Reception shows the guest's booking on Room A and creates a booking on Room B. |
| BQA-2026-00481 | `booking-form/guest.yaml` | Passed, 4 of 4, with the open-day fix. |

All three runs had 0 console and 0 network errors. Database check: three bookings without a provider, two holding Room A at different times and one holding Room B, each with 1 unit. Earlier runs 00474–00477 and 00480 found a date field in reception that is a picker (the step was removed, and the date defaults to the reception day) and the Monday problem above.

### Left open

- The customer choosing a quantity (party size), per-resource hours, a resource calendar and resource utilization in Insights.
- A business with no staff at all: creating a service still needs a provider.
- The service page still shows its "Service providers" section for a resource-only service.
