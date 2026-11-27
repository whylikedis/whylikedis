import type { Metadata, Viewport } from 'next';
import { type ReactNode, ViewTransition } from 'react';
import { PREVIEW } from './data';
import { Banner } from '@/components/ui/patterns/banner';
import { SkipLink } from '@/components/ui/skip-link';
import { THEME_SCRIPT } from '@/lib/theme-script';
import { IntentBridge } from './intent-bridge';
import { Nav } from './nav';
import { SiteFooter } from './site-footer';
import './typefaces';
import './globals.css';

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
  // Each page sets its own title and description for previews (lib/share-image pageMeta), and
  // its picture comes from the opengraph-image file next to it.
  openGraph: {
    siteName: 'WhyLikeDIs',
    description: TAGLINE,
    type: 'website',
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = { themeColor: '#f7f4ee' };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    // Comfortable density: every control (buttons, inputs, menus) is a 44px touch target, for
    // readers from 35 to 85.
    <html
      lang="en"
      data-density="comfortable"
      // THEME_SCRIPT sets the reader's text size and contrast on <html> before the first paint,
      // so the server markup and the hydrated element differ on purpose.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      {/* A column at least the window's height: on a short page (sign in, an empty account) the
          footer sits at the bottom instead of floating halfway up with bare paper under it. */}
      <body className="bg-background text-foreground font-body flex min-h-dvh flex-col">
        <SkipLink />
        <Banner tone="muted" label="Site status">
          {PREVIEW
            ? 'Local preview: drafts are shown, and nothing here is approved or public.'
            : 'This site is still being written. Answers still being checked are not ready to teach from yet.'}
        </Banner>
        {/* Anonymous intent analytics for everything below: page views and leaves, rage clicks,
            and clicks on anything marked `data-intent`. Sends nothing unless analytics is on. */}
        <IntentBridge>
          <Nav />
          {/* Each page sets its own sections, so a page can open with a full-width brand band. Moving
            between pages crossfades, and a claim morphs into the heading of its answer page. */}
          <main id="main" className="flex-1">
            <ViewTransition>{children}</ViewTransition>
          </main>
          <SiteFooter />
        </IntentBridge>
      </body>
    </html>
  );
}
