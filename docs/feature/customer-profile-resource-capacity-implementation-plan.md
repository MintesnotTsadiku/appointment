# Customer Profiles and Resource Capacity — Detailed Implementation Plan

Status: proposed implementation plan.
Updated: 2026-09-24.
Target application: Frappe `appointment` app with the React/Vite frontend.

Related context:

- [`CONTEXT.md`](../../CONTEXT.md) — canonical domain language.
- [`customer-resource-capacity-brief.md`](../planning/customer-resource-capacity-brief.md) — product discovery, feature opportunities, security, and edge cases.
- [`TECHNICAL_ARCHITECTURE_REFERENCE.md`](../TECHNICAL_ARCHITECTURE_REFERENCE.md) — earlier capacity analysis; useful evidence but not the implementation source of truth.
- [`MARKETPLACE_EXPANSION_ARCHITECTURE.md`](../marketplace-expansion/MARKETPLACE_EXPANSION_ARCHITECTURE.md) — earlier resource proposal; superseded where this plan differs.

## 1. Objective

Add durable business-owned customer profiles and a general capacity system that supports:

1. provider appointments requiring rooms or equipment;
2. pooled equipment quantities;
3. true resource-only rentals;
4. scheduled shared capacity such as a three-seat shuttle or a class;
5. a later segment-aware route model where passengers board and leave at different stops.

The work must preserve the existing canonical Appointment writer, provider-capacity protections, business membership model, public booking flow, role-scoped analytics, and historical appointment snapshots.

## 2. Locked product and domain decisions

- A Customer belongs to one Business (`Organization`), never globally to the platform.
- A solo or freelance provider operates through their own Business, so the ownership rule remains unchanged.
- A Customer may have multiple Preferred Providers.
- Preferred Providers are stored initially as a child table because their lifecycle belongs to the Customer Profile.
- A User login is optional and is not the customer identity.
- Name is required; phone and email are optional.
- Names never auto-merge identities.
- Appointment remains the canonical customer booking record.
- Appointments retain contact snapshots even after linking to a Customer Profile.
- Capacity supports `Exclusive`, `Pooled`, and `Shared Scheduled` modes.
- Provider-assisted and resource-only bookings use the same allocation engine.
- Existing `Appointment Group` is not reused for finite customer seat capacity.
- Existing `starts_at`, `ends_at`, `occupied_from`, and `occupied_until` remain the canonical time interval.
- Booking allocations, not cached calendars, are the source of truth for consumed capacity.
- Fixed full-route shared capacity ships before segment-aware route capacity.

## 3. Scope and release boundary

The first public resource release contains independently mergeable slices behind business-level capability flags:

- customer profiles and appointment linkage;
- provider plus exclusive room/equipment;
- provider plus pooled equipment;
- resource-only exclusive rental;
- resource-only pooled inventory;
- fixed-route shared scheduled capacity;
- management UI, public booking UI, analytics, audit, and security coverage for those modes.

Segment-aware routes are planned and modeled now but enabled only after fixed-route shared capacity is proven. Multi-dimensional capacity such as seats plus wheelchair spaces plus luggage is also deferred; the first implementation uses one positive integer capacity quantity per requirement.

Non-goals for the first release:

- global customer identities shared across businesses;
- automatic identity merging based on names;
- marketplace-wide resource discovery;
- dynamic pricing optimization;
- resource co-ownership across businesses;
- arbitrary multi-stop route optimization;
- insurance underwriting or fleet telematics;
- replacing Frappe User authentication.

## 4. Current-state constraints

- `Appointment.provider`, `Appointment.location`, `Appointment.service`, `client_name`, and `client_email` are currently required.
- `EventType` is the current published combination of service, provider, and location.
- `appointment.scheduler.booking` is the canonical writer and owns provider locks, hours, buffers, conflicts, retries, and history.
- Provider capacity locks the linked User and rejects overlapping active appointments.
- Customer support export currently finds bookings by organization plus email.
- Analytics currently identifies repeat customers by email.
- `Appointment Group` coordinates required staff calendars and does not track independent customer claims against finite seats.
- The Assistants-module `Client Profile` requires a User and must not be reused for scheduler customers.

## 5. Architecture overview

