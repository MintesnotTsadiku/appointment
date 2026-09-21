#!/usr/bin/env bash
# usage: run_manifest.sh <absolute-manifest-path> [base_url] [scenario]
# Executes a Phase 3 browser manifest through the product-owned entry point
# appointment.qa_runner.run (which delegates to Agent Plane + Agent Harness).
# Never calls Playwright directly.
#
# Why staging: Agent Plane derives the `Browser QA Run.app` field from
# `manifest_name.split("_", 1)[0]` and stores `manifest_name` verbatim (both max
# 140 chars). The phase evidence path is long and contains underscores, so the
# committed manifest is copied to a short /tmp staging path whose basename begins
# `appointment_` before execution. The committed source of truth is the phase
# manifest; staging is byte-identical.
set -u
BENCH=/home/minte/projects/appointment-worktree-runtimes/fix-appointment-beta-readiness-01dea7/bench
SITE=meet-beta-fix-appointment-beta-readiness-01dea7.localhost
BASE_URL="${2:-http://localhost:49510}"
SCENARIO="${3:-}"

SRC=$(realpath "$1")
STAGE=/tmp/p3qa
mkdir -p "$STAGE"
SAFE=$(basename "$SRC" | tr -c 'A-Za-z0-9.' '-')
STAGED="$STAGE/appointment_p3_${SAFE}"
cp "$SRC" "$STAGED"

KWARGS=$(python3 - "$STAGED" "$BASE_URL" "$SCENARIO" <<'PY'
import json
import sys

manifest, base_url, scenario = sys.argv[1], sys.argv[2], sys.argv[3]
payload = {"manifest_name": manifest, "base_url": base_url}
if scenario:
    payload["scenario"] = scenario
print(json.dumps(payload))
PY
)

cd "$BENCH" || exit 1
echo "== source manifest: $SRC"
echo "== staged manifest: $STAGED"
echo "== kwargs: $KWARGS"
exec bench --site "$SITE" execute appointment.qa_runner.run --kwargs "$KWARGS"
