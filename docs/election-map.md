# The election map

## The question

In Israel's election for the 25th Knesset (1 November 2022), do Likud voters live among voters
for the opposition parties more than they live among three other groups of voters?

- The opposition: Yesh Atid, National Unity, Labor, Meretz, Yisrael Beiteinu.
- The ultra-Orthodox (Haredi) parties: Shas, United Torah Judaism.
- The Arab-majority parties: Ra'am, Hadash-Ta'al, Balad.
- Religious Zionism, a party on its own.

The authors suspected yes. This page measures it. A second finding from Israeli political
science is a split between centre and periphery, and between richer and poorer places. We test
what the files allow.

## The data

Two files from the Central Elections Committee, the official "true results" for the 25th
Knesset, from the government open-data portal (data.gov.il):

- results by locality (1,216 rows);
- results by ballot box, that is polling station (12,545 rows).

URLs, download date and SHA-256 hashes are in `analysis/elections/data/SOURCES.md`. Both files
are UTF-8 with a byte-order mark. The script also handles windows-1255.

One limit. The committee's own results site was down for maintenance on the day, so the national
totals we check against come from the Israel Democracy Institute's table, which reproduces the
committee's final result. The two committee files also agree with each other on every list.

The files give no locality type. There is no flag for Jewish or Arab places, development towns,
kibbutzim, moshavim or West Bank settlements, and no income ranking. So we skip official types.

## What we left out

"Double envelope" votes are cast by soldiers, diplomats, patients and others away from their
home station. They have no location. They are 458,714 valid votes, 9.6% of all 4,764,742. They
are left out of every measure below. That leaves 4,306,028 votes in 11,707 polling stations and
1,215 localities.

## The method, in plain words

Votes are grouped into six blocs: Likud, Opposition, Haredi, Arab, Religious Zionism, and Other
(the Jewish Home and the 20-odd lists that won no seats). The table is at the top of
`analysis/elections/elections.py`, with the official ballot letters.

- **Dissimilarity index.** Take two groups of voters. For each town (or station), find what
  share of group A lives there and what share of group B lives there. Add up the gaps and halve
  it. 0 means the two groups are spread the same way. 1 means no place holds both.
- **Chance floor.** Small stations never look perfectly even. We redraw every station's voters
  at random, at the national shares, to see what score pure chance gives. It is about 0.04 to
  0.07 for the large blocs.
- **Exposure.** For the average voter of a bloc, what share of the other voters at the same
  station voted for each bloc. The voter herself is not counted.
- **Exposure ratio.** Exposure divided by the bloc's national share. 1.00 means as if voters
  were mixed evenly. Above 1 means more neighbours of that bloc than chance.
- **Correlation.** Across stations with at least 50 valid votes, do stations with a high Likud
  share also have a high share for another bloc? +1 yes, 0 no link, -1 the reverse.

Shares of the 4.31 million located votes: Likud 23.4%, Opposition 37.9%, Haredi 14.5%, Arab
11.3%, Religious Zionism 10.3%, Other 2.6%.

## National check

Every one of 16 lists matches the published national total, in both files. Likud 1,115,336; Yesh
Atid 847,435; Religious Zionism 516,470; National Unity 432,482; Shas 392,964; United Torah
Judaism 280,194; Yisrael Beiteinu 213,687; Ra'am 194,047; Hadash-Ta'al 178,735; Labor 175,992;
Meretz 150,793; Balad 138,617; and four smaller lists. The script prints this check.

## The tables

### Dissimilarity: each bloc against all other voters

| Bloc              | Locality | Station | Chance floor (station) |
| ----------------- | -------- | ------- | ---------------------- |
| Likud             | 0.30     | 0.37    | 0.05                   |
| Opposition        | 0.43     | 0.50    | 0.04                   |
| Haredi            | 0.53     | 0.62    | 0.06                   |
| Arab              | 0.88     | 0.93    | 0.07                   |
| Religious Zionism | 0.31     | 0.37    | 0.07                   |

### Dissimilarity: Likud voters against each bloc's voters

