# Spec: the fact base and its gate

## Requirements

- **F1.** A card is one JSON file in `facts/`, named by its `id`.
- **F2.** A card carries: `claim`, `heard` (at least one quoted statement of the claim by someone
  who makes it), `answer` (150 words or fewer), `facts` (at least two), `contested`, `not_claimed`
  (at least one), `status`, `content_approved`.
- **F3.** Each fact has at least two sources from different sites. Not all of them may be
  governments or advocacy groups. Wikipedia is not a source.
- **F4.** Each source has a publisher, a title, an https URL, a quote of 5 to 40 words, the date
  it was read, and a kind.
- **F5.** `--online` fetches each URL, or its Wayback Machine copy, and finds the quote on the
  page after normalising quotes, dashes and spaces. A quote that is not on the page fails the run.
  A page that cannot be read is a warning, and the card cannot be verified.
- **F6.** `status: verified` requires a skeptic verdict of `holds` and every quote found online,
  recorded in `facts/verified.lock.json`.
- **F7.** `render` writes `FACTS.md` from the cards. It is never edited by hand.
- **F8.** `selftest` proves the gate rejects: one site used twice, only partisan sources, a single
  fact, no `heard`, an over-long quote, `verified` without a review, an http URL, Wikipedia, and a
  file that is not JSON.

## The feedback loop

```bash
python3 tools/factcheck.py selftest && python3 tools/factcheck.py
```

## Out of scope for v0

- The site. A search index. Translations. Any automatic judgement of whether a source is good.
