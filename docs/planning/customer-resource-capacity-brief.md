# Customer Identity and Resource Capacity Discovery Brief

Status: product and domain direction; not an implementation plan.
Updated: 2026-09-24.

## Decisions

- Customer identity belongs to a Business (Organization). A solo or freelance provider operates as their own business.
- A customer may have multiple preferred providers. Preference is an association, not ownership.
- The resource capability must support both resources used alongside a provider and true resource-only bookings.
- Capacity has three distinct modes: exclusive, pooled, and shared scheduled.
- A shared scheduled departure or session accepts independent customer capacity claims until its limit is reached.
- Existing Appointment Group behavior coordinates staff calendars and is not the customer seat-capacity model.

## Customer profile

A Customer Profile is a durable business-owned relationship record and does not require a User login. It receives an immutable generated customer ID. Name is required; phone and email are optional. Appointments link to the profile while retaining contact snapshots so historical bookings do not change when the profile changes.

`Customer Preferred Provider` is a child association with a Provider link, priority/order, optional service context, and notes. Every referenced provider must belong to the same business. A separate association DocType should replace the child table only if cross-profile querying or independent lifecycle behavior later becomes important.

Identity matching is tenant-local. Verified normalized phone or email may suggest a match, but names never auto-merge. Name-only entries create a new identity. Staff resolve ambiguous matches and merge duplicates explicitly. A linked User remains optional and represents portal authentication, not customer identity.

Core customer functionality:

- create a name-only walk-in or a contact-rich customer;
- search by generated ID, name, normalized phone, or email;
- view upcoming bookings, history, cancellations, and no-shows;
- store preferred providers, language, communication preferences, consent, tags, and private notes;
- select or create a customer during reception booking;
- merge duplicates with an audit trail;
- support privacy export, retention, anonymization, and deletion rules;
- add optional self-service access later without requiring every customer to register.

## Capacity model

An Offering describes what can be booked and declares everything required to fulfill it. A booking may require provider capacity, one or more resources, pooled quantities, or a scheduled shared capacity instance.

### Exclusive capacity

One overlapping allocation consumes the entire resource. Examples: one treatment room, one car rental, one camera, or one examination device.

### Pooled capacity

Overlapping bookings consume quantities from a shared inventory limit. Examples: ten identical chairs, five portable devices, or twenty desks. Pools remain scoped by business and location.

### Shared scheduled capacity

A business publishes a dated Scheduled Offering with a finite capacity. Independent customer bookings claim units from that same occurrence. Examples: a three-seat shuttle departure, a class with twelve places, or a guided tour.

Resource-assisted and resource-only bookings use the same capacity kernel:

- massage: therapist plus treatment room;
- home care: caregiver plus equipment;
- driving lesson: instructor plus vehicle;
- car rental: vehicle only;
- scheduled shuttle: vehicle/departure capacity, with driver optional as a provider allocation.

## Vehicle and route scenario

A provider can publish a booking link for a specific departure. The Scheduled Offering contains the vehicle, departure and arrival times, origin, destination, capacity, booking cutoff, and optional driver/provider. Each customer creates a separate booking with a positive integer seat claim. Remaining capacity equals the applicable limit minus active claims and temporary holds.

If every passenger travels for the entire route, one capacity counter is sufficient. If passengers board or leave at different stops, capacity is calculated per Route Leg. A claim occupies every leg between its boarding and destination stops. The booking is valid only when every occupied leg has enough remaining capacity.

Example for a three-seat vehicle:

- Customer A books School Gate to Market and consumes one seat on those legs.
- Customer B books Market to University and consumes one seat only from Market onward.
- Customer C may claim a seat wherever all required legs remain below three.

An exclusive car rental is a different capacity mode and cannot share the same interval with another renter. The UI and terminology must not blur seat booking with vehicle rental.

## Candidate domain records

- `Customer Profile`
- `Customer Preferred Provider` child association
- `Resource Category`
- `Resource` for serialized assets
- `Resource Group` for interchangeable assets or pools
- `Offering Capacity Requirement`
- `Scheduled Offering`
- `Route Stop` child rows and derived or persisted Route Legs
- `Booking Capacity Claim`
- `Booking Resource Allocation`
- `Resource Unavailability` for maintenance and manual blocks

Appointment remains the customer booking record. It links to the Customer Profile and may link to a Scheduled Offering. Contact details, effective interval, price, capacity quantity, and allocation facts needed for history are snapshotted.

## Transaction and availability invariants

- Capacity is checked and allocated in one database transaction.
- Provider, serialized resource, pool, and scheduled-capacity rows are locked in a deterministic order.
- Capacity is rechecked after locks are acquired.
- Appointment and allocations succeed or roll back together.
- Active holds expire and release capacity; confirmed allocations do not silently expire.
- Cancellation and quantity reduction release only the affected future capacity.
- Rescheduling moves claims atomically; the old allocation remains until the new allocation succeeds.
- Idempotency prevents retries from creating duplicate bookings or claims.
- Capacity never becomes negative and claims are positive integers.
- Allocations cannot cross businesses, unauthorized locations, or incompatible resource groups.