```text
Business
├── Customer Profile
│   └── Customer Preferred Provider[]
├── Provider
├── Resource Category
├── Resource Group
│   └── Resource[]
├── Service
├── EventType / Offering
│   └── Offering Capacity Requirement[]
├── Route Template
│   └── Route Stop[]
└── Scheduled Offering
    └── Scheduled Stop[]

Appointment
├── Customer Profile link + immutable contact snapshots
├── optional Provider allocation
├── optional Scheduled Offering
└── Booking Capacity Allocation[]
    ├── Resource
    ├── Resource Group quantity
    └── Scheduled Offering quantity and optional route-leg range
```

`EventType` remains the internal DocType name for compatibility, but the UI and domain language call it an Offering. A later rename is not required for this feature.

## 6. Frappe data model

### 6.1 Customer Profile

Create `appointment/scheduler/doctype/customer_profile/`.

| Field | Type | Rules |
|---|---|---|
| `customer_id` | Data | Generated immutable `CUS-<random>`; unique; read-only |
| `organization` | Link Organization | Required; immutable after bookings exist |
| `display_name` | Data | Required |
| `primary_phone` | Data / Phone | Optional; normalized server-side |
| `primary_email` | Data / Email | Optional; normalized server-side |
| `phone_match_key` | Data | Hidden unique hash of organization plus normalized phone; null when absent |
| `email_match_key` | Data | Hidden unique hash of organization plus normalized email; null when absent |
| `linked_user` | Link User | Optional; no ownership inference |
| `preferred_language` | Select | Optional |
| `timezone` | Data | Optional IANA zone |
| `status` | Select | Active, Inactive, Blocked, Archived, Anonymized |
| `tags_text` | Small Text | Initial searchable tags; migrate to structured tags only if needed |
| `private_notes` | Small Text | Staff-only projection |
| `communication_consent` | Check | Explicit consent state |
| `consent_recorded_at` | Datetime | Required when consent is set |
| `preferred_providers` | Table Customer Preferred Provider | Zero or more rows |
| `merged_into` | Link Customer Profile | Set on archived duplicate |
| `is_demo_data` | Check | Fixture ownership only |

Controller invariants:

- require organization and display name;
- normalize phone and email before validation;
- require at least one contact method only when the selected workflow demands it, not globally;
- derive tenant-scoped match hashes without exposing raw values;
- validate linked User and every Preferred Provider against the same business;
- reject duplicate provider/service preference rows;
- prevent organization changes after any appointment exists;
- prevent destructive deletion when retained appointments exist; archive or anonymize instead;
- require explicit manager authority for merge and anonymization;
- record changes with `track_changes` and a dedicated merge audit event.

### 6.2 Customer Preferred Provider child

Create `Customer Preferred Provider` as `istable: 1`.

| Field | Type | Rules |
|---|---|---|
| `provider` | Link Provider | Required; same business |
| `service` | Link Service | Optional preference context; same business |
| `priority` | Int | Positive; lower number is preferred first |
| `notes` | Small Text | Optional, private |
| `is_active` | Check | Default true |

Promote this association to a standalone DocType only if independent permissions, high-volume cross-customer queries, or a separate lifecycle becomes necessary.

### 6.3 Appointment changes

Extend `Appointment` with:

| Field | Type | Purpose |
|---|---|---|
| `customer` | Link Customer Profile | Nullable for migration; required for new scheduler bookings after rollout gate |
| `fulfillment_mode` | Select | Provider Assisted, Resource Only, Shared Scheduled; snapshotted |
| `scheduled_offering` | Link Scheduled Offering | Required only for shared scheduled mode |
| `capacity_quantity` | Int | Default 1; positive |
| `boarding_sequence` | Int | Segment-aware route claim; deferred feature flag |
| `destination_sequence` | Int | Must exceed boarding sequence |
| `boarding_label` | Data | Historical snapshot |
| `destination_label` | Data | Historical snapshot |

Keep `client_name`, `client_email`, and `client_phone` as immutable-at-booking snapshots except through audited staff correction. Preserve current `appointment_id`, request identity, history, time-zone, and occupied interval behavior.

Change `provider` from schema-required to conditionally required in the controller:

- Provider Assisted: provider is required.
- Resource Only: provider is optional.
- Shared Scheduled: provider is optional unless the Offering or occurrence requires a driver/instructor.

Every existing Appointment and EventType remains Provider Assisted during migration.

### 6.4 EventType / Offering changes

Extend `EventType` with:

