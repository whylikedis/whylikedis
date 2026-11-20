# The election map

## The question

In Israel's elections for the 25th Knesset (1 November 2022) and the 26th Knesset (27 October
2026), do Likud voters live among voters for the opposition parties more than they live among
three other groups of voters?

- The opposition parties.
- The ultra-Orthodox (Haredi) parties: Shas, United Torah Judaism.
- The Arab-majority parties.
- Religious Zionism (in 2026, with Otzma Yehudit, as in 2022).

The authors suspected yes. This page measures it, for both elections, the same way. A second
finding from Israeli political science is a split between centre and periphery, and between
richer and poorer places. We test what the files allow.

## The data

Four files from the Central Elections Committee, the official results, and the committee's
national results page for each election, saved:

- results by locality and results by ballot box (polling station) for 2022;
- the same two files for 2026;
- the national results page for each election, with the votes and seats of every list.

URLs, download date and SHA-256 hashes are in `analysis/elections/data/SOURCES.md`. All are UTF-8.
The 2022 files were first taken from the government open-data portal and later from the
committee's own host. The hashes are identical.

The files give no locality type. There is no flag for Jewish or Arab places, development towns,
kibbutzim, moshavim or West Bank settlements, and no income ranking. So we skip official types.

An earlier note in `SOURCES.md` said the 2026 results were not published. That was wrong. The
committee's site gave a temporary error. It is corrected there.

## National check

For each election, every list on the committee's national page was compared with the totals in
both CSV files. Valid votes were compared too, and the list votes were added up, and the seats
(120).

| Election | Lists on page | Valid votes | Result    |
| -------- | ------------- | ----------- | --------- |
| 2022     | 40            | 4,764,742   | All match |
| 2026     | 38            | 5,691,426   | All match |

The script prints the whole table. `test_elections.py` fails if any figure differs.

## What we left out

"Double envelope" votes are cast by soldiers, diplomats, patients and others away from their
home station. They have no location. They are left out of every measure below.

| Election | Double-envelope votes | Share of valid votes | Votes measured | Stations | Localities |
| -------- | --------------------- | -------------------- | -------------- | -------- | ---------- |
| 2022     | 458,714               | 9.6%                 | 4,306,028      | 11,707   | 1,215      |
| 2026     | 450,074               | 7.9%                 | 5,241,352      | 12,018   | 1,224      |

## The blocs, and how each list was assigned

The table is at the top of `analysis/elections/elections.py`, with the official ballot letters.
Letters changed meaning between the years (`ב` was The Jewish Home in 2022 and Otzma Yehudit in
2026; `ד` was Balad, then "Partnership for All"), so each election has its own table.

**2022.** Likud. Opposition: Yesh Atid, National Unity, Labor, Meretz, Yisrael Beiteinu. Haredi:
Shas, United Torah Judaism. Arab: Ra'am, Hadash-Ta'al, Balad. Religious Zionism (it ran jointly
with Otzma Yehudit). Other: everything else, 2.6% of votes.

**2026.** The committee does not group lists, so these are our choices.

- Likud.
- Opposition, strict: The Democrats (Labor and Meretz merged) and Yisrael Beiteinu. These carry
  on lists that were in the 2022 opposition group.
- Yashar!, Together and The Reservists and the Economic each get their own row. None ran in 2022
  under its present name, and National Unity (Blue White) won no votes in 2026. We did not force
  them into a group.
- Haredi: Shas, United Torah Judaism.
- Arab: The Joint List, Ra'am.
- Religious Zionism with Otzma Yehudit, as one row. They were one list in 2022, so the row is
  comparable.
- Other: all remaining lists, 2.5% of votes. This includes "Partnership for All" and the
  Arab-Jewish joint list, which are too small to place, and Am Yisrael.

Because the choice could change the answer, every 2026 measure is shown both ways. "Broad" adds
Yashar!, Together and Reservists to the opposition. It is the like-for-like row against 2022,
and the 2026 columns below use it unless a row says otherwise. Both versions are in the script
output and in `results.json`.

## The method, in plain words

- **Dissimilarity index.** Take two groups of voters. For each town (or station), find what
  share of group A lives there and what share of group B lives there. Add up the gaps and halve
  it. 0 means the two groups are spread the same way. 1 means no place holds both.
