// Anonymous product analytics for the app, the same way the site counts: what people tap, never
// who they are. Events go to PostHog's capture endpoint with no SDK and nothing stored for
// analytics: each launch gets a random id held in memory only, and PostHog is told not to build a
// person profile. A return is known only from the game's own history, sent as counts.
//
// Off unless EXPO_PUBLIC_POSTHOG_KEY is set at build time (a public project key, never in this
// repository), so a development build sends nothing.

const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

export const ANALYTICS_ON = Boolean(KEY);

// The line About shows while analytics is on: the wording the site shows.
export const ANALYTICS_NOTICE =
  'We count anonymous taps to learn what helps. No cookies, and nothing that identifies you.';

// Every event the app sends, with its properties, in one place.
export type AnalyticsEvents = {
  round_finished: { mode: string; items: number; points: number; xp: number };
  xp_earned: { source: string; xp: number; total: number; level: number };
  level_up: { level: number };
  goal_met: { goal: string; xp: number };
  goal_changed: { goal: string; from: string };
  milestone_reached: { kind: 'streak'; value: number };
  shared: { kind: 'result' | 'milestone'; mode: string };
  reminder_set: { hour: number };
  reminder_off: Record<string, never>;
};

const launchId = `a${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

export function capture<E extends keyof AnalyticsEvents>(
  event: E,
  properties: AnalyticsEvents[E],
): void {
  if (!KEY) return;
  const body = JSON.stringify({
    api_key: KEY,
    event,
    distinct_id: launchId,
    properties: {
      ...properties,
      $process_person_profile: false,
      app_env: process.env.EXPO_PUBLIC_APP_ENV ?? 'local',
    },
  });
  try {
    void fetch(`${HOST}/i/v0/e/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    }).catch(() => {});
  } catch {
    // Analytics never breaks a screen.
  }
}
