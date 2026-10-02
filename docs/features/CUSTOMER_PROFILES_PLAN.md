---
tags: [plan, appointment, customers]
created: 2026-10-03
status: draft, waiting for decisions
---

# Customer profiles plan

## Problem

A booking stores the customer only as typed text: `client_name`, `client_email` and `client_phone`. A business cannot see one customer's history in one place. Staff type the same details for every booking. Analytics counts repeat customers by email, and the support export finds a customer by email. Notification opt-outs and booking language are also keyed by email or by booking.

This slice adds a business-owned Customer Profile and links bookings to it. It is Slice 0 and Slice 1 of [the customer profile and resource capacity plan](../feature/customer-profile-resource-capacity-implementation-plan.md). Resources, rooms, equipment and shared capacity stay out of scope.

## Locked rules (from CONTEXT.md and the existing plan)

- A Customer belongs to one Business. There is no platform-wide customer.
- Name is required. Phone and email are optional.
- Names never merge profiles automatically.
- A customer may have several Preferred Providers.
- A User login is optional and is not the customer identity.
- Appointment stays the booking record. It keeps its contact snapshot after it links to a profile.
- The Assistants module `Client Profile` requires a User and is not reused.

## What exists now

| Area | Code | Fact |
|---|---|---|
| Contact validation | `booking.validate_document` (L228–230) | Requires `client_name` and a valid `client_email` on every Appointment, staff bookings included. |
| Staff create | `desk.create_desk_appointment` | Requires name and phone. Sends `client_email or ""`, which then fails validation. |
| Walk-ins | `desk.add_walk_in`, `assign_walk_in_to_slot` | Email is optional on the walk-in, but the Appointment insert needs one. |
| Analytics | `analytics.overview` (L91) | Repeat customers are counted by lower-cased `client_email`. |
| Support export | `support.customer_record(organization, email)` | Finds bookings by business plus exact email. Managers only. |
| Notifications | `notifications.is_opted_out`, `customer_language` | Opt-out is keyed by business plus email. Language comes from the booking or the business. |
| Access | `booking_access`, `membership` | Owner/Manager, Receptionist (scoped) and Provider roles per business. |
| Demo data | rich demo | About 1,430 bookings in five businesses, about 612 distinct emails, no phone numbers. |

## Design

### Data model

New DocType `Customer Profile` (module Scheduler), named by a random `CUS-` ID:

| Field | Type | Rule |
|---|---|---|
| `organization` | Link Organization | Required. Cannot change after a booking links to the profile. |
| `display_name` | Data | Required. |
| `primary_email` | Data (Email) | Optional. Stored lower-cased and trimmed. |
| `primary_phone` | Data (Phone) | Optional. Stored in `+251…` form through `notification_sms.normalize_phone`. |
| `email_key`, `phone_key` | Data, hidden, unique | SHA-256 of organization plus the normalized value. Empty when the value is empty. |
| `preferred_language` | Select `en`/`am` | Optional. Customer messages use it before the business language. |
| `status` | Select | Active, Archived. Anonymize waits for a later slice. |
| `private_notes` | Small Text | Staff only. Never in any guest response. |
| `preferred_providers` | Table `Customer Preferred Provider` | Provider (required, same business), optional Service, priority. |
| `merged_into` | Link Customer Profile | Set on the archived duplicate after a merge. |

`Appointment` gets `customer` (Link Customer Profile, optional). The contact fields stay as the booking snapshot.

The unique keys make one profile per email and one per phone inside a business. Two different businesses can hold the same email.

### Identity service

`appointment/scheduler/customer_identity.py`:

- `normalize_email`, `normalize_phone` and `match_keys(organization, email, phone)`.
- `find_matches(organization, email, phone)` returns exact key matches only. Names never match.
- `resolve_for_booking(doc)`: called from `validate_document` when `doc.customer` is empty. It links the booking to the profile that matches by email or phone. If none exists, it creates one from the snapshot. If email and phone point to two different profiles, it links to the email match and records a possible-duplicate flag for staff.
- `merge(source, target)`: manager only. It moves bookings, merges preferred providers and empty fields, archives the source with `merged_into`, and writes a Version entry.

### Booking paths

- Public `book()`: links or creates as above. The guest response does not change, so it never reveals that a profile exists.
- Staff create and walk-in assign: accept an optional `customer` argument. Staff pick a profile in the form, or the server resolves one from the typed contact.
- Email becomes optional for staff-created bookings (see "Decisions"). Public bookings still require email, because the confirmation goes there.

### Staff APIs (`appointment/scheduler/customers.py`)

| Method | Who | Purpose |
|---|---|---|
| `search(organization, query, page)` | Manager, Receptionist; Provider sees only customers of their own bookings | Paginated search by name, email or phone. |
| `get(customer_id)` | Same scope | Profile, preferred providers and booking history (authorized rows only). |
| `save(customer_id=None, **fields)` | Manager, Receptionist | Create or edit. Same-business checks on every link. |
| `merge_preview(source, target)`, `merge(source, target)` | Manager | Shows what moves, then merges. |

Permissions use `has_permission` and `permission_query_conditions` like Appointment, so the REST API cannot read another business's customers. `private_notes` and contact details go through role projections (see "Decisions").

### Staff UI

- `/customers` in the staff shell: search, list, "New customer".
- `/customers/:id`: contact details, preferred providers, notes, booking history, merge.
- Reception create-appointment and walk-in forms: a customer picker that searches as you type and offers "New customer".
- The reception booking dialog links to the customer's page.

### Updates to existing features

- Analytics: repeat customers are counted by `customer`, with the email count as fallback for unlinked rows.
- Support export: also accepts a customer ID.
- Notifications: `customer_language` reads the profile first. The opt-out also marks the profile.

### Linking existing bookings

An idempotent patch, with a dry-run report first (see "Decisions"). It groups bookings by business plus normalized email, creates one profile per group, and links the bookings. It never merges across businesses and never matches by name. It writes a count report.

### Tests

- Identity: normalization, keys, exact-match only, same email in two businesses gives two profiles, the email-versus-phone conflict.
- Booking: public `book()` links or creates without changing the response; staff create with an existing profile; name-and-phone booking.
- Permissions: a manager of another business cannot search, read, edit or merge; a provider sees only customers of their own bookings; a guest cannot read the DocType through REST.
- Merge: bookings move, the source is archived, Version entries exist.
- Linking patch: dry-run counts, idempotent second run, demo data counts.
- Browser QA through Agent Plane at 1440×900 and 390×844, in English and Amharic: customer list and search, profile page, booking from the picker, merge, and the provider's limited view.

## Decisions

1. **Linking existing bookings.** (a) Link them now by business plus email, after a dry-run report. (b) Link only new bookings.
2. **Bookings without email.** (a) Staff may save a booking with name and phone, or name only. (b) Keep email required everywhere.
3. **Public booking matching.** (a) Link silently to an exact email or phone match inside the business. (b) Always create a new profile for public bookings; staff merge later.
4. **What providers see.** (a) Name and booking history of their own customers, without contact details or notes. (b) Name and contact details, without notes. (c) Everything managers see.

Customer self-service (customers viewing or editing their own profile) is not in this slice. Staff manage profiles.

## Run record

Filled in after the build.
