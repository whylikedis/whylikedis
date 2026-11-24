'use client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { FeaturedIcon } from '@/components/ui/featured-icon';
import {
  ScrollStory,
  ScrollStoryStep,
} from '@/components/ui/patterns/scroll-story';
import { Stack } from '@/components/ui/stack';
import { Typography } from '@/components/ui/typography';
import { Ear, MessageCircle, MessagesSquare } from 'lucide-react';

const ICONS = [Ear, MessageCircle, MessagesSquare];

type Props = {
  steps: { kicker: string; title: string; body: string }[];
  // One real answer, word for word: the claim, its first line, its sources and what is argued.
  claim: string;
  says: string;
  sources: string[];
  argued?: string;
};

// The three steps of an answer, told on one real card that fills in as the reader scrolls:
// first what the kid heard, then what you say with its sources, then what is still argued.
export function HowItWorksStory({
  steps,
  claim,
  says,
  sources,
  argued,
}: Props) {
  const graphic = (step: number) => (
    <Card>
      <CardHeader>
        <Typography variant="ui-sm" tone="muted">
          Your kid heard
        </Typography>
        <Typography as="p" variant="h4">
          “{claim}”
        </Typography>
      </CardHeader>
      <CardContent>
        <Stack gap="md">
          {step >= 1 && (
            <Stack gap="xs">
              <Typography variant="ui-sm" tone="primary">
                You say
              </Typography>
              <Typography>{says}</Typography>
              <Typography variant="ui-sm" tone="muted">
                Sources: {sources.join(' · ')}
              </Typography>
            </Stack>
          )}
          {step >= 2 && argued && (
            <Stack gap="xs">
              <Typography variant="ui-sm" tone="primary">
                Still argued
              </Typography>
              <Typography tone="muted">{argued}</Typography>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
  return (
    <ScrollStory graphic={graphic} side="end">
      {steps.map((s, i) => {
        const Icon = ICONS[i] ?? Ear;
        return (
          <ScrollStoryStep key={s.kicker}>
            <Stack gap="sm">
              <FeaturedIcon size="lg">
                <Icon />
              </FeaturedIcon>
              <Typography variant="ui-sm" tone="primary">
                {i + 1} · {s.kicker}
              </Typography>
              <Typography as="h3" variant="h3">
                {s.title}
              </Typography>
              <Typography tone="muted">{s.body}</Typography>
            </Stack>
          </ScrollStoryStep>
        );
      })}
    </ScrollStory>
  );
}
