import { appPack } from '@whylikedis/content';
import type { ReplyCard } from '@whylikedis/games';
import { Section } from '@/components/ui/section';
import { pageMeta } from '@/lib/share-image';
import { PREVIEW, site } from '../../data';
import { shareOf } from '../../share-cards';
import { HOST_TITLE, PLAY_DESCRIPTION } from '../copy';
import { HostRoom } from './host-room';

export const metadata = pageMeta({
  title: HOST_TITLE,
  description: PLAY_DESCRIPTION,
  path: '/play/host/',
  share: shareOf('play'),
});

// The same shown cards as the app and the daily question. The game itself keeps only verified
// ones, so a preview build's drafts never reach a room.
const cards: ReplyCard[] = appPack(site, { preview: PREVIEW }).cards.map(
  (c) => ({
    id: c.id,
    claim: c.claim,
    chapter: c.chapter,
    verified: c.verified,
    lines: c.lines.map((l) => ({
      says: l.says,
      sources: l.sources.map((s) => ({ publisher: s.publisher, url: s.url })),
    })),
  }),
);

export default function Host() {
  return (
    <Section container="wide" spacing="tight">
      <HostRoom cards={cards} />
    </Section>
  );
}
