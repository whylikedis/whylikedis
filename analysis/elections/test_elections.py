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

# --- exposure on made-up units (6 blocs: Likud, Opposition, Haredi, Arab, RZ, Other)
units = [[10, 0, 0, 0, 0, 0], [0, 10, 0, 0, 0, 0]]
ex = E.exposure(units)
check("segregated units: Likud voter meets only Likud", math.isclose(ex[0][0], 1.0) and math.isclose(ex[0][1], 0.0))
mixed = [[5, 5, 0, 0, 0, 0]]
ex = E.exposure(mixed)
check("mixed unit rows sum to 1", all(math.isclose(sum(row), 1.0) for row in ex[:2]))
check("mixed unit: Likud voter meets 4/9 Likud, 5/9 Opposition",
      math.isclose(ex[0][0], 4 / 9) and math.isclose(ex[0][1], 5 / 9))

# --- correlation
check("pearson of a line is 1", math.isclose(E.pearson([1, 2, 3, 4], [2, 4, 6, 8]), 1.0))
check("pearson of a falling line is -1", math.isclose(E.pearson([1, 2, 3, 4], [8, 6, 4, 2]), -1.0))

# --- the bloc table covers each official letter at most once
letters = [l for ls in E.BLOCS.values() for l in ls]
check("no letter in two blocs", len(letters) == len(set(letters)))

# --- national totals against the official result, from both committee files
loc_rows, box_rows, _, _ = E.load()
letters_all = E.letters_of(box_rows)
tl, tb = E.national_totals(loc_rows, letters_all), E.national_totals(box_rows, letters_all)
for letter, official in E.OFFICIAL_TOTALS.items():
    name = E.PARTY_NAMES[letter]
    check("national total, locality file: " + name, tl[letter] == official)
    check("national total, ballot-box file: " + name, tb[letter] == official)
check("valid votes 4,764,742", sum(int(r["כשרים"]) for r in box_rows) == 4764742)

# --- real data stays in range
for k in range(len(E.BLOC_ORDER)):
    units_real = [E.to_bloc_vector(r, letters_all) for r in box_rows if r["סמל ישוב"] != E.DOUBLE_ENVELOPE_SYMBOL
                  and int(r["כשרים"]) > 0]
    d = E.bloc_vs_rest(units_real, k)
    check("station dissimilarity in [0,1]: " + E.BLOC_ORDER[k], 0.0 <= d <= 1.0)

print("\n%d failure(s)" % len(failures))
sys.exit(1 if failures else 0)
