# Phone-first booking

Customers in Ethiopia use their phone more than their email. This change makes the phone number the main contact in every booking form, and uses one phone rule in the whole app.

## What customers see

- Every booking form asks for the name, then the phone number (required), then the email (optional), then other people by phone number, then notes.
- The phone field accepts all the usual forms. When a number does not fit, the field shows one hint: "Enter a phone number like 0911 22 33 44 or +251 91 122 3344. International numbers start with + and the country code." The Amharic text is in the translation catalog.
- Other people coming are added as phone tags. Press Enter, type a comma, press Tab or leave the field to turn a number into a shaded tag on the same line. Paste several numbers to add each one. Backspace in the empty field removes the last tag. Each tag has a remove button. A wrong number stays in the field with the hint. At most 10 other people.
- The confirmation always shows the booking reference and the manage link, with Copy and Open buttons. A customer without email uses this link to change or cancel.
- My bookings still signs in by email. The page tells customers who booked with a phone number only to use the manage link from their confirmation.

## Decisions

1. One normalizer on the server: `appointment/helpers/phone.py`. `normalize_phone(value, default_region="ET")` returns the E.164 form, or `""` when the value is not a usable number (the old `notification_sms.normalize_phone` now calls it). `phone_problem(value)` returns `None` or the hint. `format_phone` gives the display form. The `phonenumbers` library (a Frappe dependency) checks international numbers.
2. One browser rule: `frontend/src/lib/phone.ts`, and the same rule in plain JavaScript for the server-rendered pages: `appointment/public/js/phone.js`. They do not use `libphonenumber-js`; they follow the server rules with a small calling-code table. The server stays the source of truth.
3. Shared test cases: `appointment/helpers/phone_vectors.json`. The Python tests and `frontend/tests/phone.test.mjs` read the same file. It has every example the product owner gave.
4. One component: `frontend/src/components/phone-input/index.tsx` has `PhoneInput` (one number), `PhoneTagsInput` (several numbers as tags) and `PhoneText` (a stored number, formatted, with a `tel:` link).
5. A public booking needs a phone number. A caller from before phone-first that sends only an email is still accepted, so older API callers and the idempotent showcase seeders keep working. The forms always send a phone.
6. Staff dialogs ask for the phone first and require it for a new booking or walk-in. The staff API still accepts a name-only booking, and editing an older booking that has no phone does not ask for one.
7. Customer identity matches the phone first, then the email. When the phone and the email match two different profiles, the booking links to the phone profile and the email profile is marked as a possible duplicate.
8. Guest rate limits count bookings per phone (`guest_booking_limit_per_phone`, default 3) and per email when there is one (`guest_booking_limit_per_email`, default 3, still honoured).
9. Email confirmations go only to bookings with an email. A booking without one records a skipped email (`no_recipient`). SMS uses the normalized phone and still needs the SMS gateway; in development no SMS is sent.
10. Showcase businesses keep their deliberately non-dialable numbers ("000 000 0101"), so a public showcase never shows a number that can belong to a real person. The seeders use `phone.placeholder_numbers()` for this. Everything else goes through the rule.
11. Personal calendar meetings (`/schedule/in/...`) still need an email, because the invitation goes by email. They also ask for the phone first.

## The phone rule

Spaces, dashes, dots and parentheses are ignored. `00` at the start means `+`.

| Typed | Stored | Shown |
|---|---|---|
| `+251911223344`, `0911223344`, `911223344`, `251911223344`, `0911 22 33 44` | `+251911223344` | `+251 91 122 3344` |
| `+251711223344`, `0711223344`, `711223344` (Safaricom) | `+251711223344` | `+251 71 122 3344` |
| `+2510911223344` (extra 0) | `+251911223344` | `+251 91 122 3344` |
| `0111234567` (Addis Ababa landline) | `+251111234567` | `+251 11 123 4567` |
| `+44 20 7946 0958`, `0044 20 7946 0958` | `+442079460958` | `+44 20 7946 0958` |
| `447911123456` (international without +) | `+447911123456` | `+44 7911 123456` |
| `0911 22 33`, `12345`, `call me`, `+0911223344` | not accepted | the hint |

1. An Ethiopian mobile number is 9 or 7 followed by 8 digits. It is accepted with or without `+251`, `251` or `0` in front.
2. Other Ethiopian numbers (landlines) need `0` or `251` in front and must be valid in the phone metadata.
3. A number that starts with `+` must be a valid international number.
4. Digits without `+` that are not an Ethiopian pattern are read as `+<digits>`. They are accepted when that is a valid number.

The browser accepts a few numbers that the full metadata refuses (for example an unused landline range). The server then refuses them with the same hint.

## Data model

- `Appointment.participant_phones` (Small Text): other people's numbers in E.164 form, one per line.
- `Walk In.participant_phones` (Small Text): the same for a walk-in. Assigning the walk-in copies them to the booking.
- Every phone field is stored in E.164 form when it is saved or changed: Appointment and Walk In `client_phone`, Customer Profile `primary_phone`, and through a validate hook Organization, Provider, Location, Growth Partner, Landing Page Settings and Client Profile phones. An unchanged older value that is not valid does not block other edits.
- Patch `appointment.patches.v0_1.normalize_phone_numbers` writes the E.164 form of valid stored numbers, and the new match key of a Customer Profile. It leaves values that are not valid as they are and counts them. It skips a profile when another profile of the same business already has that number (counted as a conflict). It only writes values that change, so it is safe to run again.

On the development site, the patch read 49 stored numbers: 2 changed (Appointment), 1 already in E.164 form (Customer Profile), 46 not valid and left as they are (30 seeded walk-ins with `0000000000`, 11 locations and 5 organizations with showcase placeholder numbers), 0 conflicts.

## APIs

- `appointment.scheduler.booking.book(offering_id, start_time, end_time, user_name, user_email="", request_id, user_phone="", ..., participant_phones="")`: `participant_phones` is a list or comma-separated text. The request digest includes the participants only when there are some, so earlier digests stay the same.
- `appointment.api.personal_meet.book_time_slot` passes `participant_phones` to `book`.
- `appointment.scheduler.api.desk.create_desk_appointment`, `update_appointment` and `add_walk_in` accept `participant_phones` and answer a bad phone with the hint (HTTP 400).

## Tests and QA

- `appointment/tests/test_phone_first.py`: shared cases, booking with phone only, phone and email, a bad phone refused with the hint, the same phone in another form is the same customer, other people by phone, too many people, email-only callers, saved phone fields, and the patch is idempotent.
- `appointment/tests/test_guest_endpoints.py`: the limit per email and the limit per phone.
- `appointment/tests/test_customer_profiles.py`: the phone match wins.
- `frontend/tests/phone.test.mjs`: the shared cases in the app rule and in the server-rendered pages rule.
- Agent Plane: `qa/manifests/growth/phone-first.yaml` (English, desktop, light), `phone-first-am-dark.yaml` (Amharic, mobile, dark) and `phone-first-walkin.yaml` (reception). Run `appointment.tests.phone_first_qa_fixtures.setup` before them and `cleanup` after them. The manifests that fill a booking form now type a phone number first.

## Follow-up

- My bookings sign-in by phone needs SMS codes. It stays email-based until the SMS gateway (AfroMessage token) is configured.
- SMS to the other people on a booking is not sent.
- The website editor's `locations` and `contact` phone fields have no `phone` pattern in `appointment/public_experience/section_editor.py`, so they are still plain text inputs.
