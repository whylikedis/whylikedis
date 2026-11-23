import type { Metadata, Viewport } from 'next';
import { Heebo, Noto_Naskh_Arabic } from 'next/font/google';
import type { ReactNode } from 'react';
import { PREVIEW } from './data';
import { Banner } from '@/components/ui/patterns/banner';
import { SkipLink } from '@/components/ui/skip-link';
import { Nav } from './nav';
import { SiteFooter } from './site-footer';
import './globals.css';

const body = Heebo({
  subsets: ['latin', 'hebrew'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-heebo',
});
// Only the wordmark's Arabic line uses it, and next/font subsets it to the glyphs it needs.
const arabic = Noto_Naskh_Arabic({
  subsets: ['arabic'],
  weight: ['700'],
  variable: '--font-naskh',
});

const TAGLINE = 'Clear answers about Israel, each with sources you can check.';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.whylikedis.fyi'), // www serves the site; the bare domain redirects to it
  title: { default: 'WhyLikeDIs', template: '%s · WhyLikeDIs' },
  description: TAGLINE,
  robots: { index: false, follow: false }, // until both founders approve the content
  icons: {
    icon: [
      { url: '/assets/favicon.svg', type: 'image/svg+xml' },
      { url: '/assets/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/assets/apple-touch-icon.png',
  },
  openGraph: {
    siteName: 'WhyLikeDIs',
    description: TAGLINE,
    images: ['/assets/og.png'],
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = { themeColor: '#0038b8' };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${arabic.variable}`}>
      <body className="bg-background text-foreground font-body">
        <SkipLink />
        <Banner tone="muted" label="Site status">
          {PREVIEW
            ? 'Local preview: drafts are shown, and nothing here is approved or public.'
            : 'This site is still being written. Answers still being checked are not ready to teach from yet.'}
        </Banner>
        <Nav />
        {/* Each page sets its own sections, so a page can open with a full-width brand band. */}
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
