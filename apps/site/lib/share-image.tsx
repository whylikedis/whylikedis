import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import { ImageResponse } from 'next/og';
import {
  ShareImage,
  type ShareImageProps,
} from '@/components/ui/patterns/share-image';
import {
  SHARE_IMAGE_SIZES,
  type ShareImageSize,
  shareMeta,
  themeFromCss,
  visualRtlLine,
} from '@/components/ui/patterns/share-image-model';

// The pictures a WhyLikeDIs link unfurls into. Interlace's ShareImage draws them; the brand comes
// from the same theme file the site is styled with, so there is one blue and one paper.

// Paths are spelled out in full so the build traces only these files.
const FONT_DIR = path.join(process.cwd(), 'assets', 'og-fonts');
const font = (file: string) => readFileSync(path.join(FONT_DIR, file));

// Satori needs TTF files, not next/font. Newsreader for headings and Heebo for text, as on the
// site. Cairo carries the Arabic: Satori cannot read Noto Naskh Arabic's tables (Interlace notes it).
const FONTS = [
  {
    name: 'Newsreader',
    data: font('Newsreader-SemiBold.ttf'),
    weight: 600 as const,
  },
  { name: 'Heebo', data: font('Heebo-Regular.ttf'), weight: 400 as const },
  { name: 'Heebo', data: font('Heebo-Bold.ttf'), weight: 700 as const },
  { name: 'Cairo', data: font('Cairo-Bold.ttf'), weight: 700 as const },
];

const THEME = themeFromCss(
  readFileSync(path.join(process.cwd(), 'app', 'whylikedis-theme.css'), 'utf8'),
  {
    fontHeading: 'Newsreader',
    fontBody: 'Heebo',
  },
);

export const SITE_HOST = 'whylikedis.fyi';

// The street sign from the top bar: the name in Hebrew, Arabic and English, in flag blue.
function StreetSign() {
  const line = { display: 'flex', lineHeight: 1.1 } as const;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '5px 14px 4px',
        border: `3px solid ${THEME.accent}`,
        borderRadius: 8,
        color: THEME.accent,
        fontFamily: 'Heebo',
        fontWeight: 700,
      }}
    >
      <div style={{ ...line, fontSize: 19 }}>{visualRtlLine('למה ככה')}</div>
      <div style={{ ...line, fontSize: 18, fontFamily: 'Cairo' }}>
        {visualRtlLine('ليش هيك')}
      </div>
      <div style={{ ...line, fontSize: 15, letterSpacing: '0.04em' }}>
        WHYLIKEDIS
      </div>
    </div>
  );
}

// Every page offers two pictures: the wide card the networks show under a link, then a square one
// for chat thumbnails. The wide one comes first, so it is the one a network picks.
export const SHARE_SIZES: ShareImageSize[] = ['og', 'square'];

export function shareImage(
  size: ShareImageSize,
  props: Omit<ShareImageProps, 'theme' | 'brand' | 'site' | 'size'>,
) {
  return new ImageResponse(
    <ShareImage
      {...props}
      size={size}
      theme={THEME}
      brand={<StreetSign />}
      site={SITE_HOST}
    />,
    { ...SHARE_IMAGE_SIZES[size], fonts: FONTS },
  );
}

// What a preview shows: title, description, address, kind of page, and the page's two pictures
// from /share/, with their sizes and alt text written out (Interlace's shareMeta).
export function pageMeta({
  title,
  socialTitle = title,
  description,
  path: url,
  share,
  type = 'website',
}: {
  title: string;
  /** The title in previews, when the tab title alone could be misread there. */
  socialTitle?: string;
  description: string;
  path: string;
  /** The page's share image: its name under /share/ and what it shows. */
  share: { page: string; alt: string };
  type?: 'website' | 'article';
}): Metadata {
  const base = `/share/${share.page ? `${share.page}/` : ''}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    ...shareMeta({
      title: socialTitle,
      description,
      url,
      siteName: 'WhyLikeDIs',
      locale: 'en_US',
      type,
      images: SHARE_SIZES.map((size) => ({
        url: `${base}${size}.png`,
        size,
        alt: share.alt,
      })),
    }),
  };
}
