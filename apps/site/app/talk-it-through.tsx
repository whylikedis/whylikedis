import Link from 'next/link';
import { Typography } from '@/components/ui/typography';

// One plain line after an answer: a group that would rather talk it through finds the sessions page.
export function TalkItThrough({ where }: { where: string }) {
  return (
    <Typography variant="ui" tone="muted">
      Want to talk this through with your group?{' '}
      <Link
        href="/sessions/"
        className="text-primary font-medium underline underline-offset-4"
        data-intent={`${where}_talk_it_through`}
      >
        See sessions
      </Link>
      .
    </Typography>
  );
}
