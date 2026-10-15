# Published content showcases

`appointment/demo/content.v1.json` is the versioned content manifest. Its
SHA-256 is `14ef94a251e780ca6dc4a82c8394db63d71e7f5424a2011ae4fff9e86e50a53b`.
The image catalog supplies local assets and verifies their checksums before use.

Each of the five fictional organization businesses receives three published articles,
two published gallery collections, one newsletter draft, and one unsent preview.
The seeder creates no subscribers or delivery campaigns. Sender verification
requests and previews stay in the local email inbox.

The second collection includes a typed YouTube link to Big Buck Bunny. Its
caption identifies it as an independent animation example, not business footage.
The manifest records Blender Foundation attribution and the CC BY 3.0 license.
The video is a link. It is not downloaded, embedded, or played automatically.

Run the existing explicit seeder on an approved isolated development site:

```bash
export PYTHONPATH=/home/minte/projects/training-apps/.worktrees/frappe-appointment-beta
export FRAPPE_BENCH_ROOT=/home/minte/.local/state/frappe-worktree-stack/feat-content-publishing-galler-5839d4/bench
cd "$FRAPPE_BENCH_ROOT"
bench --site meet-beta-feat-content-publishing-galler-5839d4.localhost execute appointment.demo.showcase.seed \
  --kwargs '{"base_url":"http://127.0.0.11:34340","anchor_date":"2026-09-26"}'
bench --site meet-beta-feat-content-publishing-galler-5839d4.localhost execute appointment.demo.content_world.inventory
```

The site must already have the explicit rich-demo development guard enabled,
muted email, and a paused scheduler. Installation and migration never seed data.
The private runtime journal records exact owned names and the manifest checksum.
Do not commit or print that journal. It also contains synthetic login credentials.

A repeat refuses a changed manifest or missing journal-owned records. It does
not adopt existing content. The existing rich-demo verification also checks
byte-identical records and private journal bytes across a repeat.

The showcase site is visual evidence only. Seedless owner acceptance uses
separate sites. Full browser, accessibility, and release gates remain required.

## Independent showcases

The seeder also makes independent-provider showcases: one practitioner who is
the business, with their own locations, sessions, provider page and published
website. Today there is one, Yared Tesfaye Counselling (Ergata Therapy,
`/yared-counselling`). The definitions are in `appointment/demo/` and are
shared with the QA fixtures. See `docs/growth/TEMPLATE_ERGATA.md`, section
"Showcase". These showcases get bookings, but no articles, galleries or
newsletters.

## Amharic names

Amharic pages show the names of the businesses and their people in Ge'ez
script. The English name stays in the record's own field. The Amharic name is
next to it:

| Record | Field | Shown on |
|---|---|---|
| Provider | `display_name_am` | Service chooser chips and avatars, time picker, booking summary and bar, details step, confirmation, provider page, directory |
| Organization | `organization_name_am`, `description_am` | Chooser heading and description, booking header, directory, link previews (`og:title`, `og:site_name`) |
| Public Site | `site_title_am` | Website header and footer on Amharic pages, `/book`, the booking header |
| Location | `location_name_am`, `address_am` (the whole address, one line) | Booking summary and details, provider page places, independent booking, manage booking, Amharic emails |

Manage booking (`self_service` view, `local_names`), My bookings (`local_business_name`, `local_provider`) and
the Amharic customer emails and SMS (`notification_email`, `notification_sms`, the My bookings link email) use the
Amharic business, provider and place names when they exist. English pages and messages keep the English
fields they showed before. An Amharic SMS still goes through the segment guard.

When an Amharic value is empty, the page shows the English value. The public
APIs send the names as `{en, am}` (`appointment/scheduler/localized_names.py`),
and the page shows its own language (`frontend/src/lib/local-names.ts`). The
website name goes into the release (`localTitle`) when the owner publishes: the
site's Amharic title, else the organization's Amharic name. The team section of
a website reads its own bilingual content, so the seeder writes the Amharic
names there too.

Owners edit the names in English and Amharic side by side:

- Settings › Business, "Names on your booking pages": the business name, the
  description and the name of each provider of the business
  (`public_names.save_business_names`, managers only).
- Settings › Profile, "Name on booking pages": the signed-in provider's own name.
- Website setup, "Website name in Amharic".
- Settings › Locations, the place form: "Name in Amharic" next to the name, and "Address in Amharic" under the
  address (`locations.save`, `location_name_am`, `address_am`; left out, they keep their values).

