# Referrals: business invites, "Bring a friend" and partners (workstream C)

Status: code complete. The code is not verified on the site. Frappe tests, migrate checks and Agent Plane runs wait for the site restore. Read "Incident" first.

## Incident on 12 October 2026 (read first)

### What happened

1. The first runs of `appointment.tests.test_growth_referrals` committed test data to the shared site. The booking-URL sync on `Organization.on_update` calls `frappe.db.commit()` (`appointment/scheduler/booking_url_manager.py`). `workspace.publish` saves the Organization, so the sync committed the test savepoint. One more unknown commit also occurred.
2. To remove the leaked records, I ran a cleanup script in `bench console`. On its second run, the list of leaked users was empty. Each filter then fell back to `["in", [""]]`. Frappe reads that filter as `ifnull(field, '') in ('')`, which matches every row where the field is empty. In practice that was every row. The script committed.
3. The script deleted these records on the shared development site:
   - all Service, EventType, Location and Customer Profile records (the live count went to 0);
   - about 1,430 Appointment records (13 were left), with their Appointment Notification and Booking Payment rows;
   - the child rows (Opening Hours and the other child tables) and attached File records of the deleted Service, Location and EventType records. `delete_doc` ran with `force=True` and `delete_permanently=True`, so there are no Deleted Document rows;
   - possibly Business Membership rows that have an empty `user`.
   Organizations, Providers and Users were not touched.
4. A selective restore from the backup was started and then stopped. The permission system blocked it. Nothing was restored. No temporary tables remain.

### Restore

The restore needs the user's approval. The newest clean backup is `20261012_043211-...-database.sql.gz` in `$STACK_BENCH/sites/$SITE/private/backups/`. It was taken after the referral DocType migrate and before the test leaks. A selective restore script is at `$SCRATCH/growth-c/restore.py`. It loads the affected tables into temporary `zzr_*` tables and compares counts. It still needs an `INSERT IGNORE ... SELECT` step and a final `DROP` of the temporary tables.

### Changes made so it cannot happen again

- `test_growth_referrals.py` patches `frappe.db.commit` in `setUp` for every test (`mock.patch`, removed with `addCleanup`). It also sets `frappe.flags.syncing_booking_urls`, rolls back to a savepoint in `tearDown`, and gives every business a unique name. Partner tests use unique emails.
- Product code does not build `in` filters from lists that can be empty. `referral_rewards.real_bookings` returns 0 when an independent provider has no services.
- The QA fixture (`appointment/tests/growth_referrals_qa_fixtures.py`) deletes only what it recorded. Each delete uses one exact name, or one equality filter on one non-empty value (`_require` raises for any other value). Cleanup stops when nothing is recorded.
- Rule for all agents: do not use `["in", names or [""]]` in a delete path. Return early when the list is empty.

## Contract

| Part | Location |
|---|---|
| `business_code(owner_key)` (created on first use), `record_signup(code, owner_key, source=None, user=None)`, `remember_signup(user, ref, source)` | `appointment/growth/referrals.py` |
| Guest `appointment.growth.referrals.apply_partner(name, organization, email, phone, kind, message)` | defined in `appointment/growth/partners.py`, re-exported by `referrals.py` |
| Guest `appointment.growth.referrals.code_info(code)`: the code holder's name for the sign-up page | `referrals.py` |
| Owner `appointment.growth.referrals.overview(business)` | `referrals.py` |
| Codes, business facts | `appointment/growth/referral_codes.py` |
| Qualification, free-booking credits, `bonus_free_bookings(owner_key)`, daily job | `appointment/growth/referral_rewards.py` |
| Customer offer, vouchers, booking hooks | `appointment/growth/customer_referrals.py` |
| Owner offer, guest share and invite, staff voucher APIs | `appointment/growth/customer_referral_api.py` |
| Partner review (admin) | `appointment/growth/partners.py` |
| Admin overview | `appointment/growth/referral_admin.py` |

Sign-up pages pass `?ref=<code>` and `?source=<channel>` to `registration.signup(..., ref, source)`. The signup stores a pending Business Signup Source for the account. The first business that account creates takes the record (Organization `after_insert`, or Provider `on_update` when independent setup completes), so every new business has a source. A signed-in account that opens an invite link before it has a business can call `note_signup(ref, source)`.

