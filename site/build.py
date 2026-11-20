#!/usr/bin/env python3
"""Build the local preview site into site/dist/. No dependencies.

    python3 site/build.py && python3 -m http.server 4173 --directory site/dist

Pages: the waiting-list page (only if site/landing.html exists; it is kept out of git until both
founders approve it), the fact base from facts/*.json, and four pages from docs/.
Everything here is a projection of files in the repository: edit the cards and the docs, not the output.
"""
import html, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DIST = os.path.join(HERE, "dist")
PUBLIC = "--public" in sys.argv  # the hosted build: no waiting-list page, an honest banner, and no search indexing yet
BANNER = ("WORK IN PROGRESS · cards marked draft have not passed review · nothing here is teaching content yet" if PUBLIC
          else "LOCAL PREVIEW · DRAFTS · nothing here is approved or public")
ROBOTS = '<meta name="robots" content="noindex, nofollow">' if PUBLIC else ""
sys.path.insert(0, os.path.join(ROOT, "tools"))
import factcheck  # noqa: E402  the gate is the one source of rules: chapters, what counts as enough

E = html.escape
NAV = [("", "Home"), ("facts/", "Fact base"), ("questions/", "Questions we tested"), ("election-map/", "Election map"),
       ("method/", "How we check"), ("open/", "Needs a person")]
FONTS = ('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700;900'
         '&family=Heebo:wght@400;500;700&family=JetBrains+Mono:wght@500&display=swap">')
CSS = """
:root{--flag-blue:#0038b8;--olive:#3f4d1c;--gold:#a8801f;--stone:#f4efe6;--ground:#fff;--ink:#0b1430;--ink-soft:#4b4637;
--line:#e7dfd0;--on-blue:#fff;--display:"Frank Ruhl Libre",Georgia,serif;--body:Heebo,"Helvetica Neue",Arial,sans-serif;
--label:"JetBrains Mono",ui-monospace,Menlo,monospace}
@media (prefers-color-scheme:dark){:root{--flag-blue:#9db7ff;--olive:#bccb84;--gold:#e2b85c;--stone:#151b2d;--ground:#0b1020;
--ink:#eef1f8;--ink-soft:#c3c8d6;--line:#2a3350;--on-blue:#0b1020;color-scheme:dark}}
*{box-sizing:border-box}body{margin:0;background:var(--ground);color:var(--ink);font:17px/1.6 var(--body)}
a{color:var(--flag-blue)}.wrap{max-width:820px;margin:0 auto;padding:0 16px 72px}
.draft{background:var(--stone);color:var(--ink-soft);font:12px var(--label);letter-spacing:.04em;text-align:center;padding:8px 16px}
h1,h2,h3{font-family:var(--display);letter-spacing:-.015em;text-wrap:balance;margin:0}
h1{font-weight:900;font-size:clamp(34px,7vw,52px);line-height:1.05;padding-top:28px}
h2{font-weight:700;font-size:clamp(24px,5vw,32px);line-height:1.15;padding-top:44px}
h2::before{content:"";display:block;width:56px;height:2px;background:var(--gold);margin-bottom:14px}
h3{font-weight:700;font-size:21px;line-height:1.25}
p{margin:12px 0 0}.soft{color:var(--ink-soft);font-size:15px}.lede{font-size:19px}
.label{font:12px var(--label);letter-spacing:.06em;text-transform:uppercase;color:var(--ink-soft)}
.nums{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:20px}
.nums div{background:var(--stone);border-radius:8px;padding:16px}
.nums b{display:block;font:900 38px/1 var(--display);color:var(--flag-blue);font-variant-numeric:tabular-nums}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px;padding:0;list-style:none}
.chips a{display:block;border:1px solid var(--line);border-radius:999px;padding:4px 12px;font-size:14px;text-decoration:none;color:var(--ink)}
.card{border:1px solid var(--line);border-radius:10px;padding:20px;margin-top:18px}
.card h3 q{quotes:"\\201C" "\\201D"}
.tag{display:inline-block;font:11px var(--label);letter-spacing:.05em;text-transform:uppercase;border-radius:4px;padding:2px 7px;margin:0 6px 6px 0;
border:1px solid var(--line);color:var(--ink-soft)}
.tag.ok{background:var(--olive);border-color:var(--olive);color:var(--ground)}.tag.warn{border-color:var(--gold);color:var(--gold)}
details{border-top:1px solid var(--line);margin-top:14px;padding-top:10px}summary{cursor:pointer;font-weight:700}
ul,ol{padding-left:22px;margin:10px 0 0}li{margin-top:8px}
.src{font-size:14px;color:var(--ink-soft)}.src a{white-space:nowrap}
blockquote{margin:6px 0 0;padding-left:12px;border-left:3px solid var(--line);color:var(--ink-soft);font-size:15px}
.scroll{overflow-x:auto;margin-top:14px}table{border-collapse:collapse;width:100%;font-size:15px}
th,td{border-bottom:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top}th{font:12px var(--label);letter-spacing:.04em;text-transform:uppercase;color:var(--ink-soft)}
code{font:14px var(--label);background:var(--stone);padding:1px 5px;border-radius:4px}pre{background:var(--stone);padding:14px;border-radius:8px;overflow-x:auto}
pre code{background:none;padding:0}
"""
NAV_CSS = """
.sitenav{border-bottom:1px solid var(--line,#e7dfd0);background:var(--ground,#fff)}
.sitenav ul{max-width:820px;margin:0 auto;padding:10px 16px;list-style:none;display:flex;flex-wrap:wrap;gap:6px 18px}
.sitenav a{font:500 15px Heebo,Arial,sans-serif;text-decoration:none;color:var(--ink,#0b1430)}
.sitenav a[aria-current]{color:var(--flag-blue,#0038b8);font-weight:700}
"""


