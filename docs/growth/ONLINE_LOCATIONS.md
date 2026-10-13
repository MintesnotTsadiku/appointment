# Online locations

An online location is a place where customers meet a business by video or phone. It has no street address. Organizations and independent providers can have online locations next to their offices.

## Data model

### Location

| Field | Type | Rule |
|---|---|---|
| `location_type` | Select: `In person`, `Online` | Default `In person`. Rows that existed before this change are `In person`. |
| `video_platform` | Data, 60 characters | Online only. Free text. The settings form suggests Google Meet, Zoom, Microsoft Teams, Jitsi, WhatsApp video, Telegram video and Phone. |
| `meeting_link_mode` | Select: `Fixed link`, `Per booking` | Online only. Default `Fixed link`. |
| `meeting_link` | Data, 500 characters | Online and `Fixed link` only. Required in that case. Private. |

`Location.validate` calls `online_meeting.validate_location`:

- An in-person location clears the platform and the link.
- A `Per booking` location clears the link.
- A link must be an absolute `https://` URL with a dotted host, without spaces, control characters, a user name or a password.

### Appointment

| Field | Type | Rule |
|---|---|---|
| `is_online` | Check, read only | Set from the location type when the booking is made. It does not change later. |
| `meeting_link` | Data, 500 characters | Private. A new booking at a `Fixed link` location copies the location link. Staff set or change it for one booking. |

`booking.validate_document` calls `online_meeting.apply_to_booking`. An in-person booking never keeps a link.

### Appointment Notification

The `event` options have a new value, `Meeting link`. It follows the `send_confirmation` setting.

## Privacy rules

The meeting link is private. These rules apply:

1. Public APIs and public pages never contain the link. They get only `location_type` (`online` or `in_person`) and the platform label, from `online_meeting.public_place`. This applies to `independent.public_offering`, `personal_meet.get_organization_services`, `personal_meet.get_organization_meeting_windows` and `get_public_experience_snapshot`.
2. The booking response of `booking.book` does not contain the link. Whoever submits the form is not yet proven to own the email address.
3. Only the booked customer gets the link, through these channels:
   - the confirmation, reschedule, reminder, payment receipt and `Meeting link` emails (a "Join session" button and the link as text);
   - the same SMS events (`Join: <link>`). The link is part of the base text, so the SMS segment guard drops the optional extras first, never the link;
   - the manage page behind the signed manage token (`self_service.view`);
   - My bookings behind the emailed one-time sign-in (`my_bookings.bookings`).
4. Staff of the business that owns the booking see and change the link (`online_meeting.for_booking`, `online_meeting.set_link`, the desk list). `booking_access.require_access` decides. Other businesses get `PermissionError`.
5. The owner sees the fixed link of their own locations in the location settings (`locations.overview`). Location read access is scoped to the business (`booking_access.location_query`).
6. A cancelled or closed booking does not repeat the link in its email.

## Flows

### Owner: add an online location

1. Settings, Business locations (`/settings/location`), "Add an online location". The independent provider settings page (`/settings/independent-booking`) links to the same form with `?new=online`.
2. Choose "Online" in the type toggle, a platform, and "One fixed link" or "A link per booking". For a fixed link, enter the `https://` link.
3. An independent provider can tick "Offer these sessions here". Each ticked session gets an offering (EventType) at the new location, so customers can book it there.
4. A new location takes the opening hours of the owner's first location, or Monday to Friday 08:30 to 18:00.

The page uses `appointment.scheduler.locations` (`overview`, `save`, `remove`). It serves the organizations the user manages and the user's own independent business. Other staff see a calm empty state.

### Customer: book and join

1. The scheduler shows "Online video · <platform>" where an office shows its address. The confirmation shows the same line and says that the private link comes by email and on the booking page.
2. The confirmation email and SMS carry the link. Without a link yet (per booking), the email says the link comes before the session.
3. The manage page and My bookings show a join card:
   - before 15 minutes to the start: "Join opens at <time>" (Habesha time in Amharic);
   - from 15 minutes before the start to the end: "Join session";
   - without a link: "Your session link will appear here.";
   - after the end: "This session has ended."
