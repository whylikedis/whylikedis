#!/bin/sh
# Every commit says how it was verified ("Checked: none - reason" is allowed).
# Mode is in scripts/checked-stamp.mode: off, observe (log what would be blocked) or enforce.
mode=$(cat "$(dirname "$0")/checked-stamp.mode" 2>/dev/null || echo observe)
[ "$mode" = off ] && exit 0
grep -q '^Checked: ' "$1" && exit 0
echo "$(date -u +%FT%TZ) no Checked: line - $(head -1 "$1")" >> "$(git rev-parse --git-dir)/checked-gate.log"
[ "$mode" = enforce ] || exit 0
echo "commit-msg: add a line 'Checked: ...' saying how this was verified (or 'Checked: none - why')." >&2
exit 1
