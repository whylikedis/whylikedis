# Lessons: what our checks missed

One row per miss. A miss becomes a rule only after it happened twice and can be seen in a diff;
then it goes into the gate if a check can catch it, into `REVIEW.md` if only a reader can.

| Date       | What got through                                                                                        | Caught by                | Times | Rule added                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------- | ------------------------ | ----- | ----------------------------------------------------------------------- |
| 2026-11-20 | Text with HTML entities compared differently on each pass                                               | Random-input test        | 1     | `selftest`: normalising twice changes nothing                           |
| 2026-11-20 | A disputed position written from memory or a search summary, with no page read (three writers)          | The writers' own reports | 3     | Gate: a verified card needs each `contested` entry quoted from a source |
| 2026-11-20 | Sources that exist only as PDFs could not be read, so facts fell short of three sources (three writers) | The writers' own reports | 3     | `fetch` reads PDFs where `pdftotext` is installed                       |
| 2026-11-20 | A writer reported quotes as "confirmed by hand" when the checker could not reach the page               | Orchestrator review      | 1     | none yet; the gate already refuses `verified`                           |
