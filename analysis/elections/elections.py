#!/usr/bin/env python3
"""Who lives among whom? Official results of two Israeli elections, measured the same way:
the 25th Knesset (1 November 2022) and the 26th Knesset (27 October 2026).

Reads the Central Elections Committee files in data/ (results by locality and by ballot box,
plus the committee's national results page), prints, and writes results.json.
Python 3 standard library only. Run:  python3 analysis/elections/elections.py

Sources, download dates and SHA-256 hashes: data/SOURCES.md
"""
import csv
import html
import io
import json
import math
import os
import random
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
OUT_FILE = os.path.join(HERE, "results.json")

OTHER = "Other"
DOUBLE_ENVELOPE_SYMBOL = "9999"  # "מעטפות חיצוניות": soldiers, diplomats, hospitals... no location

# The ten largest cities of the brief, by official locality symbol (same symbols in both years).
CITIES = {
    "Jerusalem": "3000", "Tel Aviv-Yafo": "5000", "Haifa": "4000", "Rishon LeZion": "8300",
    "Petah Tikva": "7900", "Ashdod": "70", "Netanya": "7400", "Be'er Sheva": "9000",
    "Bnei Brak": "6100", "Holon": "6600",
}

META = {"סמל ועדה", "ברזל", "שם ישוב", "סמל ישוב", "קלפי", "ריכוז", "שופט", "בזב", "מצביעים",
        "פסולים", "כשרים", "חיצוניות", "קלפי אחרת", ""}
MIN_STATION_VOTES = 50  # stations smaller than this are left out of the correlations only

# ---------------------------------------------------------------------------------------------
# The bloc tables, one per election. Keys are bloc names; values are the official ballot letters.
# Likud must come first. Any letter not listed goes to "Other" (small lists that won no seats,
# and lists we could not place; see docs/election-map.md for how each was assigned).
# Ballot letters are NOT stable between elections: "ב" was The Jewish Home in 2022 and Otzma
# Yehudit in 2026; "ד" was Balad in 2022 and "Partnership for All" in 2026; "ל" is Yisrael
# Beiteinu in both. Each table below is for its own election only.
# ---------------------------------------------------------------------------------------------
ELECTIONS = {
    "2022": {
        "title": "25th Knesset, 1 November 2022",
        "locality_file": "knesset25_by_locality.csv",
        "box_file": "knesset25_by_ballot_box.csv",
        "national_page": "national_results_25.html",
        "variants": {
            "main": {
                "Likud": ["מחל"],  # Likud
                # Yesh Atid, National Unity, Labor, Meretz, Yisrael Beiteinu
                "Opposition": ["פה", "כן", "אמת", "מרצ", "ל"],
                "Haredi": ["שס", "ג"],  # Shas, United Torah Judaism
                "Arab": ["עם", "ום", "ד"],  # Ra'am, Hadash-Ta'al, Balad
                # Religious Zionism, which ran jointly with Otzma Yehudit in 2022
                "Religious Zionism": ["ט"],
            },
        },
        "list_names": {
            "מחל": "Likud", "פה": "Yesh Atid", "ט": "Religious Zionism + Otzma Yehudit",
            "כן": "National Unity", "שס": "Shas", "ג": "United Torah Judaism",
            "ל": "Yisrael Beiteinu", "עם": "Ra'am", "ום": "Hadash-Ta'al", "אמת": "Labor",
            "מרצ": "Meretz", "ד": "Balad", "ב": "The Jewish Home",
        },
    },
    "2026": {
        "title": "26th Knesset, 27 October 2026",
        "locality_file": "knesset26_by_locality.csv",
        "box_file": "knesset26_by_ballot_box.csv",
        "national_page": "national_results_26.html",
        "variants": {
            # Strict: only lists that carry on a 2022 opposition list directly get "Opposition".
            "main": {
                "Likud": ["מחל"],  # Likud
                # The Democrats (Labor + Meretz merged), Yisrael Beiteinu
                "Opposition": ["אמת", "ל"],
                "Yashar": ["דרך"],  # Yashar! (Eisenkot). Not a 2022 list, so its own row.
                "Together": ["רק"],  # Together (Bennett). New, own row.
                "Reservists": ["די"],  # The Reservists and the Economic (Hendel, Zelicha). New, own row.
                "Haredi": ["שס", "ג"],  # Shas, United Torah Judaism
                "Arab": ["ודם", "עם"],  # The Joint List, Ra'am
                # Religious Zionism (with Zehut) and Otzma Yehudit, which ran as one list in 2022
                "Religious Zionism + Otzma": ["ט", "ב"],
            },
            # Broad: the three new lists are added to Opposition. Our choice, not the committee's.
            "broad_opposition": {
                "Likud": ["מחל"],
                "Opposition": ["אמת", "ל", "דרך", "רק", "די"],
                "Haredi": ["שס", "ג"],
                "Arab": ["ודם", "עם"],
                "Religious Zionism + Otzma": ["ט", "ב"],
            },
        },
        "list_names": {
            "מחל": "Likud", "דרך": "Yashar", "רק": "Together", "ודם": "Joint List",
            "אמת": "The Democrats", "עם": "Ra'am", "ל": "Yisrael Beiteinu", "ב": "Otzma Yehudit",
            "ג": "United Torah Judaism", "שס": "Shas", "ט": "Religious Zionism", "די": "Reservists",
            "ך": "Am Yisrael",
        },
        # The 2026 ballot-box file has two new columns, "חיצוניות" and "קלפי אחרת" ("external" and
        # "other ballot box"). The file does not define them and they are not split by party.
        # Sensitivity run: drop stations where they exceed this share of the station's valid votes.
        "extra_cols": ["חיצוניות", "קלפי אחרת"],
        "extra_share_cutoff": 0.25,
    },
}


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
    return list(csv.DictReader(io.StringIO(text))), enc


