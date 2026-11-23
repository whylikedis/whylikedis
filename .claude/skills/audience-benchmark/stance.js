// Find what a site says on each landscape axis: reads the page and up to 24 linked pages on the same site,
// and returns up to two sentences per axis with the page they came from. Keep AX in step with axes.json.
(async () => {
  const AX = {
    security:
      /right to exist|self-defen|defend itself|existential|security of israel|israel's security/i,
    us_aid:
      /security assistance|military aid|memorandum of understanding|\bMOU\b|iron dome|U\.S\.-Israel (alliance|relationship|partnership)/i,
    gaza_war: /humanitarian|civilian|ceasefire|cease-fire|hostage/i,
    genocide: /genocide/i,
    two_states: /two[- ]state|palestinian state|statehood|peace process/i,
    settlements:
      /settlement|settler|annex|west bank|judea and samaria|occupation/i,
    apartheid: /apartheid/i,
    israeli_government:
      /judicial|netanyahu|israeli democracy|israeli government|government of israel/i,
    religion_state:
      /pluralis|kotel|western wall|conversion|egalitarian|religion and state/i,
    antisemitism:
      /anti-?zionis|IHRA|working definition|\bBDS\b|boycott|divest/i,
    iran: /\biran/i,
    us_partisanship:
      /bipartisan|nonpartisan|non-partisan|democrats and republicans|both parties|\bPAC\b/i,
  };
  const KEY =
    /issue|polic|position|principle|mission|about|what-we|our-work|values|platform|faq|antisemit|campus|iran|israel|advocacy|agenda|believe|stand/i;
  const origin = location.origin;
  const extra = (window.__extra || []).map((p) => origin + p);
  const all = [
    ...new Set(
      [...document.querySelectorAll('a[href]')]
        .filter(
          (a) =>
            a.href.startsWith(origin) &&
            !/privacy|terms|cookie|login|donate|careers|contact|\.pdf|wp-content/i.test(
              a.href,
            ),
        )
        .map((a) => a.href.split('#')[0].split('?')[0]),
    ),
  ].filter((h) => h !== location.href);
  const links = [
    ...extra,
    ...all.filter((h) => KEY.test(h)),
    ...all.filter((h) => !KEY.test(h)),
  ].slice(0, 24);
  const pages = [location.href, ...links];
  const out = {};
  const seen = new Set();
  const read = [];
  const texts = await Promise.all(
    pages.map(async (url) => {
      try {
        const ctl = new AbortController();
        setTimeout(() => ctl.abort(), 15000);
        const html = (
          await (
            await fetch(url, { credentials: 'omit', signal: ctl.signal })
          ).text()
        ).replace(
          /<\/(p|div|h\d|li|a|span|section|td|button)>|<br\s*\/?>/gi,
          ' $& ',
        );
        const doc = new DOMParser().parseFromString(html, 'text/html');
        doc
          .querySelectorAll('script,style,nav,header,footer,noscript')
          .forEach((e) => e.remove());
        return [
          url,
          (doc.querySelector('main,article') || doc.body).textContent.replace(
            /\s+/g,
            ' ',
          ),
        ];
      } catch (e) {
        return [url, ''];
      }
    }),
  );
  for (const [url, text] of texts) {
    if (text) read.push(url);
    const sents = text.split(/(?<=[.!?])\s+/);
    for (const [ax, re] of Object.entries(AX)) {
      for (const s of sents) {
        if (s.length < 30 || s.length > 330 || !re.test(s) || seen.has(s))
          continue;
        out[ax] ||= [];
        if (out[ax].length >= 2) break;
        out[ax].push(url.replace(origin, '') + ' :: ' + s.trim());
        seen.add(s);
      }
    }
  }
  return { origin, pages: read.length, out };
})();
