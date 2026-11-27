# WhyLikeDIs

Clear answers about Israel, each with sources a parent can check.

This repository holds the public side of WhyLikeDIs: the fact base behind every answer, and the
tool that checks it.

## The fact base

One card per claim a child hears, in `facts/`. Each card has:

- the claim, quoted from someone who makes it;
- an answer a parent can say in two minutes;
- the facts behind the answer, each with three reliable sources from three different sites and
  the exact words quoted from each page;
- where the record is contested, and what the card does not claim.

A card is `draft` until a second reader, who did not write it, has tried to break it, every
sentence of the answer is tied to a fact, and every quote has been found on its page. Then it is
`verified`. A verified card is still not teaching
content until its `content_approved` flag is set.

## Check it yourself

```bash
python3 tools/factcheck.py            # every card follows the rules
python3 tools/factcheck.py --online   # every quote is on the page it cites
python3 tools/factcheck.py selftest   # the gate fails on a bad card
```

The checker needs Python 3.9 or later and nothing else.

## Work on it

```bash
npm install        # Node 24; installs the hooks
npm run check      # the gate
npm run build      # the site: Next.js, built in apps/site
npm run preview    # the local preview on http://localhost:4173
```

The repository is a Turborepo: `apps/site` is the site, and the fact base and its checker sit at
the root. To read PDF sources, install `pdftotext` (poppler); without
it, PDF sources are reported as unreachable.

## How cards are written

Agents write the cards and a different agent attacks them. The procedures are skills in
`.claude/skills/`. The rules are in `AGENTS.md`, and `docs/verification.md` says how the
repository checks itself.

## Licence

The source is public to read, not free to copy. The [WhyLikeDis Commercial License](LICENSE)
allows development and testing only; any production use needs a signed agreement. Files copied
from Interlace keep Interlace's MIT licence, and quoted sources belong to their authors.
