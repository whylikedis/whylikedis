import path from 'node:path';
import type { NextConfig } from 'next';

const config: NextConfig = {
  trailingSlash: true, // the addresses the first site used: /facts/, /method/
  poweredByHeader: false,
  turbopack: { root: path.join(__dirname, '../..') }, // the workspace root, where the lockfile is
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // No search indexing until both founders approve the content.
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
    ];
  },
};

export default config;
