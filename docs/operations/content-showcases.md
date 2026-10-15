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

The seeder (`CONTENT_VERSION` 8, Ergata showcase version 6) fills the Amharic
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
