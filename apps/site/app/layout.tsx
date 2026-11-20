import type { Metadata, Viewport } from 'next';
import { Frank_Ruhl_Libre, Heebo, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { PREVIEW } from './data';
import { Nav } from './nav';
import './globals.css';

const display = Frank_Ruhl_Libre({
  subsets: ['latin'],
  weight: ['500', '700', '900'],
  variable: '--font-display',
});
const body = Heebo({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-body',
});
const label = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-label',
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
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${label.variable}`}
    >
      <body>
        <div className="draft">
          {PREVIEW
            ? 'LOCAL PREVIEW · DRAFTS · nothing here is approved or public'
            : 'WORK IN PROGRESS · cards marked draft have not passed review · nothing here is teaching content yet'}
        </div>
        <Nav />
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
