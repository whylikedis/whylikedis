#!/usr/bin/env python3
"""Who lives among whom? Official results of the 25th Knesset election (1 November 2022).

Reads the two Central Elections Committee files in data/ (by locality, by ballot box), prints
and writes results.json. Python 3 standard library only. Run:  python3 analysis/elections/elections.py

Sources, download dates and SHA-256 hashes: data/SOURCES.md
"""
import csv
import io
import json
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
LOCALITY_FILE = os.path.join(HERE, "data", "knesset25_by_locality.csv")
BOX_FILE = os.path.join(HERE, "data", "knesset25_by_ballot_box.csv")
OUT_FILE = os.path.join(HERE, "results.json")

# ---------------------------------------------------------------------------
# The one table that defines the blocs. Letters are the official ballot letters.
# Any letter not listed here (Jewish Home, Economic Freedom, and about 25 small lists that
# won no seats) goes to "Other".
# ---------------------------------------------------------------------------
BLOCS = {
    "Likud": ["מחל"],
    "Opposition": ["פה", "כן", "אמת", "מרצ", "ל"],  # Yesh Atid, National Unity, Labor, Meretz, Yisrael Beiteinu
    "Haredi": ["שס", "ג"],  # Shas, United Torah Judaism
    "Arab": ["עם", "ום", "ד"],  # Ra'am, Hadash-Ta'al, Balad
    "Religious Zionism": ["ט"],
}
OTHER = "Other"
BLOC_ORDER = list(BLOCS) + [OTHER]

PARTY_NAMES = {
    "מחל": "Likud", "פה": "Yesh Atid", "ט": "Religious Zionism", "כן": "National Unity",
    "שס": "Shas", "ג": "United Torah Judaism", "ל": "Yisrael Beiteinu", "עם": "Ra'am",
    "ום": "Hadash-Ta'al", "אמת": "Labor", "מרצ": "Meretz", "ד": "Balad",
    "ב": "The Jewish Home", "אצ": "Economic Freedom", "קץ": "Brave for You",
    "יז": "New Economy",
}

# National result as published by the Israel Democracy Institute (en.idi.org.il/israeli-elections-
# and-parties/elections/2022/, "Votes Count" column), which reproduces the Central Elections
# Committee's final result. Fetched 2026-11-20. The committee's own results site was down for
# maintenance that day; see data/SOURCES.md.
OFFICIAL_TOTALS = {
    "מחל": 1115336, "פה": 847435, "ט": 516470, "כן": 432482, "שס": 392964, "ג": 280194,
    "ל": 213687, "עם": 194047, "ום": 178735, "אמת": 175992, "מרצ": 150793, "ד": 138617,
    "ב": 56775, "אצ": 15801, "קץ": 14694, "יז": 13920,
}

DOUBLE_ENVELOPE_SYMBOL = "9999"  # "מעטפות חיצוניות": soldiers, diplomats, hospitals, prisons...

# The ten largest cities named in the brief, by official locality symbol.
CITIES = {
    "Jerusalem": "3000", "Tel Aviv-Yafo": "5000", "Haifa": "4000", "Rishon LeZion": "8300",
    "Petah Tikva": "7900", "Ashdod": "70", "Netanya": "7400", "Be'er Sheva": "9000",
    "Bnei Brak": "6100", "Holon": "6600",
}

META = {"סמל ועדה", "ברזל", "שם ישוב", "סמל ישוב", "קלפי", "ריכוז", "שופט", "בזב", "מצביעים",
        "פסולים", "כשרים"}
MIN_STATION_VOTES = 50  # stations smaller than this are left out of the correlations only


