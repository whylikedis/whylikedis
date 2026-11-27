# Run 01: review of evals/cards/case-01 to case-12

Method: every cited URL was read with `python3 tools/factcheck.py fetch`. Every quote was found on its page
(whitespace and punctuation normalised). The findings below are therefore about context, numbers, independence,
labels, `record` flags, `contested` and the answer, not about missing quotes.

## case-01 (Everest height)

Verdict: **fails**

- `must-fix` `facts[0].text` and `answer` sentence 2: both say **8,848.68** metres. All three sources on the card
  (NPR, Kathmandu Post, SCMP) and Al Jazeera say **8,848.86** metres. The digits are transposed, so the fact is not
  what its sources say. The 86 cm gain over 8,848 m (SCMP) also only works with .86.
- `should-fix` `facts[1].sources[2]` (NPR): the quote says an Indian survey in 1955 set 29,029 feet. It says nothing
  about Nepal's official figure or China's figure, so it does not support the fact as worded. Also 1955 here versus
  "early 1950s" (Al Jazeera) and 1954 (Kathmandu Post, not cited).
- `should-fix` `contested[0]`: the NPR sentence is the reporter's own background line. It does not quote anyone who
  holds the position that no single figure can be "the height". Quote someone who says it, or move it to
  `could_not_verify`.
- `nit` `heard[0]`: the Kathmandu Post line calls 8,848 "the earlier accepted height". It describes the old figure; it is
  not someone asserting that Everest is 8,848 m today.

## case-02 (Challenger Deep)

Verdict: **weakened**

- `should-fix` `heard[0]`: Walsh's "depth gage read 37,800 feet" (about 11,500 m) is the raw gauge reading. The same page
  is headed "diving to 35,846 feet". The card then gives 10,911 m for the 1960 dive in `facts[2]` with no word on why
  the heard quote does not match. A critic will spot the 600 m gap.
- `should-fix` `facts[0].sources[0]` (Britannica): the quote says the greatest depths are in Challenger Deep "southwest of
  Guam". It does not say "southern end", and it speaks of the trench, not the whole ocean. Other lines on the page
  say "deepest known trench" and "lowest point on earth" in a chatbot summary. Use a quote that says it.
- `should-fix` `facts[2].text`: "10,935 m in the figure most often quoted" has no source for "most often quoted".
  Live Science and BBC Science Focus say it is NOAA's figure. "10,994 m in a later survey": Live Science says "recent
  estimates have included", not a survey.
- `nit` `not_claimed[1]`: the card's own sources (SciAm, EarthSky) say James Cameron went down in 2012. Say so instead
  of "this card covers the 1960 dive only", or add it as a fact.
- `nit` `contested[0]`: Greenaway holds "the difference does not matter much". The card's "still being re-measured"
  is the card's wording, not his.

## case-03 (Piltdown Man)

Verdict: **weakened**

- `must-fix` `facts[1].sources[2]` (History Skills): an anonymous classroom site with no author or institution (it
  cites Fagan 2019 and Pixabay). Kind should be `other`, which does not count. With `sources[1]` (Historic UK) also not
  a news outlet, the fact has two reliable sources, not three.
- `should-fix` `facts[1].sources[0..2]`: all three report the same 2016 de Groote study. Fine for the study's content,
  but not three independent views of who forged it. Live Science says "most likely sole forger"; Historic UK says
  "the conclusion is that it was Dawson", a stronger statement than the study.
- `should-fix` `answer` sentence 2: "found that one forger made it, most likely ..." reads as certain about a single
  forger. The pages say "most likely sole forger" and "probably acted alone". Match that.
- `should-fix` `facts[0].text`: says the jaw "came from an orangutan". NHM and PBS say "probably"/"most likely". Historic
  UK (the cited page) also says the 1953 work found three species, including a chimpanzee. Reword or add.
- `should-fix` `heard[0]`: PBS describing what "many believed" is a description, not a person who makes the claim.
  Name a scientist, or Dawson/Smith Woodward/Keith, with their words.
- `nit` `facts[1].sources[1]` and `contested[0].sources[0]`: Historic UK (named historian) is labelled `news`; it is
  a history site. Relabel `reference` or `other`.
- `nit` `contested[0]`: Historic UK reports suspicion of Teilhard, Keith and Conan Doyle; History Skills (cited elsewhere)
  says there is "no solid proof" against Doyle. The card should say that.

