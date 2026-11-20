#!/usr/bin/env python3
"""The fact base's gate. No dependencies.

    python3 tools/factcheck.py              check every card in facts/ (offline, exits 1 on failure)
    python3 tools/factcheck.py --online     also fetch every source and look for its quote on the page
    python3 tools/factcheck.py [--online] era3   only the cards whose id starts with "era3"
    python3 tools/factcheck.py fetch URL    print a page as the checker reads it (agents quote from this)
    python3 tools/factcheck.py render       write FACTS.md, the readable view of every card
    python3 tools/factcheck.py selftest     prove the gate fails on a bad card
"""
import hashlib, html, json, os, re, shutil, subprocess, sys, urllib.request
from datetime import date
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FACTS = os.path.join(ROOT, "facts")
LOCK = os.path.join(FACTS, "verified.lock.json")
KINDS = {"primary", "scholarly", "reference", "news", "government", "advocacy"}
PARTISAN = {"government", "advocacy"}  # fine as one voice, never the only support for a fact
RELIABLE = KINDS - PARTISAN  # what counts toward the three sources a verified fact needs
CHAPTERS = {  # docs/chapters.md says what each one must answer
    1: "Roots: who lived here, and the names", 2: "Ottoman and British rule, and the return", 3: "1937 to 1948",
    4: "1967 to 2005", 5: "October 7 and the war", 6: "The words: apartheid, racism", 7: "From the river to the sea",
    8: "America's aid", 9: "How borders and peoples moved elsewhere", 10: "Money, media and attention",
    11: "The flag, the movement and its allies", 12: "Attempts at peace and two states",
    13: "Israeli politics, and left and right in Israel and America",
}
BANNED = ["hasbara"]


def norm(text):
    """One spelling for comparing a quote with a page: lower case, plain quotes and dashes, single spaces."""
    for a, b in (("‘", "'"), ("’", "'"), ("“", '"'), ("”", '"'), ("–", "-"), ("—", "-"), (" ", " ")):
        text = text.replace(a, b)
    return re.sub(r"\s+", " ", text).strip().lower()


def page_text(raw):
    raw = re.sub(r"(?is)<(script|style|noscript)\b.*?</\1>", " ", raw)
    return norm(html.unescape(re.sub(r"(?s)<[^>]+>", " ", raw)))


