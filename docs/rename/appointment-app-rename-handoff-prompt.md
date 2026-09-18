# Appointment identity handoff — final state (superseded prompt)

> Status: **superseded / archived.** This file used to instruct a future agent
> to implement an existing-site migration, compatibility aliases, upgraded-clone
> support and legacy-alias validation. That direction was reversed. The text
> below records the final, authoritative decision and the evidence that
> replaced the old plan. Do not follow the old instructions from the previous
> revision of this file.

## Final identity

- Repository: `https://github.com/MintesnotTsadiku/appointment.git`
- Frappe app identifier: `appointment`
- Display title: **Appointment**
- Outer Python package: `appointment`
- Primary Frappe module: `Appointment`
- Primary module package: `appointment.appointment`
- Business DocType names: unchanged
- Other modules: `Scheduler`, `Payments`, `Channels`, `Tasks`, `Assistants`

## Authoritative decisions

1. **Fresh installation is the supported path.** A fresh site installs
   `appointment` and the primary module `Appointment`.
2. **The app was never released under the old identifier** (`frappe_appointment`
   app id or `Frappe Appointment` module). Therefore **no compatibility shim,
   alias package, distributable migration or legacy patch path exists or should
   be added.**
3. **There is nothing to validate for legacy aliases.** Negative tests assert
   that the old package/module paths are absent instead.
4. **Existing-site transfer is explicitly out of scope.** Do not implement an
   existing-site migration for the beta.

## What replaced the old plan

- Canonical app/module/package identity with all metadata, fixtures, hooks,
  scheduled jobs, whitelisted dotted paths, assets and frontend API strings on
  `appointment.*`.
- Characterization tests in `appointment/tests/test_app_identity.py`.
- Redacted cloned-data preservation evidence in
  `appointment/qa_preservation.py` / `appointment/tests/test_data_preservation.py`.
- Action-based Agent Plane browser coverage in `qa/manifests`, driven through
  `appointment.qa_runner.run` → `agent_plane.api.run_browser_qa_manifest`.

## Where the current evidence lives

- `docs/rename/appointment-app-rename-implementation-plan.md`
- `docs/rename/testing-guide.md`
- `docs/rename/reference-inventory.md`
- `appointment/tests/` and `qa/manifests/`

Keep this file only as a record of the reversal. New work should update the
implementation plan and testing guide, not reintroduce a compatibility layer.
