# Lessons: what our checks missed

One row per miss. A miss becomes a rule only after it happened twice and can be seen in a diff;
then it goes into the gate if a check can catch it, into `REVIEW.md` if only a reader can.

| Date       | What got through                                              | Caught by      | Times | Rule added                                   |
| ---------- | ------------------------------------------------------------- | -------------- | ----- | -------------------------------------------- |
| 2026-11-20 | Text with HTML entities compared differently on each pass     | Random-input test | 1  | `selftest`: normalising twice changes nothing |
