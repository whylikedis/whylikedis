const { chromium } = require('playwright');
// A full live room in one browser (BroadcastChannel): a host and three players play every round
// to the podium. Run against a running site: node scripts/live-room-check.cjs <screenshot dir>
const OUT = process.argv[2] ?? '.';
const BASE = process.env.BASE_URL ?? 'http://localhost:4173';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const errors = [];
  const host = await ctx.newPage();
  host.on('pageerror', (e) => errors.push('host: ' + e.message));
  await host.goto(BASE + '/play/host/');
  await host.getByText('Join on your phone').waitFor({ timeout: 60000 });
  const code = (
    await host.locator('[data-slot="join-code-value"]').innerText()
  ).replace(/\s/g, '');
  console.log('code', code);
  const players = [];
  for (const name of ['Dana', 'Eli', 'Noa']) {
    const p = await ctx.newPage();
    await p.setViewportSize({ width: 390, height: 844 });
    p.on('pageerror', (e) => errors.push(name + ': ' + e.message));
    await p.goto(`${BASE}/play/join/?code=${code}`);
    await p.getByLabel('Your name for this game').fill(name);
    await p.getByRole('button', { name: 'Join the game' }).click();
    await p.getByText('You are in').waitFor({ timeout: 15000 });
    players.push(p);
  }
  await host.getByText('3 players').first().waitFor();
  await host.screenshot({ path: OUT + '/host-lobby.png' });
  await players[0].screenshot({ path: OUT + '/phone-lobby.png' });
  await host.getByRole('button', { name: 'Start' }).click();
  let round = 0;
  while (true) {
    // wait for question on host
    await host
      .locator('[data-slot=stack][data-phase=question]')
      .waitFor({ timeout: 20000 });
    round++;
    await players[0]
      .locator('[data-slot="answer-pad"][data-state="open"]')
      .waitFor({ timeout: 10000 });
    if (round === 1) {
      await host.screenshot({ path: OUT + '/host-question.png' });
      await players[0].screenshot({ path: OUT + '/phone-question.png' });
    }
    // Dana picks first tile, Eli second, Noa third
    for (let i = 0; i < players.length; i++) {
      const tiles = players[i].locator('[data-slot="answer-pad-choice"]');
      const n = await tiles.count();
      await tiles.nth(i % n).click();
      await players[i]
        .locator(
          '[data-slot="answer-pad"][data-state="sent"], [data-slot="answer-pad"][data-state="revealed"]',
        )
        .waitFor({ timeout: 5000 });
    }
    await host
      .locator('[data-slot=stack][data-phase=reveal]')
      .waitFor({ timeout: 10000 });
    await players[0]
      .locator('[data-slot="answer-pad"][data-state="revealed"]')
      .waitFor({ timeout: 10000 });
    if (round === 1) {
      await host.screenshot({ path: OUT + '/host-reveal.png', fullPage: true });
      await players[0].screenshot({
        path: OUT + '/phone-reveal.png',
        fullPage: true,
      });
    }
    const outcomes = await Promise.all(
      players.map((p) =>
        p.locator('[data-slot="answer-pad"]').getAttribute('data-outcome'),
      ),
    );
    const status = await Promise.all(
      players.map((p) =>
        p.locator('[data-slot="answer-pad-status"]').innerText(),
      ),
    );
    console.log('round', round, outcomes, status);
    if (round === 1) {
      // The big screen reloads mid-game: same room, same round, players still in.
      await host.reload();
      await host.getByText('Back in the game').waitFor({ timeout: 15000 });
      await host
        .locator('[data-slot=stack][data-phase=reveal]')
        .waitFor({ timeout: 10000 });
      // A phone reloads too: it is still the same player.
      await players[2].reload();
      await players[2]
        .locator('[data-slot="answer-pad"][data-state="revealed"]')
        .waitFor({ timeout: 15000 });
      console.log('host and a phone reloaded mid-game: resumed');
    }
    const next = host.getByRole('button', {
      name: /Next round|Show the podium/,
    });
    const label = await next.innerText();
    await next.click();
    if (/podium/.test(label)) break;
  }
  await host.locator('[data-slot="podium"]').waitFor({ timeout: 10000 });
  await players[1].locator('[data-slot="podium"]').waitFor({ timeout: 10000 });
  await host.waitForTimeout(1500);
  await host.screenshot({ path: OUT + '/host-podium.png' });
  await players[1].screenshot({
    path: OUT + '/phone-podium.png',
    fullPage: true,
  });
  console.log('phone heading', await players[1].locator('h1').innerText());
  console.log('errors', errors);
  await browser.close();
})().catch((e) => {
  console.error('FAIL', e);
  process.exit(1);
});
