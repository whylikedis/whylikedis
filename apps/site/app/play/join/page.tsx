import { Section } from '@/components/ui/section';
import { pageMeta } from '@/lib/share-image';
import { shareOf } from '../../share-cards';
import { JOIN_TITLE, PLAY_DESCRIPTION } from '../copy';
import { PlayerRoom } from './player-room';

export const metadata = pageMeta({
  title: JOIN_TITLE,
  description: PLAY_DESCRIPTION,
  path: '/play/join/',
  share: shareOf('play'),
});

export default async function Join({
  searchParams,
}: {
  searchParams: Promise<{ code?: string | string[] }>;
}) {
  const { code } = await searchParams;
  return (
    <Section container="content" spacing="tight">
      <PlayerRoom initialCode={typeof code === 'string' ? code : null} />
    </Section>
  );
}
