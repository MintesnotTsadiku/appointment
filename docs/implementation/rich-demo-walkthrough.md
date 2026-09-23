# Rich Appointment demo walkthrough

This local demonstration runs from `demo/rich-appointment` on the isolated site
`meet-beta-demo-rich-appointment-344c1b.localhost`. Open
`http://127.0.0.174:41960` in the Windows browser. The mode-600 private manifest
with passwords, persona URLs, business URLs and exact created-record inventory is:

`/home/minte/projects/appointment-worktree-runtimes/demo-rich-appointment-344c1b/bench/sites/meet-beta-demo-rich-appointment-344c1b.localhost/private/rich-demo-v1.json`

The anchor date is 2026-09-23, in `Africa/Addis_Ababa`. The site has five
fictional businesses, 14 login personas and 399 appointments after a clean
reseed: 223 confirmed, 131 completed, 31 cancelled and 14 no-shows. It also has
one rescheduled booking with history. Customer names and contacts are synthetic;
email is muted and the scheduler is paused. The clinic contains no real patient
records. The application uses provider capacity, with rooms represented as
locations; it does not claim group or equipment capacity.

| Business | Model | Public URL |
|---|---|---|
| Selam Movement Practice | solo wellness practitioner | `/schedule/org/selam-studio` |
| Meron Tailoring Atelier | solo business owner | `/schedule/org/meron-studio` |
| Bole Bloom Hair Studio | salon with several stylists and reception | `/schedule/org/bloom-studio` |
| Tena Family Clinic | small clinic with multiple clinicians and rooms | `/schedule/org/tena-studio` |
| Abugida Language Studio | education business with several coaches | `/schedule/org/abugida-studio` |

Use `http://127.0.0.174:41960/login` for authenticated clips. Read each password
from the private manifest; never include it in a recording. The manifest lists
the expected landing URL for every persona. Useful accounts are
`bloom.owner@example.test`, `bloom.reception@example.test`,
`bloom.provider1@example.test`, `bloom.manager@example.test`,
`multi.manager@example.test`, `selam.owner@example.test`, and
`tena.reception@example.test`.

## Recording order

1. **Public booking, 2–3 minutes.** Open Bole Bloom's public URL as a guest.
   Show the business description, named stylists, service choice, available
   dates and times. Book with a clearly fictional `example.test` customer and
   show the confirmation. For a contrasting service, open Selam Movement
   Practice or Tena Family Clinic. Use a fresh synthetic customer email for an
   actual recording, then register that booking in the demo inventory if it
   needs exact cleanup.
2. **Owner and setup, 1–2 minutes.** Log in as `bloom.owner@example.test`.
   Show the owner overview, business settings, published services and customer
   links. Explain that publication and team access are managed in the business
   workspace.
3. **Reception day, 2–3 minutes.** Log in as
   `bloom.reception@example.test`, open Reception, and show realistic busy and
   quiet dates, names, filters and location scope. Open one appointment and
   demonstrate its history. The seeded lifecycle evidence includes a
   rescheduled and a cancelled booking.
4. **Provider and solo work, 1–2 minutes each.** Use
   `bloom.provider1@example.test` for the stylist calendar, then
   `selam.owner@example.test` for a solo practitioner's overview and booking
   page. Note the different team and location complexity.
5. **Manager, clinic and multi-business, 2–3 minutes.** Use
   `bloom.manager@example.test` for team access,
   `tena.reception@example.test` for the clinic's rooms, and
   `multi.manager@example.test` to switch between authorized businesses.

The seed is versioned and guarded to this explicitly enabled `.localhost` site.
Its journal owns every record it may remove. From the isolated runtime Bench,
with the feature worktree on `PYTHONPATH`, use:

```bash
bench --site meet-beta-demo-rich-appointment-344c1b.localhost execute appointment.tests.rich_demo.seed
bench --site meet-beta-demo-rich-appointment-344c1b.localhost execute appointment.tests.test_rich_demo.verify
bench --site meet-beta-demo-rich-appointment-344c1b.localhost execute appointment.tests.test_rich_demo.roundtrip
```

`seed` is idempotent. `roundtrip` proves exact cleanup, unrelated-record
preservation, collision refusal and reseeding, and leaves a fresh site. For an
intentional removal use `appointment.tests.rich_demo.cleanup` on this site only.
Dates are anchored to the manifest date; rerun the exact cleanup and seed to
refresh upcoming activity when the current date has moved on. A rerun writes
new passwords to the private manifest.

## Browser evidence

The product QA runner used Agent Plane and Agent Harness browser sessions. The
accepted runs include public booking `BQA-2026-00024`, owner `00017`, provider
`00021`, manager `00022`, clinic mobile `00019`, multi-business switching
`00032`, reschedule `00037`, cancellation `00034`, final reception `00036`, and
public light/dark `00029`/`00030`. Focused failures during development were
fixed and rerun; the accepted runs above passed with zero console and network
errors. Windows forwarding confirms the unique browser URL is reachable. The private raw browser traces
remain in the local runtime because they may contain session material.

Representative synthetic captures: [public light](evidence/rich-demo/public-bloom-light.png),
[public dark](evidence/rich-demo/public-bloom-dark.png),
[reception desktop](evidence/rich-demo/reception-desktop.png),
[clinic mobile](evidence/rich-demo/clinic-mobile.png), and
[solo mobile](evidence/rich-demo/solo-mobile.png).

This is a walkthrough environment, not a production launch or a claim that
notifications, payments, medical workflows, or group capacity are enabled.
