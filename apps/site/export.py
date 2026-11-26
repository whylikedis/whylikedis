#!/usr/bin/env python3
"""Write apps/site/data/site.json: everything the Next.js site renders. No dependencies.

The gate (tools/factcheck.py) stays the one source of rules: the chapters, and whether a fact has
enough sources, are computed here and only displayed by the site. The docs are turned into HTML
here too, with every character escaped first, so a doc can never inject markup into a page.
Everything in site.json is a projection of files in the repository: edit the cards and the docs.
"""
import html, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))  # apps/site -> the repository root
sys.path.insert(0, os.path.join(ROOT, "tools"))
import factcheck  # noqa: E402

E = html.escape
DOCS = {  # the path on the site -> (the file in docs/, the page title)
    "questions": ("hypotheses.md", "Questions we tested"),
    "election-map": ("election-map.md", "Election map"),
    "method": ("verification.md", "How we check"),
    "open": ("needs-a-person.md", "Needs a person"),
}


def inline(t):
    t = E(t)
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"(?<![\w/])_([^_]+)_(?![\w/])", r"<i>\1</i>", t)
    return re.sub(r"\[([^\]]+)\]\((https?://[^)\s]+)\)", r'<a href="\2" rel="noopener noreferrer">\1</a>', t)


def slug(text, taken):
    """A heading's id: its words, lower case, joined by hyphens; a repeat gets -2, -3."""
    base = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "section"
    s, n = base, 1
    while s in taken:
        n += 1
        s = f"{base}-{n}"
    taken.add(s)
    return s

# A "State" cell holding one of these words reads as a status pill (Interlace Prose `data-status`).
TONES = {
    "supported": "success", "mostly supported": "success", "done": "success",
    "partly": "warning", "started": "warning",
    "not supported": "destructive",
    "cannot know": "neutral", "untested": "neutral", "observe": "neutral",
    "waits for github": "neutral", "n/a": "neutral",
}


def td(text, column):
    """One body cell. It carries its column's name (`data-label`) so a phone can stack the
    table into one card per row without waiting for script, and a known state becomes a pill."""
    label = f' data-label="{E(re.sub(r"[`*_]", "", column))}"' if column else ""
    tone = TONES.get(text.lower()) if column.lower() == "state" else None
    value = f'<span data-status="{tone}">{inline(text)}</span>' if tone else inline(text)
    return f"<td{label}>{value}</td>"


def md(text, toc=None):
    """Just enough Markdown for our own docs: headings, tables, lists, code fences, paragraphs.
    Each h2 and h3 gets an id, and is listed in `toc` (when given) for the page's contents."""
    out, lines, i = [], text.split("\n"), 0
    taken = {"main", "facts"}  # ids the layout already uses
    cells = lambda l: [c.strip() for c in l.strip().strip("|").split("|")]
    while i < len(lines):
        l = lines[i]
        if l.startswith("```"):
            j = i + 1
            while j < len(lines) and not lines[j].startswith("```"):
                j += 1
            out.append("<pre><code>" + E("\n".join(lines[i + 1:j])) + "</code></pre>")
            i = j + 1
        elif m := re.match(r"(#{1,3}) (.*)", l):
            n, label = len(m.group(1)), m.group(2)
            if n == 1:
                out.append(f"<h1>{inline(label)}</h1>")
            else:
                hid = slug(re.sub(r"[`*_]|\[([^\]]+)\]\([^)]*\)", r"\1", label), taken)
                out.append(f'<h{n} id="{hid}">{inline(label)}</h{n}>')
                if toc is not None:
                    toc.append({"id": hid, "label": re.sub(r"[`*_]|\[([^\]]+)\]\([^)]*\)", r"\1", label), "level": n})
            i += 1
        elif l.startswith("|") and i + 1 < len(lines) and re.match(r"\|[\s:|-]+\|?$", lines[i + 1].strip()):
            rows, j = [], i + 2
            while j < len(lines) and lines[j].startswith("|"):
                rows.append(cells(lines[j]))
                j += 1
            names = cells(l)
            head = "".join(f"<th>{inline(c)}</th>" for c in names)
            body = "".join("<tr>" + "".join(td(c, names[k] if k < len(names) else "") for k, c in enumerate(r)) + "</tr>" for r in rows)
            out.append(f'<div class="scroll"><table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table></div>')
            i = j
        elif re.match(r"(- |\d+\. )", l):
            tag, items = ("ul" if l.startswith("- ") else "ol"), []
            while i < len(lines) and (re.match(r"(- |\d+\. )", lines[i]) or (lines[i].startswith("  ") and items)):
                if re.match(r"(- |\d+\. )", lines[i]):
                    items.append(re.sub(r"^(- |\d+\. )", "", lines[i]))
                else:
                    items[-1] += " " + lines[i].strip()
                i += 1
            out.append(f"<{tag}>" + "".join(f"<li>{inline(x)}</li>" for x in items) + f"</{tag}>")
        elif l.strip():
            para = [l]
            i += 1
            while i < len(lines) and lines[i].strip() and not re.match(r"(#|\||- |\d+\. |```)", lines[i]):
                para.append(lines[i])
                i += 1
            out.append(f"<p>{inline(' '.join(p.strip() for p in para))}</p>")
        else:
            i += 1
    return "".join(out)


def doc(source, title):
    """A doc page: its HTML and the contents list of its headings."""
    path = os.path.join(ROOT, "docs", source)
    if not os.path.exists(path):
        return {"title": title, "html": "<p>Not written yet.</p>", "toc": []}
    toc = []
    return {"title": title, "html": md(open(path, encoding="utf-8").read(), toc), "toc": toc}


def section(source, heading):
    """One '## heading' section of a doc, as HTML."""
    text = open(os.path.join(ROOT, "docs", source), encoding="utf-8").read()
    m = re.search(rf"^## {re.escape(heading)}\n(.*?)(?=^## |\Z)", text, re.S | re.M)
    return md(m.group(1)) if m else ""


def site():
    cards = []
    for name, c in factcheck.cards():
        if "_broken" in c:
            continue
        facts = [dict(f, enough=bool(factcheck.enough(f)[0])) for f in c["facts"]]
        cards.append(dict(c, id=name, facts=facts))
    eras = {c["era"] for c in cards}
    return {
        "chapters": [{"n": k, "title": t} for k, t in factcheck.CHAPTERS.items() if k in eras],
        "cards": cards,
        "docs": {path: doc(source, title) for path, (source, title) in DOCS.items()},
        "standing": section("chapters.md", "Where we stand"),
    }


def demo():
    assert "<table>" in md("| a | b |\n| - | - |\n| 1 | `x` |") and "<code>x</code>" in md("| a |\n| - |\n| `x` |")
    assert '<td data-label="State"><span data-status="success">supported</span></td>' in md("| Q | State |\n| - | - |\n| x | supported |")
    assert '<td data-label="b">2</td>' in md("| a | b |\n| - | - |\n| 1 | 2 |") and "data-status" not in md("| a |\n| - |\n| done |")
    assert md("- one\n  more\n- two") == "<ul><li>one more</li><li>two</li></ul>"
    assert "&lt;script&gt;" in md("<script>") and "<script" not in inline("<script>alert(1)</script>")
    assert "<p>" in section("chapters.md", "Where we stand")
    assert 'href="https://a.org/x"' in inline("[t](https://a.org/x)") and "href" not in inline("[t](javascript:alert(1))")


if __name__ == "__main__":
    demo()
    out = os.path.join(HERE, "data", "site.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(site(), open(out, "w", encoding="utf-8"), ensure_ascii=False)
    print("wrote", out)
