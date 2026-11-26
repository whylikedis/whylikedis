// Live rooms (/play/host and /play/join), end to end in a browser: the real pages, the real
// Supabase client and the real room transport, over a fake Realtime server (fake-realtime.ts) that
// each check can make drop, delay, repeat and reorder messages. Nothing here needs a Supabase project.
import type { Locator, Page } from '@playwright/test';
import type { FakeRealtime } from './fake-realtime';
import { expect, settle, test } from './fixtures';

// A game takes a while in real time (a countdown, a clock), and a reconnect backs off.
test.beforeEach(() => test.setTimeout(90_000));

const JOIN = 'Join the game';
const NAME = 'Your name for this game';

async function openHost(page: Page) {
  await page.goto('/play/host/');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Join on your phone' }),
  ).toBeVisible();
  const code = (
    await page.locator('[data-slot="join-code-value"]').innerText()
  ).replace(/\s/g, '');
  expect(code).toMatch(/^[A-Z0-9]{6}$/);
  return code;
}

/** Press Tab until `target` has focus, so a check proves the keyboard can reach it. */
async function tabTo(page: Page, target: Locator, limit = 30) {
  for (let i = 0; i < limit; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('the keyboard never reached ' + target);
}

/** A phone joins by keyboard alone: Tab to the name, type, Enter. */
async function join(
  page: Page,
  code: string,
  name: string,
  landing: 'lobby' | 'game' = 'lobby',
) {
  await page.goto(`/play/join/?code=${code}`);
  await tabTo(page, page.getByLabel(NAME));
  await page.keyboard.type(name);
  await page.keyboard.press('Enter');
  if (landing === 'lobby')
    await expect(page.getByText('You are in')).toBeVisible();
  else await expect(page.locator('[data-slot="answer-pad"]')).toBeVisible();
}

const phase = (page: Page) => page.locator('[data-phase]').first();
const primary = (host: Page) => host.locator('[data-slot="room-host-primary"]');

/** The host presses its main button with the keyboard. */
async function press(host: Page, name: string | RegExp) {
  const button = host.getByRole('button', { name });
  await tabTo(host, button, 60);
  await host.keyboard.press('Enter');
}

test('a room plays from the lobby to the podium, by keyboard alone', async ({
  page: host,
  openPage,
}) => {
  const code = await openHost(host);
  const phone = await openPage();
  await join(phone, code, 'Dana');
  await expect(host.getByText('1 player').first()).toBeVisible();

  await press(host, 'Start');
  for (let round = 1; ; round++) {
    await expect(phase(host)).toHaveAttribute('data-phase', 'question', {
      timeout: 15_000,
    });
    // The phone picks a reply with a letter key, from the tile that has focus.
    const tile = phone.locator('[data-slot="answer-pad-choice"]').first();
    await expect(tile).toBeVisible();
    await tabTo(phone, tile);
    await phone.keyboard.press('b');
    await expect(
      phone.locator('[data-slot="answer-pad-status"]'),
    ).toContainText('Answer in');
    await expect(phase(host)).toHaveAttribute('data-phase', 'reveal', {
      timeout: 10_000,
    });
    const last = await host
      .getByRole('button', { name: 'Show the podium' })
      .count();
    if (last) {
      await press(host, 'Show the podium');
      break;
    }
    await press(host, 'Next round');
  }
  await expect(phase(host)).toHaveAttribute('data-phase', 'podium');
  await expect(phone.getByRole('heading', { level: 1 })).toContainText(
    'You finished 1st',
  );
  await settle(phone);
});

// --- helpers for rooms with several phones ---------------------------------------------------

const STATUS = '[data-slot="room-host-status"]';
const choice = (phone: Page, i: number) =>
  phone.locator('[data-slot="answer-pad-choice"]').nth(i);

/** A host with `names.length` phones in its lobby. */
async function lobby(
  host: Page,
  openPage: () => Promise<Page>,
  names: string[],
) {
  const code = await openHost(host);
  const phones: Page[] = [];
  for (const name of names) {
    const phone = await openPage();
    await join(phone, code, name);
    phones.push(phone);
  }
  await expect(host.locator(STATUS)).toHaveText(
    names.length === 1 ? '1 player is in.' : `${names.length} players are in.`,
  );
  return { code, phones };
}

/** The host starts, and waits for the first round to open on its screen. */
async function startAndOpen(host: Page) {
  await host.getByRole('button', { name: 'Start' }).click();
  await expect(phase(host)).toHaveAttribute('data-phase', 'question', {
    timeout: 15_000,
  });
}

const nextRoom = (page: Page, to: string, timeout = 15_000) =>
  expect(phase(page)).toHaveAttribute('data-phase', to, { timeout });

// --- late joiners -----------------------------------------------------------------------------

test.describe('a player who joins late', () => {
  test('lands in the round that is running, and can answer it', async ({
    page: host,
    openPage,
  }) => {
    const { code } = await lobby(host, openPage, ['Dana']);
    await startAndOpen(host);
    const claim = await host.getByRole('heading', { level: 1 }).innerText();

    const late = await openPage();
    await join(late, code, 'Eli', 'game');
    // Not the lobby: the same claim, the same replies, and a clock.
    await nextRoom(late, 'question');
    await expect(late.getByRole('heading', { level: 1 })).toHaveText(claim);
    await expect(late.locator('[data-slot="answer-pad"]')).toHaveAttribute(
      'data-state',
      'open',
    );
    await expect(host.locator(STATUS)).toHaveText('0 of 2 answered');

    await choice(late, 2).click();
    await expect(host.locator(STATUS)).toHaveText('1 of 2 answered');
  });

  test('is turned away from a locked room', async ({
    page: host,
    openPage,
  }) => {
    const { code } = await lobby(host, openPage, ['Dana']);
    await host.getByRole('button', { name: 'Lock the room' }).click();
    await expect(
      host.getByRole('button', { name: 'Unlock the room' }),
    ).toBeVisible();

    const late = await openPage();
    await late.goto(`/play/join/?code=${code}`);
    await late.getByLabel(NAME).fill('Eli');
    await late.getByRole('button', { name: JOIN }).click();
    await expect(
      late.locator('[role="alert"]').filter({ hasText: /./ }),
    ).toHaveText('The host has locked the room. Ask them to open it.');
    await expect(host.locator(STATUS)).toHaveText('1 player is in.');
  });

  test('a player who was in comes back after a reload, though the room is locked', async ({
    page: host,
    openPage,
    realtime,
  }) => {
    const { code, phones } = await lobby(host, openPage, ['Dana']);
    const dana = phones[0]!;
    await host.getByRole('button', { name: 'Lock the room' }).click();
    await expect(
      host.getByRole('button', { name: 'Unlock the room' }),
    ).toBeVisible();

    // The room marks Dana away (her phone slept, or her page was closed), then she comes back:
    // her phone asks to join again, and the locked room lets her in, since she was in.
    const id = await dana.evaluate(() =>
      window.sessionStorage.getItem('wld.room.id'),
    );
    realtime.inject(`room:${code}:up`, {
      kind: 'intent',
      from: id,
      event: { type: 'leave', playerId: id },
    });
    await expect(host.locator(STATUS)).toHaveText(/0 so far/);
    await expect(host.locator(STATUS)).toHaveText('1 player is in.');
    await dana.reload();
    await expect(dana.getByText('You are in')).toBeVisible();
    await expect(host.locator(STATUS)).toHaveText('1 player is in.');
  });
});

// --- the host's page reloads ------------------------------------------------------------------

test.describe('the host page reloads', () => {
  test('in the lobby: the same room, the same code, the same players', async ({
    page: host,
    openPage,
  }) => {
    const { code } = await lobby(host, openPage, ['Dana', 'Eli']);
    await host.reload();
    await expect(
      host.getByRole('heading', { level: 1, name: 'Join on your phone' }),
    ).toBeVisible();
    expect(
      (await host.locator('[data-slot="join-code-value"]').innerText()).replace(
        /\s/g,
        '',
      ),
    ).toBe(code);
    await expect(host.locator(STATUS)).toHaveText('2 players are in.');
    // A third phone can still join with the code it was given.
    const third = await openPage();
    await join(third, code, 'Noa');
    await expect(host.locator(STATUS)).toHaveText('3 players are in.');
  });

  test('in a round: the game goes on where it was, with the answers already in', async ({
    page: host,
    openPage,
  }) => {
    const { phones } = await lobby(host, openPage, ['Dana', 'Eli']);
    await startAndOpen(host);
    await choice(phones[0]!, 0).click();
    await expect(host.locator(STATUS)).toHaveText('1 of 2 answered');
    const claim = await host.getByRole('heading', { level: 1 }).innerText();

    await host.reload();
    await expect(
      host
        .getByRole('heading', { name: 'Back in the game' })
        .or(host.getByText('Back in the game')),
    ).toBeVisible();
    await nextRoom(host, 'question');
    await expect(host.getByRole('heading', { level: 1 })).toHaveText(claim);
    await expect(host.locator(STATUS)).toHaveText('1 of 2 answered');

    // The other phone answers the reloaded host, and the round ends.
    await choice(phones[1]!, 1).click();
    await nextRoom(host, 'reveal');
    await nextRoom(phones[0]!, 'reveal');
    await expect(phones[0]!.getByRole('status').last()).toContainText(
      /You are (1st|2nd) of 2/,
    );
  });
});

// --- the connection drops ---------------------------------------------------------------------

test.describe('a dropped connection', () => {
  test('the room says so, queues an answer given meanwhile, and carries on when the link is back', async ({
    page: host,
    openPage,
    realtime,
  }) => {
    const { phones } = await lobby(host, openPage, ['Dana']);
    const phone = phones[0]!;
    await startAndOpen(host);

    realtime.refuse = true;
    realtime.dropAll();
    await expect(
      host.getByText('The room lost its connection for a moment'),
    ).toBeVisible();
    await expect(phone.getByText('Reconnecting…')).toBeVisible();
    // Answered while offline: it waits for the link, then goes.
    await choice(phone, 0).click();
    await expect(
      phone.locator('[data-slot="answer-pad-status"]'),
    ).toContainText('Answer in');

    realtime.refuse = false;
    await expect(
      host.getByText('The room lost its connection for a moment'),
    ).toBeHidden({ timeout: 30_000 });
    await expect(phone.getByText('Reconnecting…')).toBeHidden();
    // The answer arrived: with one player the round ends at once, and the host counted it.
    await nextRoom(host, 'reveal', 30_000);
    await expect(host.getByText('1 answer', { exact: true })).toBeVisible();
    await nextRoom(phone, 'reveal');
  });

  test('a phone that was offline while the game moved on catches up when it is back', async ({
    page: host,
    openPage,
    realtime,
  }) => {
    const { phones } = await lobby(host, openPage, ['Dana', 'Eli']);
    const [dana, eli] = phones as [Page, Page];
    await startAndOpen(host);

    realtime.cut(dana);
    await expect(dana.getByText('Reconnecting…')).toBeVisible();
    // The game moves on without her: Eli answers, the round is revealed, the next one opens.
    await choice(eli, 1).click();
    await expect(host.locator(STATUS)).toHaveText('1 of 2 answered');
    await host.getByRole('button', { name: 'Reveal now' }).click();
    await nextRoom(host, 'reveal');
    await host.getByRole('button', { name: 'Next round' }).click();
    await nextRoom(host, 'question');
    await expect(host.getByText('Round 2 of')).toBeVisible();

    realtime.restore(dana);
    await expect(dana.getByText('Reconnecting…')).toBeHidden({
      timeout: 30_000,
    });
    await nextRoom(dana, 'question');
    await expect(dana.getByText(/Round 2 of/)).toBeVisible();
    // And she can play the round she came back to.
    await choice(dana, 1).click();
    await expect(host.locator(STATUS)).toContainText('answered');
  });

  test('a host whose last state was lost as the link dropped sends it again when it is back', async ({
    page: host,
    openPage,
    realtime,
  }) => {
    const { phones } = await lobby(host, openPage, ['Dana', 'Eli']);
    await startAndOpen(host);

    // "Reveal now" goes out, and is lost on the way; then the host's link drops. (The host spaces
    // its states 600 ms apart, so let that pass first: this one must leave at once.)
    await host.clock.fastForward(1_000);
    let lost = 0;
    realtime.plan = (w) => {
      if (w.kind !== 'state') return [0];
      lost++;
      return [];
    };
    await host.getByRole('button', { name: 'Reveal now' }).click();
    await nextRoom(host, 'reveal');
    await expect.poll(() => lost).toBeGreaterThan(0);
    realtime.cut(host);
    await expect(
      host.getByText('The room lost its connection for a moment'),
    ).toBeVisible();
    realtime.plan = () => [0];
    // The outage outlasts the host's 4 s "say it again" timer, which finds the link down.
    await host.clock.fastForward(5_000);
    // The phones heard nothing, so they still show the round...
    await expect(phase(phones[0]!)).toHaveAttribute('data-phase', 'question');

    realtime.restore(host);
    // ...until the host is back and says where the room is.
    await nextRoom(phones[0]!, 'reveal', 30_000);
    await nextRoom(phones[1]!, 'reveal');
  });
});

// --- a big room -------------------------------------------------------------------------------

test.describe('a room of thirty', () => {
  const up = (code: string) => `room:${code}:up`;
  const intent = (id: string, event: object) => ({
    kind: 'intent',
    from: id,
    event,
  });
  /** The newest room state the host broadcast. */
  const lastState = (realtime: FakeRealtime) =>
    realtime.log.findLast((w) => w.channel === 'down' && w.kind === 'state')!
      .payload as {
      state: {
        players: unknown[];
        phase: string;
        prompt?: { choices: { id: string }[] };
      };
    };

  test('takes thirty players at once for a few broadcasts, refuses the thirty-first, and plays a round', async ({
    page: host,
    openPage,
    realtime,
  }) => {
    const code = await openHost(host);
    // The host listens on the up channel once its link is up.
    await expect.poll(() => realtime.listeners(up(code))).toBe(1);
    const phone = await openPage();
    await join(phone, code, 'Real Dana');
    const from = realtime.mark();

    // 29 more join in the same instant, as a classroom's phones do.
    for (let i = 1; i <= 29; i++)
      realtime.inject(
        up(code),
        intent(`bot${i}`, {
          type: 'join',
          playerId: `bot${i}`,
          name: `Player ${i}`,
        }),
      );
    await expect(host.locator(STATUS)).toHaveText('30 players are in.');
    await expect(
      host.locator('[data-slot="room-lobby-announce"]'),
    ).toContainText('players joined');
    // Thirty joins did not cost thirty broadcasts to every phone: they were folded together.
    await expect
      .poll(() => lastState(realtime).state.players.length, { timeout: 10_000 })
      .toBe(30);
    expect(realtime.count('down', 'state', from)).toBeLessThanOrEqual(5);

    // The thirty-first is told the room is full.
    const late = await openPage();
    await late.goto(`/play/join/?code=${code}`);
    await late.getByLabel(NAME).fill('Too late');
    await late.getByRole('button', { name: JOIN }).click();
    await expect(
      late.locator('[role="alert"]').filter({ hasText: /./ }),
    ).toHaveText('The room is full.');
    await expect(host.locator(STATUS)).toHaveText('30 players are in.');

    // A round: twenty-nine answer, and the round waits for the thirtieth.
    await host.getByRole('button', { name: 'Start' }).click();
    await nextRoom(host, 'question');
    await expect.poll(() => lastState(realtime).state.phase).toBe('question');
    const pick = lastState(realtime).state.prompt!.choices[0]!.id;
    for (let i = 1; i <= 29; i++)
      realtime.inject(
        up(code),
        intent(`bot${i}`, {
          type: 'answer',
          playerId: `bot${i}`,
          value: pick,
          at: 0,
        }),
      );
    await expect(host.locator(STATUS)).toHaveText('29 of 30 answered');
    await choice(phone, 0).click();
    await nextRoom(host, 'reveal');
    await expect(host.locator(STATUS)).toHaveText(/Round 1 of/);
    // The standings are there for thirty, and nothing is pushed off the side of the big screen.
    await expect(
      host.locator('[data-slot="standings-row"]').first(),
    ).toBeVisible();
    expect(
      await host.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(0);
  });
});

// --- a bad network ----------------------------------------------------------------------------

/** From now on, note each screen a phone shows, as `phase|round`, so a check can read the trail. */
const trackPhases = (page: Page) =>
  page.evaluate(() => {
    const seen: string[] = [];
    (window as unknown as { __phases: string[] }).__phases = seen;
    const note = () => {
      const p =
        document.querySelector('[data-phase]')?.getAttribute('data-phase') ??
        '';
      const round = /Round (\d+) of/.exec(document.body.innerText)?.[1] ?? '';
      const entry = `${p}|${round}`;
      if (p && seen.at(-1) !== entry) seen.push(entry);
    };
    note();
    new MutationObserver(note).observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-phase'],
    });
  });