| Field | Type | Purpose |
|---|---|---|
| `fulfillment_mode` | Select | Provider Assisted, Resource Only, Shared Scheduled |
| `capacity_requirements` | Table Offering Capacity Requirement | Required resources or pools |
| `customer_selects_resource` | Check | Otherwise allocation is automatic or staff-assigned |
| `allow_quantity` | Check | Whether customers may claim more than one unit |
| `max_quantity_per_booking` | Int | Positive upper bound |
| `hold_minutes` | Int | Checkout capacity hold; bounded by system policy |

Provider and location validation becomes conditional. Location remains required for the first release because schedules, timezone, public discovery, and pool scope depend on it. Resource-only offerings may use a virtual/depot location but cannot omit tenant and timezone context.

### 6.5 Offering Capacity Requirement child

| Field | Type | Rules |
|---|---|---|
| `resource_category` | Link Resource Category | Optional filter |
| `resource_group` | Link Resource Group | Preferred concrete requirement |
| `specific_resource` | Link Resource | Optional exact requirement |
| `quantity` | Int | Positive |
| `selection_mode` | Select | Automatic, Customer Selects, Staff Assigns |
| `required` | Check | Default true |
| `buffer_before` | Int | Non-negative minutes |
| `buffer_after` | Int | Non-negative minutes |

Exactly one of specific resource or resource group is required. All references must share organization and compatible location/category.

### 6.6 Resource Category

Business-owned classification with `category_name`, optional parent category, description, and active status. Categories are not global to avoid cross-tenant configuration leakage.

### 6.7 Resource Group

| Field | Type | Rules |
|---|---|---|
| `organization` | Link Organization | Required |
| `group_name` | Data | Required |
| `category` | Link Resource Category | Required; same business |
| `location` | Link Location | Required for first release |
| `inventory_method` | Select | Serialized or Pool |
| `pool_capacity` | Int | Required and positive for Pool; empty for Serialized |
| `auto_allocate` | Check | Whether engine selects a serialized member |
| `is_active` | Check | Default true |

A Serialized group derives available quantity from eligible member Resources. A Pool uses `pool_capacity` and does not create one Resource per unit.

### 6.8 Resource

| Field | Type | Rules |
|---|---|---|
| `resource_id` | Data | Generated immutable ID |
| `organization` | Link Organization | Required |
| `resource_name` | Data | Required |
| `category` | Link Resource Category | Required |
| `resource_group` | Link Resource Group | Optional; Serialized group only |
| `location` | Link Location | Required |
| `status` | Select | Available, Maintenance, Out of Service, Lost, Retired |
| `attributes_json` | JSON | Validated object with size limit; never queried as authorization |
| `opening_hours` | Table Opening Hours | Optional restriction |
| `use_location_hours` | Check | Default true |
| `turnaround_before` | Int | Non-negative |
| `turnaround_after` | Int | Non-negative |
| `is_active` | Check | Default true |

Do not store a booking calendar child table as authoritative state. Query Booking Capacity Allocations and optional indexed projections.

### 6.9 Resource Unavailability

Create a business-owned record linking one Resource or Resource Group to `starts_at`, `ends_at`, reason, status, and notes. Validate a positive interval and same-business links. Creating or extending a block that conflicts with confirmed future allocations requires an explicit manager override workflow and affected-booking report.

### 6.10 Route Template and stops

`Route Template` belongs to a business and contains ordered `Route Stop` child rows:

- stable `stop_code` within the route;
- sequence;
- public label;
- optional linked Location;
- optional latitude/longitude;
- pickup instructions;
- offset from route departure for scheduling estimates.

Changing a template never mutates an already published Scheduled Offering. Occurrences snapshot their stops.

### 6.11 Scheduled Offering

| Field | Type | Rules |
|---|---|---|
| `scheduled_offering_id` | Data | Generated immutable ID |
| `organization` | Link Organization | Required |
| `offering` | Link EventType | Must be Shared Scheduled |
| `provider` | Link Provider | Optional unless required |
| `resource` | Link Resource | Optional exact vehicle/room |
| `resource_group` | Link Resource Group | Optional until allocation |
| `location` | Link Location | Required |
| `route_template` | Link Route Template | Optional for non-route classes |
| `starts_at` | Datetime | Required |
| `ends_at` | Datetime | Required and later |
| `capacity` | Int | Positive |
| `booking_cutoff` | Datetime | At or before start |
| `status` | Select | Draft, Published, Closed, Cancelled, Completed |
| `public_slug` | Data | Unique public identifier, non-guessable suffix |
| `scheduled_stops` | Table Scheduled Stop | Immutable after first confirmed claim |
| `price_override` | Currency | Optional |

