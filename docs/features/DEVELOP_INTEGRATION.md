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
| Independent providers' bookings have no organization, but customer-profile linking and customer notifications require one. Every booking with an independent provider failed (found by `test_independent_booking`). | Profile linking and notifications step aside for bookings without a business. These customers get no profile and no emails until independent providers have business-level settings. |
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
| Develop's site-locked suites: `test_content_entitlements`, `test_content_gallery`, `test_content_newsletter`, `test_content_releases`, `test_content_upstream`, `test_independent_booking`, `test_organization_import`, `test_owned_booking`, `test_staff_invitations`, `test_website_setup`, `test_membership`, `test_registration` | All pass (182 tests). They ran through the opt-in below. |

These suites create and remove their own records, so they refuse every site except develop's named implementation sites. An isolated worktree site can now opt in with `bench --site <site> set-config -p isolated_test_suites 1` (`appointment.tests.isolated_site`). The flag works only together with `worktree_development`, and the suites' own site checks are unchanged.

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
| staff-ui: shell-interactions, owner-light, reception-light, provider-light, solo-light, multi-light, admin-dark | BQA-2026-00049 to 00055 (reception-light again: 00078) | Passed |
| develop-features/owner: reception stages, change reason, reception state; website, appearance and organization import pages; team invitation; personal details; Insights; the template's Journal link | BQA-2026-00077 | Passed |
| develop-features/independent: an independent provider's home, booking page settings and Insights | BQA-2026-00076 | Passed |

`appointment.tests.develop_features_qa_fixtures` sets up a Bloom booking on an open day and a QA independent provider. Its cleanup restores the location's reception state and revokes the QA invitation; invitations are kept as an audit record, so they cannot be deleted.

### Notes

- **Console warnings:** the staff-ui runs log framer-motion's "Reduced Motion enabled" warning. It is a development-only warning (`NODE_ENV !== "production"`) from the Vite dev server, logged because the QA browser requests reduced motion.
- **Socket.io 400:** the worktree stack's backend listens on `127.0.0.1` only, but the realtime server built its auth URL from the browser's host (`127.0.0.146`), so realtime auth failed. Setting `webserver_host: 127.0.0.1` in the stack's `common_site_config.json` fixed it: reception-light then had no network errors (BQA-2026-00078), and develop's realtime check in `test_owned_booking` passes. This is stack configuration, not app code.
- **Preview iframe:** the appearance and website pages log "Blocked script execution in 'about:srcdoc'". Develop's preview iframe is sandboxed without scripts by design.
- **Duplicate key:** the appearance page keyed palette swatches by color, which repeats within a palette. They are now keyed by position.
- **Timing-sensitive check:** in `customer-profiles/manager.yaml`, the heading check right after creating a customer failed once (BQA-2026-00071) and passed on the rerun.

## Open

- **English-only pages:** develop's new pages (website setup, content, newsletter, gallery, organization import, appearance, independent booking, solo setup) need translations.
- **Independent providers' customers:** they get no customer profiles and no booking emails yet.
- **Playwright spec:** develop's `qa/homepage-analytics.spec.mjs` drives develop's previous navigation and home, which the staff shell replaced. Its features are covered by the develop-features Agent Plane manifests instead.
- **Seeding:** the showcase seed does create customer profiles; an earlier note said otherwise, and that was wrong. Profiles created by the analytics world are now journaled, so cleanup removes them.
