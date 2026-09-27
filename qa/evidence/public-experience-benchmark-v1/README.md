# Public Experience Visual Acceptance v1

This directory contains the final visual evidence for the five seeded showcase businesses.

## Scope

Each business was validated at 1440 × 900 and 390 × 844 across:

- the public landing page;
- the `/book` handoff; and
- the shared organization scheduler.

The landing captures are full-page images. Handoff and scheduler captures show the first viewport. The source comparison sheets pair the original generated design proposal with the real browser implementation. The implementation uses native text, content, controls, and responsive layout; it does not rasterize the proposal.

## Results

- `BQA-2026-00102`: 30 comprehensive scenarios passed. One transient Socket.IO polling request returned 400 in the Abugida mobile scheduler.
- `BQA-2026-00103`: all 10 final scheduler scenarios passed after the final style update and clean reseed. Console errors: 0. Network errors: 0. The Socket.IO error did not recur.
- The owned-data round trip removed and rebuilt all seeded records, refused a colliding identity, and preserved an unrelated record unchanged.

See `validation-summary.json` for the scenario-level result. See `public-experience-validation-tour.webm` for the concatenated real-browser desktop sessions.

## Interpretation

The comparison is a design-fidelity check, not a pixel-diff assertion. The source boards establish hierarchy, tone, geometry, typography, imagery, and interaction emphasis. The implementation contains thirteen real content sections, so its full-page length is intentionally greater than the compact concept boards.