| Against           | Locality | Station |
| ----------------- | -------- | ------- |
| Religious Zionism | 0.23     | 0.28    |
| Opposition        | 0.31     | 0.37    |
| Haredi            | 0.48     | 0.57    |
| Arab              | 0.88     | 0.94    |

### Exposure at station level

Row: the average voter of this bloc. Column: share of the other voters at the same station.

| Voter of          | Likud | Opposition | Haredi | Arab  | Rel. Zionism | Other |
| ----------------- | ----- | ---------- | ------ | ----- | ------------ | ----- |
| Likud             | 33.4% | 38.2%      | 11.3%  | 1.5%  | 12.8%        | 2.8%  |
| Opposition        | 23.6% | 57.4%      | 5.8%   | 2.3%  | 8.1%         | 2.8%  |
| Haredi            | 18.2% | 15.1%      | 53.6%  | 0.7%  | 10.8%        | 1.6%  |
| Arab              | 3.1%  | 7.8%       | 0.9%   | 86.5% | 0.8%         | 0.9%  |
| Religious Zionism | 29.0% | 29.5%      | 15.2%  | 0.8%  | 21.8%        | 3.7%  |

Divided by national share (1.00 = even mixing):

| Voter of          | Likud | Opposition | Haredi | Arab | Rel. Zionism |
| ----------------- | ----- | ---------- | ------ | ---- | ------------ |
| Likud             | 1.43  | 1.01       | 0.78   | 0.13 | 1.24         |
| Opposition        | 1.01  | 1.52       | 0.40   | 0.21 | 0.78         |
| Haredi            | 0.78  | 0.40       | 3.69   | 0.06 | 1.05         |
| Religious Zionism | 1.24  | 0.78       | 1.05   | 0.07 | 2.11         |

The same table at locality level is in `results.json`. It tells the same story, with the
own-bloc shares a little lower.

### Inside the ten largest cities (station level)

Row: the average Likud voter's station. Last column: Likud against Opposition dissimilarity.

| City          | Likud | Opposition | Haredi | Arab | Rel. Zionism | D (Likud, Opp.) |
| ------------- | ----- | ---------- | ------ | ---- | ------------ | --------------- |
| Jerusalem     | 29.4% | 26.6%      | 21.7%  | 1.1% | 17.6%        | 0.31            |
| Tel Aviv-Yafo | 23.6% | 56.2%      | 8.8%   | 2.6% | 6.6%         | 0.36            |
| Haifa         | 25.4% | 53.9%      | 5.6%   | 5.0% | 7.4%         | 0.25            |
| Rishon LeZion | 33.7% | 47.6%      | 6.1%   | 0.1% | 10.1%        | 0.17            |
| Petah Tikva   | 30.7% | 41.0%      | 11.4%  | 0.1% | 13.2%        | 0.20            |
| Ashdod        | 34.7% | 35.3%      | 17.6%  | 0.1% | 10.3%        | 0.19            |
| Netanya       | 37.0% | 34.4%      | 14.3%  | 0.1% | 11.5%        | 0.22            |
| Be'er Sheva   | 41.0% | 29.9%      | 10.3%  | 0.8% | 15.6%        | 0.15            |
| Bnei Brak     | 8.8%  | 5.2%       | 78.1%  | 0.0% | 7.0%         | 0.25            |
| Holon         | 35.3% | 40.4%      | 11.5%  | 0.1% | 10.3%        | 0.14            |

Jerusalem includes Arab neighbourhoods, which vote at their own stations. Bnei Brak is almost
entirely Haredi.

### Correlation of Likud's share with each bloc's share

| Bloc              | Stations | Stations, weighted | Localities, weighted |
| ----------------- | -------- | ------------------ | -------------------- |
| Opposition        | +0.02    | +0.01              | +0.09                |
| Haredi            | -0.14    | -0.21              | -0.12                |
| Arab              | -0.55    | -0.51              | -0.58                |
| Religious Zionism | +0.35    | +0.34              | +0.33                |

### Split by type of place

The files carry no official type. These classes are made from the votes and the size of the
place, so they are our labels, not the state's.