def letters_of(rows):
    return [c for c in rows[0] if c not in META and c.strip()]


def order_of(blocs):
    return list(blocs) + [OTHER]


def to_bloc_vector(row, letters, blocs):
    by_letter = {l: int(row[l] or 0) for l in letters}
    used = {l for ls in blocs.values() for l in ls}
    vec = [sum(by_letter.get(l, 0) for l in ls) for ls in blocs.values()]
    vec.append(sum(v for l, v in by_letter.items() if l not in used))
    return vec


def national_totals(rows, letters):
    return {l: sum(int(r[l] or 0) for r in rows) for l in letters}


def parse_national_page(path):
    """Read the committee's national results page (saved HTML). Returns
    ({letters: (name, seats, votes)}, set of all numbers on the page)."""
    t = open(path, encoding="utf-8").read()
    t = re.sub(r"<(script|style).*?</\1>", "", t, flags=re.S)
    t = html.unescape(re.sub(r"<[^>]+>", "\n", t))
    lines = [x.strip() for x in t.splitlines() if x.strip()]
    lists = {}
    for i in range(3, len(lines) - 1):
        if re.fullmatch(r"\d+\.\d+%", lines[i]) and lines[i - 1].isdigit() and re.fullmatch(r"[\d,]+", lines[i + 1]):
            lists[lines[i - 2]] = (lines[i - 3], int(lines[i - 1]), int(lines[i + 1].replace(",", "")))
    numbers = {int(x.replace(",", "")) for x in lines if re.fullmatch(r"\d{1,3}(,\d{3})+", x)}
    return lists, numbers


