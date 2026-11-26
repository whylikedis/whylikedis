// The answer side of a "What would you say?" card: the claim it checks, the reply in lines, the
// sources, and a link to the full answer. Shared by today's question and the practice round.
import Link from 'next/link';
import { Stack } from '@/components/ui/stack';
import { Typography } from '@/components/ui/typography';
import type { DailyCard } from './daily-question';

export function CardAnswer({ card }: { card: DailyCard }) {
  return (
    <Stack gap="sm">
      <Typography variant="h3" as="p">
        {card.claim}
      </Typography>
      {card.lines.map((line, i) => (
        <Typography key={i} variant="body">
          {line}
        </Typography>
      ))}
      {card.sources.length ? (
        <Typography variant="caption" tone="muted">
          Sources: {card.sources.join(', ')}
        </Typography>
      ) : null}
      {card.verified ? (
        <Link
          href={`/answers/${card.id}/`}
          className="text-primary text-sm font-medium underline underline-offset-4"
        >
          The full answer and every quote
        </Link>
      ) : null}
    </Stack>
  );
}

// Who makes the claim, and the claim in their words, in quotes: it is what people hear, which the
// answer checks, not ours.
export function heardOf(card: DailyCard) {
  return {
    who: card.heard?.who ? `${card.heard.who} says` : 'Someone says',
    prompt: card.heard ? `“${card.heard.quote}”` : `“${card.claim}”`,
  };
}
