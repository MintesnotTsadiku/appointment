---
tags: [plan, appointment, scheduling, resources]
created: 2026-10-03
status: built and verified 2026-10-03
---

# Rooms and equipment capacity plan

## Problem

Only the provider limits a booking. Two stylists at one studio can both be booked for a cut at 10:00 even when the studio has one chair. A clinic cannot say a consultation needs a consultation room. Bloom's public FAQ already says "room availability is shown with the booking", and nothing implements it.

This is Slice 2 of [the customer profile and resource capacity plan](../feature/customer-profile-resource-capacity-implementation-plan.md): one allocation path for a provider plus an exclusive room or piece of equipment. Pooled quantities, resource-only bookings and scheduled routes stay for later slices.

## Decisions (2026-10-03)

1. **Requirement:** a service needs "any free one of a kind" at the booking's location, for example one styling chair. It may instead name one specific resource. One unit of each kind per booking.
2. **Assignment:** the system picks a free resource. Customers never see resources; a slot is offered only when every required kind has a free resource. Reception sees the assignment and can move the booking to another free resource of the same kind.
3. **Downtime:** a manager blocks a resource for a period. Blocked time hides slots. If the block would clash with future bookings, the manager sees those bookings and must move them first.
4. **Existing bookings:** when a service starts needing a resource, or resources change, upcoming bookings are assigned where possible. Bookings that cannot be assigned are listed for staff. Nothing is cancelled automatically.

## What exists now

| Area | Code | Fact |
|---|---|---|
| Offering | `EventType` | One Service + Provider + Location. |
| Provider capacity | `booking.check_canonical_capacity` | Overlap on `occupied_from`/`occupied_until` for ACTIVE bookings of the provider's User, `for update`. |
| Lock | `booking.lock_provider` | Locks the provider's User row. |
| Gate | `booking.validate_document` | Every create, reschedule, cancel and status change, from every path (public, reception, walk-in, self-service, payments). |
| Slots | `booking.slots` | Runs `check_hours` + `check_capacity` per slot. |
| Demo | `demo/showcase.py` | Rooms are seeded as Locations. No chairs or equipment. |

## Design

### Records

| DocType | Fields | Notes |
|---|---|---|
| `Resource Type` | `organization`, `type_name`, `is_active` | A kind, e.g. "Styling chair", "Consultation room". Unique name per business. |
| `Resource` | `organization`, `resource_name`, `resource_type`, `location`, `is_active`, `notes` | One chair or room. Belongs to one location. Never deleted once used; deactivated instead. |
| `Resource Block` | `organization`, `resource`, `starts_at`, `ends_at` (UTC), `reason` | Downtime. |
| `Service Resource Need` (child of Service, field `resource_needs`) | `resource_type`, `specific_resource` | One row per kind. |
| `Appointment Resource` (child of Appointment, field `resources`) | `resource_type`, `resource` | The assignment. Its status and interval come from the booking. |

The assignment is a child of the booking, not a separate allocation table. A booking's status and occupied interval already decide whether it holds capacity, so the child needs no state of its own. Cancelled bookings keep their rows as history; they stop counting because only ACTIVE bookings count.

### Allocation (`appointment/scheduler/resources.py`)

`allocate(doc, service, location, occupied_from, occupied_until)` runs in `validate_document` after the provider check, when the booking is new, its time changed, it was reactivated, or its resource rows changed:

1. Read the service's needs. No needs means nothing to do.
2. For each need, list candidates: the specific resource, or active resources of that type at the booking's location.
3. Lock all candidate rows in name order (`select … from tabResource … for update`), after the provider lock. Every path locks provider, then resources, in the same order.
4. A candidate is free when no ACTIVE booking (other than this one) holds it over an overlapping occupied interval, and no block overlaps.
5. Keep the booking's current resource for that type if it is still free. Otherwise take the first free candidate by name. None free: "This time is no longer available."

Buffers already widen `occupied_from`/`occupied_until`, so resources get the service buffers too.

`slots` asks the same question without locking: a slot is available only when the provider and every need are free.

### Staff APIs (owners and managers; reception reads)

- Resource types and resources: list, save, deactivate.
- Blocks: list, save, delete. Saving refuses when future ACTIVE bookings hold the resource in that period and returns them.
- Deactivating a resource refuses the same way.
- Service needs: get and save on the service edit page. Saving runs the assignment for upcoming bookings and returns the ones left unassigned.
- `unassigned(organization)`: upcoming ACTIVE bookings that miss a required resource. Shown on the Resources page and as a warning in reception.
- `options(booking)` and `set_resource(booking, resource_type, resource, expected_modified)`: reception moves a booking to another free resource.

### Staff UI

- `/settings/resources` (managers): resources grouped by location and type, add and edit, active switch, blocks per resource, and "Bookings that need a resource".
- Service edit page: a "Needs a room or equipment" section.
- Reception booking dialog: the assigned resources, a change control, and a warning when a needed resource is missing. Appointment cards show the resource name.