SITE = "https://whylikedis.fyi"
TAGLINE = "Clear answers about Israel, each with sources you can check."


def head_extras(title, depth):
    """Icons and the card a link shows when it is shared."""
    up = "../" * depth
    return (f'<link rel="icon" href="{up}assets/favicon.svg" type="image/svg+xml">'
            f'<link rel="icon" href="{up}assets/favicon-32.png" sizes="32x32" type="image/png">'
            f'<link rel="apple-touch-icon" href="{up}assets/apple-touch-icon.png">'
            '<meta name="theme-color" content="#0038b8">'
            f'<meta name="description" content="{E(TAGLINE)}">'
            f'<meta property="og:title" content="{E(title)} · WhyLikeDIs"><meta property="og:description" content="{E(TAGLINE)}">'
            f'<meta property="og:image" content="{SITE}/assets/og.png"><meta property="og:type" content="website">'
            '<meta name="twitter:card" content="summary_large_image">')


def nav(current, depth):
    up = "../" * depth
    items = "".join(f'<li><a href="{up}{p}"{" aria-current=page" if p == current else ""}>{E(t)}</a></li>' for p, t in NAV)
    return f'<nav class="sitenav" aria-label="Site"><ul>{items}</ul></nav>'


def page(title, current, body, depth=1):
    return (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            f'<title>{E(title)} · WhyLikeDIs</title>{ROBOTS}{head_extras(title, depth)}{FONTS}<style>{CSS}{NAV_CSS}</style></head><body>'
            f'<div class="draft">{BANNER}</div>{nav(current, depth)}'
            f'<main class="wrap">{body}</main></body></html>')


def write(rel, text):
    path = os.path.join(DIST, rel, "index.html")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "w", encoding="utf-8").write(text)


def link(s):
    wire = f", {E(s['wire'])} copy" if s.get("wire") else ""
    return f'<a href="{E(s["url"], quote=True)}" rel="noopener noreferrer">{E(s["publisher"])}</a> <span class="soft">({E(s["kind"])}{wire})</span>'


def sources(src):
    return "".join(f'<li class="src">{link(s)}<blockquote>{E(s["quote"])}</blockquote></li>' for s in src)


