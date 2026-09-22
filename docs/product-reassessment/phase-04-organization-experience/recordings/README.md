# Recordings

No video was produced for Phase 4. The manifests request video/timeline capture,
but `appointment.qa_runner.run` does not forward those arguments and the installed
Agent Plane API's false defaults override the manifest. A reported `video: failure`
is a capture policy, not by itself proof of a recording-engine error; the null
video artifact establishes that no recording is available.

This is an invocation limitation, not a product defect or proof that Agent Plane
cannot record. No product source was changed to work around it. The original
recording requirement remains unmet and is an explicit assessment limitation.

Committed screenshots, compact reports, console/network failures and the redacted
`../probes/outputs/p4c-trace-summary.json` preserve the evidence used in the review.
Raw trace archives and private DOM snapshots remain in ephemeral `/tmp` storage;
they are neither committed durable evidence nor videos. Exact artifact paths and
run identifiers are in `../evidence-index.md`.
