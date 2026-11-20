# What the reviewer looks for

Read the diff and check only the items whose trigger matches. Tag findings `must-fix`,
`should-fix`, `nit` or `pre-existing`. Say why each one matters.

| Trigger in the diff                             | Check                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------ |
| A `quote` or `url` changed                      | Was `--online` re-run? Is the new quote in `facts/verified.lock.json`?   |
| A number appears in `answer` or a fact          | Does the card say what the number counts and who counted it?             |
| `status` became `verified`                      | Did a different agent write `review`? Do the notes show a real attempt to break the card? |
| A sentence was added to `answer`                | Is it in `answer_claims` with a fact behind it?                          |
| A source of kind `government` or `advocacy`     | Is it one voice among others, and labelled honestly?                     |
| `contested` got shorter                         | Why? A removed dispute needs a reason in the commit message.             |
| `tools/`, `AGENTS.md`, `REVIEW.md`, `.claude/`, `.github/` | Is this the only kind of change in the commit? Does `selftest` cover the new rule, and fail without it? |
| Anything outside `facts/`                       | Could it expose a person, a plan or a secret? This repository is public. |
| `content_approved` became `true`                | Only the teacher may do this.                                            |
