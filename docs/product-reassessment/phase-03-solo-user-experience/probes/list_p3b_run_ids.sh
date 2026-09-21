#!/usr/bin/env bash
cd "$(dirname "$0")/outputs" || exit 1
for f in p3b-*.txt; do
  ids=$(grep -oE 'BQA-2026-[0-9]+' "$f" | sort -u | tr '\n' ' ')
  echo "$f => $ids"
done
