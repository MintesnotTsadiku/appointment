# Recordings

No video was produced for Phase 4. `appointment.qa_runner.run` does not forward
`capture_video`/`capture_instruction_timeline`, and
`agent_plane.api.run_browser_qa_manifest` defaults both to false, overriding the
manifest. Every run therefore reports `video: failure` and `video_file: None`.

This is a QA-tooling limitation, not a product defect. Screenshots, DOM
snapshots, report JSON and Playwright traces are the durable evidence in this
phase; see `../evidence-index.md`.
