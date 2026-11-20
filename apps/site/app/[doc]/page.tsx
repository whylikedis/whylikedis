import { site } from '../data';

// One page for each doc in data/site.json: /questions/, /election-map/, /method/, /open/.
export const dynamicParams = false;
export const generateStaticParams = () =>
  Object.keys(site.docs).map((doc) => ({ doc }));

type Props = { params: Promise<{ doc: string }> };

export async function generateMetadata({ params }: Props) {
  return { title: site.docs[(await params).doc].title };
}

export default async function Doc({ params }: Props) {
  // Built by export.py from docs/, every character escaped before any tag is added.
  return (
    <div
      dangerouslySetInnerHTML={{ __html: site.docs[(await params).doc].html }}
    />
  );
}
