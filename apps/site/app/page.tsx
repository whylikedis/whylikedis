import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button-variants';
import { Hero } from '@/components/ui/patterns/hero';
import { StatGroup } from '@/components/ui/patterns/stat-group';
import { Prose } from '@/components/ui/prose';
import { Stack } from '@/components/ui/stack';
import { Typography } from '@/components/ui/typography';
import { counts, site } from './data';

export default function Home() {
  const n = counts();
  return (
    <Stack gap="lg">
      <Hero
        eyebrow="For parents"
        headline="Clear answers about Israel, each with sources you can check."
        body="When your child comes home with a claim about Israel, find an answer you can give in two minutes, the other side in its own words, and the source for every fact."
        actions={
          <>
            <Link
              href="/facts/"
              className={buttonVariants({ variant: 'highlight', size: 'lg' })}
            >
              See the answers
            </Link>
            <Link
              href="/method/"
              className={buttonVariants({ variant: 'link', size: 'lg' })}
            >
              How we check
            </Link>
          </>
        }
      />
      <Stack gap="sm">
        <StatGroup
          cols={3}
          layout="value-first"
          stats={[
            { value: n.verified, label: 'answers checked by a second reader' },
            { value: n.quotes, label: 'source quotes you can check' },
            { value: n.cards, label: 'questions we are working on' },
          ]}
        />
        <Typography variant="ui" tone="muted">
          An answer is published in full only after someone who did not write it
          has tried to break it. The rest are still being checked, and each one
          says so.
        </Typography>
      </Stack>
      <Stack gap="sm">
        <Typography as="h2" variant="h2" id="where-we-stand">
          Where we stand
        </Typography>
        {/* Built by export.py from docs/chapters.md, every character escaped before any tag is added. */}
        <Prose
          variant="long"
          dangerouslySetInnerHTML={{ __html: site.standing }}
        />
      </Stack>
    </Stack>
  );
}