- **Chance floor.** Small stations never look perfectly even. We redraw every station's voters at
  random, at the national shares, to see what pure chance gives: about 0.04 to 0.07 for the large
  blocs.
- **Exposure.** For the average voter of a bloc, what share of the other voters at the same
  station voted for each bloc. The voter herself is not counted.
- **Exposure ratio.** Exposure divided by the bloc's national share. 1.00 means as if voters were
  mixed evenly.
- **Correlation.** Across stations with at least 50 valid votes, do stations with a high Likud
  share also have a high share for another bloc? +1 yes, 0 no link, -1 the reverse.

## The tables

2026 is the broad grouping unless noted. Station figures are used in the text.

### Dissimilarity: each bloc against all other voters

| Bloc                       | 2022 locality | 2022 station | 2026 locality | 2026 station |
| -------------------------- | ------------- | ------------ | ------------- | ------------ |
| Likud                      | 0.30          | 0.37         | 0.35          | 0.42         |
| Opposition                 | 0.43          | 0.50         | 0.47          | 0.53         |
| Haredi                     | 0.53          | 0.62         | 0.60          | 0.70         |
| Arab                       | 0.88          | 0.93         | 0.89          | 0.94         |
| Religious Zionism (+Otzma) | 0.31          | 0.37         | 0.34          | 0.40         |

Chance floor at station level: 0.04 to 0.07 in both years. For 2026 with the lists apart, the
station figures are: Opposition strict 0.39, Yashar! 0.41, Together 0.40, Reservists 0.32.

### Dissimilarity: Likud voters against each bloc's voters

| Against                    | 2022 locality | 2022 station | 2026 locality | 2026 station |
| -------------------------- | ------------- | ------------ | ------------- | ------------ |
| Religious Zionism (+Otzma) | 0.23          | 0.28         | 0.25          | 0.30         |
| Opposition                 | 0.31          | 0.37         | 0.32          | 0.39         |
| Haredi                     | 0.48          | 0.57         | 0.55          | 0.66         |
| Arab                       | 0.88          | 0.94         | 0.88          | 0.95         |

With the 2026 lists apart (station): Democrats and Yisrael Beiteinu 0.43, Yashar! 0.41,
Together 0.42, Reservists 0.26.

### The average Likud voter's polling station

Share of the other voters at the same station.

| Bloc                       | 2022  | 2026  | 2022 ratio | 2026 ratio |
| -------------------------- | ----- | ----- | ---------- | ---------- |
| Likud                      | 33.4% | 32.7% | 1.43       | 1.58       |
| Opposition                 | 38.2% | 41.9% | 1.01       | 1.04       |
| Haredi                     | 11.3% | 7.8%  | 0.78       | 0.72       |
| Arab                       | 1.5%  | 1.5%  | 0.13       | 0.10       |
| Religious Zionism (+Otzma) | 12.8% | 13.3% | 1.24       | 1.30       |
| Other                      | 2.8%  | 2.7%  | 1.09       | 1.08       |

The ratio is exposure divided by the bloc's national share; 1.00 is even mixing. The 2026
opposition share, split: Democrats and Yisrael Beiteinu 12.3% (ratio 0.99), Yashar! 16.7% (1.04),
Together 9.4% (1.04), Reservists 3.5% (1.32).

The other way round, the average opposition voter's station is 23.6% Likud in 2022 (ratio 1.01)
and 21.6% in 2026 (ratio 1.04). Locality-level tables for every bloc are in `results.json`.

### Inside the ten largest cities (station level)

The average Likud voter's station: share of opposition and of Haredi voters, and the Likud
against opposition dissimilarity index.