Publishing validates all requirements and freezes capacity-affecting configuration. Capacity may be reduced only when no active claim would be invalidated. Cancellation uses a workflow that identifies every affected booking.

### 6.12 Booking Capacity Allocation

Create one authoritative allocation row per capacity target consumed by an Appointment.

| Field | Type | Rules |
|---|---|---|
| `organization` | Link Organization | Required; copied from Appointment |
| `appointment` | Link Appointment | Required |
| `allocation_type` | Select | Resource, Resource Group, Scheduled Offering |
| `resource` | Link Resource | Exactly one target field |
| `resource_group` | Link Resource Group | Exactly one target field |
| `scheduled_offering` | Link Scheduled Offering | Exactly one target field |
| `quantity` | Int | Positive |
| `occupied_from` | Datetime | Required |
| `occupied_until` | Datetime | Later than start |
| `boarding_sequence` | Int | Optional route segment start |
| `destination_sequence` | Int | Optional route segment end |
| `state` | Select | Held, Confirmed, Released, Cancelled |
| `hold_expires_at` | Datetime | Required only for Held |
| `request_key` | Data | Idempotency key; unique where applicable |
| `released_at` | Datetime | Audit |
| `release_reason` | Small Text | Audit |

Do not hard-delete allocations during ordinary cancellation or rescheduling. Transition them to a released/cancelled state so history and audits remain explainable.

## 7. Capacity engine

Create a deep module under `appointment/scheduler/capacity/`:

- `models.py` — pure interval, quantity, and route-leg value objects;
- `requirements.py` — resolve Offering requirements into concrete capacity targets;
- `availability.py` — intersect hours, unavailability, existing allocations, and scheduled limits;
- `locks.py` — deterministic database lock keys and `FOR UPDATE` queries;
- `allocator.py` — hold, confirm, release, reschedule, and substitute allocations;
- `routes.py` — fixed-route and later per-leg capacity calculations;
- `errors.py` — stable domain errors safe for public mapping;
- `audit.py` — allocation decision and override audit records.

`appointment.scheduler.booking` remains the transaction orchestrator and canonical writer. It calls the capacity module; the capacity module does not commit. No controller or API handler calls `frappe.db.commit()`.

### 7.1 Deterministic locking

Within the booking transaction:

1. lock the provider User when Provider Assisted;
2. resolve capacity requirements;
3. derive lock identities for Scheduled Offering, Resource, and Resource Group;
4. sort lock identities by type and name;
5. acquire row locks in that order;
6. re-read active allocations under lock;
7. validate every requirement;
8. insert Appointment and allocations;
9. let Frappe commit only after the request completes.

This order prevents deadlocks when two bookings require the same resources in a different input order.

### 7.2 Exclusive capacity

Reject when an active allocation for the same Resource satisfies:

`existing.occupied_from < requested_end AND existing.occupied_until > requested_start`.

Apply the maximum relevant offering/resource turnaround buffers before comparison.

### 7.3 Pooled capacity

Under the Resource Group row lock, sum active overlapping allocation quantities. Accept only when:

`existing_quantity + requested_quantity <= pool_capacity`.

Never aggregate pools across locations. Pool capacity changes cannot fall below future confirmed usage.

### 7.4 Shared scheduled capacity

For fixed full-route claims, lock Scheduled Offering and sum active Held-not-expired plus Confirmed quantities. Accept only when total plus requested quantity does not exceed capacity.

For segment-aware claims, a booking occupies every integer leg in `[boarding_sequence, destination_sequence)`. For every occupied leg, sum quantities from claims whose ranges overlap using:

`existing.boarding_sequence < requested.destination_sequence AND existing.destination_sequence > requested.boarding_sequence`.

The claim succeeds only if every required leg remains within capacity.

### 7.5 Holds

- Default hold: 10 minutes; configurable within a bounded system range.
- Holds are created only when a flow genuinely needs checkout time.
- Expired holds are ignored by reads immediately and released by an idempotent scheduled cleanup job.
- Confirmation locks the same capacity target and converts Held to Confirmed.
- A failed payment never confirms capacity.
- A duplicate request key returns the original hold or booking result.

### 7.6 Reschedule, quantity change, and cancellation

