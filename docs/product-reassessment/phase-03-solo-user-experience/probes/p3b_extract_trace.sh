#!/usr/bin/env bash
# Extract the Booking Event id from a Playwright trace.zip produced by the run.
# usage: p3b_extract_trace.sh <trace.zip>
set -u
TRACE="$1"
echo "== entries =="
unzip -l "$TRACE" | head -20
echo "== event ids =="
unzip -p "$TRACE" 2>/dev/null | grep -aoE '"event_id": "[A-Za-z0-9]+"|BEV[0-9]{3,}' | sort -u | head