def national_check(key):
    """Check one election's two CSV files against the committee's national results page.
    Returns (rows, all_match, info). Every list on the page must match, in both files."""
    cfg = ELECTIONS[key]
    loc_rows, _ = read_csv(os.path.join(DATA, cfg["locality_file"]))
    box_rows, _ = read_csv(os.path.join(DATA, cfg["box_file"]))
    letters = letters_of(box_rows)
    tl, tb = national_totals(loc_rows, letters), national_totals(box_rows, letters)
    page, numbers = parse_national_page(os.path.join(DATA, cfg["national_page"]))
    rows, ok_all = [], True
    for l, (name, seats, official) in page.items():
        ok = l in tl and tl[l] == tb[l] == official
        ok_all &= ok
        rows.append({"letters": l, "name": cfg["list_names"].get(l, name), "seats": seats,
                     "locality_file": tl.get(l), "ballot_box_file": tb.get(l), "official": official, "match": ok})
    valid_loc = sum(int(r["כשרים"]) for r in loc_rows)
    valid_box = sum(int(r["כשרים"]) for r in box_rows)
    # a list with votes in the files but missing from the page would also be a mismatch
    missing = [l for l in letters if (tl[l] or tb[l]) and l not in page]
    info = {"valid_votes_locality_file": valid_loc, "valid_votes_ballot_box_file": valid_box,
            "valid_votes_on_page": valid_loc in numbers and valid_box == valid_loc,
            "page_lists": len(page), "page_vote_sum": sum(v[2] for v in page.values()),
            "letters_with_votes_not_on_page": missing, "seats_on_page": sum(v[1] for v in page.values())}
    ok_all = ok_all and info["valid_votes_on_page"] and not missing and info["page_vote_sum"] == valid_box \
        and info["seats_on_page"] == 120
    return rows, ok_all, info


# ------------------------------- measures ------------------------------------------------
def dissimilarity(a, b):
    """0.5 * sum |a_i/A - b_i/B|: 0 = spread alike, 1 = no unit holds both groups."""
    A, B = sum(a), sum(b)
    if A == 0 or B == 0:
        return float("nan")
    return 0.5 * sum(abs(x / A - y / B) for x, y in zip(a, b))


def bloc_vs_rest(units, k):
    return dissimilarity([u[k] for u in units], [sum(u) - u[k] for u in units])


def bloc_vs_bloc(units, k, j):
    return dissimilarity([u[k] for u in units], [u[j] for u in units])


def exposure(units):
    """E[x][y]: for the average voter of bloc x, the share of the OTHER voters in the same unit
    who voted for bloc y (the voter herself is left out, so a row sums to 1)."""
    n = len(units[0])
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
                num[x][y] += u[x] * ((u[x] - 1) if x == y else u[y]) / (t - 1)
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
    ws = [float(sum(u)) for u in use] if weighted else None
    lk = [u[0] / sum(u) for u in use]
    return [pearson(lk, [u[k] / sum(u) for u in use], ws) for k in range(1, len(units[0]))]


def random_allocation_floor(units, seed=25):
    """Dissimilarity each bloc would show against the rest if every station's voters were drawn
    at random with the national bloc shares: the small-numbers floor."""
    rng = random.Random(seed)
    nb = len(units[0])
    total = [sum(u[k] for u in units) for k in range(nb)]
    p = [t / sum(total) for t in total]
    sim = []
    for u in units:
        n, left_p, row = sum(u), 1.0, []
        for k in range(nb - 1):
            q = min(1.0, p[k] / left_p) if left_p > 0 else 0.0
            d = rng.binomialvariate(n, q)
            row.append(d)
            n -= d
            left_p -= p[k]
        row.append(n)
        sim.append(row)
    return [bloc_vs_rest(sim, k) for k in range(nb)]


def locality_group(vec, order):
    """Vote-derived locality classes. The files carry no locality type: these are our labels."""
    t = sum(vec)
    if vec[order.index("Arab")] / t > 0.5:
        return "Arab parties won over half the votes"
    if vec[order.index("Haredi")] / t > 0.5:
        return "Haredi parties won over half the votes"
    if t >= 80000:
        return "Other places, 80,000+ valid votes"
    if t >= 30000:
        return "Other places, 30,000-79,999 valid votes"
    if t >= 10000:
        return "Other places, 10,000-29,999 valid votes"
    return "Other places, under 10,000 valid votes"


GROUP_ORDER = ["Arab parties won over half the votes", "Haredi parties won over half the votes",
               "Other places, 80,000+ valid votes", "Other places, 30,000-79,999 valid votes",
               "Other places, 10,000-29,999 valid votes", "Other places, under 10,000 valid votes"]


# ------------------------------- output helpers ------------------------------------------
def r3(x):
    return None if (isinstance(x, float) and math.isnan(x)) else round(x, 4)


def short(b):
    return b[:9]


