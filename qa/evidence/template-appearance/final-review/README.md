# Final website review

Review date: 2026-09-27. Runtime: `meet-beta-feat-content-publishing-galler-5839d4.localhost`, React `http://127.0.0.11:34340`.

[Open the screenshot gallery](comparison.html). It contains final native browser captures of all five templates at desktop and mobile sizes, in light and dark modes.

Fixed Meron hero copy overlapping the detail photograph and a duplicate Journal link. Tena's hero and booking actions now use the selected palette. Shared preview controls load their stylesheet when an owner opens an article editor directly. Desktop full-page captures start at the top; mobile dialog captures use the visible viewport.

| Suite | Run | Passed | Failed | Flaky | Baseline changes |
| --- | --- | ---: | ---: | ---: | ---: |
| Public routes | BQA-2026-00300 | 20 | 0 | 0 | 12 |
| Palette and fonts | BQA-2026-00305 | 1 | 0 | 0 | 50 |
| Owner workflow | BQA-2026-00306 | 1 | 0 | 0 | 32 |

All three cleanup and audit checks passed. The public matrix left the publication inventory unchanged. The owner workflow removed all temporary records. Appearance choices, versions, content and existing publications were restored exactly.

The public matrix covers landing, `/book`, scheduler, articles, galleries, newsletter and unavailable/empty states. Its 12 baseline changes are limited to the corrected Meron landing and Tena landing/booking surfaces. Every other public screenshot matches its baseline. The owner workflow covers publication with selected appearance, guest booking, article preview/history, newsletter consent/suppression, workbook import and staff isolation. Final appearance checks cover all five templates, actual CTA color changes before saving, font samples, persistence, reset/Undo, permissions and mobile/fullscreen controls.

Browser behavior passes. The engine reports `Failed/baseline_drift` because its pixel baselines still contain the prior UI; each validation file retains `strict_visual_pass: false`. Desktop and mobile captures were inspected directly. These results do not claim strict pixel acceptance.

Compiler checks pass all 30 palette/font combinations, preserve default hashes and reject unknown choices. DOM checks, focused appearance ESLint and Vite build pass. The TypeScript check has 249 existing errors outside the changed modules. Logs are included below.

Validation commands use the exact isolated Bench and explicit site:

```sh
export PYTHONPATH=/home/minte/projects/training-apps/.worktrees/frappe-appointment-beta
export FRAPPE_BENCH_ROOT=/home/minte/.local/state/frappe-worktree-stack/feat-content-publishing-galler-5839d4/bench
bench --site meet-beta-feat-content-publishing-galler-5839d4.localhost execute appointment.tests.test_template_appearance.run
bench --site meet-beta-feat-content-publishing-galler-5839d4.localhost execute appointment.tests.content_browser_bootstrap.enqueue_smoke --kwargs '{"suite":"content-templates","update_baseline":0}'
```

The same enqueue command selects `website-setup` and `template-appearance`. No schema migration or deployment command was run.
