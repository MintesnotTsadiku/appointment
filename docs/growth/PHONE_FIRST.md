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
- The assistant API (`appointment/assistants/api/assistant_api.py`) stores the VA phone (`User.mobile_no`) and the client phone (`Client Profile.phone`, and its user's `mobile_no`) in E.164 form, with the same rule for unchanged older values.
- The website editor's place phones (`locations` items) and contact phone (`contact.phone`) are stored in E.164 form when they change. See "Website editor" below.
- `Location` had five fields defined twice in `location.json` (`address_line_1`, `address_line_2`, `city`, `phone`, `timezone`). Both copies used the same field name, so the site had one database column for each and no data moved. The copies at the top of the field list were removed; the fields in the "Address Information" section stay. Migrate removed the extra DocField rows. On the development site all 14 locations kept their values (11 with a phone, 11 with an address, 14 with a city).
- Patch `appointment.patches.v0_1.normalize_phone_numbers` writes the E.164 form of valid stored numbers, and the new match key of a Customer Profile. It leaves values that are not valid as they are and counts them. It skips a profile when another profile of the same business already has that number (counted as a conflict). It only writes values that change, so it is safe to run again.

On the development site, the patch read 49 stored numbers: 2 changed (Appointment), 1 already in E.164 form (Customer Profile), 46 not valid and left as they are (30 seeded walk-ins with `0000000000`, 11 locations and 5 organizations with showcase placeholder numbers), 0 conflicts.

## APIs

- `appointment.scheduler.booking.book(offering_id, start_time, end_time, user_name, user_email="", request_id, user_phone="", ..., participant_phones="")`: `participant_phones` is a list or comma-separated text. The request digest includes the participants only when there are some, so earlier digests stay the same.
- `appointment.api.personal_meet.book_time_slot` passes `participant_phones` to `book`.
- `appointment.scheduler.api.desk.create_desk_appointment`, `update_appointment` and `add_walk_in` accept `participant_phones` and answer a bad phone with the hint (HTTP 400).

## Website editor

The section editor has a `phone` field kind (`appointment/public_experience/section_editor.py`). The place phone of each place card and the contact phone use it. The editor shows them with `PhoneInput` and checks them with `lib/phone.ts`. A number that does not fit shows the shared hint under the field, and the editor does not save the section.

`setup.save()` calls `section_editor.normalize_phones` after the bilingual merge. A changed number is stored in E.164 form. A changed number that is not usable is refused with the hint and the field path (for example `items[0].phone`). A number that the stored section already has is not checked again, in the editor and on the server, so a showcase with placeholder numbers ("000 000 0106") can still save other edits. The showcase seeders run inside `phone.placeholder_numbers()` and keep their numbers. The workbook import (`organization_import/website.py`) refuses a contact phone row that does not fit, with the hint.

The safety notice's phone lines are not under the phone rule: they are emergency numbers such as 991 and 907. They are `plain` fields with the `dial` pattern: digits, spaces and `+ ( ) -`, the same rule as `section_schemas._notice`. The message is `staff.website.editor.issue.phone`.

Templates show every phone with `formatPhone` and a `tel:` link. The version 1 templates of Bloom, Meron, Abugida and Selam now do the same for the place phone.

## Assistant forms

The VA and client profile modals (`frontend/src/components/assistants/modals/`) use `PhoneInput`. A number that does not fit shows the hint under the field; the form sends E.164. The client detail modal shows the number with `PhoneText`, and the VA detail modal now shows it too. On a phone screen the phone field takes the full width.

The create calls of `frontend/src/lib/tasks-assistants/api.ts` sent the fields at the top level, but the server functions take one `data` argument, so the gateway refused every create ("missing 1 required positional argument: 'data'"). They now send `{ data }`. This fixes creating VA profiles, client profiles, assignments, tasks, task categories, task templates, task projects and assistant skills.

## Tests and QA

- `appointment/tests/test_phone_first.py`: shared cases, booking with phone only, phone and email, a bad phone refused with the hint, the same phone in another form is the same customer, other people by phone, too many people, email-only callers, saved phone fields, and the patch is idempotent.
- `appointment/tests/test_guest_endpoints.py`: the limit per email and the limit per phone.
- `appointment/tests/test_customer_profiles.py`: the phone match wins.
- `appointment/tests/test_website_editor.py`: the phone field kinds, a changed phone stored in E.164, a bad changed phone refused with the hint, stored placeholders that do not block other edits, the seeders' placeholders, and an owner's contact phone edit that keeps the Amharic title.
- `appointment/tests/test_phone_first.py`: the assistant API stores VA and client phones in E.164 and refuses a bad number.
- `appointment/scheduler/doctype/location/test_location.py`: each Location field is defined once and is in the field order.
- `frontend/tests/phone.test.mjs`: the shared cases in the app rule and in the server-rendered pages rule.
- Agent Plane: `qa/manifests/growth/phone-first.yaml` (English, desktop, light), `phone-first-am-dark.yaml` (Amharic, mobile, dark) and `phone-first-walkin.yaml` (reception). Run `appointment.tests.phone_first_qa_fixtures.setup` before them and `cleanup` after them. The manifests that fill a booking form now type a phone number first.
- Agent Plane: `qa/manifests/growth/phone-assistants.yaml` (VA profile on desktop, client profile on a phone, English, light). Run `appointment.tests.assistant_phone_qa_fixtures.setup` before it and `cleanup` after it; `stored_phones()` reads the stored numbers. The fixture deletes only its two profiles and their two users, by name.
- `website-editor.yaml` and `website-editor-am-dark.yaml` check the place phone hint (English and Amharic), the stored placeholder, and a contact phone stored in E.164 and shown as `+251 91 122 3344` with a `tel:` link.

Runs of 2026-10-15:

| Run | Manifest | Result |
|---|---|---|
| BQA-2026-00233 | `phone-assistants.yaml` | Passed. Stored: VA `+251711482602`, client `+251111234567`. 0 network errors. Console: the reduced-motion notice. |
| BQA-2026-00232 | `website-editor.yaml` | Passed. 0 network errors. Console: the known sandboxed preview notices and the reduced-motion notice. |
| BQA-2026-00231 | `website-editor-am-dark.yaml` | Passed. 0 network errors. Same known notices. |
| BQA-2026-00234 | `online-location.yaml` | Passed. 0 network errors. |
| BQA-2026-00235 | `phone-first.yaml` | Passed. 0 console errors, 0 network errors. |

## Follow-up

- My bookings sign-in by phone needs SMS codes. It stays email-based until the SMS gateway (AfroMessage token) is configured.
- SMS to the other people on a booking is not sent.
- The assistant pages and modals have English-only text apart from the phone field. They need translation keys.
