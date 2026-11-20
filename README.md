# WhyLikeDIs

Clear answers about Israel, each with sources a parent can check.

This repository holds the public side of WhyLikeDIs: the fact base behind every answer, and the
tool that checks it.

## The fact base

One card per claim a child hears, in `facts/`. Each card has:

- the claim, quoted from someone who makes it;
- an answer a parent can say in two minutes;
- the facts behind the answer, each with two sources from different sites and the exact words
  quoted from each page;
- where the record is contested, and what the card does not claim.

A card is `draft` until a second reader, who did not write it, has tried to break it and every
quote has been found on its page. Then it is `verified`. A verified card is still not teaching
content until its `content_approved` flag is set.

## Check it yourself

```bash
python3 tools/factcheck.py            # every card follows the rules
python3 tools/factcheck.py --online   # every quote is on the page it cites
python3 tools/factcheck.py render     # write FACTS.md, the readable view
python3 tools/factcheck.py selftest   # the gate fails on a bad card
```

Python 3.9 or later. No dependencies.

## How cards are written

Agents write the cards and a different agent attacks them. The briefs are in `agents/`. The rules
both follow are in `AGENTS.md`.

## Licence

Not chosen yet.