# ------------------------------- reading -------------------------------------------------
def read_csv(path):
    """Read a committee CSV. Detects the encoding: UTF-8 (with or without BOM), else windows-1255."""
    raw = open(path, "rb").read()
    for enc in ("utf-8-sig", "windows-1255"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise ValueError("cannot decode " + path)
    if "<HTML" in text[:400].upper():
        raise ValueError(path + " is an error page, not a CSV")
    rows = list(csv.DictReader(io.StringIO(text)))
    return rows, enc


def letters_of(rows):
    return [c for c in rows[0] if c not in META]


def to_bloc_vector(row, letters):
    """Votes per bloc, in BLOC_ORDER."""
    by_letter = {l: int(row[l] or 0) for l in letters}
    vec = []
    for b in BLOC_ORDER:
        if b == OTHER:
            used = {l for ls in BLOCS.values() for l in ls}
            vec.append(sum(v for l, v in by_letter.items() if l not in used))
        else:
            vec.append(sum(by_letter[l] for l in BLOCS[b] if l in by_letter))
    return vec


def national_totals(rows, letters):
    return {l: sum(int(r[l] or 0) for r in rows) for l in letters}


# ------------------------------- measures ------------------------------------------------
def dissimilarity(a, b):
    """Index of dissimilarity between two lists of counts over the same units.
    0.5 * sum |a_i/A - b_i/B|.  0 = spread alike, 1 = no unit holds both groups."""
    A, B = sum(a), sum(b)
    if A == 0 or B == 0:
        return float("nan")
    return 0.5 * sum(abs(x / A - y / B) for x, y in zip(a, b))


def bloc_vs_rest(units, k):
    a = [u[k] for u in units]
    b = [sum(u) - u[k] for u in units]
    return dissimilarity(a, b)


def bloc_vs_bloc(units, k, j):
    return dissimilarity([u[k] for u in units], [u[j] for u in units])


def exposure(units):
    """E[x][y]: for the average voter of bloc x, the share of the OTHER voters in the same unit
    who voted for bloc y. The voter herself is left out, so a row sums to 1."""
    n = len(BLOC_ORDER)
    num = [[0.0] * n for _ in range(n)]
    tot = [0] * n
    for u in units:
        t = sum(u)
        if t < 2:
            continue
        for x in range(n):
            if u[x] == 0:
                continue
            tot[x] += u[x]
            for y in range(n):
                others = (u[x] - 1) if x == y else u[y]
                num[x][y] += u[x] * others / (t - 1)
    return [[(num[x][y] / tot[x]) if tot[x] else float("nan") for y in range(n)] for x in range(n)]


def pearson(xs, ys, ws=None):
    ws = ws or [1.0] * len(xs)
    W = sum(ws)
    mx = sum(w * x for w, x in zip(ws, xs)) / W
    my = sum(w * y for w, y in zip(ws, ys)) / W
    cov = sum(w * (x - mx) * (y - my) for w, x, y in zip(ws, xs, ys))
    vx = sum(w * (x - mx) ** 2 for w, x in zip(ws, xs))
    vy = sum(w * (y - my) ** 2 for w, y in zip(ws, ys))
    return cov / math.sqrt(vx * vy) if vx > 0 and vy > 0 else float("nan")


def correlations(units, weighted):
    use = [u for u in units if sum(u) >= MIN_STATION_VOTES]
    share = lambda u, k: u[k] / sum(u)
    ws = [float(sum(u)) for u in use] if weighted else None
    lk = [share(u, 0) for u in use]
    return {BLOC_ORDER[k]: pearson(lk, [share(u, k) for u in use], ws) for k in range(1, len(BLOC_ORDER))}


def random_allocation_floor(units, seed=25):
    """Dissimilarity each bloc would show against the rest if every station's voters were drawn at
    random with the national bloc shares. This is the small-numbers floor: a station of 300 voters
    never looks perfectly even, so even a perfectly mixed country scores above 0."""
    rng = random.Random(seed)
    total = [sum(u[k] for u in units) for k in range(len(BLOC_ORDER))]
    grand = sum(total)
    p = [t / grand for t in total]
    sim = []
    for u in units:
        n, left_p, row = sum(u), 1.0, []
        for k in range(len(p) - 1):
            q = min(1.0, p[k] / left_p) if left_p > 0 else 0.0
            d = rng.binomialvariate(n, q)
            row.append(d)
            n -= d
            left_p -= p[k]
        row.append(n)
        sim.append(row)
    return {BLOC_ORDER[k]: bloc_vs_rest(sim, k) for k in range(len(BLOC_ORDER))}


# ------------------------------- grouping ------------------------------------------------
def locality_group(vec, name_votes):
    """Vote-derived locality classes. The committee files carry no locality type, so these are
    NOT official types: they are labels made from the votes and the size of the place."""
    t = sum(vec)
    if vec[BLOC_ORDER.index("Arab")] / t > 0.5:
        return "Arab parties won over half the votes"
    if vec[BLOC_ORDER.index("Haredi")] / t > 0.5:
        return "Haredi parties won over half the votes"
    if t >= 80000:
        return "Other places, 80,000+ valid votes"
    if t >= 30000:
        return "Other places, 30,000-79,999 valid votes"
    if t >= 10000:
        return "Other places, 10,000-29,999 valid votes"
    return "Other places, under 10,000 valid votes"


# ------------------------------- main ----------------------------------------------------
def load():
    loc_rows, loc_enc = read_csv(LOCALITY_FILE)
    box_rows, box_enc = read_csv(BOX_FILE)
    return loc_rows, box_rows, loc_enc, box_enc


def r3(x):
    return None if (isinstance(x, float) and math.isnan(x)) else round(x, 4)


def table(title, header, rows, fmt="{:>9}"):
    print("\n" + title)
    print("  " + "".join(fmt.format(h[:9]) for h in header))
    for name, vals in rows:
        print("  {:<19}".format(name) + "".join(fmt.format(v) for v in vals))


def main():
    loc_rows, box_rows, loc_enc, box_enc = load()
    letters = letters_of(box_rows)
    res = {"files": {"locality": {"rows": len(loc_rows), "encoding": loc_enc},
                     "ballot_box": {"rows": len(box_rows), "encoding": box_enc}}}
    print("Files: locality %d rows (%s), ballot box %d rows (%s)" %
          (len(loc_rows), loc_enc, len(box_rows), box_enc))

    # 1. national totals vs official
    tot_loc, tot_box = national_totals(loc_rows, letters), national_totals(box_rows, letters)
    print("\n1. National totals against the published result")
    print("   %-22s %10s %10s %10s  %s" % ("party", "locality", "ballotbox", "official", "ok"))
    ok_all = True
    check = {}
    for l, off in OFFICIAL_TOTALS.items():
        ok = tot_loc[l] == tot_box[l] == off
        ok_all &= ok
        check[PARTY_NAMES[l]] = {"locality_file": tot_loc[l], "ballot_box_file": tot_box[l],
                                 "official": off, "match": ok}
        print("   %-22s %10d %10d %10d  %s" % (PARTY_NAMES[l], tot_loc[l], tot_box[l], off, "OK" if ok else "MISMATCH"))
    same_files = tot_loc == tot_box
    print("   Locality file and ballot-box file agree on every list: %s" % same_files)
    print("   ALL MATCH: %s" % (ok_all and same_files))
    res["national_check"] = {"parties": check, "all_match": ok_all and same_files}

    # 2. double envelopes and the spatial units
    de_rows = [r for r in box_rows if r["סמל ישוב"] == DOUBLE_ENVELOPE_SYMBOL]
    valid_all = sum(int(r["כשרים"]) for r in box_rows)
    valid_de = sum(int(r["כשרים"]) for r in de_rows)
    print("\n2. Double envelopes (no location): %d ballot-box rows, %d valid votes = %.1f%% of %d."
          % (len(de_rows), valid_de, 100 * valid_de / valid_all, valid_all))
    print("   They are left out of every spatial measure below.")
    res["double_envelopes"] = {"rows": len(de_rows), "valid_votes": valid_de, "total_valid_votes": valid_all,
                               "share": r3(valid_de / valid_all)}
    stations, station_city, station_loc = [], [], []
    for r in box_rows:
        if r["סמל ישוב"] == DOUBLE_ENVELOPE_SYMBOL:
            continue
        v = to_bloc_vector(r, letters)
        if sum(v) == 0:
            continue
        stations.append(v)
        station_loc.append(r["סמל ישוב"])
    locs, loc_names, loc_syms = [], [], []
    for r in loc_rows:
        if r["סמל ישוב"] == DOUBLE_ENVELOPE_SYMBOL:
            continue
        v = to_bloc_vector(r, letters)
        if sum(v) == 0:
            continue
        locs.append(v)
        loc_names.append(r["שם ישוב"])
        loc_syms.append(r["סמל ישוב"])
    print("   Spatial units: %d localities, %d ballot boxes with votes; %d valid votes."
          % (len(locs), len(stations), sum(map(sum, stations))))
    res["units"] = {"localities": len(locs), "stations": len(stations), "valid_votes": sum(map(sum, stations))}

    totals = [sum(u[k] for u in stations) for k in range(len(BLOC_ORDER))]
    grand = sum(totals)
    res["bloc_vote_shares"] = {BLOC_ORDER[k]: r3(totals[k] / grand) for k in range(len(BLOC_ORDER))}
    print("\n   Bloc shares of located valid votes: " +
          ", ".join("%s %.1f%%" % (BLOC_ORDER[k], 100 * totals[k] / grand) for k in range(len(BLOC_ORDER))))

    # 3. dissimilarity
    floor = random_allocation_floor(stations)
    print("\n3. Dissimilarity index (0 = spread evenly, 1 = fully separate)")
    print("   %-19s %10s %10s %12s" % ("bloc vs all others", "locality", "station", "chance floor"))
    d = {}
    for k, b in enumerate(BLOC_ORDER):
        d[b] = {"locality": r3(bloc_vs_rest(locs, k)), "station": r3(bloc_vs_rest(stations, k)),
                "station_random_floor": r3(floor[b])}
        print("   %-19s %10.3f %10.3f %12.3f" % (b, d[b]["locality"], d[b]["station"], floor[b]))
    res["dissimilarity_vs_all_others"] = d
    print("\n   Likud voters against each other bloc's voters")
    print("   %-19s %10s %10s" % ("bloc", "locality", "station"))
    dp = {}
    for j in range(1, len(BLOC_ORDER)):
        dp[BLOC_ORDER[j]] = {"locality": r3(bloc_vs_bloc(locs, 0, j)), "station": r3(bloc_vs_bloc(stations, 0, j))}
        print("   %-19s %10.3f %10.3f" % (BLOC_ORDER[j], dp[BLOC_ORDER[j]]["locality"], dp[BLOC_ORDER[j]]["station"]))
    res["dissimilarity_likud_vs_bloc"] = dp

    # 4. exposure
    def show_exposure(title, E):
        table(title, ["-> " + b for b in BLOC_ORDER],
              [(BLOC_ORDER[x], ["%.1f%%" % (100 * E[x][y]) for y in range(len(BLOC_ORDER))]) for x in range(len(BLOC_ORDER))])

    Es = exposure(stations)
    El = exposure(locs)
    show_exposure("4a. Exposure at polling-station level: row = average voter of that bloc; column = share of the other "
                  "voters at the same station", Es)
    show_exposure("4b. Same, at locality level", El)
    res["exposure_station"] = {BLOC_ORDER[x]: {BLOC_ORDER[y]: r3(Es[x][y]) for y in range(len(BLOC_ORDER))} for x in range(len(BLOC_ORDER))}
    res["exposure_locality"] = {BLOC_ORDER[x]: {BLOC_ORDER[y]: r3(El[x][y]) for y in range(len(BLOC_ORDER))} for x in range(len(BLOC_ORDER))}

    # 4c. exposure against the even-mixing benchmark: exposure / the bloc's national share
    shares = [totals[k] / grand for k in range(len(BLOC_ORDER))]
    ratio = [[Es[x][y] / shares[y] for y in range(len(BLOC_ORDER))] for x in range(len(BLOC_ORDER))]
    table("4c. Station exposure divided by the bloc's national share (1.00 = as if voters were mixed "
          "evenly; above 1 = more neighbours of that bloc than chance)", ["-> " + b for b in BLOC_ORDER],
          [(BLOC_ORDER[x], ["%.2f" % ratio[x][y] for y in range(len(BLOC_ORDER))]) for x in range(len(BLOC_ORDER))])
    res["exposure_ratio_station"] = {BLOC_ORDER[x]: {BLOC_ORDER[y]: r3(ratio[x][y]) for y in range(len(BLOC_ORDER))}
                                     for x in range(len(BLOC_ORDER))}

    # 5. inside the ten largest cities
    print("\n5. Inside the ten largest cities, polling-station level")
    res["cities"] = {}
    print("   %-15s %7s | Likud voter's station: %s | D(Likud vs Opposition)" %
          ("city", "stations", " ".join("%s" % b[:6] for b in BLOC_ORDER)))
    for city, sym in CITIES.items():
        us = [u for u, s in zip(stations, station_loc) if s == sym]
        if not us:
            print("   %s: not found" % city)
            continue
        E = exposure(us)
        dl = {b: r3(bloc_vs_bloc(us, 0, j)) for j, b in enumerate(BLOC_ORDER) if j > 0}
        ct = [sum(u[k] for u in us) for k in range(len(BLOC_ORDER))]
        res["cities"][city] = {
            "stations": len(us), "valid_votes": sum(ct),
            "vote_shares": {BLOC_ORDER[k]: r3(ct[k] / sum(ct)) for k in range(len(BLOC_ORDER))},
            "likud_voter_exposure": {BLOC_ORDER[y]: r3(E[0][y]) for y in range(len(BLOC_ORDER))},
            "opposition_voter_exposure": {BLOC_ORDER[y]: r3(E[1][y]) for y in range(len(BLOC_ORDER))},
            "dissimilarity_likud_vs": dl,
            "dissimilarity_vs_all_others": {BLOC_ORDER[k]: r3(bloc_vs_rest(us, k)) for k in range(len(BLOC_ORDER))},
        }
        print("   %-15s %7d | %s | %.3f" % (city, len(us), " ".join("%5.1f%%" % (100 * E[0][y]) for y in range(len(BLOC_ORDER))), dl["Opposition"]))

    # 6. correlations
    cu = correlations(stations, False)
    cw = correlations(stations, True)
    cl = correlations(locs, True)
    print("\n6. Correlation of Likud's share with each bloc's share (stations with %d+ valid votes)" % MIN_STATION_VOTES)
    print("   %-19s %10s %10s %14s" % ("bloc", "stations", "stations,", "localities,"))
    print("   %-19s %10s %10s %14s" % ("", "", "weighted", "weighted"))
    for b in BLOC_ORDER[1:]:
        print("   %-19s %10.3f %10.3f %14.3f" % (b, cu[b], cw[b], cl[b]))
    res["correlation_with_likud_share"] = {"stations_unweighted": {b: r3(v) for b, v in cu.items()},
                                           "stations_weighted": {b: r3(v) for b, v in cw.items()},
                                           "localities_weighted": {b: r3(v) for b, v in cl.items()},
                                           "min_station_valid_votes": MIN_STATION_VOTES}

    # 7. split by locality type
    print("\n7. Split by locality type")
    print("   The committee files carry no locality type (no Jewish/Arab flag, no development-town, "
          "kibbutz or settlement flag).")
    print("   Official types are therefore skipped. Instead, classes made from the votes and the size of the place:")
    res["locality_type"] = {"official_type_in_files": False,
                            "note": "Classes below are derived from votes and size, not official types."}
    group_of = {sym: locality_group(v, n) for v, n, sym in zip(locs, loc_names, loc_syms)}
    groups = {}
    for u, s in zip(stations, station_loc):
        groups.setdefault(group_of[s], []).append(u)
    lg = {}
    for v, s in zip(locs, loc_syms):
        lg.setdefault(group_of[s], []).append(v)
    order = ["Arab parties won over half the votes", "Haredi parties won over half the votes",
             "Other places, 80,000+ valid votes", "Other places, 30,000-79,999 valid votes",
             "Other places, 10,000-29,999 valid votes", "Other places, under 10,000 valid votes"]
    print("   %-42s %5s %8s %6s %6s %6s %6s %6s | Likud voter's station: %s" %
          ("class", "n loc", "votes", "Lik%", "Opp%", "Har%", "Arab%", "RZ%", " ".join(b[:6] for b in BLOC_ORDER)))
    res["locality_type"]["classes"] = {}
    for g in order:
        us = groups.get(g)
        if not us:
            continue
        ct = [sum(u[k] for u in us) for k in range(len(BLOC_ORDER))]
        t = sum(ct)
        E = exposure(us)
        res["locality_type"]["classes"][g] = {
            "localities": len(lg[g]), "stations": len(us), "valid_votes": t,
            "vote_shares": {BLOC_ORDER[k]: r3(ct[k] / t) for k in range(len(BLOC_ORDER))},
            "likud_voter_exposure_station": {BLOC_ORDER[y]: r3(E[0][y]) for y in range(len(BLOC_ORDER))},
            "dissimilarity_likud_vs_opposition_station": r3(bloc_vs_bloc(us, 0, 1)),
            "dissimilarity_likud_vs_opposition_locality": r3(bloc_vs_bloc(lg[g], 0, 1)),
            "correlation_likud_vs_opposition_station": r3(pearson([u[0] / sum(u) for u in us if sum(u) >= MIN_STATION_VOTES],
                                                               [u[1] / sum(u) for u in us if sum(u) >= MIN_STATION_VOTES])),
        }
        print("   %-42s %5d %8d %5.1f%% %5.1f%% %5.1f%% %5.1f%% %5.1f%% | %s" %
              (g, len(lg[g]), t, 100 * ct[0] / t, 100 * ct[1] / t, 100 * ct[2] / t, 100 * ct[3] / t, 100 * ct[4] / t,
               " ".join("%5.1f%%" % (100 * E[0][y]) for y in range(len(BLOC_ORDER)))))
    print("   Centre/periphery and class need a locality ranking (for example the Central Bureau of Statistics")
    print("   socio-economic index) that these files do not carry. Not used here.")

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(res, f, ensure_ascii=False, indent=2)
    print("\nWrote %s" % OUT_FILE)
    return 0 if res["national_check"]["all_match"] else 1


if __name__ == "__main__":
    sys.exit(main())