- Acquire locks for old and new targets in the same deterministic order.
- Validate the new capacity before releasing old allocations.
- Save new allocations and release old allocations in one transaction.
- Quantity reduction releases only the difference.
- Partial passenger cancellation preserves remaining seats.
- Whole Scheduled Offering cancellation transitions all affected bookings through an audited bulk workflow and notification queue.

## 8. Customer identity service

Create `appointment/scheduler/customer_identity.py` with:

- contact normalization;
- tenant-scoped match-key derivation;
- exact match suggestions;
- explicit profile creation;
- appointment snapshot population;
- duplicate merge preview and execution;
- anonymization subject to retention policy.

Public booking behavior:

- never reveal whether contact data already exists;
- attach automatically only after an approved verification rule;
- otherwise create or defer matching without leaking identity;
- preserve the submitted contact snapshot;
- rate-limit lookup/matching paths.

Staff behavior:

- show exact and possible matches inside the authorized business;
- require deliberate selection when multiple profiles match;
- allow name-only creation;
- audit merge and correction decisions.

Backfill and runtime fallback must treat organization plus normalized email as legacy evidence, not as a universal identity guarantee.

## 9. API design

All writes use POST/PUT with typed parameters. Guest APIs return only public projections.

### 9.1 Staff customer APIs

- paginated customer search scoped through `managed_organizations()` and role membership;
- Customer Profile CRUD through permission-aware APIs;
- merge preview and manager-only merge document method;
- customer history projection using authorized Appointment rows;
- privacy export and anonymization as manager-only audited operations.

### 9.2 Resource management APIs

- Resource/Group/Category CRUD through normal DocType APIs plus controller validation;
- resource timeline aggregation endpoint;
- maintenance/unavailability creation with conflict impact preview;
- substitution and manual allocation as audited manager/reception actions according to role.

### 9.3 Public booking APIs

Extend the current `slots` and `book` orchestration rather than adding a second booking writer:

- public Offering projection;
- capacity-aware availability;
- sanitized Resource choices only when customer selection is enabled;
- Scheduled Offering list/detail by public slug;
- remaining-capacity projection with no customer or allocation identifiers;
- create/confirm/release hold;
- canonical booking request with quantity and optional stop sequences;
- secure self-service history/change/cancel using signed, expiring, revocable grants.

Never expose raw Frappe document names, linked User emails, internal notes, allocation rows, passenger lists, exact private addresses, or other customer claims through guest APIs.

## 10. Permissions

Add DocType permissions, `permission_query_conditions`, and `has_permission` enforcement for every new tenant-owned record.

| Role | Customer profiles | Resource configuration | Operational allocations | Exports/merge |
|---|---|---|---|---|
| Owner/Manager | Full business scope | Full business scope | Full business scope | Allowed with audit |
| Receptionist | Scoped operational read/write | Read; limited operational updates | Scoped create/reassign/cancel | Denied by default |
| Provider | Customers linked to authorized appointments; minimal projection | Assigned resources read-only | Own appointment allocations | Denied |
| Guest | No DocType access | Public projection only | Explicit booking endpoints only | Denied |

Controller validation must independently enforce same-business links even when server-side code uses `ignore_permissions` for the narrow public booking insert.

Field-sensitive data such as private notes, consent evidence, passenger manifests, and contact details must be returned through role-specific projections rather than relying only on generic DocType read permission.

## 11. Frontend implementation

### 11.1 Staff routes

Add authenticated React routes:

- `/customers` — search, filters, duplicate indicators, and quick booking;
- `/customers/:customerId` — overview, contacts, preferences, history, audit-safe notes;
- `/resources` — resources/groups with availability and maintenance state;
- `/resources/:resourceId` — timeline, attributes, upcoming allocations, maintenance;
- `/capacity` — cross-resource operational timeline;
- `/scheduled-offerings` — departures/classes list;
- `/scheduled-offerings/:id` — occurrence editor, capacity, claims, and impact warnings.

Integrate a customer picker into Reception and staff booking flows. It supports select-existing, create-name-only, show authorized possible matches, and preserves entered snapshots.

### 11.2 Offering settings

Extend the service/offering editor with progressive disclosure:

- fulfillment mode;
- provider requirement;
- exclusive/pooled requirements;
- quantity policy;
- customer-selection policy;
- turnaround buffers;
- hold duration;
- Scheduled Offering and route settings only for shared scheduled mode.

