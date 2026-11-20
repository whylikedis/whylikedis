#!/bin/sh
# The self-test must always pass. The card gate blocks a commit that touches facts/.
# A commit that only changes rules or tools may land while cards are being brought up to a new rule;
# it prints what is failing so nobody forgets.
python3 tools/factcheck.py selftest || exit 1
out=$(python3 tools/factcheck.py 2>&1); status=$?
echo "$out" | tail -1
if [ $status -ne 0 ]; then
  if git diff --cached --name-only | grep -q '^facts/'; then
    echo "$out" | grep FAIL | head -20
    echo "pre-commit: cards are failing the gate, and this commit touches facts/. Fix the cards first." >&2
    exit 1
  fi
  echo "pre-commit: cards are failing the gate; this commit does not touch facts/, so it may land." >&2
fi