def table(title, header, rows):
    print("\n" + title)
    print("  %-26s" % "" + "".join("%10s" % short(h) for h in header))
    for name, vals in rows:
        print("  %-26s" % name + "".join("%10s" % v for v in vals))


# ------------------------------- analysis of one election / variant ----------------------
def analyse(key, variant, station_filter=None, label=""):
    cfg = ELECTIONS[key]
    blocs = cfg["variants"][variant]
    order = order_of(blocs)
    nb = len(order)
    loc_rows, loc_enc = read_csv(os.path.join(DATA, cfg["locality_file"]))
    box_rows, box_enc = read_csv(os.path.join(DATA, cfg["box_file"]))
    letters = letters_of(box_rows)
    res = {"election": cfg["title"], "variant": variant, "blocs": {b: ls for b, ls in blocs.items()},
           "files": {"locality": {"rows": len(loc_rows), "encoding": loc_enc},
                     "ballot_box": {"rows": len(box_rows), "encoding": box_enc}}}
    head = "%s  [%s]%s" % (cfg["title"], variant, ("  " + label) if label else "")
    print("\n" + "=" * 100 + "\n" + head + "\n" + "=" * 100)
    print("Blocs: " + "; ".join("%s = %s" % (b, "+".join(cfg["list_names"].get(l, l) for l in ls))
                                for b, ls in blocs.items()) + "; Other = all remaining lists")

    de_rows = [r for r in box_rows if r["סמל ישוב"] == DOUBLE_ENVELOPE_SYMBOL]
    valid_all = sum(int(r["כשרים"]) for r in box_rows)
    valid_de = sum(int(r["כשרים"]) for r in de_rows)
    print("Double envelopes (no location): %d rows, %d valid votes = %.1f%% of %d; left out of every spatial measure."
          % (len(de_rows), valid_de, 100 * valid_de / valid_all, valid_all))
    res["double_envelopes"] = {"rows": len(de_rows), "valid_votes": valid_de, "total_valid_votes": valid_all,
                               "share": r3(valid_de / valid_all)}

    stations, station_loc, dropped = [], [], 0
    extras = cfg.get("extra_cols")
    for r in box_rows:
        if r["סמל ישוב"] == DOUBLE_ENVELOPE_SYMBOL:
            continue
        v = to_bloc_vector(r, letters, blocs)
        if sum(v) == 0:
            continue
        if station_filter and extras:
            if sum(int(r[c] or 0) for c in extras) / sum(v) > station_filter:
                dropped += 1
                continue
        stations.append(v)
        station_loc.append(r["סמל ישוב"])
    locs, loc_names, loc_syms = [], [], []
    for r in loc_rows:
        if r["סמל ישוב"] == DOUBLE_ENVELOPE_SYMBOL:
            continue
        v = to_bloc_vector(r, letters, blocs)
        if sum(v) == 0:
            continue
        locs.append(v)
        loc_names.append(r["שם ישוב"])
        loc_syms.append(r["סמל ישוב"])
    print("Spatial units: %d localities, %d ballot boxes with votes (%d dropped by the sensitivity filter); "
          "%d valid votes." % (len(locs), len(stations), dropped, sum(map(sum, stations))))
    res["units"] = {"localities": len(locs), "stations": len(stations), "stations_dropped_by_filter": dropped,
                    "valid_votes": sum(map(sum, stations))}

    totals = [sum(u[k] for u in stations) for k in range(nb)]
    grand = sum(totals)
    shares = [t / grand for t in totals]
    res["bloc_vote_shares"] = {order[k]: r3(shares[k]) for k in range(nb)}
    print("Bloc shares of located valid votes: " + ", ".join("%s %.1f%%" % (order[k], 100 * shares[k]) for k in range(nb)))

    # dissimilarity
    floor = random_allocation_floor(stations)
    print("\nDissimilarity index (0 = spread evenly, 1 = fully separate)")
    print("  %-26s %10s %10s %12s" % ("bloc vs all other voters", "locality", "station", "chance floor"))
    d = {}
    for k, b in enumerate(order):
        d[b] = {"locality": r3(bloc_vs_rest(locs, k)), "station": r3(bloc_vs_rest(stations, k)),
                "station_random_floor": r3(floor[k])}
        print("  %-26s %10.3f %10.3f %12.3f" % (b, d[b]["locality"], d[b]["station"], floor[k]))
    res["dissimilarity_vs_all_others"] = d
    print("  Likud voters against each other bloc's voters")
    dp = {}
    for j in range(1, nb):
        dp[order[j]] = {"locality": r3(bloc_vs_bloc(locs, 0, j)), "station": r3(bloc_vs_bloc(stations, 0, j))}
        print("  %-26s %10.3f %10.3f" % (order[j], dp[order[j]]["locality"], dp[order[j]]["station"]))
    res["dissimilarity_likud_vs_bloc"] = dp

    # exposure
    Es, El = exposure(stations), exposure(locs)
    pct = lambda E: [(order[x], ["%.1f%%" % (100 * E[x][y]) for y in range(nb)]) for x in range(nb)]
    table("Exposure, polling-station level (row: average voter of the bloc; column: share of the other voters at "
          "the same station)", ["-> " + b for b in order], pct(Es))
    table("Exposure, locality level", ["-> " + b for b in order], pct(El))
    ratio = [[Es[x][y] / shares[y] for y in range(nb)] for x in range(nb)]
    table("Station exposure / bloc's national share (1.00 = even mixing)", ["-> " + b for b in order],
          [(order[x], ["%.2f" % ratio[x][y] for y in range(nb)]) for x in range(nb)])
    mk = lambda E: {order[x]: {order[y]: r3(E[x][y]) for y in range(nb)} for x in range(nb)}
    res["exposure_station"], res["exposure_locality"], res["exposure_ratio_station"] = mk(Es), mk(El), mk(ratio)

    # cities
    print("\nTen largest cities, polling-station level: the average Likud voter's station")
    print("  %-15s %7s | %s | D(Likud, Opposition)" % ("city", "stations", " ".join("%8s" % short(b) for b in order)))
    res["cities"] = {}
    for city, sym in CITIES.items():
        us = [u for u, s in zip(stations, station_loc) if s == sym]
        if not us:
            print("  %s: not found" % city)
            continue
        E = exposure(us)
        ct = [sum(u[k] for u in us) for k in range(nb)]
        oi = order.index("Opposition")
        res["cities"][city] = {
            "stations": len(us), "valid_votes": sum(ct),
            "vote_shares": {order[k]: r3(ct[k] / sum(ct)) for k in range(nb)},
            "likud_voter_exposure": {order[y]: r3(E[0][y]) for y in range(nb)},
            "dissimilarity_likud_vs": {order[j]: r3(bloc_vs_bloc(us, 0, j)) for j in range(1, nb)},
            "dissimilarity_vs_all_others": {order[k]: r3(bloc_vs_rest(us, k)) for k in range(nb)},
        }
        print("  %-15s %7d | %s | %.3f" % (city, len(us), " ".join("%7.1f%%" % (100 * E[0][y]) for y in range(nb)),
                                          bloc_vs_bloc(us, 0, oi)))

    # correlations
    cu, cw, cl = correlations(stations, False), correlations(stations, True), correlations(locs, True)
    print("\nCorrelation of Likud's share with each bloc's share (stations with %d+ valid votes)" % MIN_STATION_VOTES)
    print("  %-26s %10s %10s %14s" % ("bloc", "stations", "weighted", "localities(w)"))
    for i, b in enumerate(order[1:]):
        print("  %-26s %10.3f %10.3f %14.3f" % (b, cu[i], cw[i], cl[i]))
    res["correlation_with_likud_share"] = {
        "stations_unweighted": {b: r3(cu[i]) for i, b in enumerate(order[1:])},
        "stations_weighted": {b: r3(cw[i]) for i, b in enumerate(order[1:])},
        "localities_weighted": {b: r3(cl[i]) for i, b in enumerate(order[1:])},
        "min_station_valid_votes": MIN_STATION_VOTES}

    # locality type
    print("\nLocality type: the committee files carry no locality type (no Jewish/Arab flag, no development-town,")
    print("kibbutz or settlement flag), so official types are skipped. Classes made from votes and size instead:")
    group_of = {sym: locality_group(v, order) for v, sym in zip(locs, loc_syms)}
    groups, lg = {}, {}
    for u, s in zip(stations, station_loc):
        groups.setdefault(group_of[s], []).append(u)
    for v, s in zip(locs, loc_syms):
        lg.setdefault(group_of[s], []).append(v)
    res["locality_type"] = {"official_type_in_files": False,
                            "note": "Classes are derived from votes and size, not official types.", "classes": {}}
    oi = order.index("Opposition")
    print("  %-42s %5s %8s %6s %6s | Likud voter's station: %s" %
          ("class", "n loc", "votes", "Lik%", "Opp%", " ".join("%7s" % short(b) for b in order)))
    for g in GROUP_ORDER:
        us = groups.get(g)
        if not us:
            continue
        ct = [sum(u[k] for u in us) for k in range(nb)]
        t = sum(ct)
        E = exposure(us)
        sel = [u for u in us if sum(u) >= MIN_STATION_VOTES]
        res["locality_type"]["classes"][g] = {
            "localities": len(lg[g]), "stations": len(us), "valid_votes": t,
            "vote_shares": {order[k]: r3(ct[k] / t) for k in range(nb)},
            "likud_voter_exposure_station": {order[y]: r3(E[0][y]) for y in range(nb)},
            "dissimilarity_likud_vs_opposition_station": r3(bloc_vs_bloc(us, 0, oi)),
            "dissimilarity_likud_vs_opposition_locality": r3(bloc_vs_bloc(lg[g], 0, oi)),
            "correlation_likud_vs_opposition_station": r3(pearson([u[0] / sum(u) for u in sel],
                                                                  [u[oi] / sum(u) for u in sel])),
        }
        print("  %-42s %5d %8d %5.1f%% %5.1f%% | %s" % (g, len(lg[g]), t, 100 * ct[0] / t, 100 * ct[oi] / t,
                                                        " ".join("%6.1f%%" % (100 * E[0][y]) for y in range(nb))))
    print("Centre/periphery and class need a locality ranking (for example the Central Bureau of Statistics")
    print("socio-economic index) that these files do not carry. Not used here.")
    return res


