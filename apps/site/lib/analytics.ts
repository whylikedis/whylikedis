// Anonymous product analytics: what people tap, never who they are. Events go to PostHog's capture
// endpoint with no SDK, no cookie and nothing kept in the browser for analytics: each page load
// gets a random id held in memory only, and PostHog is told not to build a person profile. The
// project drops IP addresses. A return visit is known only from the game's own history on the
// device, sent as a count of days, never as an identifier.
//
// Off unless NEXT_PUBLIC_POSTHOG_KEY is set (a public project key, set on Vercel, never in this
// repository), so a local build and a preview without the key send nothing.

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

export const ANALYTICS_ON = Boolean(KEY);

// The one line every page shows while analytics is on.
export const ANALYTICS_NOTICE =
  'We count anonymous taps to learn what helps. No cookies, and nothing that identifies you.';

// The events the site sends, with their properties. A new event is added here first, so every
// name and shape is in one place for whoever reads the dashboards.
export type AnalyticsEvents = {
  daily_viewed: {
    puzzle: number;
    played_before: boolean;
    days_since_last_play: number | null;
    streak: number;
    already_played_today: boolean;
    level: number;
    shields: number;
  };
  daily_revealed: { puzzle: number };
  daily_rated: { puzzle: number; rating: string };
  streak_extended: { length: number; best: number };
  daily_shared: {
    puzzle: number;
    method: string;
    kind: 'result' | 'milestone';
  };
  practice_started: { items: number };
  practice_finished: { items: number; points: number; xp: number };
  goal_changed: { goal: string; from: string };
  xp_earned: { source: string; xp: number; total: number; level: number };
  level_up: { level: number };
  goal_met: { goal: string; xp: number };
  milestone_reached: { kind: 'streak'; value: number };
  reminder_added: { hour: number };
  reminder_dismissed: Record<string, never>;
  daily_next_tapped: { puzzle: number; target: string };
  updates_viewed: { total: number; new_count: number; first_visit: boolean };
  update_opened: { kind: string; id: string; was_new: boolean };
};

let pageId: string | null = null;
const anonId = () =>
  (pageId ??=
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `p${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`);

export function capture<E extends keyof AnalyticsEvents>(
  event: E,
  properties: AnalyticsEvents[E],
): void {
  if (!KEY || typeof window === 'undefined') return;
  const body = JSON.stringify({
    api_key: KEY,
    event,
    distinct_id: anonId(),
    properties: {
      ...properties,
      $process_person_profile: false,
      // Preview builds send too, so their test taps can be filtered out of real readers'.
      site_env: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'local',
      $current_url: window.location.origin + window.location.pathname,
      $pathname: window.location.pathname,
    },
  });
  const url = `${HOST}/i/v0/e/`;
  try {
    if (navigator.sendBeacon?.(url, new Blob([body], { type: 'text/plain' })))
      return;
    void fetch(url, {
      method: 'POST',
      body,
      keepalive: true,
      credentials: 'omit',
    }).catch(() => {});
  } catch {
    // Analytics never breaks a page.
  }
}
