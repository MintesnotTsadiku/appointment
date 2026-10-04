---
tags: [integration, appointment, merge]
created: 2026-10-04
status: merged on the integration branch, verified 2026-10-04
---

# Integrating analytics-operations with develop

`origin/develop` was merged into `integration/analytics-operations-into-develop`. Before the merge, `feat/analytics-operations` was 30 commits ahead of `develop` and 41 behind. Both branches had changed 60 of the same files, and 43 of them conflicted.

## How the conflicts were resolved

Both lines of work are kept. The shadcn staff shell (`StaffShell`) stays; develop's pages and features are moved into it.

- **Navigation:** develop's AppTopNav, its account menu and its navigation preference are removed. Develop's website, organization import, appearance and independent-booking pages render in StaffShell and appear in the settings navigation.
- **Ported in our style:** team invitations, the personal details form, reception stages, the change reason, recovery, reception state, the dashboard filters, the independent-owner home and the onboarding structure choice. Develop's own new pages keep their English copy for now.
- **Analytics:** develop's module split is kept. Room use, the provider-less exclusions and the profile-based customer counts were moved into it.
- **Templates:** v1 and v2 packages both stay. They gain develop's content pages, Journal and Gallery links, and newsletter blocks.

## Problems the merge exposed, fixed

| Problem | Fix |
|---|---|
| The "Template original" appearance choice loaded v1 palettes and fonts, so v2 templates would publish with v1 fonts and colors. | The default choice uses the recipe's own primitives. Alternates come from the appearance options. |
| Reception stages locked the booking's provider, so they failed for bookings without a provider. | Stages lock the booking's resources. Recovery stays provider-only. |
| Develop turns off the staff session on any path that looks like a business page. `/customers` was not reserved, so it was treated as a business called "customers" and the session never loaded. | `customers` and `forgot-password` are reserved in the frontend and backend. A route test covers it. |
| Tests and manifests named demo records (`EVT-2026-000109`, `SRV-2026-0050`) and the feature site's URL, which only work on that site. | Offerings are looked up by service, provider and location (`appointment.tests.demo_offerings`). HTTP race tests use the site's `host_name`. Manifests get record names from their fixtures. |
| Several manifests clicked "tomorrow" or "next day", which fails when tomorrow is Monday (Bloom is closed). | They open the fixture's open day (`qa_days.open_day`) or `/reception?date=<booking day>`. |
| `customer-profiles/manager.yaml` left its QA customers behind, so a rerun failed with 409. | `customer_qa_fixtures.cleanup` removes them. |

## Verification site

A new isolated stack, `meet-beta-integration-analytics-operatio-a5df2b.localhost` at `http://127.0.0.146:47800`:

1. Backup `20261004_202011` was taken.
2. The site was migrated and seeded with the showcase, and `link_customer_profiles` was run.
3. Its Agent Plane browser policy allows `127.0.0.146`.

## Backend suites

| Suites | Result |
|---|---|
| Ours (17 modules) | All pass. |
| Develop's suites that run on any site: `test_analytics_math`, `test_organization_workbook`, `test_public_content_routes`, `test_content_monitoring` | Pass. |
| Develop's `bench execute` checks: `test_demo_analytics`, `test_homepage_analytics`, `test_internal_appearance`, `test_template_appearance` | Pass. |
| Develop's site-locked suites: content, independent booking, organization import, owned booking, staff invitations, website setup | Not run. They refuse every site except develop's named implementation sites. |

## Frontend

- `npm run test:dom`: passes.
- `vite build`: passes.
- `tsc -p tsconfig.app.json`: 178 errors. This is the same set of errors as `feat/analytics-operations`, all in older pages that the merge did not touch.

## Agent Plane runs

| Manifest | Run | Result |
|---|---|---|
| my-bookings/guest | BQA-2026-00027 | Passed. The one network error is the expected 403 when a used link is reopened. |
| quantity/guest, quantity/owner | BQA-2026-00028, 00029 | Passed |
| pools/guest, pools/owner | BQA-2026-00030, 00031 | Passed |
| resources/guest, resources/owner | BQA-2026-00032, 00056 | Passed |
| receipts/guest, owner, admin | BQA-2026-00034, 00035, 00036 | Passed |
| payments/guest, staff, settings | BQA-2026-00066, 00067, 00039 | Passed |
| admin-payments/admin | BQA-2026-00040 | Passed |
| self-service/customer, staff | BQA-2026-00068, 00069 | Passed |
| customer-profiles/manager, provider | BQA-2026-00072, 00065 | Passed |
| customer-notifications/guest, staff, settings | BQA-2026-00062, 00063, 00047 | Passed |
| booking-form/guest | BQA-2026-00048 | Passed |
| staff-ui: shell-interactions, owner-light, reception-light, provider-light, solo-light, multi-light, admin-dark | BQA-2026-00049 to 00055 | Passed |

### Notes

- **Console warnings:** the staff-ui runs log framer-motion's "Reduced Motion enabled" warning. It is a development-only warning (`NODE_ENV !== "production"`) from the Vite dev server, logged because the QA browser requests reduced motion.
- **Socket.io 400:** reception-light logged one socket.io polling 400 (a stale realtime session ID during navigation). Whether `feat/analytics-operations` shows the same 400 was not checked.
- **Timing-sensitive check:** in `customer-profiles/manager.yaml`, the heading check right after creating a customer failed once (BQA-2026-00071) and passed on the rerun.

## Open

- **Site-locked suites:** develop's site-locked suites need an opt-in flag, or a run on develop's own sites.
- **English-only pages:** develop's new pages need translations.
- **Profile backfill:** on a new site, the showcase seed does not create customer profiles until `link_customer_profiles` runs.
- **Playwright spec:** develop's spec (`qa/homepage-analytics.spec.mjs`) was updated for our location filter but not run. Browser QA here goes through Agent Plane only.
