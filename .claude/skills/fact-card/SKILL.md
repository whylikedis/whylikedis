---
name: fact-card
description: Write or extend fact cards in facts/ for one era. Use when asked to research a claim, add a card, or add sources to a card.
---

# Write a fact card

You write fact cards for one era. You do not verify your own cards.

## Steps

1. Read `AGENTS.md` and one finished card in `facts/` if there is one. Use only what you read on
   the pages you cite, not what you remember.
2. For each claim you were given, find the strongest fair statement of it by someone who makes it.
   That is `heard`.
3. Find the facts that answer it, and for each fact **three reliable sources from three
   different sites**. Prefer the document itself (a UN resolution, a treaty, a court
   ruling, a census), then scholars, then reference works, then news. A government or an advocacy
   group may be one voice, but it does not count toward the three. If you cannot find three, keep
   the fact with what you have and say so in `could_not_verify`. Never pad with a weak source.
4. Read every page with `python3 tools/factcheck.py fetch <url>` and copy each quote from that
   output, 5 to 40 words. If the page will not load, find its Wayback Machine copy and put it in
   `archive`. PDFs are readable where `pdftotext` is installed.
5. Write the answer last, in 150 words or fewer, from the facts on the card and nothing else.
6. Fill `contested` honestly. If serious historians disagree, name the positions. Write each one
   as an object, `{ "text": "…", "sources": [ … ] }`, with at least one source that quotes someone
   who holds that position, read with `fetch` like any other. A position you only remember, or saw
   in a search summary, goes in `could_not_verify`, not in `contested`.
7. Fill `could_not_verify`: what you looked for and did not find. "I could not find this" is a
   good answer; a guess is not.
8. Fill `not_claimed`: the stronger thing a reader might think the card says, and does not.
9. Save `facts/<id>.json` with `status: "draft"` and `content_approved: false`. Run
   `python3 tools/factcheck.py` and then `python3 tools/factcheck.py --online`. Fix what fails by
   fixing the card, never the checker.

## The card

```json
{
  "id": "era3-partition-vote",
  "era": 3,
  "claim": "The claim, as a child hears it.",
  "heard": [
    {
      "who": "Who says it",
      "url": "https://…",
      "quote": "their words",
      "archive": ""
    }
  ],
  "answer": "What a parent can say in two minutes.",
  "facts": [
    {
      "text": "One fact, one sentence.",
      "sources": [
        {
          "publisher": "Who published it",
          "title": "Page title",
          "url": "https://…",
          "archive": "",
          "quote": "exact words from the page",
          "accessed": "2026-11-20",
          "kind": "primary"
        }
      ]
    }
  ],
  "contested": [
    {
      "text": "Where the record is disputed, and by whom.",
      "sources": [
        {
          "publisher": "…",
          "title": "…",
          "url": "https://…",
          "quote": "their words",
          "accessed": "2026-11-20",
          "kind": "scholarly"
        }
      ]
    }
  ],
  "could_not_verify": ["What you looked for and did not find."],
  "not_claimed": ["What this card does not say."],
  "status": "draft",
  "content_approved": false
}
```

`kind` is one of `primary`, `scholarly`, `reference`, `news`, `government`, `advocacy`.

## Never

- Never write a quote from memory or from a search summary.
- Never drop a fact that hurts the answer. Put it in `contested`.
- Never put a person's private details, or anything about the venture's plans, in a card.

## When you are stuck

If a check still fails after three rounds of fixing, stop. Write what you tried and what you think
the cause is, and hand it to a person. Do not retry until it passes, and do not weaken the claim to
get through.
