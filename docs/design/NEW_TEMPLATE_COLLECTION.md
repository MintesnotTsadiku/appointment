# Seven new public templates

The approved desktop concepts are implemented as seven independent versioned packages. Phone layouts and tonal dark modes were designed during implementation.

## Collection

| Business | Direction | Showcase | Design and verification |
| --- | --- | --- | --- |
| Enkua Image Studio | Enkua Experimental | `/enkua-studio` | [ENKUA](ENKUA.md) |
| Mizan Auto Lab | Precision Atlas | `/mizan-studio` | [MIZAN](MIZAN.md) |
| Meseret Advisory | A Day in Addis | `/meseret-studio` | [MESERET](MESERET.md) |
| Buna Bet | Field Atlas | `/buna-studio` | [BUNA](BUNA.md) |
| Hana Bekele | Addis Field Notebook | `/hana-bekele` | [HANA](HANA.md) |
| Dr. Dawit Tesfaye | Medical Journal V2 | `/dr-dawit` | [DAWIT](DAWIT.md) |
| Selam Homes | Living Gallery | `/selam-homes` | [SELAM-HOMES](SELAM_HOMES.md) |

## Release checks

Each package has a booking skin, loading state, static confirmation, live availability, Habesha hours and owner-controlled holiday greeting. Content supports English and Amharic.

The final build passes the DOM suite. TypeScript remains at the starting count of 123 errors. All seven light, dark, state and booking manifests pass. Agent Plane retains the screenshots and traces. The design documents record each run and phone measurement.

The local phone measurements pass the 2.5-second median LCP budget in both languages. They use a production build behind the standard local compression proxy. They are laboratory measurements, not production field statistics.

Generated images and font subsets include provenance, licenses and checksums. Only product gallery previews and approved design references are committed as screenshots.

## Scope

These are business websites and appointment presentations. They use the existing scheduling, permissions and payment capabilities. They do not add influencer social imports, hospital calendar sync, travel scheduling, shared coffee-event capacity or real-estate inventory.

The owner chooser and public gallery include all seven business focuses, with translated labels and audience descriptions.

Dr. Dawit offers separate evening blocks for in-person and video consultations. No hospital needs an account for those independent hours. An owner must keep external commitments outside published availability.

Hana offers video conversations, feedback, coffee and lunch. Selam Homes offers consultations and viewings, with an editable property gallery.

## Reproduce

Run `appointment.patches.v0_1.import_frontend_translations.execute` to sync the Amharic catalog. Install and migrate also run this importer. Then run `appointment.demo.showcase.seed` through the exact configured site. Run `appointment.tests.template_collection_qa_fixtures.setup` before the booking manifests and `.cleanup` afterward. Cleanup matches the fixture name, provider, phone and creation boundary. It excludes all seeder-owned records.

Run the four manifests per package in `qa/manifests/growth/`. `template-collection-release.yaml` adds a final desktop-English and phone-Amharic-dark review. Use `scripts/capture_template_gallery.py` for product gallery previews.

No DocType schema changed. No migration was required. Main is not part of this release.

## Final integration evidence

- Public gallery and all seven previews: BQA-2026-00728 (Passed), English desktop and Amharic phone.
- BQA-2026-00727 found missing site Translation records. The standard importer resolved them before the passing rerun.
- Focused Frappe modules: collection (5), shell boot (12), gallery (5), independent showcases (5), showcase refresh (7). All 34 tests pass.
- A repeat seed preserves 18 providers, 25 locations, 45 services, 59 offerings, 13 websites, 53 releases, 2,517 appointments and 733 customer profiles.
- TypeScript remains at 123 errors. The DOM suite and production build pass.

Single-load outliers remain in the per-template tables. The release budget uses the median of three cache-disabled phone loads.
