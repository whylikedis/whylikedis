import { Prose } from '@/components/ui/prose';
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

export default async function Doc({ params }: Props) {
  // Built by export.py from docs/, every character escaped before any tag is added.
  return (
    <Prose
      variant="long"
      dangerouslySetInnerHTML={{ __html: site.docs[(await params).doc].html }}
    />
  );
}