Invalid combinations are blocked on both client and server.

### 11.3 Public flows

- Existing provider booking remains visually stable.
- Resource-assisted flow shows resource choice only when configured.
- Resource-only flow replaces provider selection with resource/category selection.
- Shared scheduled page shows date/time, route or class details, booking cutoff, quantity selector, and live remaining capacity.
- Segment-aware route page adds boarding and destination stop selection before showing availability and price.
- Confirmation states exactly what was reserved and whether payment/notification is pending.
- Self-service management supports permitted cancellation, reschedule, and quantity reduction.

All new views require mobile, keyboard, screen-reader, empty, loading, expired-hold, sold-out, and error states. Light/dark themes and English/Amharic layout expansion must remain viable even if translation content is delivered separately.

## 12. Analytics and operations

Extend analytics without exposing customer PII:

- unique customers by Customer Profile with legacy email fallback during migration;
- new versus returning customers;
- preferred-provider conversion;
- resource occupied hours and available hours;
- serialized resource utilization;
- pool utilization by quantity-hours;
- Scheduled Offering load factor;
- route-leg load factor after segment support;
- hold abandonment;
- waitlist conversion;
- maintenance/downtime;
- cancellation and no-show rate by offering mode.

Historical limitations must be explicit when capacity or schedules are not snapshotted. Scheduled Offering and Allocation records provide stronger historical facts than recomputing from current resource configuration.

## 13. Migration and rollout

### 13.1 Schema migration

- Add DocType JSON and controller files.
- Modify Appointment and EventType schema.
- Run only site-scoped `bench --site <isolated-site> migrate` on an authorized isolated runtime.
- Do not migrate a shared or reference site from an individual implementation task.

### 13.2 Customer backfill

Create an idempotent post-model-sync patch:

1. scan legacy Appointments by organization in bounded pages;
2. normalize non-empty email and phone;
3. group exact organization-plus-email matches when unambiguous;
4. create Customer Profiles with migration provenance;
5. attach appointments while retaining snapshots;
6. create separate profiles for ambiguous or name-only records;
7. write a reconciliation report with counts and unresolved collisions;
8. never merge across organizations.

Support dry-run reporting in a separate command before applying the patch to meaningful data.

### 13.3 Compatibility

- Default every existing EventType and Appointment to Provider Assisted.
- Preserve existing public URLs and request payloads; omitted quantity means one.
- Keep legacy analytics/support fallback until backfill verification passes.
- Keep Provider required in existing UI flows while the controller makes it conditional by fulfillment mode.
- Add business capability flags so unfinished modes remain hidden.

### 13.4 Rollout gates

1. internal staff customer profiles;
2. provider plus exclusive resource;
3. pooled resource;
4. resource-only booking;
5. fixed-route shared scheduled capacity;
6. segment-aware route capacity;
7. remove legacy customer fallback only after reconciliation and release evidence.

## 14. Implementation slices

### Slice 0 — architectural records and fixtures

- Record ADRs for business-owned customer identity and unified capacity allocations.
- Add deterministic test fixtures for two businesses, solo provider, salon/clinic, resources, pools, and shuttle occurrences.
- Add capability flags and seed cleanup journal.

Exit: fixtures prove exact ownership and cleanup; no user-facing feature enabled.

### Slice 1 — customer profiles

- Create Customer Profile and Preferred Provider child DocTypes.
- Add normalization, match keys, permissions, customer search, and profile UI.
- Link Appointment to Customer Profile and preserve snapshots.
- Update reception booking, support export, and analytics fallback.
- Implement merge preview/merge and audit.

Exit: name-only and contact-rich customers work; multiple preferred providers work; cross-business access fails.

### Slice 2 — capacity kernel and exclusive assisted resources

- Create Resource Category, Group, Resource, Unavailability, Requirement, and Allocation DocTypes.
- Implement pure interval logic, deterministic locks, exclusive allocation, release, and reschedule.
- Extend EventType and staff Offering editor.
- Add provider plus room/equipment public and staff booking flow.

Exit: therapist plus room cannot double-book either provider or room under concurrent requests.

### Slice 3 — pooled and resource-only modes

- Add pooled quantity calculations.
- Make provider conditional by fulfillment mode.
- Add resource-only availability and booking UI.
- Add resource timeline and maintenance conflicts.

Exit: pooled quantities never oversell; a car can be rented without a Provider; existing provider bookings remain unchanged.

