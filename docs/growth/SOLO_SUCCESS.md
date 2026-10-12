# Solo setup success screen

## Goal

An independent provider ends solo setup on the same "your booking page is live" screen as an
organization. Before, solo setup sent the provider to `/settings/independent-booking` with no link.

## What changed

- `appointment/public_experience/solo_setup.py`: `create(business_name, timezone, service_name=None, publish=0)`.
  With `service_name`, it also makes the first offering (30 minutes, Monday to Friday, 09:00–17:00)
  and, with `publish=1`, publishes it. The result has `business_path` (`sharing.public_path` for
  `Provider:<name>`) and `published`.
- `appointment/scheduler/independent.py`: `live_page(provider)`; `publish` now returns
  `{offerings, business_path, published}` (it returned the offerings list before).
- `appointment/growth/business_prompt.py`: `quick_start` uses the solo setup path and returns
  `business_path` and `published`.
- `frontend/src/components/live-page-success/`: the shared success screen (short link, full URL,
  copy, open, Telegram share, "Print a QR poster", "Go to Grow", "Go to dashboard"). A draft shows
  an honest state with Publish. Organization onboarding, solo setup, quick start and the first
  publish on `/settings/independent-booking` all use it.
- `frontend/src/pages/onboarding/solo-setup.tsx`: name, first service, time zone and "Publish now".
- `frontend/src/pages/grow`: `/grow#grow-poster` opens at the poster; copy falls back to a textarea
  copy when the browser refuses the Clipboard API.

## Known limit

An independent provider has no page above its offering. Without a published website,
`business_path` is the first offering's booking page, `/schedule/individual/<offering>`.
With a published website it is `/<slug>`.

## Checks

- Frappe: `appointment.tests.test_solo_setup_success` (rolled back, commit patched).
- Frontend: `frontend/tests/live-page-success.test.mjs` in `test:dom`.
- Agent Plane: `qa/manifests/growth/solo-success.yaml` with fixture
  `appointment.tests.growth_solo_success_qa_fixtures` (en desktop light, am mobile dark, draft then
  publish on mobile).
