---
tags: [plan, appointment, notifications, independent-providers]
created: 2026-10-10
status: built and verified 2026-10-10
---

# Customer message settings for independent providers

Follows [customers of independent providers](INDEPENDENT_PROVIDER_CUSTOMERS_PLAN.md). That work sends independent providers' customers the default messages and no SMS, and shows the settings read-only.

## Decision (2026-10-10)

The user asked to continue with the next feature after the independent-provider customer work. This is that feature, the first one offered: an independent provider edits their customer message settings the same way an organization does, including turning SMS on.

## Design

- **Record:** Customer Notification Settings gets `independent_provider` (Link Provider), and `organization` is no longer required. Exactly one of the two must be set.
  - The record name is the owner key: the organization name, as it is today, or `Provider:<provider>`. Set the name in the controller's `autoname`, so existing records keep their names.
  - The change adds schema, so take a backup before the migrate.
- **Settings APIs:** `notifications.business_settings`, `get_settings` and `save_settings` take the owner key.
  - Saving for `Provider:<x>` requires `independent.require_owner`.
  - `get_settings` returns `editable: true` for the owner.
- **SMS:** an independent provider can turn SMS on, as an organization can. The platform AfroMessage account sends it. Remove the rule that independent providers have no SMS. Messages name the provider's business.
- **Staff page:** `/settings/notifications` for an independent provider is the same editable page that organizations get, with the SMS switch. Remove the read-only notice.
- **Defaults:** unchanged. A provider with no saved record gets the defaults: email on, SMS off, reminders 24 hours before.

## Tests

- **Backend:**
  - the provider saves settings, and a booking follows them (a confirmation is not sent when it is turned off);
  - the reminder lead time is used;
  - SMS is queued when it is turned on and the gateway is available;
  - another user cannot read or save the provider's settings;
  - organizations are unchanged.
- **Agent Plane:** the provider turns off confirmations, changes the reminder hours and turns on SMS, in English (desktop) and Amharic (mobile).

## Run record

### What was built

- **Settings record:** Customer Notification Settings gets `independent_provider`, and `organization` is no longer required. The controller names the record by the owner key, so existing organization records keep their names. It also checks that exactly one owner is set and that the owner does not change.
- **Settings APIs:** `business_settings`, `get_settings` and `save_settings` work by owner key. Saving for a provider requires the provider's owner.
- **SMS:** independent providers can turn SMS on, and the SMS text names the provider's business.
- **Staff page:** independent providers get the same editable Customer messages page as organizations. The read-only notice and its strings are removed.
- **Migrate:** backup `20261010_031010` was taken first. Patch `import_independent_settings_translations` adds two server messages.

### Tests

| Suite | Result |
|---|---|
| `test_independent_customers` | 16 passed (7 new). Covers defaults, settings that change what is sent, reminder lead time, SMS on and off, access refused to other users, organizations unchanged, and exactly one owner. |
| Full backend regression, 34 modules | All pass. |

### Agent Plane runs

| Run | Manifest | Result |
|---|---|---|
| BQA-2026-00125 | develop-features/indep-provider: the provider turns confirmations off, sets reminders to 6 hours (en desktop) and to 12 hours (am mobile), and saves | Passed, 0 console and 0 network errors |
| BQA-2026-00126, 00127 | develop-features/independent-customers, customer-notifications/settings (regression for organizations) | Passed |

The dev site has no SMS gateway, so the SMS switch is disabled in the browser. The backend tests cover SMS with a test gateway.

### Found during QA

- **Static files:** the shared `sites/assets/appointment` link pointed into the retired feature worktree, so fonts failed on every stack. It now points to the develop worktree.
- **Stale web process:** after the migrate, saves failed with HTTP 400 until the stack was restarted.
