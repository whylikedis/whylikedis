# Reviewer evals

This folder tests the reviewer. It answers one question: how many real flaws does an agent find
when it follows `.claude/skills/fact-review/SKILL.md` on cards it did not write?

## What is here

- `cards/` holds twelve fact cards, `case-01.json` to `case-12.json`. Every card is well formed and
  passes the gate, online and offline. Every quote was copied from a real page.
- Eight cards each carry one planted flaw that the gate cannot see. Four are clean controls.
- `key/answers.md` says which is which and states each flaw exactly. `key/` is for the person
  scoring. The reviewer never opens it.

The topics are neutral and far from the Middle East: space flight, geography, public health,
history of science, economics and sport. A planted error can not be mistaken for a claim about the
real subject.

## How to run it

1. Start a fresh reviewer agent. Give it only the `fact-review` skill and the `evals/cards/` folder.
   Do not give it `evals/key/`, this file, or the repository history. Tell it never to open
   `evals/key/`.
2. Ask it to review all twelve cards, in two rounds, as the skill says. It may fetch pages with
   `python3 tools/factcheck.py fetch <url>`.
3. Have it write its notes to a separate file, one section per card, with the verdict and each
   finding tagged `must-fix`, `should-fix` or `nit`. It must not edit the cards.
4. Open `key/answers.md` and compare the notes with the key. Do this yourself, or with a second
   agent that is shown both the notes and the key.

To check the cards still pass the gate, run these from the repository root:

```bash
python3 -c "import sys; sys.path.insert(0,'tools'); import factcheck
sys.exit(factcheck.run('evals/cards'))"
python3 -c "import sys; sys.path.insert(0,'tools'); import factcheck
sys.exit(factcheck.run('evals/cards', online=True))"
```

The online run writes `verified.lock.json` into the folder it checks. Move it to `key/` afterwards
so the reviewer does not see it. A few publishers (Britannica, PBS, SCMP) refuse scripts, so a
warning that a page could not be read today is normal. The card keeps its earlier result.

## How to score

- Flaw score: found k of 8. A flaw counts as found only if a finding describes that exact flaw.
  "This source seems weak" does not score for a flaw that is a reversed quote. The key says what
  counts for each case.
- Credit a flaw once, even if the reviewer reports it twice. Credit it if it is a `must-fix` or
  `should-fix`, or if the verdict is `weakened` or `fails` because of it. A `nit` does not count.
- False alarms are counted separately, on the four clean cards only. A false alarm is a `fails`
  verdict or a `must-fix` finding on a clean card. Report it as "j of 4 controls".
- Extra findings on a flawed card are not scored. Read them anyway. Some may be real.
- Judge a false alarm against the page before you count it. If the reviewer is right and the card
  really is wrong, fix the card and log the miss. Do not count it against the reviewer.

A good reviewer finds most of the eight and raises no false alarm. Record the result, the date, and
the model that ran the review. Compare runs only when the cards were the same.

## Keep it honest

- Run it again after any change to the skill, to `REVIEW.md`, or to the checker.
- Do not edit a case to make the reviewer look better. If a case turns out to be unfair, replace it
  and note why.
- Extend the set. Every real miss that reaches `docs/lessons.md` becomes a new case here, with its
  planted flaw built the same way as the real one. A set that never grows stops measuring anything.
- Pages change. If a source later stops matching a quote, fix the quote or swap the case, and
  say so.
- The reviewer may have read these cards in an earlier run. For a fair score, use new cases.