| City          | Opposition 2022 | Opposition 2026 | Haredi 2022 | Haredi 2026 | D 2022 | D 2026 |
| ------------- | --------------- | --------------- | ----------- | ----------- | ------ | ------ |
| Jerusalem     | 26.6%           | 29.4%           | 21.7%       | 19.5%       | 0.31   | 0.33   |
| Tel Aviv-Yafo | 56.2%           | 60.3%           | 8.8%        | 6.1%        | 0.36   | 0.40   |
| Haifa         | 53.9%           | 57.0%           | 5.6%        | 4.2%        | 0.25   | 0.27   |
| Rishon LeZion | 47.6%           | 53.0%           | 6.1%        | 3.7%        | 0.17   | 0.19   |
| Petah Tikva   | 41.0%           | 46.9%           | 11.4%       | 8.4%        | 0.20   | 0.21   |
| Ashdod        | 35.3%           | 39.0%           | 17.6%       | 11.2%       | 0.19   | 0.19   |
| Netanya       | 34.4%           | 38.8%           | 14.3%       | 8.8%        | 0.22   | 0.21   |
| Be'er Sheva   | 29.9%           | 34.8%           | 10.3%       | 5.2%        | 0.15   | 0.14   |
| Bnei Brak     | 5.2%            | 5.5%            | 78.1%       | 74.6%       | 0.25   | 0.25   |
| Holon         | 40.4%           | 46.1%           | 11.5%       | 8.1%        | 0.14   | 0.15   |

Jerusalem includes Arab neighbourhoods, which vote at their own stations. Bnei Brak is almost
entirely Haredi.

### Correlation of Likud's share with each bloc's share

| Bloc                       | 2022 stations | 2022 weighted | 2026 stations | 2026 weighted |
| -------------------------- | ------------- | ------------- | ------------- | ------------- |
| Opposition                 | +0.02         | +0.01         | +0.01         | +0.07         |
| Haredi                     | -0.14         | -0.21         | -0.19         | -0.18         |
| Arab                       | -0.55         | -0.51         | -0.51         | -0.54         |
| Religious Zionism (+Otzma) | +0.35         | +0.34         | +0.31         | +0.34         |

"Weighted" counts each station by its valid votes. Across localities, weighted: Opposition +0.09
in 2022 and +0.17 in 2026. With the 2026 lists apart (stations): Democrats and Yisrael Beiteinu
-0.07, Yashar! -0.01, Together 0.00, Reservists +0.50.

### Split by type of place

The files carry no official type. These classes are made from the votes and the size of the
place, so they are our labels, not the state's. Last column: opposition share in the average
Likud voter's station.

| Class                        | Likud 2022 | Likud 2026 | Opp. 2022 | Opp. 2026 | Station opp. 2022 | Station opp. 2026 |
| ---------------------------- | ---------- | ---------- | --------- | --------- | ----------------- | ----------------- |
| Arab parties won over half   | 1.3%       | 0.4%       | 4.4%      | 3.7%      | 8.7%              | 13.7%             |
| Haredi parties won over half | 5.7%       | 5.6%       | 2.5%      | 2.9%      | 10.9%             | 12.1%             |
| Other, 80,000+ valid votes   | 25.8%      | 24.4%      | 43.3%     | 48.1%     | 41.2%             | 44.6%             |
| Other, 30,000 to 79,999      | 29.6%      | 27.0%      | 46.0%     | 51.3%     | 40.1%             | 44.0%             |
| Other, 10,000 to 29,999      | 33.0%      | 30.5%      | 38.0%     | 41.8%     | 33.8%             | 36.9%             |
| Other, under 10,000          | 21.2%      | 19.0%      | 51.1%     | 55.4%     | 38.6%             | 42.1%             |

## What the numbers show

1. **Likud voters sit closer to the opposition than to the Haredi or Arab parties, in both
   years.** Station dissimilarity against the opposition is 0.37 in 2022 and 0.39 in 2026. Against
   Haredi voters it is 0.57 and 0.66. Against Arab-party voters it is 0.94 and 0.95.
2. **But that is about what chance gives.** The exposure ratio of Likud voters to opposition
   voters is 1.01 in 2022 and 1.04 in 2026. They meet opposition voters as often as the
   opposition's national share predicts, not more. They meet fewer Haredi voters (ratio 0.78 and
   0.72) and almost no Arab-party voters (0.13 and 0.10).
3. **Religious Zionism is closer to Likud than the opposition is, in both years.** 0.28 against
   0.37 in 2022; 0.30 against 0.39 in 2026. Across stations, Likud's share rises with Religious
   Zionism's (+0.35 and +0.31) and has no link to the opposition's (+0.02 and +0.01).
4. **The cities differ.** In Tel Aviv-Yafo and Haifa the Likud voter's station is more than half
   opposition in both years. In Be'er Sheva it is about a third, and Likud and Religious Zionism
   together outweigh the opposition. In Jerusalem the Haredi share is about a fifth.
