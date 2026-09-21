#!/usr/bin/env bash
# usage: run_probe.sh <absolute-probe.py> [output-file]
# Runs a Phase 3 probe against the preserved isolated runtime using the bench
# Python environment. The runner changes cwd, so always pass absolute paths.
BENCH=/home/minte/projects/appointment-worktree-runtimes/fix-appointment-beta-readiness-01dea7/bench
cd "$BENCH/sites" || exit 1
if [ -n "$2" ]; then
  exec "$BENCH/env/bin/python" "$1" >"$2" 2>&1
fi
exec "$BENCH/env/bin/python" "$1"