def main():
    results = {}
    all_ok = True
    for key, cfg in ELECTIONS.items():
        rows, ok, info = national_check(key)
        all_ok &= ok
        print("\n" + "#" * 100 + "\nNATIONAL CHECK, %s: both CSV files against the committee's national results page\n" % cfg["title"]
              + "#" * 100)
        print("  %-8s %-34s %5s %10s %10s %10s  %s" % ("letters", "list", "seats", "locality", "ballotbox", "official", "ok"))
        for r in rows:
            print("  %-8s %-34s %5d %10s %10s %10d  %s" % (r["letters"][::-1] if False else r["letters"], r["name"][:34], r["seats"],
                                                         r["locality_file"], r["ballot_box_file"], r["official"],
                                                         "OK" if r["match"] else "MISMATCH"))
        print("  Valid votes: locality file %d, ballot-box file %d, on the page: %s. Sum of list votes on page: %d. "
              "Seats on page: %d. Lists with votes but not on the page: %s." %
              (info["valid_votes_locality_file"], info["valid_votes_ballot_box_file"], info["valid_votes_on_page"],
               info["page_vote_sum"], info["seats_on_page"], info["letters_with_votes_not_on_page"] or "none"))
        print("  ALL MATCH: %s" % ok)
        results[key] = {"national_check": {"rows": rows, "info": info, "all_match": ok}}

    for key, cfg in ELECTIONS.items():
        for variant in cfg["variants"]:
            results[key][variant] = analyse(key, variant)
        if cfg.get("extra_cols"):
            cut = cfg["extra_share_cutoff"]
            results[key]["sensitivity_station_extra_columns"] = analyse(
                key, "main", station_filter=cut,
                label="SENSITIVITY: stations dropped where the two extra columns exceed %d%% of valid votes" % (cut * 100))

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print("\nWrote %s" % OUT_FILE)
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
