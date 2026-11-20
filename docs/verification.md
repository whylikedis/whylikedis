# How this repository checks itself

The approach follows Anthropic's published guidance:
["How the Claude Code team thinks about verification"](https://claude.dev/blog/how-the-claude-code-team-thinks-about-verification/)
(16 November 2026) and
["Reduce hallucinations"](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations).
Read on 2026-11-20.

| Practice                                         | What we do here                                                                              | Where                                        | State            |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------- | -------------------------------------------- | ---------------- |
| Write down what "done" means                     | Requirements F1 to F8                                                                        | `.sdlc/intents/fact-base/`                   | done             |
| Verification means running the change            | `--online` fetches every cited page; `render` is read as a parent would                      | `verify` skill                               | done             |
| End-to-end test                                  | A card passes only if its quotes are on the live pages                                       | `factcheck.py --online`                      | done             |
| Property test                                    | 2,000 random texts per run: normalising twice changes nothing; a copied quote is found again | `factcheck.py selftest`                      | done             |
| Differential test                                | Not used: there is no older system to compare with                                           | -                                            | n/a              |
| Check that the checks work                       | `selftest` breaks a good card 16 ways and breaks each real card; every break must fail       | `factcheck.py selftest`                      | done             |
| Three failed rounds, then a person               | A written rule                                                                               | `AGENTS.md`                                  | done             |
| Checks say why they failed                       | Every failure names the card, the field and the fix                                          | `factcheck.py`                               | done             |
| A checklist triggered by the diff                | Nine triggers                                                                                | `REVIEW.md`                                  | done             |
| One reviewer, several rounds                     | Round 1 attacks the card; round 2 builds on it and ties the answer to the facts              | `fact-review` skill                          | done             |
| A change cannot modify its own checks            | Owners on the rule files; card work never edits them                                         | `.github/CODEOWNERS`                         | waits for GitHub |
| Cheap checks first                               | The gate runs before every commit                                                            | `lefthook.yml`, `scripts/pre-commit-gate.sh` | done             |
| Start a new gate in observe mode; stamp commits  | A `Checked:` line on every commit, logged when missing, not blocked yet                      | `lefthook.yml`, `scripts/checked-stamp.sh`   | observe          |
| Test the reviewer on what matters                | Planted-flaw cards with an answer key, and clean controls                                    | `evals/`                                     | not yet          |
| Turn misses into rules; prune them               | A log; a rule needs two misses                                                               | `docs/lessons.md`                            | started          |
| Let the model say "I don't know"                 | `could_not_verify` on every verified card                                                    | gate                                         | done             |
| Ground in direct quotes                          | Every source carries the exact words, 5 to 40 of them                                        | gate                                         | done             |
| Verify with citations; retract what has no quote | `answer_claims`: a sentence with no fact behind it is removed                                | gate, `fact-review` skill                    | done             |
| Compare independent runs                         | Two review rounds by an agent that did not write the card                                    | gate                                         | done             |
| Use only the provided documents                  | Cards are written from fetched pages, not from memory                                        | `AGENTS.md`, skills                          | done             |

On top of that guidance, a verified fact needs **three reliable, independent sources**.
Governments and advocacy groups may be cited, but do not count toward the three. Outlets carrying
one news agency's story count once. A fact that states what a named record says (a census, a law,
a ruling, a vote) is verified by the record itself, read by us, plus two reliable sources that
report the same content.
