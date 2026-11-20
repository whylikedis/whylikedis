#!/usr/bin/env python3
"""The fact base's gate. No dependencies.

    python3 tools/factcheck.py              check every card in facts/ (offline, exits 1 on failure)
    python3 tools/factcheck.py --online     also fetch every source and look for its quote on the page
    python3 tools/factcheck.py [--online] era3   only the cards whose id starts with "era3"
    python3 tools/factcheck.py fetch URL    print a page as the checker reads it (agents quote from this)
    python3 tools/factcheck.py render       write FACTS.md, the readable view of every card
    python3 tools/factcheck.py selftest     prove the gate fails on a bad card
"""
import hashlib, html, json, os, re, sys, urllib.request
from datetime import date
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FACTS = os.path.join(ROOT, "facts")
LOCK = os.path.join(FACTS, "verified.lock.json")
KINDS = {"primary", "scholarly", "reference", "news", "government", "advocacy"}
PARTISAN = {"government", "advocacy"}  # fine as one voice, never the only support for a fact
ERAS = range(1, 9)
BANNED = ["hasbara"]


def norm(text):
    """One spelling for comparing a quote with a page: lower case, plain quotes and dashes, single spaces."""
    text = html.unescape(text)
    for a, b in (("‘", "'"), ("’", "'"), ("“", '"'), ("”", '"'), ("–", "-"), ("—", "-"), (" ", " ")):
        text = text.replace(a, b)
    return re.sub(r"\s+", " ", text).strip().lower()


def page_text(raw):
    raw = re.sub(r"(?is)<(script|style|noscript)\b.*?</\1>", " ", raw)
    return norm(re.sub(r"(?s)<[^>]+>", " ", raw))


def fetch(url):
    """(status, text). Only https; a browser-like agent string because many archives refuse the default one."""
    if urlparse(url).scheme != "https":
        return 0, ""
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; factcheck/0)", "Accept": "text/html,*/*"})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            body = r.read(4_000_000)
            kind = r.headers.get("Content-Type", "")
            if "html" not in kind and "text" not in kind and "json" not in kind:
                return r.status, ""  # a PDF or image: needs a human or an HTML mirror
            return r.status, page_text(body.decode(r.headers.get_content_charset() or "utf-8", "replace"))
    except Exception as e:  # network errors are a result, not a crash
        return getattr(e, "code", 0) or 0, ""


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
    if card["era"] not in ERAS:
        e.append("era must be 1 to 8")
    if len(card["answer"].split()) > 150:
        e.append("answer is over 150 words; a parent must be able to say it in two minutes")
    if not card["heard"]:
        e.append("heard: quote the claim from someone who makes it (no strawmen)")
    if len(card["facts"]) < 2:
        e.append("needs at least two facts")
    if not card["not_claimed"]:
        e.append("not_claimed: say what this card does not claim")
    for bad in BANNED:
        if bad in json.dumps(card, ensure_ascii=False).lower():
            e.append(f"banned word: {bad}")
    for i, f in enumerate(card["facts"]):
        src = f.get("sources") or []
        if not f.get("text"):
            e.append(f"facts[{i}]: no text")
        if len({urlparse(s.get("url", "")).netloc.removeprefix("www.") for s in src}) < 2:
            e.append(f"facts[{i}]: needs two sources from different sites")
        if src and all(s.get("kind") in PARTISAN for s in src):
            e.append(f"facts[{i}]: every source is a government or an advocacy group; add an independent one")
        for j, s in enumerate(src):
            w = f"facts[{i}].sources[{j}]"
            if s.get("kind") not in KINDS:
                e.append(f"{w}: kind must be one of {sorted(KINDS)}")
            if not s.get("publisher") or not s.get("title"):
                e.append(f"{w}: publisher and title are required")
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
        if (card.get("review") or {}).get("skeptic", {}).get("verdict") != "holds":
            e.append("verified needs review.skeptic.verdict = holds, from an agent that did not write the card")
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
                lock[key(url, quote)] = mine[key(url, quote)] = {"url": url, "result": result, "http": status, "checked": date.today().isoformat()}
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
    verified = sum(c.get("status") == "verified" for _, c in cards(folder))
    out(f"{'FAILED' if failed else 'ok'}: {n} cards, {verified} verified, {failed} failing")
    return failed


def render():
    lines = ["# The fact base", "", "Generated by `python3 tools/factcheck.py render`. Do not edit by hand.", ""]
    for name, c in cards():
        if "_broken" in c:
            continue
        lines += [f"## {c['claim']}", "", f"`{name}` · era {c['era']} · **{c['status']}**"
                  + ("" if c["content_approved"] else " · content not yet approved"), "", c["answer"], ""]
        for f in c["facts"]:
            links = "; ".join(f"[{s['publisher']}]({s['url']})" for s in f["sources"])
            lines.append(f"- {f['text']} ({links})")
        lines += ["", "**Where the record is contested**", ""] + [f"- {x}" for x in c["contested"] or ["Nothing recorded yet."]]
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
        "wikipedia": lambda c: c["heard"][0].update(url="https://en.wikipedia.org/wiki/X"),
    }
    assert check_card(good, "good", {}) == [], check_card(good, "good", {})
    for why, breakit in bad.items():
        c = json.loads(json.dumps(good))
        breakit(c)
        assert check_card(c, "good", {}), f"the gate let through: {why}"
    with tempfile.TemporaryDirectory() as d:
        json.dump(good, open(os.path.join(d, "good.json"), "w"))
        assert run(d, out=lambda *_: None) == 0
        open(os.path.join(d, "broken.json"), "w").write("{")
        assert run(d, out=lambda *_: None) == 1
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