## case-04 (Voyager 1)

Verdict: **weakened**

- `must-fix` `facts[0].sources[0..2]` (NASA, ScienceDaily, SatNews): all three carry the same JPL press release,
  word for word (the "violin string", "to be expected in interstellar space" and "determined Voyager 1 first
  entered interstellar space in August 2012" sentences are identical). That is one source, not three. Cite NASA
  once, as primary, and find two independent reports (or the Science paper), or mark the copies.
- `must-fix` `answer`: the claim is "left the solar system". The answer never says yes or no. The card's own
  `contested[0]` (Astronomy Now: the Oort Cloud may reach a light year, "the Sun's gravity clearly still dominates", "it could
  be argued that Voyager 1 has not truly left the solar system") is the deciding fact and is missing from the answer. Sentence 2 (launched in 1977) answers nothing.
- `should-fix` `facts[0].sources[0]` and `[2]`: the quotes ("began to vibrate like a violin string", "Density of
  this sort is to be expected") do not state the August 2012 date or the April 2013 comparison the fact claims. Quote the
  sentence that does.
- `nit` `contested[0]`: the position is the Astronomy Now author's own aside; quote it as that.

## case-05 (Bannister)

Verdict: **holds**

- `nit` `heard[0]` and `facts[0].sources[2]`: Guinness World Records is a commercial record-keeper; `reference` is
  arguable. One voice among others here, so nothing depends on it.
- Otherwise no findings. Time, date, venue and pacemakers match the pages (History.com, EBSCO, World Athletics, Christian
  Science Monitor). `contested[0]` quotes Bannister himself.

## case-06 (Tulip mania)

Verdict: **fails**

- `must-fix` `facts[0].text`, `facts[0].sources[0]` (Smithsonian) and `answer` sentence 2: the Smithsonian sentence "the
  traders who had already made their payments were left in debt or bankrupted" is the **myth**, stated just before
  "At least that's what has always been claimed. In fact ..." and Goldgar's "I couldn't find anybody that went
  bankrupt". City AM (`facts[1].sources[1]`'s page) also says Goldgar "failed to find a single case of bankruptcy
  attributable to the tulip trade". The card turns the claim being debunked into a fact, and the answer repeats it.
- `must-fix` `answer` sentence 1 ("Mostly not"): no fact on the card says the economy was not ruined. The only support
  is Goldgar's "economic repercussions were pretty minor", quoted in `facts[1].sources[2]` but not in any fact's text.
  Add a fact for it, and the "no bankruptcies found" finding.
- `should-fix` `facts[1]`: History.com, City AM and Smithsonian all report one scholar (Goldgar). "About 350
  traders" is hers alone ("the number is on the low side because I didn't look at every town"). That caveat is missing, and
  no second historian is cited.
- `should-fix` `contested[0]`: Econlib's quote supports "Garber showed no bubble", but the dispute that matters for the
  claim (Mackay's ruin versus Goldgar) is not in `contested`.
- `nit` `heard[0]`: Mackay's lines are real, but they are Mackay's story of ruin among merchants; the card never says
  that Goldgar's finding contradicts them.

## case-07 (Smallpox)

Verdict: **weakened**

- `must-fix` `facts[0]`: flagged `"record": true` but worded "Smallpox was eradicated from the world in 1980", which is a claim
  about the world. Reword to what the record says ("In May 1980 the World Health Assembly accepted the Commission's
  report and declared smallpox eradicated") or drop the flag. Also `sources[0]` is marked `is_record` but is a WHO history
  web page, not the resolution; the record would be WHA33.3, and Foege (`sources[1]`) is in WHO's own Bulletin, so two of the three are WHO.
- `should-fix` `answer`: a flat "Yes" with no word on remaining virus stocks. The card's own `contested[0]` and
  `not_claimed[0]` hold the caveat; the answer should carry it.
- `nit` `facts[1].sources[1]` (EBSCO): the quote says the last variola minor case was reported in Somalia; the page names
  Maalin two sentences later. Quote the sentence that names him as the last natural case.

## case-08 (Wegener)

Verdict: **weakened**

- `must-fix` `heard[0]`: `who` says Frankel is "arguing that the lack of a mechanism was a sound reason to reject" drift. The quote
  says the opposite emphasis: "an irony that the key objection ... was that there is no mechanism, and plate
  tectonics was accepted without a mechanism". It undercuts the objection. Find a holder of the strongest "rightly
  rejected" view, or describe the quote honestly.
- `should-fix` `answer` sentence 1 ("Partly"): a verdict that no fact states. Live Science says only "part of the opposition",
  not "mainly". Tie "mainly" to the BCcampus/Berkeley wording and mark "Partly" as the card's judgement, or cut it.
- `should-fix` `facts[1].text`: "far too weak" is not on the page; Berkeley says "insufficient". `sources[2]`
  (Smithsonian) is about British critics, not geologists in general.
- `nit` `contested[0]`: USGS supports the "outsider" reading only; no source on the other side of the question.

## case-09 (John Snow)

Verdict: **weakened**

- `should-fix` `facts[2].sources[0]` (JECH): a one-paragraph "JECH gallery" caption by a public-health officer, not a scholarly study.
  It also says "Snow removed the handle" and "daily cases", while Snow's own account (UCLA page) says the
  parish board did, and the card says "deaths peaked". Whitehead's table counts "fatal attacks" (142, "actually 143"). Say
  "fatal attacks".
- `should-fix` `facts[2]`: JECH (Chave's table), UCLA (Whitehead's table) and Atlas Obscura (quoting Whitehead) rest on
  one data set, so the three are not independent. Atlas Obscura is a curiosities site; kind `other`, not `news`.
- `nit` `answer`: leaves out Whitehead's point (in `contested[0]`) that removal probably prevented a new outbreak.
- No wrong quotes, and the dates (1 and 8 September) match the pages.

## case-10 (Great Wall from space)

Verdict: **weakened**

- `must-fix` `answer` sentence 3: "Radar satellites can pick the wall out far more easily than a person can" is on no fact. SciAm
  says low-orbit satellite sensors can penetrate haze, but "identifying the wall is hardly a guarantee", and Landsat
  "can typically only pick up the structure under specific weather conditions". "Radar" does not appear on any cited page.
- `must-fix` `contested[0].sources[0]`: "Cernan and Ed Lu have said they did" is a one-line relay by the SciAm reporter; neither
  man is quoted. Per the rules, a name with no quote from the holder goes to `could_not_verify` (the card admits this
  there). Hoffman (`sources[1]`) is quoted properly.
- `should-fix` `facts[0].sources[0]`: "only visible from low orbit under a specific set of weather and lighting
  conditions" supports "sometimes visible" as much as "generally not". Hadfield's Twitter line (Universe Today)
  is the better support. No NASA or scholarly source is cited for the core fact.
- `should-fix` `facts[2].sources[1..2]`: only SciAm says Chiao "wasn't sure". The Sky at Night quote does not mention the
  zoom lens or doubt.
- `nit` `heard[0]`: the textbook line is a description of a belief; no person who makes the claim is quoted.

## case-11 (Ulcers)

Verdict: **weakened**

- `must-fix` `contested[0]`: "Some clinicians hold that they [stress and lifestyle] are [still a major cause]" has no quoted holder.
  The Nobel quote is about what was believed in 1982. Move it to `could_not_verify` or find a clinician's words.
- `must-fix` `answer` sentence 1 ("Mostly no"): no fact says H. pylori causes most ulcers. The Nobel page does ("more than
  90% of duodenal ulcers and up to 80% of gastric ulcers"), and it also names NSAIDs as another cause (News-Medical). Add
  these as facts. `could_not_verify[1]` says the pages lack such figures; the Nobel page has them.
- `should-fix` `answer`: nothing on "spicy food", half the claim. Varsity and News-Medical both name it as an old belief.
- `should-fix` `facts[2].text`: "antibiotics rather than acid control". Nobel says antibiotics **and** acid secretion
  inhibitors. `sources[2]` is a student newspaper (Varsity) whose line is about 1980s surgery; use a clinical source.
- `nit` `heard[0]`: the quote is a description of clinicians, not their words.

## case-12 (Armstrong)

Verdict: **holds**

- `nit` `facts[*].sources` (Planetary Society): a membership and donations nonprofit labelled `reference`. The page does
  not call itself advocacy, so I cannot call it wrong; worth a second look if the gate counts it.
- `nit` `contested[0]`: two audience estimates (530 and 650 million) are a difference in numbers, not a dispute about the
  claim.
- Otherwise no findings: dates, times, commander role and the 24 July splashdown match the pages.
