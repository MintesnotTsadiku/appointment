# Recordings

**No video file was produced for any Phase 3 browser run.** Every Browser QA Run
reported `"video_file": null`, and `find /tmp/agent_browser_qa/appointment -name
'*.webm' -o -name '*.mp4'` over the Phase 3 window returned nothing.

Why: the phase-prescribed entry point `appointment.qa_runner.run` calls
`agent_plane.api.run_browser_qa_manifest(...)` without `capture_video` or
`capture_instruction_timeline`. Those API parameters default to `0` → `False`
and override the manifest, so the manifest keys `capture_video: true` and
`capture_instruction_timeline: true` are ignored. `capture_trace` is honoured
because it is read directly from the manifest. This is a tooling limitation of
the product wrapper, not a product-code defect, and it was not worked around by
calling Playwright or changing application code.

What exists instead:

- `../traces/` contains the compact Agent Harness `report.json` per run plus key
  DOM snapshots (screenshots at each decision point live in `../screenshots/`).
- Raw Playwright `trace.zip` files (replayable recordings of each run) remain in
  the Agent Plane artifact store, e.g.
  `/tmp/agent_browser_qa/appointment/appointment-p3-solo-onboarding-individual-20260921T095156Z/trace.zip`
  (~11 MB). Exact paths and Browser QA Run ids are listed in `../evidence-index.md`.
  They are intentionally **not committed** (size), and they expire with the
  `/tmp` runtime filesystem.