The seeder (`CONTENT_VERSION` 9, Ergata showcase version 6) fills the Amharic
names of the five organization showcases, their ten providers, their nine places
(name and address, from the website's own translations) and the Ergata practice
and its two places. A repeat run writes the same values.

### Portraits

The ten staff portraits of the five organization showcases are new photos of
the same people in each template's v3 art direction, with warm or neutral
grading. They were made with the Codex CLI (`gpt-6.1-sol`) as edits of the
earlier portraits, so each person keeps the same face. The files are in
`appointment/public/brand-experience/providers/warm/`:

- `<name>.webp` and `<name>.avif`, 768 × 768 (the team sections),
- `<name>-192.webp` / `.avif` and `<name>-96.webp` / `.avif` (avatars).

The Ergata portrait has the same small variants next to it. The scheduler APIs
send the 192 px file as the avatar (`localized_names.avatar`), about 4–7 KB
instead of 40–75 KB. Each file and its checksum is in the showcase catalog
(`providerAssets[].variants`). The earlier portraits stay in place, because old
releases can point to them.

QA: `qa/manifests/growth/amharic-names.yaml` (each showcase in Amharic) and
`amharic-names-owner.yaml` (the owner changes a name and changes it back). The
fixture is `appointment.tests.amharic_names_qa_fixtures`.
Runs on 2026-10-15: BQA-2026-00414 (`amharic-names`, every scenario passed) and
BQA-2026-00413 (`amharic-names-owner`, passed).

## What the seeder fills

A fresh seed fills these fields on every showcase where they apply. The
read-only coverage check of 2026-10-16 found no other gaps (see "Regenerate
showcase data on a server", step 6).

| Record | Fields | Showcases |
|---|---|---|
| Organization | `organization_name_am`, `description_am`, `phone` (placeholder) | The five organizations |
| Provider | `display_name_am`, `bio`, `bio_am`, `spoken_languages`, the portrait (warm, with 96 and 192 px variants) | All eleven providers |
| Provider | `public_slug` | Ergata only. Provider pages are for independent providers. |
| Location | `location_name_am`, `address_am`, `location_type`, `phone` (placeholder) | All places |
| Location | `video_platform`, `meeting_link_mode`, `meeting_link` | The Ergata online room |
| Public Site | `site_title_am`, `recipe_version` (latest: v3, Ergata v2), `am` locale, booking `liveAvailability` and `holidayGreetings`, `expressive` motion | All six websites |
| Website sections | Amharic for every localized text, also the reviewer names and bare numbers; the v3 photos (hero, about, services, places, and the process steps of Selam and Tena); a gallery section where the template has one | All six websites |
| Appointment | `client_phone` (E.164), `customer_language`, `participant_phones` (some Tena and Bloom bookings, the Ergata couples sessions), `is_online` and `meeting_link` (Ergata online sessions) | All bookings |
| Customer Profile | `primary_phone`, `primary_email`, `preferred_language` | All customers |
| Walk In | `client_name` (a showcase client), `client_phone` (E.164), `participant_phones` (one per Tena and Bloom queue) | All walk-ins |
| Directory Listing | Listed, with a category and an area | All six showcases |

Not filled, on purpose:

- Public business and place numbers stay non-dialable placeholders
  (`+251 11 000 0101` and so on), so a showcase never shows a number that could
  belong to a real person. Customer numbers are E.164 mobile numbers
  (`+2519112…` Ergata, `+2519113…` organizations, `+2519114…` companions),
  because the phone rule accepts nothing else. Nobody gets a message: the seeder
  skips customer notifications, the showcases keep SMS off, and every email
  address is on `example.test`.
- Empty image slots (the gallery items, the process steps of Bloom, Meron and
  Abugida, testimonials, contact): the v3 templates show their own packaged
  photos there.
- Online offerings: only Ergata has an online room. The organization
  showcases meet in person.
- Business referral codes (made when an owner first opens the referral page),
  customer referral offers (an owner opt-in; an active offer makes customer
  codes on demand that the journal does not own, which would block cleanup) and
  signup sources (they record how a real owner signed up).
- Brand and growth settings, directory categories and areas: install and
  `migrate` fill them (`appointment.growth.seed.ensure_defaults`,
  `appointment.growth.directory.ensure_defaults`), not the seeder.

The seeder modules: `showcase.py` (organizations, websites, bookings),
`content_world.py` (articles, galleries, newsletters), `analytics_world.py`
(lifecycle facts, walk-ins), `dashboard_world.py`, `independent_world.py`
(Ergata), `customer_world.py` (customer contacts) and `growth_world.py`
(directory listings). Each step has its own version in the journal. A repeat
run does the steps whose version changed and nothing else.

## Regenerate showcase data on a server

There is one seeder: `appointment.demo.showcase.seed`. It is the "explicit,
idempotent production seeder" that `AGENTS.md` names, but its guard
(`require_target`) only accepts a site that meets all of these:

- the site name ends with `.localhost`,
- `worktree_development` is set,
- `rich_demo_enabled` is `1`,
- `mute_emails` and `pause_scheduler` are set,
- the command runs as Administrator (`bench execute` does).

So the seeder never runs on a live site, and it cannot be pointed at one by
mistake. Do not weaken the guard. Do not run the seeder on a site that has real
businesses or real customers, and do not copy a showcase site to production
(`GO_LIVE_RUNBOOK.md` §2).

The safe way to have showcase data on a server is a separate showcase site,
for example `showcase.localhost`, in its own bench (or at least its own site,
never the live one). Its folder name ends with `.localhost`; Nginx serves it
under a public name by sending `X-Frappe-Site-Name: showcase.localhost`.

1. Create the site and install the app (as in `GO_LIVE_RUNBOOK.md` §2):

   ```bash
   bench new-site showcase.localhost --db-root-username <root user> --install-app appointment
   bench --site showcase.localhost migrate
   ```

2. Turn on the seeder flags. Mute email and pause the scheduler first:

   ```bash
   bench --site showcase.localhost set-config -p mute_emails 1
   bench --site showcase.localhost set-config -p pause_scheduler 1
   bench --site showcase.localhost set-config -p worktree_development 1
   bench --site showcase.localhost set-config -p rich_demo_enabled 1
   bench --site showcase.localhost set-config host_name https://<showcase host>
   bench --site showcase.localhost set-config -p brand_public_experience_platform_hosts '["<showcase host>"]'
   bench --site showcase.localhost set-config -p brand_public_experience_edge_tls 1
   ```

   The last three keys make the public pages answer on the showcase host
   over HTTPS (`GO_LIVE_RUNBOOK.md` §3).

3. Seed. `anchor_date` is the "today" of the showcase: bookings run from 89
   days before it to 30 days after it. Leave it out to use today. `base_url`
   only goes into the persona landing links in the private journal.

   ```bash
   bench --site showcase.localhost execute appointment.demo.showcase.seed \
     --kwargs '{"base_url": "https://<showcase host>"}'
   ```

   On the drill of 2026-10-16 a fresh seed took 5 minutes. A repeat run takes
   a few seconds and changes nothing.

4. Turn off the seeder flags. Keep email muted and the scheduler paused on the
   showcase site: the showcase customers have `example.test` addresses, and
   reminders for them must not go to the mail queue.

   ```bash
   bench --site showcase.localhost set-config -p rich_demo_enabled 0
   bench --site showcase.localhost set-config -p worktree_development 0
   ```

   Turn the two flags on again only for the next seed.

5. Point Nginx at the site (`proxy_set_header X-Frappe-Site-Name
   showcase.localhost;` for the showcase host) and reload Nginx after
   `nginx -t`.

6. Check:

   - `https://<showcase host>/bloom-studio`, `/selam-studio`, `/tena-studio`,
     `/abugida-studio`, `/meron-studio` and `/yared-counselling` open, in
     English and with `?lang=am`;
   - `/bloom-studio/book` and `/schedule/p/yared-counselling` open and show
     free times;
   - `/directory` lists the six showcases;
   - `bench --site showcase.localhost execute appointment.tests.test_rich_demo.verify`
     (it needs the seeder flags of step 2 for the duration of the check).

   The private journal `sites/showcase.localhost/private/rich-demo-v1.json`
   lists every record the seeder made, and the sign-in credentials of the
   showcase staff. Do not copy, print or commit it.

To make the data current again (the bookings are around the anchor date):

- On a showcase site that nobody has used, turn the flags on, run
  `appointment.demo.showcase.cleanup` (it deletes only the records in the
  journal), then `seed` again.
- When people booked on the showcase site, cleanup stops on their bookings, on
  purpose. Make a new site instead: `bench drop-site showcase.localhost` (check
  the name first), then steps 1 to 6.

A seed after an app update upgrades the existing showcases in place: each step
whose version changed writes its new values on the records it owns, and the
websites are published again.

A guard that allowed a named showcase site without `.localhost` (for example a
`showcase_site` key next to `rich_demo_enabled`) is a possible change. It is
not made: the current guard is the reason the seeder cannot reach a live site.
