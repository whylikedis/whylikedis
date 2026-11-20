# Sources

All files are from the Central Elections Committee. Downloaded on 2026-11-20 with curl and a
browser-like User-Agent. `elections.py` reads them as they are; nothing was edited.

## 25th Knesset (1 November 2022)

| File here | URL | SHA-256 |
| --- | --- | --- |
| `knesset25_by_locality.csv` (1,216 rows) | https://media25.bechirot.gov.il/files/expc.csv | `412785ed46af1281af9f812402bb86c45822ebdccef9131750e922d2375f6103` |
| `knesset25_by_ballot_box.csv` (12,545 rows) | https://media25.bechirot.gov.il/files/expb.csv | `07c71db1bf844d40cbc4d96c606550f2ada3c9f258287d08679180d0b9a413bc` |
| `national_results_25.html` (national results page, saved) | https://votes25.bechirot.gov.il/nationalresults | `2306a810c945d2b51462043f650bb67eb66a4b1a4a62f6c3a89dc94d88044e05` |

The two CSV files were first downloaded from the government open-data portal (dataset
`votes-knesset`, `https://data.gov.il/dataset/26f9fa06-fcd7-4173-8df5-65797b63e857/resource/...`,
resources `b392b8ee-ba45-4ea0-bfed-f03a1a36e99c` and `cc223336-07bc-485d-b160-62df92967c0a`).
Later the same day they were downloaded again from the committee's own results host (the URLs in
the table). The SHA-256 hashes are identical, so the open-data copy is the committee's file.

## 26th Knesset (27 October 2026)

| File here | URL | SHA-256 |
| --- | --- | --- |
| `knesset26_by_locality.csv` (1,225 rows) | https://media26.bechirot.gov.il/files/expc.csv | `bf7db01f96e1afceb4f22039d16e5f616dc001e4901a9ef2194ba92645837e8a` |
| `knesset26_by_ballot_box.csv` (12,929 rows) | https://media26.bechirot.gov.il/files/expb.csv | `23d67534399e8edc10e9da0c97acf6e9802017f4f353c179fc978507892fa48e` |
| `national_results_26.html` (national results page, saved) | https://votes26.bechirot.gov.il/nationalresults?lang=he | `8d4dfadf3587e64102de5e6d840c8079caa0f3196e9fbfcdd13aace05703dfa8` |

The links come from the committee's own page `https://votes26.bechirot.gov.il/`: the two entries
"results by locality (file to download)" and "results by polling station (file to download)" open
`media26.bechirot.gov.il/files/expc.csv` and `expb.csv`. The page header reads "Official final
results". The same paths on the results host itself (`votes26.bechirot.gov.il/Media/SharedFiles/`)
did not work: `expc.csv` came back empty and `expb.csv` returned 404. The links on the page worked
at the first try.

Encoding: all four CSV files are UTF-8 with a byte-order mark. `elections.py` tries UTF-8 first
and windows-1255 second.

## Correction to an earlier note

An earlier version of this file said that no 26th Knesset results were published, because
`votes26.bechirot.gov.il` returned a gov.il "site not found" page and the open-data portal
(`package_show?id=votes-knesset`, last modified 2024-11-27) listed only the 16th to the 25th
Knesset. That was wrong about the committee's site: it loaded when read again on 2026-11-20 and
carries the final results. The open-data dataset still has no 26th Knesset files that day. The
earlier failure was a temporary error. The files used are the committee's own.

## National check

`elections.py` and `test_elections.py` check each election against the committee's saved
national results page: every list on the page must match the vote total in both CSV files, the
valid-vote total must match, the list votes must add up to the valid votes, and the seats must add
up to 120. The 2022 page lists 40 lists and the 2026 page lists 38.

## Things in the 2026 files that the files do not explain

- The 2026 ballot-box file has two columns that the 2022 file lacks, `חיצוניות` ("external") and
  `קלפי אחרת` ("other ballot box"). Together they hold 694,286 in the located stations, and for a
  few stations they exceed the station's valid votes. The files do not define them and they are
  not split by party. `elections.py` runs the 2026 measures a second time without the stations
  where they exceed 25% of valid votes, and reports the difference.
- Ballot letters changed meaning. `ב` was The Jewish Home in 2022 and is Otzma Yehudit in 2026.
  `ד` was Balad in 2022 and is "Partnership for All" in 2026. Each election has its own bloc table.
