#!/usr/bin/env bash
# usage: run_probe.sh <probe.py>
BENCH=/home/minte/projects/appointment-worktree-runtimes/fix-appointment-beta-readiness-01dea7/bench
cd "$BENCH/sites" || exit 1
exec "$BENCH/env/bin/python" "$1"
