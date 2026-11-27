import type { MetadataRoute } from 'next';
import { HELD_DOCS } from '@whylikedis/content';

export const dynamic = 'force-static';

// What a crawler may read: the public pages. Everything a reader needs an account for, the live
// rooms, the share landing pages, and every doc still held back (HELD_DOCS: not approved) are
// kept out. The sitemap lists only what is public.
// The site also says `noindex` in its headers and metadata until both founders approve it; this
// file does not change that.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/account/',
        '/sign-in/',
        '/auth/',
        '/play/',
        '/share/',
        ...[...HELD_DOCS].map((doc) => `/${doc}/`),
      ],
    },
    sitemap: 'https://www.whylikedis.fyi/sitemap.xml',
  };
}
