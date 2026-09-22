# Phase 5 recordings

No video recording was produced for any Phase 5 run.

`appointment.qa_runner.run` calls `agent_plane.api.run_browser_qa_manifest`
without forwarding `capture_video`/`capture_instruction_timeline`, and the API's
defaults (`capture_video=0`, `capture_instruction_timeline=0`) override the
manifest flags. Every run therefore reports `video_file: null`; a search of the
run artifact directories found no `.webm`/`.mp4` file. The run-level capture
policy label "failure" reflects the disabled channel, not a lost recording.

Durable evidence used instead: per-decision screenshots, accessibility snapshots
and DOM snapshots committed under `../screenshots/` and `../traces/`, plus the
redacted response summary in `../probes/outputs/p5-trace-summary.json`. Raw
`trace.zip` files remain in the site `private/files` store and on each
`Browser QA Run` record. Making video work requires a supported configuration or
a product/QA-runner source change, which is out of scope for this assessment.
