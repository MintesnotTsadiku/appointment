---
tags: [plan, appointment, customers]
created: 2026-10-03
status: built and verified 2026-10-03
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

The DocType grants permissions to System Manager only, so the REST API gives staff and guests nothing. Staff reach profiles only through these methods, which check the role in the business and return a role projection. Receptionists see every customer of their business, because a customer belongs to the business, not to one location.

### Staff UI

- `/customers` in the staff shell: search, list, "New customer".
- `/customers/:id`: contact details, preferred providers, notes, booking history, merge.
- Reception create-appointment and walk-in forms: a customer picker that searches as you type and offers "New customer".
- The reception booking dialog links to the customer's page.

### Updates to existing features

- Analytics: repeat customers are counted by `customer`, with the email count as fallback for unlinked rows.
- Support export: also accepts a customer ID.
- Notifications: `customer_language` uses the booking language, then the profile's preferred language, then the business language. The reminder opt-out stays keyed by business plus email.

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

Decided on 2026-10-03:

1. **Existing bookings:** link them by business plus email, after a dry-run report.
2. **Bookings without email:** staff may save a booking with name and phone, or name only. Public bookings still require email.
3. **Public booking matching:** link silently to an exact email or phone match inside the business.
4. **Providers:** name and booking history of their own customers. No contact details, no notes.

Customer self-service (customers viewing or editing their own profile) is not in this slice. Staff manage profiles.

## Run record

### What was built

- Schema: `Customer Profile` (random `CUS-` IDs), `Customer Preferred Provider`, `Appointment.customer`, `Walk In.customer`. `Appointment.client_email` is no longer mandatory in the schema. Backup `20261003_015934` was taken before the migrate.
- `customer_identity.py`: normalization, hashed per-business match keys, exact matching, `resolve_for_booking`, `merge`.
- `booking.validate_document`: a name is always required, and email only for public bookings. Every new booking links to a profile, or creates one.
- `customers.py`: `search`, `get`, `save`, `merge_preview` and `merge`, with role projections.
- Desk: `create_desk_appointment` and `add_walk_in` accept `customer`, and phone is optional on desk bookings.
- Analytics counts repeat customers by profile, with an email fallback. The support export accepts a customer ID.
- Staff UI: `/customers`, `/customers/:id` (edit, preferred providers, history, merge), the customer picker in the create-appointment and walk-in forms, and "Open customer" in the reception booking dialog.
- Strings are in English and Amharic. Patch `import_customer_profile_translations` imports them.

### Existing bookings

`link_customer_profiles.report()` (dry run) found 1,430 unlinked bookings and 612 customers, all grouped by email. None had only a phone, and none had no contact. The patch ran during migrate: 612 profiles, 0 unlinked bookings.

### Found and fixed during the build

- Every staff and walk-in booking needed an email, through both the validation code and the schema. Name-only and name-and-phone desk bookings now save.
- The desk form kept a 30-minute duration whatever the service, so the server refused a 45-minute service ("Booking duration does not match the offering"). Choosing a service now sets its duration.
- The desk create and walk-in toasts crashed React when the API returned `{"error": ...}`. `serverErrorMessage` now reads that shape.
- Test and QA fixtures (`QA-WF-*`, `QA-BROWSER-*`) left orphan profiles when they deleted their business. Both cleanups now remove their profiles. The showcase seeder journals the profiles its bookings create, so its cleanup removes them.

### Tests

| Suite | Result |
|---|---|
| `appointment.tests.test_customer_profiles` | 19 passed |
| `appointment.tests.test_customer_notifications` | 13 passed |
| `appointment.tests.test_customer_sms` | 12 passed |
| `appointment.tests.test_policy_manager` | 7 passed |
| `appointment.tests.test_workspace_overview` | 1 passed |
| `appointment.tests.test_scheduling_workflows` | 9 passed |
| `npm run -s test:dom` | passed |

`appointment.tests.test_analytics.verify` fails at line 82: the owner's and the receptionist's 30-day utilization rates both round to 11.8% (11.76% and 11.83%). The check compares rounded rates in a window that ends today, and utilization does not read customer fields. This is not caused by this slice.

### Agent Plane runs

| Run | Manifest | Result |
|---|---|---|
| BQA-2026-00381 | `customer-profiles/manager.yaml` | 3 of 4. The English desktop booking step failed on the desk duration bug above. |
| BQA-2026-00382 | `customer-profiles/provider.yaml` | Passed, 4 of 4 (1440×900 and 390×844, English and Amharic). 0 console, 0 network errors. The provider sees only their own bookings and no contact details. |
| BQA-2026-00383 | `manager.yaml`, English desktop, after the fixes | Passed. List and search, profile, two new customers, notes edit, merge, and a desk booking through the picker. 0 console, 0 network errors. |

Database check after run 00383: the source customer was Archived with `merged_into` set, and its phone was released. Its note moved to the target. The desk booking had no email and linked to the target. The QA customers and booking were deleted afterwards. The site has 612 profiles.

### Left open

- Customers cannot see or manage their own profile. Staff manage profiles (this slice's decision).
- Profile anonymization and a privacy export per profile are not built.
- Dates in the profile history use ISO dates. The staff audit already notes that there is no Amharic date locale.
- The receptionist sees a customer's whole booking history in the business, including bookings at other locations.
- Amharic copy needs a native speaker's review.