5. **Between towns versus within towns.** Every index is lower at locality level than at station
   level (Likud 0.35 and 0.42 in 2026). Part of the separation is between towns, part within them.
6. **Centre and periphery, only partly tested.** In both years Likud's share is lowest in the
   smallest places (21% and 19%), highest in places of 10,000 to 30,000 valid votes (33% and 31%)
   and lower again in the biggest cities (26% and 24%). The opposition share runs the other way in
   the mid-sized towns. We cannot say whether that is geography or income, because the files carry
   neither.
7. **The grouping choice in 2026 does not change the finding.** With a strict opposition, the
   exposure ratio is 0.99 and the station dissimilarity is 0.43. With the broad one it is 1.04 and
   0.39. Yashar! and Together each give 1.04. Both are close to even mixing. The one list that
   behaves differently is the Reservists: their voters live in stations where Likud's share is high
   (correlation +0.50, dissimilarity from Likud 0.26, closer than Religious Zionism).

## What changed between 2022 and 2026

- **Turnout and size.** Valid votes rose from 4.76 million to 5.69 million. The double-envelope
  share fell from 9.6% to 7.9%.
- **Everything is a little more separate.** Station dissimilarity against all other voters rose
  for Likud (0.37 to 0.42), the opposition (0.50 to 0.53), Haredi (0.62 to 0.70), Religious Zionism
  (0.37 to 0.40) and Arab-party voters (0.93 to 0.94). The numbers cannot say why. The lists, and
  so the blocs, are not identical: more lists with small shares, the Arab parties running jointly
  again, and the new lists above.
- **The average Likud voter's station is a little more opposition and less Haredi.** Opposition
  38.2% to 41.9%; Haredi 11.3% to 7.8%. Part of this is the shares: the broad opposition won
  40% of located votes in 2026 against 38% in 2022, and the Haredi parties won 11% against 14.5%.
  The exposure ratio to the opposition moved only from 1.01 to 1.04.
- **The Arab-party share of located votes rose from 11.3% to 15.5%.** The separation of those
  voters stayed at 0.93 to 0.94.
- **The pattern in the big cities and in the size classes is the same in both years.**

## A caution about the 2026 files

The 2026 ballot-box file has two columns the 2022 file lacks, "external" and "other ballot box".
The files do not define them and do not split them by party. For some stations they exceed the
station's valid votes. As a check we ran 2026 again without the 1,100 stations where they exceed
25% of valid votes. Results moved by at most 0.01 on the main indices (Likud against all other
voters 0.419 instead of 0.417; Likud against the strict opposition 0.422 instead of 0.427).

## What this does not show

- Polling stations are not neighbourhoods. A station serves a few hundred to a few thousand
  voters, assigned by address, but lines can cut across streets, and big stations may combine
  several blocks.
- Living near someone is not sharing a way of life. Neighbours may never meet.
- Many voters did not vote. And 9.6% (2022) and 7.9% (2026) of valid votes, the double envelopes,
  have no place.
- Two elections, not a trend. We did not test any other year.
- A station's results are not individual choices. We know where votes were cast, not who cast
  them.
- It says nothing about why people vote as they do.
- The blocs are our choice. The committee does not group lists. Other groupings give other
  numbers, and 2026 has new lists that do not map cleanly to 2022. Ra'am, Hadash-Ta'al and Balad
  (2022), and the Joint List and Ra'am (2026), are in one Arab bloc, though they differ.
- The chance floor is one random draw (seed fixed), not an average of many.
- Centre, periphery and class were not tested with an official index.
- The 2026 "external" and "other ballot box" columns are unexplained in the files (see above).

## Verdicts on the hunch

- **2022: partly supported.** Likud voters share stations with opposition voters far more than
  with Haredi or Arab-party voters (dissimilarity 0.37 against 0.57 and 0.94), but no more than
  chance (exposure ratio 1.01), and Religious Zionism is closer to Likud (0.28).
- **2026: partly supported.** The same: 0.39 against 0.66 and 0.95, exposure ratio 1.04 with the
  broad opposition (0.99 with the strict one), and Religious Zionism with Otzma closer to Likud
  (0.30).

Run it again: `python3 analysis/elections/elections.py` and
`python3 analysis/elections/test_elections.py`.