def card_html(name, c):
    review = c.get("review") or {}
    tags = f'<span class="tag {"ok" if c["status"] == "verified" else ""}">{E(c["status"])}</span>'
    for who, label in (("skeptic", "attack round"), ("citer", "citation round")):
        v = (review.get(who) or {}).get("verdict")
        if v:
            tags += f'<span class="tag {"" if v == "holds" else "warn"}">{label}: {E(v)}</span>'
    if not c.get("content_approved"):
        tags += '<span class="tag">not approved as teaching content</span>'
    good = sum(factcheck.enough(f)[0] for f in c["facts"])
    facts = ""
    for f in c["facts"]:
        mark = "" if factcheck.enough(f)[0] else ' <span class="tag warn">short of sources</span>'
        rec = ' <span class="tag">what a record says</span>' if f.get("record") else ""
        facts += f'<li>{E(f["text"])}{rec}{mark}<ul>{sources(f["sources"])}</ul></li>'
    contested = "".join(
        f"<li>{E(x)}</li>" if isinstance(x, str) else f'<li>{E(x["text"])}<ul>{sources(x.get("sources") or [])}</ul></li>'
        for x in c["contested"]) or "<li>Nothing recorded.</li>"
    heard = "".join(f'<li class="src">{E(h.get("who", ""))}: <a href="{E(h["url"], quote=True)}" rel="noopener noreferrer">source</a>'
                    f'<blockquote>{E(h["quote"])}</blockquote></li>' for h in c["heard"])
    plain = lambda items: "".join(f"<li>{E(x)}</li>" for x in items) or "<li>Nothing recorded.</li>"
    notes = "".join(f'<p class="soft"><b>{label}.</b> {E((review.get(who) or {}).get("notes", ""))}</p>'
                    for who, label in (("skeptic", "Attack round"), ("citer", "Citation round")) if review.get(who))
    return (f'<article class="card" id="{E(name)}"><p>{tags}</p><h3><q>{E(c["claim"])}</q></h3><p>{E(c["answer"])}</p>'
            f'<details><summary>Facts and sources ({good} of {len(c["facts"])} fully sourced)</summary><ol>{facts}</ol></details>'
            f'<details><summary>Who says this ({len(c["heard"])})</summary><ul>{heard}</ul></details>'
            f'<details><summary>Where the record is contested ({len(c["contested"])})</summary><ul>{contested}</ul></details>'
            f'<details><summary>What this card does not claim</summary><ul>{plain(c["not_claimed"])}</ul></details>'
            f'<details><summary>What we could not verify ({len(c.get("could_not_verify") or [])})</summary><ul>{plain(c.get("could_not_verify") or [])}</ul></details>'
            + (f"<details><summary>Review notes</summary>{notes}</details>" if notes else "")
            + f'<p class="soft"><code>{E(name)}</code></p></article>')


def facts_page():
    cards = [(n, c) for n, c in factcheck.cards() if "_broken" not in c]
    all_facts = [f for _, c in cards for f in c["facts"]]
    verified = sum(c["status"] == "verified" for _, c in cards)
    body = ('<p class="label" style="padding-top:28px">The fact base</p><h1>One card for each claim a child hears</h1>'
            '<p class="lede">Each card gives an answer a parent can say in two minutes, the facts behind it with the exact words '
            'quoted from each source, where the record is disputed, and what the card does not claim.</p>'
            f'<div class="nums"><div><b>{len(cards)}</b>cards</div><div><b>{verified}</b>verified by a second reader</div>'
            f'<div><b>{sum(factcheck.enough(f)[0] for f in all_facts)}</b>of {len(all_facts)} facts fully sourced</div>'
            f'<div><b>{sum(bool(c.get("content_approved")) for _, c in cards)}</b>approved as teaching content</div></div>')
    chapters = [(k, t) for k, t in factcheck.CHAPTERS.items() if any(c["era"] == k for _, c in cards)]
    body += '<ul class="chips">' + "".join(f'<li><a href="#ch{k}">{k}. {E(t)}</a></li>' for k, t in chapters) + "</ul>"
    for k, t in chapters:
        body += f'<h2 id="ch{k}">{k}. {E(t)}</h2>'
        mine = [(n, c) for n, c in cards if c["era"] == k]
        # The hosted site shows a card in full only once it is verified; drafts are listed, so nobody
        # mistakes an unreviewed answer for a checked one.
        body += "".join(card_html(n, c) for n, c in mine if not PUBLIC or c["status"] == "verified")
        drafts = [c for _, c in mine if PUBLIC and c["status"] != "verified"]
        if drafts:
            body += ('<p class="soft" style="margin-top:18px">In review, not yet verified:</p><ul>'
                     + "".join(f'<li><q>{E(c["claim"])}</q></li>' for c in drafts) + "</ul>")
    return page("Fact base", "facts/", body)


def inline(t):
    t = E(t)
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"(?<![\w/])_([^_]+)_(?![\w/])", r"<i>\1</i>", t)
    return re.sub(r"\[([^\]]+)\]\((https?://[^)\s]+)\)", r'<a href="\2" rel="noopener noreferrer">\1</a>', t)


def md(text):
    """Just enough Markdown for our own docs: headings, tables, lists, code fences, paragraphs."""
    out, lines, i = [], text.split("\n"), 0
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
            out.append(f"<h{len(m.group(1))}>{inline(m.group(2))}</h{len(m.group(1))}>")
            i += 1
        elif l.startswith("|") and i + 1 < len(lines) and re.match(r"\|[\s:|-]+\|?$", lines[i + 1].strip()):
            rows, j = [], i + 2
            while j < len(lines) and lines[j].startswith("|"):
                rows.append(cells(lines[j]))
                j += 1
            head = "".join(f"<th>{inline(c)}</th>" for c in cells(l))
            body = "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in rows)
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