def fetch(url):
    """(status, text). Only https; a browser-like agent string because many archives refuse the default one."""
    if urlparse(url).scheme != "https":
        return 0, ""
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; factcheck/0)", "Accept": "text/html,*/*"})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            body = r.read(30_000_000)
            kind = r.headers.get("Content-Type", "")
            if "pdf" in kind or body[:5] == b"%PDF-":
                # Optional: PDFs are read only where the pdftotext program (poppler) is installed.
                if not shutil.which("pdftotext"):
                    return r.status, ""
                out = subprocess.run(["pdftotext", "-q", "-", "-"], input=body, capture_output=True, timeout=60).stdout
                return r.status, norm(out.decode("utf-8", "replace"))
            if "html" not in kind and "text" not in kind and "json" not in kind:
                return r.status, ""  # an image or a download: needs a human or an HTML mirror
            return r.status, page_text(body.decode(r.headers.get_content_charset() or "utf-8", "replace"))
    except Exception as e:  # network errors are a result, not a crash
        return getattr(e, "code", 0) or 0, ""


WIRES = {"associated press": "ap", "ap": "ap", "reuters": "reuters", "afp": "afp", "agence france-presse": "afp"}
WIRE_IN_NAME = re.compile(r"\((?:via |from )?(associated press|ap|reuters|afp|agence france-presse)\)", re.I)


def origin(s):
    """Where a source's words come from. Outlets that carry the same news agency's story are one source."""
    wire = (s.get("wire") or "").strip().lower()
    return "wire:" + WIRES.get(wire, wire) if wire else urlparse(s.get("url", "")).netloc.removeprefix("www.")


def key(url, quote):
    return hashlib.sha256(f"{url}\n{norm(quote)}".encode()).hexdigest()[:16]


WAYBACK = "https://web.archive.org/web/"


def read(url, archive=""):
    """Try the page, then its archived copy. Many publishers refuse scripts; the archive also keeps the
    page as it was on the day we quoted it."""
    status, text = fetch(url)
    if not text:
        _, text = fetch(archive or WAYBACK + "2/" + url)
    return status, text


def quoted(card):
    """Every (where, url, quote, archive) in a card: the claim as its proponents state it, and each
    fact's sources."""
    for i, h in enumerate(card.get("heard") or []):
        yield f"heard[{i}]", h.get("url", ""), h.get("quote", ""), h.get("archive", "")
    for i, f in enumerate(card.get("facts") or []):
        for j, s in enumerate(f.get("sources") or []):
            yield f"facts[{i}].sources[{j}]", s.get("url", ""), s.get("quote", ""), s.get("archive", "")
    for i, c in enumerate(card.get("contested") or []):  # a disputed position, in the words of someone who holds it
        for j, s in enumerate(c.get("sources") or [] if isinstance(c, dict) else []):
            yield f"contested[{i}].sources[{j}]", s.get("url", ""), s.get("quote", ""), s.get("archive", "")


def check_card(card, name, lock):
    e = []
    need = {"id": str, "era": int, "claim": str, "heard": list, "answer": str, "facts": list,
            "contested": list, "not_claimed": list, "status": str, "content_approved": bool}
    for k, t in need.items():
        if not isinstance(card.get(k), t):
            e.append(f"{k}: missing or not {t.__name__}")
    if e:
        return e
    if card["id"] != name:
        e.append(f"id '{card['id']}' must match the file name '{name}'")
    if card["era"] not in CHAPTERS:
        e.append(f"era must be a chapter number, 1 to {max(CHAPTERS)}")
    if len(card["answer"].split()) > 150:
        e.append("answer is over 150 words; a parent must be able to say it in two minutes")
    if not card["heard"]:
        e.append("heard: quote the claim from someone who makes it (no strawmen)")
    if len(card["facts"]) < 2:
        e.append("needs at least two facts")
    if not card["not_claimed"]:
        e.append("not_claimed: say what this card does not claim")
    if re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", json.dumps(card, ensure_ascii=False)):
        e.append("an email address is in the card; no personal data in this repository")
    for bad in BANNED:
        if bad in json.dumps(card, ensure_ascii=False).lower():
            e.append(f"banned word: {bad}")
    for i, f in enumerate(card["facts"]):
        src = f.get("sources") or []
        if not f.get("text"):
            e.append(f"facts[{i}]: no text")
        if len({origin(s) for s in src}) < 2:
            e.append(f"facts[{i}]: needs two sources from different sites (one agency story on two sites is one source)")
        if src and all(s.get("kind") in PARTISAN for s in src):
            e.append(f"facts[{i}]: every source is a government or an advocacy group; add an independent one")
        for j, s in enumerate(src):
            w = f"facts[{i}].sources[{j}]"
            if s.get("kind") not in KINDS:
                e.append(f"{w}: kind must be one of {sorted(KINDS)}")
            if not s.get("publisher") or not s.get("title"):
                e.append(f"{w}: publisher and title are required")
            m = WIRE_IN_NAME.search(s.get("publisher", ""))
            if m and not s.get("wire"):
                e.append(f'{w}: the publisher names a news agency; add "wire": "{WIRES[m.group(1).lower()].upper()}" so it is not counted twice')
            try:
                date.fromisoformat(s.get("accessed", ""))
            except ValueError:
                e.append(f"{w}: accessed must be a date, YYYY-MM-DD")
    for where, url, quote, archive in quoted(card):
        if urlparse(url).scheme != "https":
            e.append(f"{where}: url must be https")
        if urlparse(url).netloc.endswith("wikipedia.org"):
            e.append(f"{where}: Wikipedia is a way to find sources, not a source; cite what it cites")
        if archive and not archive.startswith(WAYBACK):
            e.append(f"{where}: archive must be a {WAYBACK} link")
        if not 5 <= len(quote.split()) <= 40:
            e.append(f"{where}: quote must be 5 to 40 words, copied exactly from the page")
    if card["status"] not in ("draft", "verified"):
        e.append("status must be draft or verified")
    if card["status"] == "verified":
        review = card.get("review") or {}
        for who in ("skeptic", "citer"):  # two independent readers; neither wrote the card
            if (review.get(who) or {}).get("verdict") != "holds":
                e.append(f"verified needs review.{who}.verdict = holds, from an agent that did not write the card")
        for i, f in enumerate(card["facts"]):
            sites = {origin(s) for s in f.get("sources") or [] if s.get("kind") in RELIABLE}
            if len(sites) < 3:
                e.append(f"facts[{i}]: verified needs three reliable, independent sources (has {len(sites)}); governments and "
                         "advocacy groups do not count, and one agency story on several sites counts once")
        for i, c in enumerate(card["contested"]):
            if not (isinstance(c, dict) and c.get("text") and c.get("sources")):
                e.append(f"contested[{i}]: verified needs each disputed position as {{text, sources}}, quoted from "
                         "someone who holds it; a position we only remember goes in could_not_verify")
        if not isinstance(card.get("could_not_verify"), list):
            e.append("verified needs could_not_verify: what was looked for and not found (an empty list if nothing)")
        claims = card.get("answer_claims") or []
        if norm(" ".join(c.get("says", "") for c in claims)) != norm(card["answer"]):
            e.append("verified needs answer_claims: the answer split into sentences, in order, with nothing left out")
        for i, c in enumerate(claims):
            idx = c.get("facts") or []
            if not idx or any(not isinstance(k, int) or not 0 <= k < len(card["facts"]) for k in idx):
                e.append(f"answer_claims[{i}]: must name the facts that support it; a sentence no fact supports is removed")
        for where, url, quote, _ in quoted(card):
            if lock.get(key(url, quote), {}).get("result") != "found":
                e.append(f"{where}: verified needs the quote found on the page (run --online)")
    return e


def cards(folder=FACTS):
    for f in sorted(os.listdir(folder)):
        if f.endswith(".json") and f != "verified.lock.json":
            try:
                yield f[:-5], json.load(open(os.path.join(folder, f), encoding="utf-8"))
            except ValueError as err:
                yield f[:-5], {"_broken": str(err)}


def load_lock(path=LOCK):
    return json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {}


def run(folder=FACTS, online=False, out=print, prefix=""):
    """prefix: check only cards whose id starts with it, so agents on different eras do not trip on each other."""
    lock_path = os.path.join(folder, "verified.lock.json")
    lock, mine = load_lock(lock_path), {}
    failed = n = 0
    for name, card in cards(folder):
        if not name.startswith(prefix):
            continue
        n += 1
        errs = [f"not valid JSON: {card['_broken']}"] if "_broken" in card else []
        if online and not errs:
            for where, url, quote, archive in quoted(card):
                status, text = read(url, archive)
                result = "found" if text and norm(quote) in text else "missing" if text else "unreachable"
                k = key(url, quote)
                if result == "unreachable" and lock.get(k, {}).get("result") == "found":
                    out(f"  warn {name} {where}: could not read {url} today; keeping the quote found on {lock[k]['checked']}")
                    continue  # a page that will not load today is not evidence that the quote is gone
                lock[k] = mine[k] = {"url": url, "result": result, "http": status, "checked": date.today().isoformat()}
                if result == "missing":
                    errs.append(f"{where}: the quote is not on the page {url}")
                elif result == "unreachable":
                    out(f"  warn {name} {where}: could not read {url} (http {status}); the card stays a draft")
        errs += [] if "_broken" in card else check_card(card, name, lock)
        failed += bool(errs)
        for x in errs:
            out(f"FAIL {name}: {x}")
    if online:  # re-read before writing: another agent may have added its own results meanwhile
        json.dump({**load_lock(lock_path), **mine}, open(lock_path, "w", encoding="utf-8"), indent=1, sort_keys=True)
    mine = [c for name, c in cards(folder) if name.startswith(prefix) and "_broken" not in c]
    verified = sum(c.get("status") == "verified" for c in mine)
    facts = [f for c in mine for f in c.get("facts") or []]
    three = sum(len({origin(s) for s in f.get("sources") or [] if s.get("kind") in RELIABLE}) >= 3 for f in facts)
    out(f"{'FAILED' if failed else 'ok'}: {n} cards, {verified} verified, {failed} failing; "
        f"{three} of {len(facts)} facts have three reliable sources")
    return failed


def render():
    lines = ["# The fact base", "", "Generated by `python3 tools/factcheck.py render`. Do not edit by hand.", ""]
    for name, c in cards():
        if "_broken" in c:
            continue
        lines += [f"## {c['claim']}", "", f"`{name}` · {CHAPTERS[c['era']]} · **{c['status']}**"
                  + ("" if c["content_approved"] else " · content not yet approved"), "", c["answer"], ""]
        for f in c["facts"]:
            links = "; ".join(f"[{s['publisher']}]({s['url']})" for s in f["sources"])
            lines.append(f"- {f['text']} ({links})")
        lines += ["", "**Where the record is contested**", ""] + [
            "- " + (x if isinstance(x, str) else x["text"] + " (" + "; ".join(f"[{s['publisher']}]({s['url']})" for s in x["sources"]) + ")")
            for x in c["contested"] or ["Nothing recorded yet."]]
        lines += ["", "**What this card does not claim**", ""] + [f"- {x}" for x in c["not_claimed"]] + [""]
    open(os.path.join(ROOT, "FACTS.md"), "w", encoding="utf-8").write("\n".join(lines))


def selftest():
    import tempfile
    src = lambda host, kind="reference": {"publisher": "P", "title": "T", "url": f"https://{host}/a", "quote": "five words are the minimum here",
                                           "accessed": "2026-11-20", "kind": kind}
    good = {"id": "good", "era": 3, "claim": "c", "heard": [{"who": "w", "url": "https://x.org/a", "quote": "a claim stated by its proponents"}],
            "answer": "a", "facts": [{"text": "t", "sources": [src("a.org"), src("b.org")]}, {"text": "u", "sources": [src("a.org"), src("c.org")]}],
            "contested": [], "not_claimed": ["n"], "status": "draft", "content_approved": False}
    bad = {
        "one site": lambda c: c["facts"][0].update(sources=[src("a.org"), src("www.a.org")]),
        "only partisan": lambda c: c["facts"][0].update(sources=[src("a.org", "advocacy"), src("b.org", "government")]),
        "one fact": lambda c: c.update(facts=c["facts"][:1]),
        "no strawman guard": lambda c: c.update(heard=[]),
        "long quote": lambda c: c["heard"][0].update(quote="word " * 41),
        "verified without review": lambda c: c.update(status="verified"),
        "http": lambda c: c["heard"][0].update(url="http://x.org/a"),
        "a chapter that does not exist": lambda c: c.update(era=99),
        "wikipedia": lambda c: c["heard"][0].update(url="https://en.wikipedia.org/wiki/X"),
        "an email address": lambda c: c.update(answer="write to someone@example.org"),
    }
    assert check_card(good, "good", {}) == [], check_card(good, "good", {})
    three = lambda: [src("a.org"), src("b.org"), src("c.org")]
    ver = json.loads(json.dumps(good))
    ver.update(status="verified", answer="One thing. Another thing.", could_not_verify=[],
               facts=[{"text": "t", "sources": three()}, {"text": "u", "sources": three()}],
               answer_claims=[{"says": "One thing.", "facts": [0]}, {"says": "Another thing.", "facts": [0, 1]}],
               review={"skeptic": {"verdict": "holds"}, "citer": {"verdict": "holds"}})
    lock = {key(u, q): {"result": "found"} for _, u, q, _ in quoted(ver)}
    assert check_card(ver, "good", lock) == [], check_card(ver, "good", lock)
    bad_ver = {
        "one agency story on three sites": lambda c: [s.update(wire="AP") for s in c["facts"][0]["sources"]],
        "an agency named in the publisher but not declared": lambda c: c["facts"][0]["sources"][0].update(publisher="PBS NewsHour (Associated Press)"),
        "two reliable sources": lambda c: c["facts"][0].update(sources=[src("a.org"), src("b.org"), src("c.org", "advocacy")]),
        "one reader": lambda c: c["review"].pop("citer"),
        "skeptic says weakened": lambda c: c["review"]["skeptic"].update(verdict="weakened"),
        "answer sentence with no fact": lambda c: c["answer_claims"][1].update(facts=[]),
        "answer sentence left out": lambda c: c["answer_claims"].pop(),
        "no could_not_verify": lambda c: c.pop("could_not_verify"),
        "a disputed position with no quoted source": lambda c: c.update(contested=["Some historians disagree."]),
        "quote changed after it was checked": lambda c: c["facts"][0]["sources"][0].update(quote="five other words were swapped in"),
    }
    for why, breakit in bad_ver.items():
        c = json.loads(json.dumps(ver))
        breakit(c)
        assert check_card(c, "good", lock), f"the gate let a verified card through: {why}"
    for why, breakit in bad.items():
        c = json.loads(json.dumps(good))
        breakit(c)
        assert check_card(c, "good", {}), f"the gate let through: {why}"
    with tempfile.TemporaryDirectory() as d:
        json.dump(good, open(os.path.join(d, "good.json"), "w"))
        assert run(d, out=lambda *_: None) == 0
        open(os.path.join(d, "broken.json"), "w").write("{")
        assert run(d, out=lambda *_: None) == 1
    for name, card in cards():  # the smoke-alarm test, on the real cards
        if "_broken" in card or check_card(card, name, load_lock()):
            continue
        m = json.loads(json.dumps(card))
        m["facts"][0]["sources"] = m["facts"][0]["sources"][:1]
        assert check_card(m, name, load_lock()), f"{name}: dropping sources went unnoticed"
        if card["status"] == "verified":
            m = json.loads(json.dumps(card))
            m["facts"][0]["sources"][0]["quote"] += " and one more word"
            assert check_card(m, name, load_lock()), f"{name}: an edited quote went unnoticed"
    import random
    seed = random.randrange(10**9)
    rnd = random.Random(seed)
    alphabet = list("abcdefghij ABC 0123 .,;:!?()&'\"") + ["\u2018", "\u2019", "\u201c", "\u201d", "\u2013", "\u2014", "\u00a0", "\n", "\t", "  ", "é", "ש", "&amp;", "&lt;", "&#39;"]
    for _ in range(2000):
        t = "".join(rnd.choice(alphabet) for _ in range(rnd.randrange(1, 200)))
        assert norm(norm(t)) == norm(t), f"norm is not idempotent (seed {seed}): {t!r}"
        assert key("https://a.org/x", t) == key("https://a.org/x", "  " + t.replace(" ", " \n ") + " "), f"key depends on spacing (seed {seed})"
        words = norm(t).split()
        if len(words) >= 5:  # a quote copied from what `fetch` prints is always found again on that page
            i = rnd.randrange(0, len(words) - 4)
            quote = " ".join(words[i:i + rnd.randrange(5, 41)])
            page = f"<html><script>var x = 1 < 2;</script><p class='a'>{html.escape(t)}</p></html>"
            assert norm(quote) in page_text(page), f"a copied quote was not found (seed {seed}): {quote!r}"
    assert norm("“Smart” quotes — and  spaces") == '"smart" quotes - and spaces'
    assert "hidden" not in page_text("<p>Shown</p><script>hidden</script>") and "shown" in page_text("<p>Shown</p>")
    print("ok: factcheck selftest")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "selftest":
        selftest()
    elif cmd == "render":
        render()
    elif cmd == "fetch":
        status, text = read(sys.argv[2])
        print(text if text else f"could not read the page (http {status})")
    else:
        args = [a for a in sys.argv[1:] if a != "--online"]
        sys.exit(1 if run(online="--online" in sys.argv, prefix=args[0] if args else "") else 0)
