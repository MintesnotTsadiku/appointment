# Recordings

No Phase 3 video was produced; recorded reports contain `video_file: null`.
Screenshots, DOM snapshots and traces support the bounded assessment but do not
fulfill the original video requirement.

`appointment.qa_runner.run` omits `capture_video` and
`capture_instruction_timeline` when calling Agent Plane. The installed API's
false defaults override manifest requests. All eight follow-up `p3b_*` manifests
also explicitly set both flags false, so their null video fields are not an
independent test of forwarding a true request. This is an invocation limitation,
not evidence that Agent Plane cannot record video.

A supported capture path must be verified before recording-dependent work. No
product or QA-runner source was changed during this assessment. The accepted
bounded follow-up allowed a precise tooling blocker instead of an unauthorized
source change; do not repeat unchanged runs expecting a different result.

Compact reports and screenshots are committed. Raw `trace.zip` files remain in
`/tmp/agent_browser_qa/appointment/<scenario-run>/` and are ephemeral; exact run
paths are in `../evidence-index.md`. They are not videos. The redacted network
extract `../probes/outputs/p3c-trace-summary.json` preserves the response evidence
used to verify key conclusions without publishing raw session material.
