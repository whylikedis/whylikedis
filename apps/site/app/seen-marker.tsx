'use client';

import { useViewIntent } from '@/hooks/use-intent';

// A point on the page that reports when a reader reaches it and stays a moment: put one at the end
// of an answer to count it as read. It takes no space and nothing reads it aloud.
export function SeenMarker({ name }: { name: string }) {
  const { ref } = useViewIntent({ name, threshold: 0 });
  return <span ref={ref} aria-hidden="true" />;
}