const screens = (page: Page) =>
  page.evaluate(() => (window as unknown as { __phases: string[] }).__phases);

/** A repeatable stream of numbers in [0, 1): the same bad network every run. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('on a network that delays, repeats and reorders messages, a phone only ever moves forward', async ({
  page: host,
  openPage,
  realtime,
}) => {
  test.setTimeout(150_000);
  const { phones } = await lobby(host, openPage, ['Dana', 'Eli']);
  const [dana, eli] = phones as [Page, Page];
  for (const phone of phones) await trackPhases(phone);

  // From here, every message takes up to 0.7 s, a third arrive twice, and so some pass others.
  const rnd = seeded(1);
  const sent: { to: Page; n: number; at: number; kind: string }[] = [];
  realtime.plan = (w, to) => {
    // A state can be held back for seconds, so a later one overtakes it; the rest for under a second.
    const first = Math.floor(rnd() * (w.kind === 'state' ? 3500 : 700));
    const times =
      rnd() < 0.35 ? [first, first + 50 + Math.floor(rnd() * 600)] : [first];
    for (const t of times)
      sent.push({ to, n: w.n, at: Date.now() + t, kind: w.kind });
    return times;
  };

  await host.getByRole('button', { name: 'Start' }).click();
  for (let round = 1; ; round++) {
    for (const phone of [dana, eli]) {
      await nextRoom(phone, 'question', 30_000);
      await choice(phone, round % 3).click();
    }
    await nextRoom(host, 'reveal', 30_000);
    const last = await host
      .getByRole('button', { name: 'Show the podium' })
      .count();
    await host
      .getByRole('button', { name: last ? 'Show the podium' : 'Next round' })
      .click();
    if (last) break;
  }
  await nextRoom(dana, 'podium', 30_000);
  await nextRoom(eli, 'podium', 30_000);
  await expect(dana.getByRole('heading', { level: 1 })).toContainText(
    'You finished',
  );

  // Let every message still in flight land: a late copy of an old state must not undo the podium.
  const lastLanding = Math.max(...sent.map((m) => m.at));
  await expect
    .poll(() => Date.now() > lastLanding + 300, { timeout: 15_000 })
    .toBe(true);
  await nextRoom(dana, 'podium');
  await nextRoom(eli, 'podium');

  // The network really was bad: states passed each other and some came twice.
  const states = sent.filter((s) => s.kind === 'state');
  const passed = states.some((a) =>
    states.some((b) => a.to === b.to && a.n < b.n && a.at > b.at),
  );
  const twice = states.some(
    (a, i) => states.findIndex((b) => b.to === a.to && b.n === a.n) !== i,
  );
  expect(passed, 'a state overtook an older one').toBe(true);
  expect(twice, 'a state came twice').toBe(true);

  // And no phone went back: it may skip a state that was overtaken, never show an older one.
  for (const phone of phones) {
    const seen = (await screens(phone)).map(
      (e) => e.split('|') as [string, string],
    );
    const trail = seen.map((e) => e.join(':')).join(' > ');
    expect(seen.at(0)![0], trail).toBe('lobby');
    expect(seen.at(-1)![0], trail).toBe('podium');
    let round = 0;
    let revealed = false;
    for (const [p, r] of seen) {
      if (p === 'lobby') expect(round, trail).toBe(0); // the lobby is not shown again
      if (!r) continue;
      expect(Number(r), trail).toBeGreaterThanOrEqual(round);
      if (Number(r) > round) revealed = false;
      round = Number(r);
      // Within a round, the question never comes back after the reveal.
      if (p === 'question') expect(revealed, trail).toBe(false);
      if (p === 'reveal') revealed = true;
    }
  }
});

test('a state that arrives after a newer one is ignored, and so is a copy of one already seen', async ({
  page: host,
  openPage,
  realtime,
}) => {
  const { phones } = await lobby(host, openPage, ['Dana', 'Eli']);
  const dana = phones[0]!;
  await trackPhases(dana);
  const phaseOf = (w: { payload: unknown }) =>
    (w.payload as { state?: { phase?: string } }).state?.phase;

  // The state that opens the round reaches Dana 4 s late; the next one, and a copy of each, on time.
  let heldUntil = 0;
  realtime.plan = (w, to) => {
    if (to !== dana || w.kind !== 'state') return [0];
    if (phaseOf(w) === 'question') {
      heldUntil = Date.now() + 4_000;
      return [4_000];
    }
    return [0, 30];
  };
  await host.getByRole('button', { name: 'Start' }).click();
  await nextRoom(host, 'question');
  await expect.poll(() => heldUntil).toBeGreaterThan(0);
  await host.getByRole('button', { name: 'Reveal now' }).click();
  await nextRoom(dana, 'reveal');

  // The old state lands now. Dana stays on the reveal.
  await expect
    .poll(() => Date.now() > heldUntil + 500, { timeout: 10_000 })
    .toBe(true);
  await nextRoom(dana, 'reveal');
  const seen = (await screens(dana)).map((e) => e.split('|')[0]);
  expect(seen.slice(seen.indexOf('reveal')), seen.join(' > ')).toEqual([
    'reveal',
  ]);
});

// --- screen readers ---------------------------------------------------------------------------

/** Mark an element, so a later check can tell it is the same one and was not swapped for a copy. */
const mark = (el: Locator, name: string) =>
  el.evaluate(
    (node, n) => ((node as unknown as Record<string, boolean>)[n] = true),
    name,
  );