4. For an online booking, the manage link stays valid until the end of the session, so the customer can join. Reschedule and cancel still close at the start.

### Staff: reception

- Desk cards, the overflow list and the calendar agenda mark online bookings with "Online".
- The booking dialog (organization bookings) and the edit dialog (independent bookings) have an "Online session" section: the platform, the current link, and a field to set or change the link for this booking. Saving queues a `Meeting link` email and SMS to the customer.
- Walk-ins need an in-person place. The walk-in form hides online locations, and `Walk In.validate` refuses them.

### Calendar files

The app makes `.ics` files only for the older personal-calendar flow (`helpers/ics_file.py`). Appointment emails have no `.ics` attachment, so there is no calendar location line to change.

## Contract for templates

`get_public_experience_snapshot` returns two public maps (`appointment-public-snapshot.v2`):

```json
"sessionFormats": {"<service id>": {"locationType": "online", "platform": "Google Meet"}},
"placeFormats": {"<location id>": {"locationType": "in_person", "platform": ""}}
```

- Keys: `sessionFormats` uses the service id, the `id` of a `services` item. `placeFormats` uses the location name (at most 64 characters), the `id` of a `locations` item.
- `locationType` is `online` or `in_person`. `platform` is a label, empty in person. There is never a link.
- A service whose bookable offerings meet both online and in person has no entry.
- Python payloads (`public_offering`, organization booking APIs) use `location_type` and `platform`. The frontend type is `SessionFormat` in `public-experience/types.ts`.

Templates decide the format of a session in this order (`lib/online-session.ts`, `sessionMeetOf`):

1. the content `format` of the item (the owner's choice in the editor);
2. `locationType` from `sessionFormats` (an online place with the platform "Phone" means `phone`);
3. words in the session name, in English or Amharic.

Places use the content `format`, then `placeFormats`, then `in_person`. The Ergata template follows these rules, so an online location shows "Online video" without any content. Website setup (`setup.prefill_sections`) now adds an online place as an online card (`format: online`, the line "Online video · <platform>"), after the offices.

## Showcase

`appointment.tests.template_ergata_qa_fixtures` makes the Yared Tesfaye Counselling "Online video room" an Online location on Google Meet with the fixed, fictional link `https://meet.google.com/ytc-room-one`. Its session and place content has no `format`; the template derives it. The fixture also makes two online bookings: one whose join window is open now (Selamawit Bekele, for the manage page) and one on the first free day (Dawit Mengistu, for the reception desk). Re-run `setup()` shortly before the browser runs: the join window closes 45 minutes after setup.

## Tests

- Frappe: `appointment/tests/test_online_locations.py` (15 tests, rolled back, `frappe.db.commit` patched): type validation, https rule, in-person and per-booking clearing, owner versus other business, walk-in refusal, `is_online` and the copied link, no link in public payloads or the booking response, per-booking link with permissions and the `Meeting link` message, email and SMS with only this customer's link, manage token required, the join window, the manage link until the end, and My bookings behind its session.
- Frontend: `frontend/tests/online-session.test.mjs` (join window timing, link rule, derived formats), part of `npm run test:dom`.

## Browser QA (Agent Plane)

| Manifest | Covers |
|---|---|
| `qa/manifests/growth/online-location.yaml` | Owner, en, desktop and phone, light: list with office and online cards, the online form, the https error, save with a session, per-booking choice. |
| `qa/manifests/growth/online-location-guest.yaml` | Guest, en, desktop and phone, light: online session card to the scheduler ("Online video · Google Meet"), booking, confirmation, manage page with "Join session", an invalid token. |
| `qa/manifests/growth/online-location-reception-am-dark.yaml` | Owner, am, phone, dark: desk card with the online badge, the online session section, a new link for one booking. |
