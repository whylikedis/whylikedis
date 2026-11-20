#!/usr/bin/env python3
"""Checks for elections.py. Exits non-zero on any failure. Run: python3 analysis/elections/test_elections.py"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import elections as E  # noqa: E402

failures = []


def check(name, cond):
    print(("PASS " if cond else "FAIL ") + name)
    if not cond:
        failures.append(name)


# --- dissimilarity on made-up inputs
check("identical distributions -> 0", math.isclose(E.dissimilarity([5, 10, 20], [5, 10, 20]), 0.0, abs_tol=1e-12))
check("proportional distributions -> 0", math.isclose(E.dissimilarity([1, 2, 3], [10, 20, 30]), 0.0, abs_tol=1e-12))
check("fully separated -> 1", math.isclose(E.dissimilarity([10, 0, 0], [0, 4, 6]), 1.0))
check("fully separated, many units -> 1", math.isclose(E.dissimilarity([3, 0, 7, 0], [0, 9, 0, 1]), 1.0))
check("half overlap -> 0.5", math.isclose(E.dissimilarity([10, 10, 0], [0, 10, 10]), 0.5))
check("symmetric", math.isclose(E.dissimilarity([1, 5, 2], [4, 1, 3]), E.dissimilarity([4, 1, 3], [1, 5, 2])))

# --- exposure on made-up units (6 blocs)
ex = E.exposure([[10, 0, 0, 0, 0, 0], [0, 10, 0, 0, 0, 0]])
check("segregated units: Likud voter meets only Likud", math.isclose(ex[0][0], 1.0) and math.isclose(ex[0][1], 0.0))
ex = E.exposure([[5, 5, 0, 0, 0, 0]])
check("mixed unit rows sum to 1", all(math.isclose(sum(row), 1.0) for row in ex[:2]))
check("mixed unit: Likud voter meets 4/9 Likud, 5/9 Opposition",
      math.isclose(ex[0][0], 4 / 9) and math.isclose(ex[0][1], 5 / 9))

# --- correlation
check("pearson of a line is 1", math.isclose(E.pearson([1, 2, 3, 4], [2, 4, 6, 8]), 1.0))
check("pearson of a falling line is -1", math.isclose(E.pearson([1, 2, 3, 4], [8, 6, 4, 2]), -1.0))

# --- the page parser, on a made-up page in the committee's layout
import tempfile  # noqa: E402

fake = "<div>x</div>\n" + "\n".join("<td>%s</td>" % x for x in
                                   ["Some list", "אבג", "7", "5.00%", "1,234", "Other list", "דה", "0", "0.10%", "56"])
with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8") as f:
    f.write(fake)
lists, _ = E.parse_national_page(f.name)
os.unlink(f.name)
check("page parser reads letters, seats and votes", lists == {"אבג": ("Some list", 7, 1234), "דה": ("Other list", 0, 56)})

# --- per-election checks
KNOWN = {  # figures read by hand from the committee's national pages, to catch a parser that passes by reading nothing
    "2022": {"מחל": 1115336, "פה": 847435, "שס": 392964, "valid": 4764742},
    "2026": {"מחל": 1167591, "דרך": 913629, "שס": 299533, "valid": 5691426},
}
for key, cfg in E.ELECTIONS.items():
    rows, ok, info = E.national_check(key)
    for r in rows:
        check("%s national total, %s: locality file = ballot-box file = committee page" % (key, r["name"][:30]), r["match"])
    check("%s national check passes as a whole" % key, ok)
    page, _ = E.parse_national_page(os.path.join(E.DATA, cfg["national_page"]))
    for letters, votes in KNOWN[key].items():
        if letters != "valid":
            check("%s page lists %s with %d votes" % (key, letters, votes), page.get(letters, (0, 0, None))[2] == votes)
    check("%s valid votes %d" % (key, KNOWN[key]["valid"]),
          info["valid_votes_locality_file"] == info["valid_votes_ballot_box_file"] == KNOWN[key]["valid"])
    check("%s page has 120 seats" % key, info["seats_on_page"] == 120)

    box_rows, _ = E.read_csv(os.path.join(E.DATA, cfg["box_file"]))
    letters_all = E.letters_of(box_rows)
    for variant, blocs in cfg["variants"].items():
        ls = [l for v in blocs.values() for l in v]
        check("%s/%s: no letter in two blocs" % (key, variant), len(ls) == len(set(ls)))
        check("%s/%s: every bloc letter is a column in the file" % (key, variant), all(l in letters_all for l in ls))
        check("%s/%s: Likud is the first bloc" % (key, variant), list(blocs)[0] == "Likud")
        units = [E.to_bloc_vector(r, letters_all, blocs) for r in box_rows
                 if r["סמל ישוב"] != E.DOUBLE_ENVELOPE_SYMBOL and int(r["כשרים"]) > 0]
        check("%s/%s: bloc votes add up to valid votes" % (key, variant),
              sum(map(sum, units)) == sum(int(r["כשרים"]) for r in box_rows if r["סמל ישוב"] != E.DOUBLE_ENVELOPE_SYMBOL))
        check("%s/%s: station dissimilarity in [0,1]" % (key, variant),
              all(0.0 <= E.bloc_vs_rest(units, k) <= 1.0 for k in range(len(units[0]))))

print("\n%d failure(s)" % len(failures))
sys.exit(1 if failures else 0)