### Tests

- Allocation: picks a free chair; a second overlapping booking takes the other chair; a third is refused even with a free provider; buffers count; other locations do not count; cancelling frees the chair.
- Specific resource, inactive resource, block hides slots and refuses booking.
- Slots match allocation.
- Reschedule keeps the chair when free, moves it when not.
- Staff change to another free chair; refused when busy; another business cannot see or change.
- Block and deactivate refuse with the clashing bookings listed.
- Saving needs assigns upcoming bookings and lists the ones it cannot.
- Concurrency: two overlapping bookings with different providers for the last chair, in separate HTTP sessions; exactly one wins.
- Browser QA through Agent Plane: Resources settings, service needs, public booking with one chair shared by two stylists, reception change, in English and Amharic, at desktop and mobile.

## Out of scope

Counted pools (10 dryers), resource-only bookings, customer choice of resource, scheduled classes and routes, opening hours per resource, resource analytics, seeding resources into the showcase demo.

## Run record

### What was built

- DocTypes `Resource Type`, `Resource`, `Resource Block`, `Service Resource Need` (Service `resource_needs`) and `Appointment Resource` (Appointment `resources`). Backup `20261004_010553` was taken before the migrate.
- `resources.py`: allocation inside `booking.validate_document`, after the provider lock and check. It is strict for a new booking, a new time, a reactivation or a staff choice. Any other edit only fills missing needs and never fails, so staff can still edit an unassigned booking. Resources are locked in name order after the provider. `booking.slots` hides a slot when any need has no free resource.
- Staff APIs: overview, types, resources (turning one off or moving it is refused while upcoming bookings hold it), blocks (refused with the clashing bookings listed), service needs (saving assigns upcoming bookings and lists the rest), the reception view and move, and resource names on the reception cards.
- `/settings/resources` (owners and managers): types with the services that need them, resources per location, blocks, and "Bookings that need a resource". The service edit page has a "Needs a room or equipment" section. The reception booking dialog shows the room or equipment with a "Move to" list, where busy ones are marked and disabled.
- Reception accepts `?date=YYYY-MM-DD`. The date picker's day cells carry `data-qa-date`, and the slots panel carries `data-qa-open`.
- Patch `import_resource_translations` imports the Amharic copy, including the server messages.

### Found and fixed during the build

- `Service.on_update` syncs booking URLs and calls `frappe.db.commit()`. Saving needs skips that sync (`resources._save_needs`) because needs do not change booking URLs, so a needs change no longer commits in the middle of a request. Other service saves still commit as before (existing behavior).
- The slots header counted every slot, including unavailable ones ("13 slots available" with none open). It now counts open slots, and says "No available time slots" when none are open.
- QA runs that add a resource assign it to upcoming demo bookings, as the feature does. The fixture cleanup releases them through the normal booking save before deleting the QA resources. Those demo bookings keep the Version entries of those saves. No email was queued.

### Tests

| Suite | Result |
|---|---|
| `appointment.tests.test_resources` | 14 passed, including a race over HTTP: two guests book the last chair with different stylists while the chair is locked, both wait, exactly one wins |
| Payments, Chapa, payments admin, self-service, notifications, SMS, profiles, scheduling workflows, policies, overview | passed |
| `npm run -s test:dom` | passed |

### Agent Plane runs

`appointment.tests.resources_qa_fixtures.setup` gives Bloom a "Styling chair (QA)" type needed by Cut and shape: chairs 1 and 2 at the main studio, both blocked all of the QA day (the first day Rahel has open times, 2026-10-06), and quiet chairs A and B at the quiet room. It books Rahel that day (quiet chair A). `cleanup` removes everything.

| Run | Manifest | Result |
|---|---|---|
| BQA-2026-00441 | `resources/guest.yaml` | Passed, 4 of 4 (1440×900 and 390×844, English and Amharic). Eden's Cut and shape on the QA day has 0 open times; Rahel's has open times at the quiet room. |
| BQA-2026-00442 | `resources/owner.yaml` (bloom.owner) | Passed, 4 of 4. English desktop adds Chair 3, sees a block over the booking refused with the booking listed, sees the service needs, and moves the booking to quiet chair B in reception. Amharic desktop moves it back to A. |

Both runs had 0 console and 0 network errors. Database check: the booking held quiet chair A at the end, Chair 3 existed, and only the fixture's two blocks existed. Earlier runs 00438–00440 found a fixture day that fell on the closed Monday, a test-order mistake in the manifest, and the cleanup problem above.

### Left open

- The showcase demo has no resources. Seeding them belongs in the explicit showcase seeder, if the demo should show them.
- Counted pools, resource-only bookings, customer choice, and per-resource opening hours are later slices.
- The empty-slots panel still has untranslated "Try:" hints and English slot `aria-label` suffixes ("(Booked)"). This is an older gap.
