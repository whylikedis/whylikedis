# Run 01: score

Scored on 2026-11-20 against `evals/key/answers.md`, by the rules in `evals/README.md`. The run
file does not record which model ran the review.

## Flawed cases

| Case | Planted flaw kind | Result | Matching finding |
| ---- | ----------------- | ------ | ---------------- |
| case-01 | Wrong number | found | must-fix: `facts[0].text` and answer say 8,848.68; all three sources say 8,848.86 |
| case-03 | Wrong source kind | found | must-fix: History Skills is an anonymous classroom site, kind should be `other` |
| case-04 | Three sources, one text | found | must-fix: NASA, ScienceDaily and SatNews carry the same JPL release word for word |
| case-06 | Quote reversed by context | found | must-fix: the "in debt or bankrupted" line is the myth the page goes on to debunk |
| case-07 | Record worded as world fact | found | must-fix: flagged `record` but says "eradicated from the world", reword or drop flag |
| case-08 | Strawman in `heard` | found | must-fix: `heard[0]` says Frankel argues the opposite of what his quote says |
| case-10 | Unsupported answer sentence | found | must-fix: the radar satellites sentence is on no fact |
| case-11 | Contested entry not held by source | found | must-fix: `contested[0]` has no quoted holder, Nobel quote is about 1982 |

## Totals

- Flaw score: found 8 of 8.
- False alarms on controls: 0 of 4.
- Controls marked weakened: 2 of 4 (case-02 and case-09; case-05 and case-12 were marked holds).

## Controls

- case-02: verdict weakened, with only should-fix and nit findings. Over-flagging, not a false alarm.
- case-05: holds, nit only.
- case-09: verdict weakened, with only should-fix and nit findings. Over-flagging, not a false
  alarm.
- case-12: holds, nit only.

No control got a `fails` verdict or a `must-fix` finding.

## Extra must-fix findings on flawed cards

Case-01, case-03 and case-08 had no must-fix beyond the planted flaw. The others:

- case-04, `answer` never says yes or no to "left the solar system"; the deciding point sits in
  `contested[0]`. Cannot tell without the card. It reads as a real second problem, since the
  reviewer quotes the card's own contested text.
- case-06, `answer` sentence 1 ("Mostly not") is on no fact; the support is only quoted in
  `facts[1].sources[2]`. Cannot tell without the card. The key says this card has other facts
  that contradict the planted one, so a thin answer is plausible. Leans real.
- case-07, a side remark inside the planted finding: `sources[0]` is a WHO history page, not the
  resolution, and two of the three sources are WHO. Cannot tell. It is minor and it is part of
  the same finding.
- case-10, `contested[0].sources[0]` relays "Cernan and Ed Lu have said they did" with neither man
  quoted. Leans real: the reviewer says the card admits this itself in `could_not_verify`, which
  is what the skill's rules would require. Cannot confirm without the card.
- case-11, `answer` sentence 1 ("Mostly no"): no fact states that H. pylori causes most ulcers,
  and `could_not_verify[1]` says the pages lack figures that the Nobel page has. Leans real, but
  the key does not mention it and the card is not in these files. Cannot tell.

None of these can be confirmed from the run and the key alone. To count one as a real card flaw,
check it on the card and the page, as the README says.
