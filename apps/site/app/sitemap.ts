import type { MetadataRoute } from 'next';
import { shownCards } from './answer-parts';
import { site } from './data';

export const dynamic = 'force-static';

const ORIGIN = 'https://www.whylikedis.fyi';

// The public pages and nothing else: the answers that are verified (shownCards), and the docs
// that are not held back (site.docs already leaves HELD_DOCS out). Accounts, sign in, live rooms
// and share landing pages are not listed.
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    '/',
    '/facts/',
    '/how-we-check/',
    '/daily/',
    '/updates/',
    '/sessions/',
    ...Object.keys(site.docs).map((doc) => `/${doc}/`),
    ...[...new Set(shownCards().map((c) => c.id))].map(
      (id) => `/answers/${id}/`,
    ),
  ];
  return paths.map((path) => ({ url: `${ORIGIN}${path}` }));
}
