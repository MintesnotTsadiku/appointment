#!/usr/bin/env bash
# usage: p4_run_manifest.sh <absolute-manifest-path> [base_url] [scenario]
# Executes a Phase 4 browser manifest through the product-owned entry point
# appointment.qa_runner.run (delegates to Agent Plane + Agent Harness).
# Never calls Playwright directly.
#
# Staging rationale (same as Phase 3): Agent Plane derives Browser QA Run.app from
# manifest_name.split("_", 1)[0]; the committed phase path is long, so copy the
# byte-identical manifest to a short /tmp path whose basename begins
# `appointment_` before execution.
set -u
BENCH=/home/minte/projects/appointment-worktree-runtimes/fix-appointment-beta-readiness-01dea7/bench
SITE=meet-beta-fix-appointment-beta-readiness-01dea7.localhost
BASE_URL="${2:-http://localhost:49510}"
SCENARIO="${3:-}"

SRC=$(realpath "$1")
STAGE=/tmp/p4qa
mkdir -p "$STAGE"
SAFE=$(basename "$SRC" | tr -c 'A-Za-z0-9.' '-')
STAGED="$STAGE/appointment_p4_${SAFE}"
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
