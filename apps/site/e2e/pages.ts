// Every page of the site, as the browser checks see it. A page added under app/ without an entry
// here fails `every page under app/ is checked` in pages.spec.ts, so no page goes unchecked.
import { readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { HELD_DOCS } from '@whylikedis/content';
import { SHARE_RESULT_SLUGS } from '@whylikedis/games';

const here = join(__dirname, '..');
const site = JSON.parse(readFileSync(join(here, 'data/site.json'), 'utf8')) as {
  cards: { id: string; status: string }[];
  docs: Record<string, unknown>;
};

export type Page = {
  /** Short name, used in test titles and screenshot names. */
  name: string;
  path: string;
  /** The app/ route this page comes from. */
  route: string;
  /** Screenshot it (one page per dynamic route is enough for pixels). */
  visual: boolean;
};

const answers = site.cards
  .filter((c) => c.status === 'verified')
  .map((c) => c.id);
// A held doc (not approved yet) has no page, as in app/data.ts.
const docs = Object.keys(site.docs).filter((d) => !HELD_DOCS.has(d));

export const PAGES: Page[] = [
  { name: 'home', path: '/', route: '/', visual: true },
  { name: 'facts', path: '/facts/', route: '/facts', visual: true },
  ...answers.map((id, i) => ({
    name: `answer-${id}`,
    path: `/answers/${id}/`,
    route: '/answers/[id]',
    visual: i === 0,
  })),
  ...docs.map((doc) => ({
    name: `doc-${doc}`,
    path: `/${doc}/`,
    route: '/[doc]',
    visual: true,
  })),
  {
    name: 'how-we-check',
    path: '/how-we-check/',
    route: '/how-we-check',
    visual: true,
  },
  { name: 'daily', path: '/daily/', route: '/daily', visual: true },
  {
    name: 'practice',
    path: '/daily/practice/',
    route: '/daily/practice',
    visual: true,
  },
  // Where a shared daily result lands: one per result, the same page with other words.
  ...SHARE_RESULT_SLUGS.map((slug, i) => ({
    name: `shared-${slug}`,
    path: `/daily/s/${slug}/`,
    route: '/daily/s/[result]',
    visual: i === 0,
  })),
  { name: 'updates', path: '/updates/', route: '/updates', visual: true },
  { name: 'sessions', path: '/sessions/', route: '/sessions', visual: true },
  { name: 'sign-in', path: '/sign-in/', route: '/sign-in', visual: true },
  // Signed out, the account page sends the reader to sign in; signed in is in journeys.spec.ts.
  { name: 'account', path: '/account/', route: '/account', visual: false },
  {
    name: 'not-found',
    path: '/no-such-page/',
    route: '/_not-found',
    visual: true,
  },
];

/** Every page route under app/, as `/daily/practice` or `/answers/[id]`, and its 404 page. */
export function appRoutes(): string[] {
  const app = join(here, 'app');
  return readdirSync(app, { recursive: true })
    .map(String)
    .flatMap((f) => {
      if (f === 'not-found.tsx') return ['/_not-found'];
      if (f !== 'page.tsx' && !f.endsWith(`${sep}page.tsx`)) return [];
      return ['/' + f.split(sep).slice(0, -1).join('/')];
    })
    .sort();
}
