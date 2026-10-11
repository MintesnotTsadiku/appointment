# Growth workstream A: customer touchpoints

Every booking is an advert for the platform, and a customer can become a business owner in one step.
This document is the plan and the run record for workstream A.

## Scope

1. A "Powered by" line on every customer touchpoint, with the text "Get your own booking page — free"
   (`growth().own_page_text`). The link goes to the platform sign-up with `?source=<channel>`.
2. "Book again" links that go straight back to the same business and service.
3. A card "Do you take appointments too?" on the booking confirmation.
4. One-tap setup from that card to a live booking page, with no personal data in a URL.

All parts are switched by **Growth Settings** (Platform → Brand & growth).

| Flag | Controls |
|---|---|
| `powered_by_emails` | Footer under confirmation, reschedule, cancellation, reminder, payment and receipt emails |
| `powered_by_sms` | Last SMS line, only when it costs no extra segment |
| `powered_by_pages` | `PoweredBy` on the confirmation screen, My bookings and the manage page |
| `book_again_enabled` | Book-again button in emails, SMS line in reminders, "Book again" on past bookings |
| `customer_business_prompt_enabled` | The card on the confirmation screen and the prefill endpoints |

## Design

### Links

- Sign-up: `<product_url>/signup?source=<channel>` (same rule as the SPA `PoweredBy`). Channels:
  `powered_by_email`, `powered_by_sms`, `powered_by_page`, `customer_prompt`.
- SMS sign-up link: `<short_host>/signup?source=powered_by_sms`, without the scheme.
- Book again (`appointment/growth/touchpoints.py`, `book_again_path`):
  - organization: `/schedule/org/<slug>/<offering>`. The scheduler route already preselects the service.
  - independent provider: `/schedule/individual/<offering>`.
  - If the offering is no longer public, the link falls back to the business booking page (`book_path`).
- There is no post-visit email. Thus the book-again button is on the confirmation, the reminder and the
  payment receipt email. In these emails it replaces "Open the booking page".

### Emails

`notification_email.render` adds `touchpoints.email_context(event, doc, language)`. The template shows a
small centred block under the card: the platform mark, "Powered by <product>", and the own-page link.
Texts use the email language (the booking/customer language logic is unchanged). Values are escaped.

### SMS segment guard

`touchpoints.sms_parts(text)` counts billed segments: GSM 03.38 (160 single, 153 per part, extension
characters count 2) or UCS-2 (70 single, 67 per part; Amharic is always UCS-2). `append_if_fits(text, line)`
adds a line only when the segment count does not change. Reminders try "Book again: <url>" first, then the
"Powered by" line. The em dash is replaced by "-" for SMS because it is not in the GSM table.

### Customer to business prompt

- `booking.book` now returns `manage_path` for every booking (before, only for held payments).
- `BusinessPrompt` (`frontend/src/components/business-prompt`) shows on the confirmation (Bloom-style
  scheduler `ConfirmationModal` and the independent booking page) when:
  the flag is on, this browser did not close it (`localStorage`, wrapped in try/catch), and the guest
  endpoint `appointment.growth.business_prompt.prompt` says yes. The server hides it for signed-in staff,
  for an email that already has an account (this covers every business owner), and for bookings older than
  30 minutes.
- "Create my page" calls `create_prefill(manage_token)` (guest, POST, 5 per 10 minutes per address).
  The server checks the manage token, stores name, email and phone in the cache for 30 minutes, and returns
  `/signup?source=customer_prompt&prefill=<nonce>.<expires>.<hmac>`. The URL has no personal data.
- `/signup?prefill=…` renders `pages/auth/quick-start.tsx`. `read_prefill(token)` (guest, rate limited)
  returns name, email and the business name (defaults to the person's name). The phone never goes to the
  browser.
- One submit: `registration.signup` (with `source` and `ref`; workstream C keeps them through
  `referrals.remember_signup`), sign in, then `business_prompt.quick_start(business_name, service_name, prefill)`.
  `quick_start` uses the existing `solo_setup.create`, `independent.create` (Monday to Friday, 09:00–17:00,
  30 minutes) and `independent.publish`. It sets the provider phone from the booking when the emails match,
  and spends the token. The person ends on "Your booking page is live" with the link, copy, and dashboard.
  Fields to type: password and "What do you offer?". The rest is prefilled.

## Files

- Backend: `appointment/growth/touchpoints.py`, `appointment/growth/business_prompt.py`;
  edits in `scheduler/notification_email.py`, `scheduler/notification_sms.py`, `scheduler/my_bookings.py`
  (`book_again_path` on past rows), `scheduler/booking.py` (`manage_path` always),
  `templates/emails/customer_notification.html`.
- Frontend: `components/business-prompt/index.tsx`, `lib/growth-touchpoints.ts`, `pages/auth/quick-start.tsx`;
  edits in `pages/auth/signup.tsx`, `booking-v2/components/ConfirmationModal`, `public-experience/independent-booking.tsx`,
  `my-bookings/index.tsx`, `manage-booking/index.tsx`, `package.json` (`test:dom`).
- Tests: `appointment/tests/test_growth_touchpoints.py`, `frontend/tests/growth-touchpoints.test.mjs`;
  `test_customer_notifications.py` now ignores platform links when it counts business links.
- QA: `appointment/tests/growth_touchpoints_qa_fixtures.py`, `qa/manifests/growth/touchpoints-guest.yaml`
  (en, light), `qa/manifests/growth/touchpoints-guest-dark.yaml` (am, dark). The fixture writes email previews
  to `appointment/public/qa-previews/` (served at `/assets/appointment/qa-previews/`) and removes them in cleanup.
- Strings: `$G/strings/A-touchpoints.json` (groups `growthTouchpoints.*`, `server.growth`).

## Run record

- `test_growth_touchpoints`: 16 tests passed (before the site restore; the commit patch was added after).
- Related modules passed: `test_customer_sms`, `test_my_bookings`, `test_payments`, `test_independent_booking`,
  `test_receipts`, `test_registration`. `test_customer_notifications` and `test_independent_customers` had
  2 errors each in `send_due_reminders`: appointments of organizations deleted by another workstream's test
  data ("Business not found."). Not caused by this workstream.
- Frontend: `tsc` 0 errors (baseline 178), `growth-touchpoints.test.mjs` passes, production build passes.
  `test:dom` stops earlier in `habesha-time.test.mjs` (workstream D, in progress).
- The site was paused for a restore from backup. Agent Plane runs are not done yet.

## Open after the restore

1. `$G/strings.sh $G/strings/A-touchpoints.json` (the catalog files already have the strings; this imports them again).
2. `$G/test.sh appointment.tests.test_growth_touchpoints appointment.tests.test_customer_notifications appointment.tests.test_my_bookings appointment.tests.test_customer_sms`
3. `$G/qa.sh qa/manifests/growth/touchpoints-guest.yaml appointment.tests.growth_touchpoints_qa_fixtures` and the same for
   `touchpoints-guest-dark.yaml`. Review every screenshot, including the four email previews.

No migrate is needed: this workstream adds no DocType.