def doc_page(source, title, current):
    path = os.path.join(ROOT, "docs", source)
    if not os.path.exists(path):
        return page(title, current, f"<h1>{E(title)}</h1><p>Not written yet.</p>")
    return page(title, current, md(open(path, encoding="utf-8").read()))


def section(source, heading):
    """One '## heading' section of a doc, as HTML."""
    text = open(os.path.join(ROOT, "docs", source), encoding="utf-8").read()
    m = re.search(rf"^## {re.escape(heading)}\n(.*?)(?=^## |\Z)", text, re.S | re.M)
    return md(m.group(1)) if m else ""


def public_home():
    cards = [c for _, c in factcheck.cards() if "_broken" not in c]
    facts = [f for c in cards for f in c["facts"]]
    mark = ('<svg viewBox="0 0 100 100" width="44" height="44" role="img" aria-label="WhyLikeDIs mark: an eye">'
            '<path d="M14 46 Q50 12 86 46" fill="none" stroke="var(--flag-blue)" stroke-width="10" stroke-linecap="round"/>'
            '<path d="M14 58 Q50 92 86 58" fill="none" stroke="var(--flag-blue)" stroke-width="10" stroke-linecap="round"/>'
            '<circle cx="50" cy="52" r="12" fill="var(--gold)"/></svg>')
    body = (f'<p style="display:flex;align-items:center;gap:10px;padding-top:24px">{mark}'
            '<span style="font:700 24px var(--display)">WhyLikeDIs</span></p>'
            '<h1>Clear answers about Israel, each with sources you can check.</h1>'
            '<p class="lede">We are building a fact base for parents: one card for each claim a child hears. Each card gives an '
            'answer in plain words, the facts behind it with the exact words quoted from every source, where the record is '
            'disputed, and what the card does not claim.</p>'
            f'<div class="nums"><div><b>{len(cards)}</b>cards so far</div>'
            f'<div><b>{sum(c["status"] == "verified" for c in cards)}</b>verified by a second reader</div>'
            f'<div><b>{sum(factcheck.enough(f)[0] for f in facts)}</b>of {len(facts)} facts fully sourced</div></div>'
            '<p>Most cards are still drafts, and each one says so. A card is verified only after a reader who did not write it '
            'has tried to break it, every sentence of the answer is tied to a fact, and every quote has been found on its page.</p>'
            '<p><a href="facts/">Read the fact base</a> · <a href="method/">How we check</a> · '
            '<a href="questions/">Questions we tested</a></p>'
            '<h2>Where we stand</h2>' + section("chapters.md", "Where we stand"))
    return page("Home", "", body, depth=0)


def home():
    if PUBLIC:
        return public_home()
    path = os.path.join(HERE, "landing.html")
    if os.path.exists(path):  # the waiting-list page as drafted; we only add the site's navigation to it
        text = open(path, encoding="utf-8").read()
        return text.replace("</head>", f"{head_extras('Home', 0)}<style>{NAV_CSS}</style></head>", 1).replace('<div class="wrap">', nav("", 0) + '<div class="wrap">', 1)
    return page("Home", "", '<h1>WhyLikeDIs</h1><p class="lede">Clear answers about Israel, each with sources a parent can check.</p>'
                '<p>The waiting-list page is not in this checkout. <a href="facts/">Open the fact base</a>.</p>', depth=0)


def demo():
    assert "<table>" in md("| a | b |\n| - | - |\n| 1 | `x` |") and "<code>x</code>" in md("| a |\n| - |\n| `x` |")
    assert md("- one\n  more\n- two") == "<ul><li>one more</li><li>two</li></ul>"
    assert "&lt;script&gt;" in md("<script>") and "<script" not in inline("<script>alert(1)</script>")
    assert "<p>" in section("chapters.md", "Where we stand")
    assert 'href="https://a.org/x"' in inline("[t](https://a.org/x)") and "href" not in inline("[t](javascript:alert(1))")


if __name__ == "__main__":
    demo()
    import shutil
    shutil.rmtree(DIST, ignore_errors=True)  # a build never carries a page over from the build before it
    os.makedirs(DIST, exist_ok=True)
    shutil.copytree(os.path.join(HERE, "assets"), os.path.join(DIST, "assets"))
    open(os.path.join(DIST, "index.html"), "w", encoding="utf-8").write(home())
    write("facts", facts_page())
    write("questions", doc_page("hypotheses.md", "Questions we tested", "questions/"))
    write("election-map", doc_page("election-map.md", "Election map", "election-map/"))
    write("method", doc_page("verification.md", "How we check", "method/"))
    write("open", doc_page("needs-a-person.md", "Needs a person", "open/"))
    print("built", DIST)
