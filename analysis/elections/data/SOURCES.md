# Sources

Both files are the Central Elections Committee's "true results" of the 25th Knesset election
(1 November 2022), published on the Israeli government open-data portal (data.gov.il), dataset
`votes-knesset`, organisation "Central Elections Committee". Downloaded on 2026-11-20 with curl.

| File here | URL | SHA-256 |
| --- | --- | --- |
| `knesset25_by_locality.csv` (1,216 rows) | https://data.gov.il/dataset/26f9fa06-fcd7-4173-8df5-65797b63e857/resource/b392b8ee-ba45-4ea0-bfed-f03a1a36e99c/download/-25-.csv | `412785ed46af1281af9f812402bb86c45822ebdccef9131750e922d2375f6103` |
| `knesset25_by_ballot_box.csv` (12,545 rows) | https://data.gov.il/dataset/26f9fa06-fcd7-4173-8df5-65797b63e857/resource/cc223336-07bc-485d-b160-62df92967c0a/download/-25-.csv | `07c71db1bf844d40cbc4d96c606550f2ada3c9f258287d08679180d0b9a413bc` |

Encoding: UTF-8 with a byte-order mark. `elections.py` tries UTF-8 first and windows-1255 second.

The resource list came from the portal's API:
`https://data.gov.il/api/3/action/package_show?id=votes-knesset`.

## What was tried

1. `votes25.bechirot.gov.il` redirected to a maintenance page that day. Not used.
2. The `e.data.gov.il/.../download/...` links listed by the API returned HTTP 403 (and, with a
   browser header, a Google sign-in page).
3. The same path on `data.gov.il` (no `e.`) with an ordinary browser User-Agent returned the CSV.

## National result used for the check

The committee's own results site was down, so the published national totals in `elections.py`
(`OFFICIAL_TOTALS`) are taken from the Israel Democracy Institute's 2022 results table,
https://en.idi.org.il/israeli-elections-and-parties/elections/2022/ (fetched 2026-11-20), which
reproduces the committee's final result. That is a second source, not the committee itself.
The check also confirms the two committee files agree with each other on every list.
Replace the table with the committee's own page when it is back up.
