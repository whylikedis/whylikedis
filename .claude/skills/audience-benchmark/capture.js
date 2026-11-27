// Read one home page: what it says, what it asks for, and how it looks.
// Paste into the browser's JavaScript tool on the loaded page. It only reads the page.
(() => {
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return (
      r.width > 0 &&
      r.height > 0 &&
      s.visibility !== 'hidden' &&
      s.display !== 'none'
    );
  };
  const txt = (el) =>
    (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  const uniq = (a) => [...new Set(a.filter(Boolean))];
  const meta = (n) =>
    document.querySelector(`meta[name="${n}"],meta[property="${n}"]`)
      ?.content || '';
  const heads = (tag) =>
    uniq([...document.querySelectorAll(tag)].filter(vis).map(txt)).slice(0, 14);
  const nav = uniq(
    [...document.querySelectorAll('header a, nav a')]
      .filter(vis)
      .map(txt)
      .filter((t) => t.length < 40),
  ).slice(0, 30);
  const ctas = uniq(
    [...document.querySelectorAll('a,button')]
      .filter(vis)
      .filter((el) => {
        const s = getComputedStyle(el);
        return (
          s.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
          s.backgroundColor !== 'transparent' &&
          txt(el).length > 1 &&
          txt(el).length < 40
        );
      })
      .map((el) => txt(el) + ' [' + getComputedStyle(el).backgroundColor + ']'),
  ).slice(0, 20);
  const colors = {},
    fonts = {};
  [...document.querySelectorAll('body *')]
    .slice(0, 4000)
    .filter(vis)
    .forEach((el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const area = Math.min(r.width * r.height, 2e5);
      if (
        s.backgroundColor &&
        !s.backgroundColor.includes(', 0)') &&
        s.backgroundColor !== 'transparent'
      )
        colors['bg ' + s.backgroundColor] =
          (colors['bg ' + s.backgroundColor] || 0) + area;
      if (el.childNodes[0]?.nodeType === 3 && txt(el)) {
        colors['fg ' + s.color] =
          (colors['fg ' + s.color] || 0) + txt(el).length;
        fonts[s.fontFamily.split(',')[0]] =
          (fonts[s.fontFamily.split(',')[0]] || 0) + txt(el).length;
      }
    });
  const top = (o, n) =>
    Object.entries(o)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k]) => k);
  const h1 = document.querySelector('h1');
  const body = document.body.innerText;
  const has = (re) => re.test(body);
  return {
    url: location.href,
    title: document.title,
    description: meta('description') || meta('og:description'),
    h1: heads('h1'),
    h2: heads('h2'),
    h3: heads('h3').slice(0, 10),
    nav,
    ctas,
    bg: top(
      Object.fromEntries(
        Object.entries(colors).filter(([k]) => k.startsWith('bg')),
      ),
      6,
    ),
    fg: top(
      Object.fromEntries(
        Object.entries(colors).filter(([k]) => k.startsWith('fg')),
      ),
      4,
    ),
    fonts: top(fonts, 5),
    h1font: h1
      ? getComputedStyle(h1).fontFamily.split(',')[0] +
        ' ' +
        getComputedStyle(h1).fontWeight +
        ' ' +
        getComputedStyle(h1).fontSize
      : '',
    images: document.images.length,
    videos: document.querySelectorAll(
      'video, iframe[src*="youtube"], iframe[src*="vimeo"]',
    ).length,
    forms: document.querySelectorAll('form').length,
    inputsEmail: document.querySelectorAll('input[type=email]').length,
    social: uniq(
      [...document.querySelectorAll('a[href]')].map(
        (a) =>
          (a.href.match(
            /(facebook|instagram|x\.com|twitter|tiktok|youtube|linkedin|threads|whatsapp|spotify|podcasts\.apple)/,
          ) || [])[1],
      ),
    ),
    signals: {
      donate: has(/donat|give now|give today/i),
      newsletter: has(/newsletter|sign up|subscribe/i),
      quiz: has(/quiz/i),
      podcast: has(/podcast/i),
      events: has(/event/i),
      store: has(/shop|store/i),
      petition: has(/petition|take action|act now/i),
      educators: has(/educator|teacher|curricul|lesson/i),
      parents: has(/parent|famil/i),
      students: has(/student|campus/i),
      myths: has(/myth|fact/i),
      antisemitism: has(/antisemitism/i),
    },
    words: body.split(/\s+/).length,
    sample: body.replace(/\s+/g, ' ').slice(0, 1500),
  };
})();