const isMarked = (el: Locator, name: string) =>
  el.evaluate(
    (node, n) => (node as unknown as Record<string, boolean>)[n] === true,
    name,
  );

test.describe('what happens in a room is said in live regions that were already there', () => {
  test('a player joining is announced in the host lobby, politely', async ({
    page: host,
    openPage,
  }) => {
    const { code, phones } = await lobby(host, openPage, ['Dana']);
    const joined = host.locator('[data-slot="room-lobby-announce"]');
    await expect(joined).toHaveAttribute('aria-live', 'polite');
    await mark(joined, 'same');
    await join(await openPage(), code, 'Eli');
    await expect(joined).toHaveText('Eli joined');
    expect(await isMarked(joined, 'same'), 'the region was replaced').toBe(
      true,
    );
    // The phone's own lobby tells the player they are in.
    await expect(phones[0]!.getByText('You are in')).toBeVisible();
  });

  test('the countdown on a phone is announced at once, with the seconds', async ({
    page: host,
    openPage,
  }) => {
    const { phones } = await lobby(host, openPage, ['Dana']);
    await host.getByRole('button', { name: 'Start' }).click();
    const countdown = phones[0]!.locator(
      '[data-slot="room-countdown-announce"]',
    );
    await expect(countdown).toHaveAttribute('aria-live', 'assertive');
    await expect(countdown).toContainText(/Starting in \d seconds?|Go/);
  });

  test('the host count of answers is one live region from the first answer to the reveal', async ({
    page: host,
    openPage,
  }) => {
    const { phones } = await lobby(host, openPage, ['Dana', 'Eli']);
    await startAndOpen(host);
    const status = host.locator(STATUS);
    await expect(status).toHaveAttribute('aria-live', 'polite');
    await expect(status).toHaveText('0 of 2 answered');
    await mark(status, 'same');
    await choice(phones[0]!, 0).click();
    await expect(status).toHaveText('1 of 2 answered');
    await choice(phones[1]!, 1).click();
    await expect(status).toHaveText('2 of 2 answered');
    await nextRoom(host, 'reveal');
    await expect(status).toHaveText(/Round 1 of/);
    expect(await isMarked(status, 'same'), 'the region was replaced').toBe(
      true,
    );
  });

  test('a phone hears "Answer in", then how it went, in one polite region, and where it stands', async ({
    page: host,
    openPage,
  }) => {
    const { phones } = await lobby(host, openPage, ['Dana', 'Eli']);
    const [dana, eli] = phones as [Page, Page];
    await startAndOpen(host);
    const pad = dana.locator('[data-slot="answer-pad-status"]');
    await expect(pad).toHaveAttribute('aria-live', 'polite');
    await mark(pad, 'same');
    await choice(dana, 0).click();
    await expect(pad).toHaveText('Answer in. Watch the screen.');
    await choice(eli, 1).click();
    await nextRoom(dana, 'reveal');
    await expect(pad).toHaveText(
      /^(Right\. \+[\d,]+ points\.|Not this time\. The right reply was [A-D]\.)$/,
    );
    expect(await isMarked(pad, 'same'), 'the region was replaced').toBe(true);
    await expect(dana.getByRole('status').last()).toContainText(
      /You are (1st|2nd) of 2/,
    );
  });
});

