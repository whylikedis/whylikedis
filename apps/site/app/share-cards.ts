import type { ShareImageProps } from '@/components/ui/patterns/share-image';
import { answerLines, quoteCount, shownCards, sourceMix } from './answer-parts';
import { site } from './data';
import { docLead } from './doc-lead';
import { FACTS_DESCRIPTION, FACTS_TITLE } from './facts/copy';
import { HOME_DESCRIPTION, HOME_TITLE } from './home-copy';
import { DAILY_DESCRIPTION, DAILY_TITLE } from './daily/copy';
import { SESSIONS_DESCRIPTION, SESSIONS_TITLE } from './sessions/copy';
import { UPDATES_DESCRIPTION, UPDATES_TITLE } from './updates/copy';
import { HOW_DESCRIPTION, HOW_TITLE } from './how-we-check/copy';

// What each page's share image says. A page is named by its path without slashes: '' is the home
// page, 'facts' the answers index, 'answers/<id>' an answer, '<doc>' a guide.
export type ShareCard = {
  alt: string;
  props: Omit<ShareImageProps, 'theme' | 'brand' | 'site' | 'size'>;
};

// The bars sit beside the title, so each kind of source gets its short name there.
const SHORT: Record<string, string> = {
  'from the record itself': 'The record itself',
  'from scholars and reference works': 'Scholars, references',
  'from news reports': 'News reports',
  'from advocacy groups': 'Advocacy groups',
};

function home(): ShareCard {
  return {
    alt: 'WhyLikeDIs: clear answers about Israel, each with sources you can check',
    props: {
      kicker: 'Say it straight',
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      bars: sourceMix().map((k) => ({
        label: SHORT[k.label] ?? k.label,
        value: k.n,
        display: String(k.n),
      })),
      footnote: 'Quotes in our answers, by source',
    },
  };
}

function facts(): ShareCard {
  const cards = shownCards();
  return {
    alt: 'WhyLikeDIs answers, each with the exact words quoted from its sources',
    props: {
      label: 'The record',
      kicker: 'Answers',
      title: FACTS_TITLE,
      description: FACTS_DESCRIPTION,
      stat: {
        value: String(cards.reduce((n, c) => n + quoteCount(c), 0)),
        label: 'quotes from the sources, word for word',
      },
      footnote: `${cards.length} answers checked by a second reader`,
    },
  };
}

// The claim is shown as the child heard it, in quotes, so it never reads as our own words.
function answer(id: string): ShareCard | null {
  const c = shownCards().find((x) => x.id === id);
  if (!c) return null;
  return {
    alt: `What your kid heard: “${c.claim}” An answer from WhyLikeDIs, with its sources`,
    props: {
      label: `Chapter ${c.era}`,
      kicker: 'Your kid heard',
      title: `“${c.claim}”`,
      description: answerLines(c)[0]?.says,
      footnote: `${c.facts.length} facts · ${quoteCount(c)} sources quoted`,
    },
  };
}

function guide(doc: string): ShareCard | null {
  const d = site.docs[doc];
  if (!d) return null;
  return {
    alt: `${d.title}, from WhyLikeDIs`,
    props: {
      label: 'Guide',
      kicker: 'WhyLikeDIs',
      title: d.title,
      description: docLead(doc),
    },
  };
}

function sessions(): ShareCard {
  return {
    alt: `${SESSIONS_TITLE}, from WhyLikeDIs`,
    props: {
      label: 'Sessions',
      kicker: 'WhyLikeDIs',
      title: SESSIONS_TITLE,
      description: SESSIONS_DESCRIPTION,
    },
  };
}

function daily(): ShareCard {
  return {
    alt: `${DAILY_TITLE} A daily question from WhyLikeDIs`,
    props: {
      label: 'Every day',
      kicker: 'WhyLikeDIs',
      title: DAILY_TITLE,
      description: DAILY_DESCRIPTION,
    },
  };
}

function updates(): ShareCard {
  return {
    alt: `${UPDATES_TITLE} at WhyLikeDIs`,
    props: {
      label: 'Updates',
      kicker: 'WhyLikeDIs',
      title: UPDATES_TITLE,
      description: UPDATES_DESCRIPTION,
    },
  };
}

function howWeCheck(): ShareCard {
  return {
    alt: `${HOW_TITLE}, at WhyLikeDIs`,
    props: {
      label: 'How we check',
      kicker: 'WhyLikeDIs',
      title: HOW_TITLE,
      description: HOW_DESCRIPTION,
    },
  };
}

export function shareCard(page: string): ShareCard | null {
  if (page === 'how-we-check') return howWeCheck();
  if (page === 'daily') return daily();
  if (page === 'updates') return updates();
  if (page === '') return home();
  if (page === 'sessions') return sessions();
  if (page === 'facts') return facts();
  if (page.startsWith('answers/')) return answer(page.slice('answers/'.length));
  return page.includes('/') ? null : guide(page);
}

export const sharePages = () => [
  '',
  'facts',
  'sessions',
  'daily',
  'updates',
  'how-we-check',
  ...shownCards().map((c) => `answers/${c.id}`),
  ...Object.keys(site.docs),
];

/** A page's share image, for its metadata: its name and alt text. */
export function shareOf(page: string) {
  return { page, alt: shareCard(page)?.alt ?? 'WhyLikeDIs' };
}
