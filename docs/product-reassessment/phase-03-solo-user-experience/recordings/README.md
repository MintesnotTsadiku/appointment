# Recordings

**No video file was produced for any Phase 3 browser run.** The recorded Browser QA runs
reported `"video_file": null`, and `find /tmp/agent_browser_qa/appointment -name
'*.webm' -o -name '*.mp4'` over the Phase 3 window returned nothing.

Why: the phase-prescribed entry point `appointment.qa_runner.run` calls
`agent_plane.api.run_browser_qa_manifest(...)` without `capture_video` or
`capture_instruction_timeline`. Those API parameters default to `0` → `False`
and override the manifest, so the manifest keys `capture_video: true` and
`capture_instruction_timeline: true` are ignored. `capture_trace` is honoured
because it is read directly from the manifest. This is a QA-tooling limitation of
the current invocation path, separate from customer-facing product findings, and it was not worked around by
calling Playwright or changing application code.

What exists instead:

- `../traces/` contains the compact Agent Harness `report.json` per run plus key
  DOM snapshots (screenshots at each decision point live in `../screenshots/`).
- Raw browser `trace.zip` archives (trace inspection artifacts, not video recordings) remain in
  the Agent Plane artifact store, e.g.
  `/tmp/agent_browser_qa/appointment/appointment-p3-solo-onboarding-individual-20260921T095156Z/trace.zip`
  (~11 MB). Exact paths and Browser QA Run ids are listed in `../evidence-index.md`.
  They are intentionally **not committed** (size), and they expire with the
  `/tmp` runtime filesystem.

Most manifests requested video and timeline capture; the d2 status diagnostic
explicitly set both false. The finding is that no video was produced through
these invocations, not that recording is impossible with Agent Plane. Screenshots
and traces do not fulfill the original video requirement. Resolve the supported
capture path or record an explicit blocker before the follow-up lifecycle run.

## Follow-up result (bounded Phase 3 evidence correction)

The follow-up replayed lifecycle scenarios through the same entry point and again
produced **no video** for any run (`video_file: null`; the new `p3b-*` manifests
that requested capture still yielded none, and diagnostics set it false). This
confirms the wrapper limitation rather than an Agent Plane-wide impossibility.

Smallest supported prerequisite (no application-code change made): in
`appointment/qa_runner.py`, forward `capture_video=1` and
`capture_instruction_timeline=1` into
`agent_plane.api.run_browser_qa_manifest(...)` (or stop that API from defaulting
the arguments to `False` and overriding the manifest). Until then, traces are
trace-inspection artifacts, not video, and the recording requirement stays
explicitly unmet rather than silently substituted.