### Slice 4 — fixed-route shared scheduled capacity

- Create Route Template, Scheduled Offering, stop snapshots, holds, and shared claims.
- Add departure publishing and public link.
- Add remaining capacity, multi-seat booking, partial cancellation, waitlist foundation, and whole-occurrence cancellation.

Exit: three independent customers can claim the three seats, the fourth is rejected or waitlisted, and cancellation releases the correct quantity.

### Slice 5 — segment-aware routes

- Enable boarding/destination selections and per-leg calculations.
- Add stop-specific cutoff, pricing hook, manifests, and operational views.
- Add route-change protections after claims exist.

Exit: non-overlapping passengers can reuse capacity on later legs while every leg remains within vehicle capacity.

### Slice 6 — analytics, hardening, and release evidence

- Add customer/resource/shared-capacity analytics.
- Complete accessibility, localization layout, observability, security, load, and recovery checks.
- Run migration rehearsal and rollback/disable drill.

Exit: all release gates and evidence are complete.

## 15. Testing strategy

### 15.1 Pure unit tests

- email and phone normalization;
- match-key tenant isolation;
- preferred-provider deduplication and priority;
- interval overlap and buffers;
- exclusive allocation;
- pooled quantity arithmetic;
- expired versus active holds;
- fixed Scheduled Offering remaining capacity;
- per-leg overlap and capacity;
- quantity reduction and partial cancellation;
- deterministic lock ordering;
- timezone and DST conversion.

### 15.2 Frappe integration tests

- Customer Profile validation and permissions for every role;
- business/provider/service/resource link consistency;
- name-only, phone-only, email-only, and linked-User customers;
- duplicate suggestion without unauthorized disclosure;
- merge and anonymization audit;
- provider-assisted booking with required Resource;
- pooled inventory allocation;
- provider-optional resource booking;
- Scheduled Offering publish/freeze rules;
- maintenance and deactivation with future allocations;
- cancellation, reschedule, substitution, and hold expiration;
- history snapshots after customer/resource edits;
- idempotent retry and changed-payload rejection;
- migration patch idempotency and reconciliation.

### 15.3 Concurrency tests

Use separate HTTP/database sessions, not only transaction-wrapped unit tests:

- two requests for the last exclusive Resource;
- two requests consuming the last pooled units;
- two requests for the last seat;
- confirmation racing with hold expiration;
- waitlist promotion racing with a public booking;
- reschedule racing with a new allocation;
- multi-resource bookings submitted in reversed requirement order to detect deadlocks.

Exactly one valid winner is accepted where only one capacity unit remains.

### 15.4 Security tests

- cross-business direct document access and list leakage;
- foreign linked IDs in public and staff payloads;
- customer existence enumeration by phone/email;
- guessable or expired management links;
- replayed cancellation/reschedule/payment requests;
- private notes, contact data, manifests, and pickup details omitted from guest responses;
- role revocation takes effect immediately;
- formula injection in customer/resource exports;
- HTML/script injection in names, notes, labels, and attributes;
- oversized JSON, quantities, stop lists, and public request bodies;
- negative, zero, fractional, and overflowing capacity quantities.

### 15.5 Browser QA

Create Agent Plane manifests for:

- owner customer/resource administration;
- manager merge/export and occurrence cancellation;
- receptionist customer picker and resource allocation;
- provider scoped customer/history/resource visibility;
- Guest provider-assisted booking;
- Guest resource-only booking;
- Guest fixed-route three-seat sellout;
- Guest waitlist and expired hold;
- mobile 390×844 and desktop 1440×900;
- light and dark themes;
- multi-business switching;
- self-service partial cancellation/reschedule.

Every accepted run requires explicit authenticated identity where applicable, zero unexpected console/network errors, retained screenshots/DOM/trace artifacts, and unique isolated runtime URLs.

### 15.6 Performance targets

- paginated customer search, no unbounded queries;
- capacity reads use indexed organization, target, state, and interval fields;
- no per-resource N+1 query in timelines or public availability;
- public capacity response remains bounded by date/occurrence window;
- define and measure p95 slot/occurrence availability and booking transaction latency before release;
- load test last-seat contention and a realistic resource timeline.

## 16. Security, privacy, and operational controls