| Class                        | Places | Likud | Opposition | Haredi | Arab  |
| ---------------------------- | ------ | ----- | ---------- | ------ | ----- |
| Arab parties won over half   | 125    | 1.3%  | 4.4%       | 0.4%   | 93.1% |
| Haredi parties won over half | 20     | 5.7%  | 2.5%       | 82.6%  | 0.0%  |
| Other, 80,000+ valid votes   | 10     | 25.8% | 43.3%      | 16.2%  | 2.0%  |
| Other, 30,000 to 79,999      | 16     | 29.6% | 46.0%      | 9.2%   | 2.0%  |
| Other, 10,000 to 29,999      | 43     | 33.0% | 38.0%      | 12.4%  | 2.2%  |
| Other, under 10,000          | 1,001  | 21.2% | 51.1%      | 5.2%   | 1.6%  |

The average Likud voter's station is 34 to 41% opposition voters in each of the four classes of
"other" places (41% in the biggest, 34% in the 10,000 to 30,000 class).

## What the numbers show

1. **Likud voters are closer to the opposition than to the Haredi or Arab parties.** Station
   dissimilarity is 0.37 against the opposition, 0.57 against Haredi voters and 0.94 against
   Arab-party voters. The average Likud voter's station is 38% opposition, 11% Haredi and 1.5%
   Arab.
2. **But that is about what chance would give.** The exposure ratio of Likud voters to
   opposition voters is 1.01. They meet opposition voters as often as the opposition's national
   share predicts, not more. The Haredi ratio is 0.78 and the Arab ratio is 0.13, so they meet
   fewer of those.
3. **Religious Zionism is closer to Likud than the opposition is.** Dissimilarity is 0.28
   against 0.37. The ratio is 1.24 against 1.01. Across stations, Likud's share rises with
   Religious Zionism's (+0.35) and has no link to the opposition's (+0.02).
4. **Within the big cities the picture varies.** In Tel Aviv-Yafo and Haifa the Likud voter's
   station is more than half opposition. In Be'er Sheva and Netanya it is a third or less, and
   Likud and Religious Zionism together outweigh the opposition. In Jerusalem the Haredi share
   is 22%.
5. **Between towns versus within towns.** Index values are lower at locality level than at
   station level for every bloc (Likud 0.30 and 0.37). Part of the separation is between towns
   and part is within them.
6. **Centre and periphery, only partly tested.** Likud's share is 21% in places under 10,000
   valid votes, 33% in places of 10,000 to 30,000, 30% in places of 30,000 to 80,000 and 26% in
   the biggest cities. The opposition share runs the other way: 51%, 38%, 46%, 43%. So the
   mid-sized towns lean most to Likud and the smallest places least. We cannot say whether that
   is geography or income, because the files carry neither. We did not test a class split.

## What this does not show

- Polling stations are not neighbourhoods. A station serves a few hundred to a few thousand
  voters, assigned by address, but lines can cut across streets, and big stations may combine
  several blocks.
- Living near someone is not sharing a way of life. Neighbours may never meet.
- Many voters did not vote, and 9.6% of valid votes (double envelopes) have no place.
- This is one election. We did not test any other year.
- A station's results are not individual choices. We know where votes were cast, not who cast
  them.
- It says nothing about why people vote as they do.
- The blocs are our choice. Yisrael Beiteinu and National Unity sit in "Opposition" because the
  question grouped them there. Other groupings give other numbers. Ra'am, Hadash-Ta'al and
  Balad are in one Arab bloc, though they differ.
- The chance floor is one random draw (seed fixed), not an average of many.
- Centre, periphery and class were not tested with an official index.

## Verdict

Partly supported: Likud voters share stations with opposition voters far more than with Haredi
or Arab-party voters (dissimilarity 0.37 against 0.57 and 0.94), but no more than chance
(exposure ratio 1.01), and Religious Zionism is closer to Likud than the opposition is (0.28).

Run it again: `python3 analysis/elections/elections.py` and
`python3 analysis/elections/test_elections.py`.
