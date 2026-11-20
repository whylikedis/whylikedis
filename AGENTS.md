# WhyLikeDIs — agent instructions

This repository is meant to be public. Write every line as if a critic will read it.

## What belongs here

- Fact cards in `facts/`, the checker in `tools/`, skills in `.claude/skills/`, and later the site.
- Only what a parent may see.

## What never goes here

- Anything about a parent or a sign-up: names, emails, questions they sent.
- Founders' private answers, pricing, plans, drafts that were not approved.
- Secrets: keys, tokens, passwords.
- Material from anyone's employer.

## Rules a check cannot enforce

The gate (`tools/factcheck.py`) enforces everything it can. These are the rest. Keep this list
short: a rule moves into the gate as soon as a check can catch it.

1. **Use only what you read.** A quote is copied from the page, never from memory or a search
   summary. If you cannot find it, say so in `could_not_verify`.
2. **Quote the other side fairly.** `heard` carries the claim in the words of someone who makes
   it. No strawmen.
3. **Say what is contested.** If serious historians disagree, name the positions. Never drop a
   fact because it hurts the answer.
4. **The writer does not verify.** Reviews come from an agent that did not write the card.
5. **Three rounds, then a person.** If a check still fails after three rounds of fixing, stop and
   ask. Never skip a check, add a retry, or run it again until it passes.
6. **A change cannot change its own checks.** Card work never edits `tools/`, `AGENTS.md`,
   `REVIEW.md`, `.claude/` or `.github/`. Those change in their own commit, approved by an owner.
7. **`content_approved` stays false.** Only the teacher sets it.
8. **No contact with anyone.** No forms, sign-ups, posts or messages. Searches stay generic.
9. **Restraint.** No graphic descriptions. Say "pro-Israel advocacy" or "outreach". Plain English.

## Where a rule lives

| Kind of rule                                 | Home                                 | Example                                    |
| -------------------------------------------- | ------------------------------------ | ------------------------------------------ |
| A computer can check it                      | `tools/factcheck.py` (the gate)      | Three reliable sources; the quote is on the page |
| Judgement, needed in every session           | This file (`CLAUDE.md` imports it)   | Quote the other side fairly                |
| A procedure, needed only for one kind of task | A skill in `.claude/skills/`         | How to write a card; how to verify         |
| What a reviewer looks for in a diff          | `REVIEW.md`                          | A changed quote means a new online check   |

A new rule is added only after the same mistake happened twice, and as a check if at all possible.
Misses are logged in `docs/lessons.md`. Rules that never catch anything are removed.

## Skills

- `verify`: prove a change works before committing.
- `fact-card`: write or extend a card.
- `fact-review`: review a card you did not write, in two rounds.

## The one command

```bash
python3 tools/factcheck.py selftest && python3 tools/factcheck.py
```

It must exit 0 before any commit. Never edit the checker to make a card pass.