## DocTypes (module Scheduler, System Manager only; staff use the whitelisted APIs)

| DocType | Purpose |
|---|---|
| Business Referral Code | One code per business (`owner_key`) or approved partner (`Partner:<name>`). The name is the code. |
| Business Signup Source | The sign-up channel of each new business: `Pending` until the account creates a business, then `Attached`. |
| Business Referral | Referred business → referrer business or partner. Status Pending → Qualified → Rewarded. One per referred business (unique `referred_owner_key`). |
| Free Booking Credit | Append-only free-booking credits. `credit_key` is unique (`<referral>:referred`, `:referrer`, `:partner`), so a reward is credited one time. |
| Growth Partner | Partner application: Pending, Approved or Rejected. Kind is association, school, trainer, telegram or other. |
| Customer Referral Offer | One per business: on or off, percent or custom reward, optional end date, "both friends" switch, voucher validity (90 days). |
| Customer Referral Code | One personal code per Customer Profile. |
| Customer Referral Reward | Voucher: Issued, Redeemed or Expired. Role Referrer or Friend. `reward_key` is unique per friend. |

## Rules and decisions

- **Codes.** A code is up to 6 ASCII letters from the name plus 3 digits, for example `BLOOMH427`. After 20 collisions the code uses 5 digits. Names without enough Latin letters use the neutral stem `BOOK`. Customer codes use the first name, for example `HANNA482`. Codes never change. A code created during a GET request sets `frappe.local.flags.commit`, so the code is kept.
- **Self-referral.** No referral is created when the code belongs to the new business, when the referrer business has the same owner account, or when a partner's email or linked business is the new business's. A business is referred only one time.
- **Real bookings** count toward the threshold when they took place: status Completed, or Confirmed with a start time in the past. Cancelled, pending and future bookings do not count. Bookings for the owner's own email, or for reserved test domains (`example.com/.org/.net`, `.test`, `.invalid`, `.localhost`, `.example`), do not count. Decision: counting only bookings that took place stops a business from creating future bookings and cancelling them later.
- **Qualification** runs in the Appointment `on_update` hook. The hook makes one indexed query and returns when the business has no open referral. A daily job (`referrals.daily`) rechecks every open referral, because the move of a booking into the past is not a save. Rewarding locks the referral row and is idempotent.
- **Reward ledger.** Decision: rewards are Free Booking Credit rows, not a counter, so each waived fee can be traced to a referral. `payments._ledger` waives the platform fee while `paid bookings <= Payment Settings.free_bookings + bonus_free_bookings(organization)`. A fee that is waived by the bonus has the note "Referral bonus". Booking payments exist for organizations only, so independent providers collect credits that apply when payments open to them.
- **Partners.** Approval issues a code. A partner earns `partner_reward_free_bookings` for each qualified business. If the partner has a linked business (`linked_owner_key`), the credit status is Credited. If not, the status is "Payout owed", for manual payout. The referred business always gets `referral_reward_free_bookings`. `apply_partner` allows 5 requests per IP per hour. It validates each field and does not show other applications (a repeated email is accepted without creating a second record).
- **Customer referrals.** A voucher is issued when a new customer of the same business books with a friend's code. A new customer is a profile with no other booking. The customer's own code gives no voucher. When the friend's booking is cancelled, its unused vouchers expire. The daily job expires vouchers after their date.
- **No automatic discount.** The booking payment code has no discount line: `quote_for` uses the catalog price, and `Appointment.discount_amount` is a fixed analytics snapshot. Decision: vouchers are not applied to online payments. Staff mark them as used at reception or on the customer page.
- **Flags.** `business_referrals_enabled`, `customer_referrals_enabled` and `partner_program_enabled` from Growth Settings switch each part off. The threshold and reward numbers come from Growth Settings.
- **Links.** The business invite link is `<product_url>/signup?ref=<code>`. The customer share link is `/schedule/org/<slug>?ref=<code>` for an organization and `/schedule/individual/<offering>?ref=<code>` for an independent provider. The scheduler reads `ref` directly, so the code does not get lost on the way through the landing page.