test('a dropped connection is announced as a status, not left as a silent banner', async ({
  page: host,
  openPage,
  realtime,
}) => {
  const { phones } = await lobby(host, openPage, ['Dana']);
  realtime.cut(phones[0]!);
  const banner = phones[0]!.getByRole('status').filter({
    hasText: 'Reconnecting…',
  });
  await expect(banner).toBeVisible();
  realtime.restore(phones[0]!);
  await expect(banner).toBeHidden({ timeout: 30_000 });
});

// --- reduced motion ---------------------------------------------------------------------------

/** Counts every Web Animation a page starts, so a check can tell motion from no motion. */
const countAnimations = (page: Page) =>
  page.addInitScript(() => {
    const w = window as unknown as { __animated: number };
    w.__animated = 0;
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args: Parameters<typeof animate>) {
      w.__animated++;
      return animate.apply(this, args);
    };
  });
const animated = (page: Page) =>
  page.evaluate(() => (window as unknown as { __animated: number }).__animated);

/** Join, count down, answer and see the reveal: the moments the room animates. */
async function playOneRound(host: Page, phones: Page[]) {
  await host.getByRole('button', { name: 'Start' }).click();
  await nextRoom(host, 'question');
  for (const phone of phones) await choice(phone, 0).click();
  await nextRoom(host, 'reveal');
  for (const phone of phones) await nextRoom(phone, 'reveal');
}

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the room moves nothing when the reader asks for less motion', async ({
    page: host,
    openPage,
  }) => {
    await countAnimations(host);
    const code = await openHost(host);
    const phones: Page[] = [];
    for (const name of ['Dana', 'Eli']) {
      const phone = await openPage();
      await countAnimations(phone);
      await join(phone, code, name);
      phones.push(phone);
    }
    await playOneRound(host, phones);
    // The reveal's marks, points and standings are all there, as words and colours.
    await expect(
      phones[0]!.locator('[data-slot="answer-pad-status"]'),
    ).not.toHaveText('');
    for (const page of [host, ...phones]) expect(await animated(page)).toBe(0);
  });
});

test.describe('motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the same round does animate, so the check above can tell', async ({
    page: host,
    openPage,
  }) => {
    await countAnimations(host);
    const code = await openHost(host);
    const phones: Page[] = [];
    for (const name of ['Dana', 'Eli']) {
      const phone = await openPage();
      await countAnimations(phone);
      await join(phone, code, name);
      phones.push(phone);
    }
    await playOneRound(host, phones);
    const counts = await Promise.all([host, ...phones].map(animated));
    expect(counts.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    // A phone's countdown digit and the reveal both move.
    expect(counts[1]).toBeGreaterThan(0);
  });
});
