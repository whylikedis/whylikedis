import { ReadingLayout } from '@/components/ui/patterns/reading-layout';
import { Prose } from '@/components/ui/prose';
import { Section } from '@/components/ui/section';
import { site } from '../data';

// One page for each doc in data/site.json: /questions/, /election-map/, /method/, /open/.
export const dynamicParams = false;
export const generateStaticParams = () =>
  Object.keys(site.docs).map((doc) => ({ doc }));

type Props = { params: Promise<{ doc: string }> };

export async function generateMetadata({ params }: Props) {
  const { doc } = await params;
  return { title: site.docs[doc].title, alternates: { canonical: `/${doc}/` } };
}

// A doc with a few headings gets a contents rail; a short one reads as a single column.
const MIN_TOC = 3;

export default async function Doc({ params }: Props) {
  const d = site.docs[(await params).doc];
  return (
    <Section spacing="tight">
      <ReadingLayout
        toc={d.toc.length >= MIN_TOC ? d.toc : []}
        tocLabel={`${d.title}: contents`}
      >
        {/* Built by export.py from docs/, every character escaped before any tag is added. */}
        <Prose variant="long" dangerouslySetInnerHTML={{ __html: d.html }} />
      </ReadingLayout>
    </Section>
  );
}
