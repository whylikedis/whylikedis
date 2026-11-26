// What every browser check starts from: a fixed day, a fake back end for accounts and analytics,
// no request to any other host, and no console error. A check that needs something else says so.
import { test as base, expect, type Page, type Route } from '@playwright/test';
import { POSTHOG, SUPABASE } from './env.mjs';
import { FakeRealtime } from './fake-realtime';

/** The day every check is played on: a fixed weekday morning in New York. */
export const NOW = new Date('2026-12-01T10:00:00-05:00');

export const OTP = '123456';
export const USER = {
  id: '00000000-0000-4000-8000-000000000001',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'reader@example.com',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  identities: [
    {
      id: 'reader@example.com',
      identity_id: '00000000-0000-4000-8000-000000000002',
      user_id: '00000000-0000-4000-8000-000000000001',
      provider: 'email',
      identity_data: { email: 'reader@example.com' },
      created_at: '2026-11-01T00:00:00Z',
      last_sign_in_at: '2026-11-01T00:00:00Z',
      updated_at: '2026-11-01T00:00:00Z',
    },
  ],
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
};
const TOKEN = 'e2e-access-token';

export type Backend = {
  /** Every analytics event the page sent, by name, in order. */
  events: { event: string; properties: Record<string, unknown> }[];
  /** Emails a sign-in code was sent to. */
  codesSentTo: string[];
  /** Session requests saved. */
  requests: Record<string, unknown>[];
  /** Make the next writes fail, to see the error states. */
  failWrites: boolean;
  profile: { first_name: string | null; last_name: string | null } | null;
};

type Fixtures = {
  backend: Backend;
  /** Requests the page made to a host it should not talk to. */
  strayRequests: string[];
  consoleErrors: string[];
  /** The live-room network every page of the test shares: see fake-realtime.ts. */
  realtime: FakeRealtime;
  /** Another page of the same browser, set up like `page`: a phone in a live room. */
  openPage: () => Promise<Page>;
};

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

async function fakeSupabase(page: Page, backend: Backend) {
  await page.route(`${SUPABASE}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const method = req.method();
    const authed = (req.headers()['authorization'] ?? '').endsWith(TOKEN);
    const body = () => (req.postData() ? JSON.parse(req.postData()!) : {});

    if (path === '/auth/v1/otp') {
      backend.codesSentTo.push(body().email);
      return json(route, 200, {});
    }
    if (path === '/auth/v1/verify') {
      if (body().token !== OTP)
        return json(route, 403, {
          code: 403,
          error_code: 'otp_expired',
          msg: 'Token has expired or is invalid',
        });
      return json(route, 200, {
        access_token: TOKEN,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(NOW.getTime() / 1000) + 365 * 24 * 3600,
        refresh_token: 'e2e-refresh-token',
        user: USER,
      });
    }
    if (path === '/auth/v1/user') {
      if (!authed)
        return json(route, 401, {
          code: 401,
          error_code: 'no_authorization',
          msg: 'no',
        });
      return json(route, 200, USER);
    }
    if (path === '/auth/v1/logout') return route.fulfill({ status: 204 });
    if (path === '/rest/v1/profiles') {
      if (method === 'PATCH') {
        if (backend.failWrites) return json(route, 500, { message: 'down' });
        backend.profile = { ...backend.profile, ...body() };
        return route.fulfill({ status: 204 });
      }
      const row = backend.profile
        ? [
            {
              id: USER.id,
              email: USER.email,
              avatar_url: null,
              ...backend.profile,
            },
          ]
        : [];
      const one = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object');
      return json(route, 200, one ? (row[0] ?? null) : row);
    }
    if (path === '/rest/v1/session_requests' && method === 'POST') {
      if (backend.failWrites) return json(route, 500, { message: 'down' });
      backend.requests.push(body());
      return route.fulfill({ status: 201 });
    }
    return json(route, 404, {
      message: `the fake back end does not know ${method} ${path}`,
    });
  });
}

export const test = base.extend<Fixtures>({
  backend: async ({}, use) =>
    use({
      events: [],
      codesSentTo: [],
      requests: [],
      failWrites: false,
      profile: null,
    }),

  strayRequests: async ({}, use) => use([]),
  consoleErrors: async ({}, use) => use([]),

  realtime: async ({}, use) => {
    const hub = new FakeRealtime();
    await use(hub);
    hub.stop();
  },

  page: async (
    { page, backend, strayRequests, consoleErrors, realtime },
    use,
  ) => {
    await prepare(page, { backend, strayRequests, consoleErrors, realtime });
    await use(page);
  },

  openPage: async (
    { context, backend, strayRequests, consoleErrors, realtime },
    use,
  ) => {
    await use(async () => {
      const page = await context.newPage();
      await prepare(page, { backend, strayRequests, consoleErrors, realtime });
      return page;
    });
  },
});

async function prepare(
  page: Page,
  {
    backend,
    strayRequests,
    consoleErrors,
    realtime,
  }: Pick<Fixtures, 'backend' | 'strayRequests' | 'consoleErrors' | 'realtime'>,
) {
  page.on('pageerror', (e) => consoleErrors.push(`page error: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(`console: ${m.text()}`);
  });
  await page.clock.install({ time: NOW });
  // Any host but this one and the two fakes below is stray: refused, and the test fails.
  await page.route(
    (url) => !['127.0.0.1', 'localhost'].includes(url.hostname),
    (route) => {
      strayRequests.push(route.request().url());
      return route.abort('blockedbyclient');
    },
  );
  // Routes added last match first: these hosts are answered, everything else is stray.
  await fakeSupabase(page, backend);
  await realtime.attach(page);
  await page.route(`${POSTHOG}/**`, async (route) => {
    const data = route.request().postData();
    if (data) {
      const { event, properties } = JSON.parse(data);
      backend.events.push({ event, properties });
    }
    return route.fulfill({ status: 200, body: '{"status":"Ok"}' });
  });
}

/** After the test: no stray request, no console error (unless the test expected one). */
test.afterEach(async ({ strayRequests, consoleErrors }, info) => {
  if (info.status !== info.expectedStatus) return;
  expect(
    strayRequests,
    'requests to a host the site should not talk to',
  ).toEqual([]);
  // A test that expects an error names a piece of its text in a `console-error` annotation.
  const expected = info.annotations
    .filter((a) => a.type === 'console-error')
    .map((a) => a.description ?? '');
  const unexpected = consoleErrors.filter(
    (e) => !expected.some((ok) => ok && e.includes(ok)),
  );
  expect(unexpected, 'console errors').toEqual([]);
});

/** Wait until the page is settled: fonts loaded, nothing loading, hydrated. */
export async function settle(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
}

export { expect };
