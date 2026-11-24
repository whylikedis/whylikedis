import { site } from './data';

// A doc's first paragraph as plain text: its description in link previews.
export function docLead(doc: string): string {
  const p = /<p>([\s\S]*?)<\/p>/.exec(site.docs[doc].html)?.[1] ?? '';
  return p
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;|&rsquo;/g, '’')
    .replace(/\s+/g, ' ')
    .trim();
}
