# Published content showcases

`appointment/demo/content.v1.json` is the versioned content manifest. Its
SHA-256 is `14ef94a251e780ca6dc4a82c8394db63d71e7f5424a2011ae4fff9e86e50a53b`.
The image catalog supplies local assets and verifies their checksums before use.

Each of the five fictional businesses receives three published articles,
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
