# WhyLikeDIs — agent instructions

This repository is meant to be public. Write every line as if a critic will read it.

## What belongs here

- Fact cards in `facts/`, the checker in `tools/`, agent briefs in `agents/`, and later the site.
- Only what a parent may see.

## What never goes here

- Anything about a parent or a sign-up: names, emails, questions they sent.
- Founders' private answers, pricing, plans, drafts that were not approved.
- Secrets: keys, tokens, passwords.
- Material from anyone's employer.

## Rules for facts

1. **A fact has two sources from different sites.** At least one is not a government or an
   advocacy group. Wikipedia is a way to find sources, not a source.
2. **Quote the page exactly.** 5 to 40 words, copied from what
   `python3 tools/factcheck.py fetch <url>` prints. If the page will not load, add an `archive`
   link from the Wayback Machine.
3. **Quote the other side fairly.** `heard` carries the claim in the words of someone who makes
   it. No strawmen.
4. **Say what is contested.** If historians disagree, the card says so and names the sides.
5. **Say what the card does not claim.**
6. **The writer does not verify.** `status: verified` needs a skeptic's `holds` from a different
   agent, and every quote found by `--online`.
7. **`content_approved` stays false.** Only the teacher sets it.
8. Say "pro-Israel advocacy" or "outreach". Plain English, short sentences.

## The one command

```bash
python3 tools/factcheck.py selftest && python3 tools/factcheck.py
```

It must exit 0 before any commit. Never edit the checker to make a card pass.
