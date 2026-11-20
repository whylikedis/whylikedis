---
name: verify
description: Prove a change to this repository works before committing - run the gate, fetch the cited pages, render the cards and read them. Use before every commit and whenever asked to verify or check the fact base.
---

# Verify

Run the real thing, not only the checks. Cheap steps first.

1. `python3 tools/factcheck.py selftest` - the gate still rejects bad cards.
2. `python3 tools/factcheck.py` - every card follows the rules.
3. `python3 tools/factcheck.py --online <prefix>` for each era you touched - every quote is on its
   page. `missing` is a failure. `unreachable` is a warning: add an `archive` link or change the
   source. Never re-run until it passes.
4. `python3 tools/factcheck.py render`, then read your cards in `FACTS.md` the way a parent would.
   Does the answer make sense on its own? Would a critic find a sentence the facts do not carry?
5. End your commit message with the stamp. Write "none" for a step you did not run, and say why:

   ```text
   Checked: selftest ok - gate ok (24 cards) - online ok (era3: 31 found, 0 unreachable) - render read
   ```

If a step still fails after three rounds of fixing, stop and bring in a person. Say what you tried
and what you think the cause is.
