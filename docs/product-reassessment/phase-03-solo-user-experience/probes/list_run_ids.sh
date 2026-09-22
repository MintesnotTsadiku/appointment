#!/usr/bin/env bash
# List the Browser QA Run id(s) recorded in each Phase 3 run output.
cd "$(dirname "$0")/outputs" || exit 1
for f in run-*.txt; do
  ids=$(grep -oE 'BQA-2026-[0-9]+' "$f" | sort -u | tr '\n' ' ')
  echo "$f => $ids"
done