## UI

| Surface | Files |
|---|---|
| Grow page: "Invite other businesses" (code, link, Telegram and copy, progress list, empty state) and "Bring a friend offer" (switch, percent or own reward, who gets it, end date with a calendar popover, recent rewards) | `frontend/src/pages/grow/sections/ReferralSection.tsx`, `pages/grow/sections/referrals/*` |
| Confirmation and My bookings: customer share card (link, Telegram, copy) | `frontend/src/components/growth-referrals/CustomerShareCard.tsx`, placed before A's business prompt in `ConfirmationModal`, on `my-bookings`, and on the independent booking page |
| Scheduler invite banner: "You were invited by <first name>", with the offer when the friend gets it too | `components/growth-referrals/CustomerInviteBanner.tsx` on `organization-appointment` and `independent-booking` |
| Booking carries the code | `pages/booking-v2/hooks/useBookingSubmit.ts`, `independent-booking.tsx`, via `lib/referral-link.ts` (the code is kept per business for the visit) |
| Reception: "Referred by <customer>" and vouchers to mark as used | `pages/reception/components/BookingReferral.tsx` in `OwnedBookingActions` |
| Customer page: share code, friends brought, vouchers | `pages/customers/CustomerRewards.tsx` |
| Sign-up: `?ref` and `?source` sent to `registration.signup`, "Invited by <business>" | `pages/auth/signup.tsx`, `components/growth-referrals/ReferralInvite.tsx` |
| Admin: `/admin/referrals` (totals, referrals, sign-up sources for 30 and 90 days, partner approve and reject), nav item `nav-admin-referrals` | `frontend/src/pages/admin/referrals/*` |

Decision: the admin overview is a separate page next to Brand & growth, not a tab. The Brand & growth page has one save bar and a live preview for its settings form. A read-only list with review actions would conflict with that layout.

## Tests and checks

| Check | Result |
|---|---|
| `py_compile` on all changed Python files | pass |
| `node tests/referral-link.test.mjs` (appended to `test:dom`) | pass |
| `npm run -s test:dom` | pass |
| `$G/build.sh` | tsc 178 errors (baseline 178; none in workstream C files), `test:dom` pass, build pass |
| `appointment.tests.test_growth_referrals` (14 tests) | not run since the fixes. The last run before the incident: 10 passed, 4 failed. The fixes are in code: unique names; the qualification test now uses the "took place" rule; commit is patched. |
| Agent Plane | not run |

Strings, prepared and not merged: `$G/strings/referrals-ui.json` (128 strings) and `$G/strings/referrals-server.json` (20 strings). A read-only check against `en.json` found no case-only duplicates after one change ("Awaiting review").

## To run after the restore (in this order)

1. Confirm the restore: the Service, EventType, Location, Customer Profile and Appointment counts match the backup.
2. `$G/migrate.sh` only if the referral DocTypes are missing after the restore. A full restore of the 04:32 backup keeps them; the 04:29 backup does not.
3. `$G/strings.sh $G/strings/referrals-ui.json` and `$G/strings.sh $G/strings/referrals-server.json`.
4. `$G/test.sh appointment.tests.test_growth_referrals`. Then check that no rows leaked: `Business Signup Source`, `Business Referral` and `Free Booking Credit` counts do not change, and no new Organization or User remains.
5. `$G/build.sh`: typecheck at 178, `test:dom` and the build pass.
6. Agent Plane, each with fixture `appointment.tests.growth_referrals_qa_fixtures`:
   `qa/manifests/growth/referrals-owner.yaml`, `referrals-solo-am.yaml`, `referrals-customer.yaml`, `referrals-signup.yaml`, `referrals-admin.yaml`, `referrals-admin-dark.yaml`. Review every screenshot.

## Open items

- The database steps above.
- `appointment/growth/directory.py` and `year_review.py` (other workstreams) read with `["in", list or [""]]`. In reads, this can return rows with an empty field (for example, providers without an organization). They do not delete anything, but the results can be wrong.
- Partner payouts have no "mark paid" action yet. Admins can set Free Booking Credit to "Paid out" in Desk.
- Email Queue rows from fixture bookings stay (emails are muted on this site).
