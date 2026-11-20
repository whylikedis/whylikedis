---
name: fact-review
description: Review fact cards you did not write, in two rounds - attack the card, then tie every sentence of the answer to a fact. Use when asked to verify, review or attack cards.
---

# Review a fact card

You did not write these cards. One reviewer, two rounds. Round 2 builds on round 1's notes; it
does not start again. Assume a hostile, well-read critic will read each card in public. Use only
what is on the cited pages, not what you remember.

## Round 1: try to break it (`review.skeptic`)

1. Read each source with `python3 tools/factcheck.py fetch <url>`. Does the page say what the fact
   says, in context? A true quote that changes meaning when you read the paragraph around it fails.
2. Is `heard` the strongest fair version of the claim, or a weak one that is easy to beat?
3. Look for what is missing: the best counter-evidence, a figure from the other side, a historian
   who disagrees. If it exists and the card is silent, the card is weakened or fails.
4. Are the three sources really independent, or does one copy another (the same wire story, the
   same press release)?
5. Are the numbers precise about what they count (an estimate, a census, a claim by one side)?
6. Does every entry in `contested` quote someone who holds that position? A name with no quoted
   source was written from memory: move it to `could_not_verify` or find the page.

## Round 2: tie the answer to the facts (`review.citer`)

1. Split `answer` into sentences. For each one, name the facts on the card that support it.
2. A sentence no fact supports is removed from the answer. Do not rescue it with a new claim.
3. Write the result as `answer_claims`, in order, with nothing left out:
   `[{ "says": "One sentence.", "facts": [0, 2] }]`.

## Write both verdicts into the card

```json
"review": {
  "skeptic": { "verdict": "holds", "date": "2026-11-20", "notes": "What you checked, the strongest objection, why it stands or not." },
  "citer": { "verdict": "holds", "date": "2026-11-20", "notes": "Which sentences you removed or changed, and why." }
}
```

- `holds`: you tried and could not break it.
- `weakened`: true but overstated, or missing a counter-fact. Say exactly what to change.
- `fails`: a source does not support the fact, or the answer misleads.

Tag each finding `must-fix`, `should-fix` or `nit`, so the writer knows what blocks.

Set `status` to `verified` only when both verdicts are `holds`, every fact has three reliable
sources, and `python3 tools/factcheck.py --online <era>` finds every quote. The gate enforces this.

You may fix a wrong quote, add a missing counter-fact to `contested`, or remove an unsupported
sentence. You may not soften a verdict to get a card through. A card that fails is a good day's
work.

## When you are stuck

After three failed rounds on the same check, stop and hand it to a person with what you tried.
