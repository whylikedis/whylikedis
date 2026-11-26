'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { IntentProvider, type IntentEvent } from '@/hooks/use-intent';
import { capture } from '@/lib/analytics';

// Turns Interlace intents into the site's anonymous analytics events. Every page is wrapped once,
// in the layout, so a page or component only declares intent (`data-intent`, an intent hook) and
// never calls analytics itself. Events carry names, numbers and fixed options, nothing typed.
export function toAnalytics(event: IntentEvent): void {
  switch (event.kind) {
    case 'page_view':
      return capture('$pageview', {});
    case 'page_leave':
      return capture('$pageleave', {
        visible_ms: event.visibleMs,
        scroll_depth: event.depth,
      });
    case 'activate':
      return capture('intent_activate', {
        intent: event.name,
        input: event.input,
      });
    case 'view':
      return capture('intent_view', { intent: event.name });
    case 'dwell':
      return capture('intent_dwell', {
        intent: event.name,
        input: event.input,
      });
    case 'commit':
      return capture('intent_commit', {
        intent: event.name,
        length: event.length,
      });
    case 'disclosure':
      return capture('intent_disclosure', {
        intent: event.name,
        open: event.open,
        reason: event.reason,
      });
    case 'form':
      return capture('intent_form', {
        intent: event.name,
        phase: event.phase,
        reason: event.reason ?? null,
      });
    case 'rage_click':
      return capture('rage_click', {
        intent: event.name,
        clicks: event.clicks,
      });
  }
}

export function IntentBridge({ children }: { children: ReactNode }) {
  const page = usePathname();
  return (
    <IntentProvider onIntent={toAnalytics} page={page}>
      {children}
    </IntentProvider>
  );
}
