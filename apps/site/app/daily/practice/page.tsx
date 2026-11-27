import { Section } from '@/components/ui/section';
import { pageMeta } from '@/lib/share-image';
import { shareOf } from '../../share-cards';
import { practiceCards } from '../cards';
import { PracticeRound } from './practice-round';

export const metadata = pageMeta({
  title: 'Practice: What would you say?',
  description:
    'A few questions in a row, the ones you have not got yet first. Reviewed answers only.',
  path: '/daily/practice/',
  share: shareOf('daily'),
});

export default function Practice() {
  return (
    <Section container="content" spacing="tight">
      <PracticeRound cards={practiceCards} />
    </Section>
  );
}