- Tenant scope is checked in controllers and capacity services, not only API wrappers.
- `get_all` is restricted to trusted server internals; user-facing lists use permission-aware queries or explicit scoped projections.
- Guest APIs are allow-listed and disclose no PII or internal identifiers.
- Public request identities and management grants use cryptographically strong random values or signed tokens.
- Sensitive tokens are hashed at rest where replay does not require retrieval.
- Profile merges, anonymization, exports, overrides, substitutions, and bulk cancellations are audited.
- Customer notes and consent evidence are excluded from provider/guest projections unless explicitly authorized.
- Rate limits apply independently to catalog, availability, booking, hold, management, and identity-related endpoints.
- Background expiration, notification, and waitlist jobs are idempotent and tenant-scoped.
- Payment and messaging webhook signatures are verified and events deduplicated.
- Data retention distinguishes operational history, financial/legal records, contact data, and optional notes.
- Resource/route exports use CSV injection protection.
- Observability records capacity rejection reason, contention, hold expiry, allocation latency, waitlist promotion, and notification failure without logging secrets or raw PII.

## 17. Edge-case acceptance matrix

| Scenario | Required behavior |
|---|---|
| Shared family phone/email | Offer authorized possible matches; staff chooses; never auto-merge |
| Recycled phone | Preserve old history; require deliberate reassignment/verification |
| Name-only customer | Create distinct generated identity |
| Customer in two businesses | Two isolated Customer Profiles |
| Duplicate concurrent profile creation | Unique match-key conflict resolves safely without cross-tenant leakage |
| Profile merge with future bookings | Repoint links transactionally; retain snapshots and merge audit |
| Provider preference from another business | Reject |
| Resource maintenance after bookings | Require impact preview and explicit resolution |
| Resource moved to another location | Do not invalidate history; future allocations require compatible location |
| Last unit/seat contention | Atomic winner; no oversell |
| Abandoned payment | Hold expires; capacity becomes immediately available to reads |
| Partial multi-seat cancellation | Release only cancelled quantity |
| Whole occurrence cancellation | Cancel/notify all affected bookings with audit |
| Route edited after sales | Existing occurrence stop snapshot remains unchanged |
| Passenger legs do not overlap | Capacity can be reused |
| Passenger legs overlap | Sum never exceeds vehicle capacity |
| DST/timezone boundary | Store canonical UTC instants and business/resource zone snapshot |
| Provider removed from resource-only offering | Booking remains valid if no provider requirement exists |
| Lost/retired resource with future bookings | Block silent status change; require substitution/cancellation workflow |
| Waitlist versus public claim race | Same lock and deterministic promotion policy |

## 18. Recommended defaults requiring confirmation

- First shared-capacity vertical: scheduled shuttle/departure.
- Resource selection: automatic by default; customer choice per Offering.
- Hold duration: 10 minutes.
- Quantity: one integer dimension in the first release.
- Name-only self-service: unavailable until a contact verification method is added; staff can manage it.
- Provider-assisted resources and resource-only rentals ship in the same release but through separate gated slices.
- Segment-aware routes ship after fixed full-route capacity.
- Existing Policy Engine supplies cancellation/deposit policy where compatible; resource-specific policy extensions are explicit follow-up work.

## 19. Definition of done

The feature is complete only when:

- all new records and links are business-scoped and permission-tested;
- customer profiles support name-only identity and multiple preferred providers;
- existing appointments and public URLs continue to work;
- resource-assisted and resource-only bookings share one atomic allocation engine;
- exclusive, pooled, and fixed shared capacity cannot oversell under controlled concurrency;
- fixed-route booking links show accurate remaining capacity;
- cancellation, reschedule, holds, maintenance, and substitutions preserve invariants and history;
- migration is idempotent, reconciled, and rehearsed on an isolated site;
- role-specific staff and public UI flows pass browser QA on desktop/mobile and light/dark themes;
- analytics and exports remain aggregate/scoped and disclose no unauthorized PII;
- operational metrics, audit trails, recovery instructions, and known limitations are documented;
- implementation commits are clean, tests/builds pass, and no passwords or private browser artifacts enter Git.

## 20. Planning handoff

Before implementation begins, confirm the recommended defaults in Section 18 and split each implementation slice into tracer-bullet tickets with explicit dependency edges. Schema work requires an isolated `.localhost` runtime and site-scoped migration. The existing analytics demonstration runtime may be reused only if it is still healthy and explicitly selected for this new implementation; otherwise provision a new isolated feature runtime during planning, not midway through development.
