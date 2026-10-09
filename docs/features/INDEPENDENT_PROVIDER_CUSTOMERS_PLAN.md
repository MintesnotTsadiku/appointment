---
tags: [plan, appointment, customers, independent-providers]
created: 2026-10-09
status: built and verified 2026-10-10
---

# Customers of independent providers

## Problem

An independent provider runs a business with no Organization record. Develop added this with `Provider.organization_status = "Independent"`, `Service.independent_provider` and `Location.independent_provider`. It uses the workspace key `Provider:<provider>`. Our customer features belong to an Organization:

- customer profiles;
- notification settings, notification records and opt-outs;
- manage links;
- the My bookings page;
- the staff customer pages.

Since the merge, these features step aside for bookings that have no organization. The customers of independent providers get no profile, no emails and no manage link.

## Decision (2026-10-09)

The user chose the "provider as business" option: an independent provider owns customer data the same way an organization does. This gives the same features: profiles, booking emails and reminders, manage links, My bookings and the staff customer pages.

## Design

### One owner key

A new module, `appointment/scheduler/business_owner.py`, resolves the owner of a booking, service, profile or workspace:

| Owner | Key | Filter on records |
|---|---|---|
| Organization | `<organization>` | `organization = <organization>` |
| Independent provider | `Provider:<provider>` (the same as develop's workspace key) | `independent_provider = <provider>` and `organization` not set |

The resolved owner has these values:
- `key`, `kind`, `organization` and `provider`;
- `display_name`, the organization name or the provider's display name;
- `logo`, `email`, `phone` and `timezone`;
- `public_root`, which is `/<slug>` for an organization and `/schedule/individual/<offering>` for a provider.

The customer modules use the owner. They do not read `doc.organization` directly.

### Records

| DocType | Change |
|---|---|
| Customer Profile | `organization` becomes optional. Add `independent_provider` (Link Provider). Exactly one of the two must be set. `email_key` and `phone_key` use the owner key. Existing keys are already prefixed with the organization, so they do not change. |
| Appointment Notification | `organization` becomes optional. Add `independent_provider`. |
| Customer Notification Settings | It is named by `organization`. Independent providers use the defaults: email on, SMS off, reminders 24 hours before. A provider record can come later. |
| Customer Notification Opt Out | `opt_out_key` uses the owner key. Add `independent_provider`. |

These changes add schema. Take a site backup before the migrate.

### Behavior

- **Profiles:** `customer_identity` finds and creates profiles for either owner. Merging and the staff customer pages (`customers.py`) accept the `Provider:<provider>` workspace. Access goes through develop's `independent.require_owner`.
- **Notifications:** confirmation, change, cancellation and reminder emails, with the business identity from the owner. The "book again" link is the offering's public path. SMS stays off for independent providers.
- **Manage links:** for an organization the link stays `/<slug>/booking/<token>`. For an independent provider it is `/schedule/individual/booking/<token>`, a new route that uses the same manage page.
- **My bookings:** the page `/schedule/individual/<offering>/my-bookings` lists the customer's bookings with that provider. The emailed one-time link and the device session work as they do for an organization; the token carries the owner key.
- **Staff:** the independent provider's navigation gains Customers and Notifications (`isAllowedDestination` and `primaryNav`).

### Out of scope

- Payments and receipts for independent providers. `payments.required()` is false without an organization.
- SMS for independent providers.
- Per-provider notification settings beyond the defaults.

## Tests

- **Backend** (`test_independent_customers`):
  - a booking creates and links a provider-owned profile;
  - matching is by email or phone within the provider only, never across owners;
  - emails are queued with the provider's name;
  - a reminder is queued;
  - opting out works per provider;
  - the manage link opens, reschedules and cancels;
  - My bookings lists only that provider's bookings;
  - another owner cannot read the profiles.
- **Regression:** the existing customer, notification, self-service and My bookings suites pass unchanged.
- **Agent Plane:**
  - a guest books an independent offering and opens the manage link;
  - My bookings for that provider;
  - the provider's Customers page;
  - English and Amharic, desktop and mobile.

## Run record

### What was built

- **`business_owner.py`:** resolves the owner of a booking, record, workspace key or offering. It gives the identity, contact, reply-to, language and public paths, and the record filters. An organization's key is still its name, so existing profile keys, opt-out keys, My bookings tokens and `/<slug>/booking/<token>` links do not change.
- **Schema:** Customer Profile, Appointment Notification and Customer Notification Opt Out get `independent_provider`, and their `organization` is no longer required. Backup `20261010_022213` was taken before the migrate.
- **Profiles:** `customer_identity` and `customers.py` work for either owner. Independent providers use the `Provider:<provider>` workspace key, checked by `independent.require_owner`. The merge stopgaps that skipped bookings without an organization are removed.
- **Notifications:** the owner's name, logo and contact are used, and the "book again" link points to the offering. The reminder job and opt-out also work per owner. Independent providers get the default settings, read-only, and no SMS.
- **Manage links:** `/schedule/individual/booking/<token>`.
- **My bookings:** `/schedule/individual/<offering>/my-bookings`.
- **Staff:** Customers and Customer messages are in the independent provider's navigation. The sidebar header shows the provider's business with the Owner role, instead of "Administration".
- **Translations:** patch `import_independent_customer_translations`.

### Tests

| Suite | Result |
|---|---|
| `test_independent_customers` | 9 passed. A booking creates a provider-owned profile, matching stays within the owner, emails and a reminder are queued with the provider's name, opt-out is per provider, the manage link works, My bookings is scoped to the provider, another owner is refused, and a profile has exactly one owner. |
| Full backend regression (ours and develop's): 34 modules | All pass (404 tests). |

### Agent Plane runs

| Run | Manifest | Result |
|---|---|---|
| BQA-2026-00106 | develop-features/independent-customers: the guest's manage link and My bookings (en desktop), and the manage page in Amharic (am mobile) | Passed |
| BQA-2026-00114 | develop-features/indep-provider: the provider's Customers list and profile, read-only notification settings (en desktop), and Customers in Amharic (am mobile) | Passed |
| BQA-2026-00108, 00109, 00110, 00111, 00112, 00115 | develop-features/independent, my-bookings/guest, self-service/customer and staff, customer-profiles/provider, staff-ui/multi-light (regression) | Passed |

### Left open

- **Rescheduling:** for an independent provider, the reschedule time picker uses the public slot lookup, so it works only while the offering is published.
- **Organization only:** the walk-in check and SMS still work only for organizations.