## High-value product features

### First release

- customer directory with fast reception search and quick rebooking;
- multiple preferred providers;
- provider plus room/equipment requirements;
- resource-only rental offerings;
- resource timeline showing booked, available, held, and maintenance periods;
- live remaining capacity on shared scheduled links;
- multi-seat booking and partial cancellation;
- waitlist with controlled promotion;
- maintenance blocks and manual unavailability;
- self-service confirmation, cancellation, and rescheduling with secure expiring links;
- utilization, occupancy, no-show, and resource downtime reporting.

### Strong follow-ons

- recurring classes, trips, and departures with per-occurrence exceptions;
- automatic substitution within a Resource Group;
- customer-selected versus automatically assigned resources;
- route maps, pickup instructions, stop-specific cutoffs, and arrival estimates;
- QR or code-based check-in and passenger/attendee manifests for authorized staff;
- deposits, cancellation fees, seat classes, and demand-based pricing;
- packages requiring several resources, such as vehicle plus driver plus equipment;
- waitlist notification through configured email, SMS, or messaging channels;
- customer favorites, one-click rebooking, household/dependent profiles, and saved accessibility needs;
- operational dashboards for resource availability, maintenance, capacity, and revenue.

## Security and privacy requirements

- Enforce business ownership on every customer, provider, resource, offering, allocation, and route reference.
- Never expose whether a phone or email exists in another business.
- Treat customer notes, contact information, manifests, pickup details, and accessibility needs as private data.
- Apply least-privilege role scopes: reception gets operational access; providers receive only authorized booking/customer data; managers control exports and merges.
- Audit profile merges, contact changes, allocation overrides, cancellations, capacity changes, and staff access to sensitive exports.
- Use secure, expiring, revocable booking-management links; do not identify a booking using guessable IDs alone.
- Rate-limit public availability, matching, booking, and management endpoints; add bot protection when abuse warrants it.
- Preserve CSRF and HTTP-method protections for authenticated writes and validate all public inputs server-side.
- Sanitize rich text and filenames and scan uploaded customer/resource documents where uploads are supported.
- Keep payment and notification webhooks idempotent and verify their signatures.
- Minimize retained personal data and define export, anonymization, deletion, and legal-retention behavior.
- Do not expose public passenger lists, exact private pickup addresses, internal notes, or other customers' remaining claims.

## Edge cases to design and test

### Customer identity

- two people sharing a family phone or email;
- recycled phone numbers and changed contact details;
- common names and name-only customers;
- one person appearing independently in multiple businesses;
- duplicate creation through concurrent desk and public bookings;
- profile merge when both profiles already have future bookings;
- minors or dependents represented by a guardian;
- blocked, archived, anonymized, or deleted customers with retained financial/history obligations;
- login account deletion without deleting the business-owned customer relationship.

### Resources and bookings

- simultaneous claims for the last seat or last pooled unit;
- provider available while a required room or device is unavailable;
- resource maintenance added after future bookings exist;
- resource deactivation, loss, or reassignment across locations;
- preparation, cleaning, travel, charging, and turnaround buffers;
- resource substitution after customers have been notified;
- pool quantities split across locations or incompatible variants;
- cancellation of one seat in a multi-seat booking;
- whole-departure cancellation versus one passenger cancellation;
- rescheduling when the destination occurrence lacks capacity;
- timezone and daylight-saving boundaries;
- a route or capacity change after bookings already exist;
- waitlist promotion racing with a new public booking;
- temporary holds abandoned during payment;
- capacity dimensions such as seats, wheelchair places, luggage, or weight limits;
- partial-route passengers whose overlapping Route Legs differ;
- recurring schedules with holiday, maintenance, or one-off exceptions.

## Delivery direction

Build one shared capacity kernel, then expose it through separate vertical slices within the first resource release:

1. provider plus exclusive room/equipment;
2. provider plus pooled equipment;
3. resource-only exclusive rental;
4. resource-only pooled inventory;
5. scheduled shared capacity with fixed full-route claims;
6. segment-aware route claims after fixed-route capacity is proven.

The first four slices validate the general allocation model. Fixed-route shared capacity validates independent claims against one scheduled occurrence. Segment-aware routes should follow because per-leg inventory, stop changes, pricing, manifests, and operational recovery materially increase complexity.

## Remaining product decisions

- whether the first shared-capacity experience is a shuttle, class, or another concrete vertical;
- whether customers may choose an exact serialized resource or only a category/group;
- how long unpaid or incomplete capacity holds last;
- whether name-only customers may receive self-service access and by what verification method;
- whether multi-dimensional capacity is required initially or one integer quantity is sufficient;
- which cancellation, refund, waitlist, and late-arrival policies are configurable per offering.
