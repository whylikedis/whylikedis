import { notFound } from 'next/navigation';
import { SHARE_SIZES, shareImage } from '@/lib/share-image';
import { shareCard, sharePages } from '../../share-cards';

// /share/<page>/og.png and /share/<page>/square.png: every page's two share images, built at
// build time. The address ends in .png, so the trailing-slash redirect never applies and a
// network's crawler gets the image on its first request.
export const dynamicParams = false;

export const generateStaticParams = () =>
  sharePages().flatMap((page) =>
    SHARE_SIZES.map((size) => ({
      slug: [...(page ? page.split('/') : []), `${size}.png`],
    })),
  );

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const file = slug.at(-1) ?? '';
  const size = SHARE_SIZES.find((s) => file === `${s}.png`);
  const card = shareCard(slug.slice(0, -1).join('/'));
  if (!size || !card) notFound();
  return shareImage(size, card.props);
}
