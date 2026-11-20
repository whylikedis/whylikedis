# Answer key

Do not show this file to the reviewer. One row per case. A finding scores only if it describes the
flaw in the last column.

| File | Verdict | Planted flaw |
| ---- | ------- | ------------ |
| case-01.json | flawed | Wrong number. `facts[0]` says the 2020 joint height of Everest is 8,848.68 metres (digits swapped), and the answer repeats it. All three cited pages (NPR, Kathmandu Post, SCMP) say 8,848.86 metres. |
| case-02.json | clean | No known flaw. |
| case-03.json | flawed | Wrong source kind. In `facts[1]` the third source (History Skills, historyskills.com) is labelled `reference`. It is a classroom study site with no named author or institution behind it, so it should be `other` and does not count toward the three. |
| case-04.json | flawed | Three sources are one text. `facts[0]` cites NASA's news release, ScienceDaily and SatNews. The two others reproduce the NASA/JPL release word for word (ScienceDaily credits NASA/JPL). No `wire` field says so, so it is one source, not three. |
| case-05.json | clean | No known flaw. |
| case-06.json | flawed | Quote reversed by context. In `facts[0]` the Smithsonian quote says defaulting buyers left traders "in debt or bankrupted". The next sentences on that page say "At least that's what has always been claimed", and Goldgar "couldn't find anybody that went bankrupt". History.com says the same. The bankruptcy half of the fact is the legend the page debunks. |
| case-07.json | flawed | Record fact worded as a fact about the world. `facts[0]` is flagged `"record": true` with the WHO page as `is_record`, but it says "Smallpox was eradicated from the world in 1980". The record only says that the World Health Assembly declared, on 8 May 1980, that the world had won freedom from smallpox. It should say what the declaration says, or lose the record flag. |
| case-08.json | flawed | Strawman in `heard[0]`. The card says Henry Frankel argues that lack of a mechanism was a sound reason to reject drift. His quote on the Live Science page calls it an irony that the key objection was the missing mechanism, since plate tectonics was accepted without one. He does not make the claim. |
| case-09.json | clean | No known flaw. |
| case-10.json | flawed | Unsupported answer sentence. The last sentence, "Radar satellites can pick the wall out far more easily than a person can", is backed by none of the three facts. Nothing on the card mentions radar or satellites. |
| case-11.json | flawed | Contested entry not held by its source. `contested[0]` says some clinicians still hold that stress and lifestyle are a major cause of ulcers. The quoted Nobel press release only describes that as the view in 1982 and says H. pylori causes over 90% of duodenal ulcers. Nobody is quoted holding the position. |
| case-12.json | clean | No known flaw. |

## Notes for scoring

- Flaw kinds, in the order of the brief: 1 context reverses quote (case-06), 2 wrong number
  (case-01), 3 three sources one text (case-04), 4 unsupported answer sentence (case-10), 5 strawman
  in `heard` (case-08), 6 record wording (case-07), 7 wrong source kind (case-03), 8 contested
  source does not hold the position (case-11).
- Case-04 labels the NASA release `primary`. A reviewer who calls it `government` has found a
  different, smaller point. It scores only if the finding says the three sources are one text.
- Case-07 and case-11 each rely on a WHO or Nobel page that is correct as far as it goes. The flaw
  is in how the card uses it.
- Case-06 and case-11 also have other facts that contradict the planted one. A reviewer who spots
  only the contradiction between facts, without saying the quote is out of context (case-06) or the
  source does not hold the position (case-11), has not described the flaw.
- Clean cards were checked by hand, but a clean card may still hold a flaw we missed. Judge each
  false alarm on the page before counting it. If the reviewer is right, fix the card and log it.
- `verified.lock.json` in this folder is the output of the online gate run on the cards. It is kept
  here so the cards folder holds nothing but cards.
