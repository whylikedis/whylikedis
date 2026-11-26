// The paths a reader takes, end to end, as a reader takes them: by role and label, never by class.
// Each one also checks what analytics heard, since that is how we learn what helps.
import { PHONE } from './conditions';
import { expect, NOW, OTP, settle, test } from './fixtures';

const names = (b: { events: { event: string }[] }) =>
  b.events.map((e) => e.event);
const DAY = 24 * 3600 * 1000;

test.describe('daily question', () => {
  test.use({
    viewport: PHONE,
    permissions: ['clipboard-read', 'clipboard-write'],
  });

  test('reveal, rate, see XP and the streak, share, come back tomorrow', async ({
    page,
    backend,
  }) => {
    await page.goto('/daily/');
    await settle(page);
    await expect(
      page.getByRole('heading', { level: 1, name: 'What would you say?' }),
    ).toBeVisible();

    // Reveal: the answer opens and takes focus, so a screen reader reads it next.
    const reveal = page.locator('[data-slot="recall-card-reveal"]');
    await expect(reveal).toHaveAttribute('aria-expanded', 'false');
    await reveal.click();
    const answer = page.getByRole('region', { name: 'The answer' });
    await expect(answer).toBeVisible();
    await expect(answer).toBeFocused();
    const rate = page.getByRole('group', { name: 'Did you have it?' });
    await expect(rate).toBeVisible();

    // Rate: done, with XP and a one-day streak.
    await rate.getByRole('button', { name: 'I had it' }).click();
    await expect(page.getByText('Today’s question, done')).toBeVisible();
    await expect(page.getByText('XP earned', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Your progress' }),
    ).toBeVisible();

    // Share by copying: the result as marks, never the answer, and the link back.
    await page.getByRole('button', { name: /copy/i }).click();
    const shared = await page.evaluate(() => navigator.clipboard.readText());
    expect(shared).toContain('What would you say?');
    expect(shared).toContain('🟩');
    expect(shared).toContain('/daily/');

    await expect
      .poll(() => names(backend))
      .toEqual(
        expect.arrayContaining([
          'daily_viewed',
          'daily_revealed',
          'daily_rated',
          'streak_extended',
          'xp_earned',
          'daily_shared',
        ]),
      );

    // Back the same day: played, not celebrated again, the rating kept.
    await page.reload();
    await settle(page);
    await expect(page.getByText('You’ve played today')).toBeVisible();
    await expect(page.getByText('XP today')).toBeVisible();

    // Tomorrow: a new question, and the streak goes on to two days.
    await page.clock.setSystemTime(new Date(NOW.getTime() + DAY));
    await page.reload();
    await settle(page);
    await expect(page.getByText('You’ve played today')).toHaveCount(0);
    await page.locator('[data-slot="recall-card-reveal"]').click();
    await page
      .getByRole('group', { name: 'Did you have it?' })
      .getByRole('button', { name: 'Not yet' })
      .click();
    await expect(page.getByText('Today’s question, done')).toBeVisible();
    const streak = backend.events
      .filter((e) => e.event === 'streak_extended')
      .at(-1);
    expect(streak?.properties.length).toBe(2);
  });

  test('a second visit offers a calendar reminder, and dismissing it lasts', async ({
    page,
  }) => {
    for (const day of [0, 1]) {
      await page.clock.setSystemTime(new Date(NOW.getTime() + day * DAY));
      await page.goto('/daily/');
      await settle(page);
      await page.locator('[data-slot="recall-card-reveal"]').click();
      await page.getByRole('button', { name: 'I had it' }).click();
      await expect(page.getByText('Today’s question, done')).toBeVisible();
    }
    const offer = page.locator('[data-slot="reminder-offer"]');
    await expect(offer).toBeVisible();
    await offer
      .getByRole('button', { name: /not now|no thanks|dismiss/i })
      .click();
    await expect(offer).toHaveCount(0);
    await page.reload();
    await settle(page);
    await expect(page.getByText('You’ve played today')).toBeVisible();
    await expect(offer).toHaveCount(0);
  });
});

test.describe('practice round', () => {
  test.use({ viewport: PHONE });

  test('answer every card, then see what the round earned', async ({
    page,
    backend,
  }) => {
    await page.goto('/daily/practice/');
    await settle(page);
    // One card at a time until the round is done.
    for (let i = 0; i < 20; i++) {
      const reveal = page.locator('[data-slot="recall-card-reveal"]');
      if (!(await reveal.isVisible())) break;
      await reveal.click();
      await page
        .getByRole('button', { name: i % 2 ? 'Not yet' : 'I had it' })
        .click();
      // Focus moves to the next card's heading, so the reader is not left at the bottom.
    }
    await expect(page.locator('[data-slot="round-summary"]')).toBeVisible();
    await expect
      .poll(() => names(backend))
      .toEqual(
        expect.arrayContaining([
          'practice_started',
          'practice_finished',
          'xp_earned',
        ]),
      );
  });
});

test.describe('sessions', () => {
  test.use({ viewport: PHONE });

  async function fillRequest(page: import('@playwright/test').Page) {
    await page.goto('/sessions/');
    await settle(page);
    await page.getByRole('radio', { name: /A group/ }).click();
    await page
      .getByLabel('What would you like to talk about? (optional)')
      .fill('October 7 and the war');
    await page.getByRole('button', { name: 'Continue' }).click();

    // A day must be picked before going on, and the form says so.
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(
      page.getByText('Pick a day and a time to go on.'),
    ).toBeVisible();
    // Tomorrow (Wednesday 2 December) is open; Saturdays are not.
    await page
      .getByRole('button', { name: /^Wednesday, December 2, 2026/ })
      .click();
    await page.getByRole('radio', { name: /1:00/ }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    // Details: an email that is not one stops the step and takes focus.
    const email = page.getByRole('textbox', { name: 'Email' });
    await page.getByRole('textbox', { name: 'Name' }).fill('Dana');
    await email.fill('not-an-email');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(email).toBeFocused();
    await expect(
      page.getByRole('heading', { name: /Your details/ }),
    ).toBeVisible();
    await email.fill('dana@example.com');
    await page.getByRole('button', { name: 'Continue' }).click();

    // The summary says what will be sent, and each line can be changed.
    const summary = page.locator('[data-slot="multi-step-form-summary"]');
    await expect(summary).toContainText('A group');
    await expect(summary).toContainText('October 7 and the war');
    await expect(summary).toContainText('Wednesday, December 2, 2026');
    await expect(summary).toContainText('13:00 ET');
    await expect(summary).toContainText('dana@example.com');
  }

  test('an email that is not one says what is wrong', async ({ page }) => {
    // The step names the field and says why, not only where (Interlace #229).
    await page.goto('/sessions/');
    await settle(page);
    await page.getByRole('button', { name: 'Continue' }).click();
    await page
      .getByRole('button', { name: /^Wednesday, December 2, 2026/ })
      .click();
    await page.getByRole('radio', { name: /1:00/ }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('Dana');
    const email = page.getByRole('textbox', { name: 'Email' });
    await email.fill('not-an-email');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(email).toHaveAttribute('aria-invalid', 'true', {
      timeout: 2000,
    });
    await expect(
      page
        .locator('[data-slot="multi-step-form-error"]')
        .filter({ visible: true }),
    ).toHaveText(/^Email: \S/);
  });

  test('pick a day and time, give details, check, request', async ({
    page,
    backend,
  }) => {
    await fillRequest(page);
    await page.getByRole('button', { name: 'Request the session' }).click();
    await expect(page.getByText('Request sent')).toBeVisible();
    expect(backend.requests).toEqual([
      expect.objectContaining({
        for_whom: 'group',
        topic: 'October 7 and the war',
        day: '2026-12-02',
        time: '13:00',
        time_zone: 'America/New_York',
        name: 'Dana',
        email: 'dana@example.com',
      }),
    ]);
  });

  test('a request that fails says so, keeps everything, and can be sent again', async ({
    page,
    backend,
  }) => {
    test.info().annotations.push({ type: 'console-error', description: '500' });
    await fillRequest(page);
    backend.failWrites = true;
    await page.getByRole('button', { name: 'Request the session' }).click();
    await expect(page.getByText('That did not go through')).toBeVisible();
    await expect(
      page.locator('[data-slot="multi-step-form-summary"]'),
    ).toContainText('dana@example.com');
    backend.failWrites = false;
    await page.getByRole('button', { name: 'Request the session' }).click();
    await expect(page.getByText('Request sent')).toBeVisible();
    expect(backend.requests).toHaveLength(1);
  });
});

test.describe('sign in and account', () => {
  test.use({ viewport: PHONE });

  test('signed out, the account page asks to sign in and comes back after', async ({
    page,
    backend,
  }) => {
    await page.goto('/account/');
    await expect(page).toHaveURL(/\/sign-in\/\?next=/);
    await settle(page);
    await page
      .getByRole('textbox', { name: 'Email' })
      .fill('reader@example.com');
    await page.getByRole('button', { name: 'Email me a code' }).click();
    await expect(page.getByText('Check your email')).toBeVisible();
    expect(backend.codesSentTo).toEqual(['reader@example.com']);

    // A wrong code says so, in words, where the code goes.
    test.info().annotations.push({ type: 'console-error', description: '403' });
    const code = page
      .getByRole('textbox', { name: 'Code from the email' })
      .first();
    await code.click();
    await page.keyboard.type('000000');
    // Supabase answers a mistyped code and an old one alike, so the words cover both.
    await expect(page.locator('[role="alert"]', { hasText: /\w/ })).toHaveText(
      'That code does not match, or it has expired. Check the email, or ask for a new code.',
    );

    // The wrong code is cleared and the first box focused, so the next try is just typing.
    await expect(code).toBeFocused();
    await expect(code).toHaveValue('');
    // The right code signs in and returns to the account page.
    await page.keyboard.type(OTP);
    await expect(page).toHaveURL(/\/account\/$/);
    await expect(
      page.getByRole('heading', { name: 'Your details' }),
    ).toBeVisible();

    // Saving a name says it saved; a failed save says that too.
    await page.getByLabel('First name').fill('Dana');
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.getByText('Saved.')).toBeVisible();
    expect(backend.profile?.first_name).toBe('Dana');

    test.info().annotations.push({ type: 'console-error', description: '500' });
    backend.failWrites = true;
    await page.getByLabel('First name').fill('Dan');
    await page.getByRole('button', { name: /save/i }).click();
    await expect(
      page.getByText('Your details could not be saved. Please try again.'),
    ).toBeVisible();
  });

  test('a cancelled sign-in comes back with words a parent can act on', async ({
    page,
  }) => {
    await page.goto('/sign-in/?error=cancelled');
    await settle(page);
    await expect(
      page.getByText(
        'That sign-in was cancelled. Try again, or choose another way in.',
      ),
    ).toBeVisible();
  });

  test('the sign-in page never sends anyone to another site', async ({
    page,
  }) => {
    await page.goto('/sign-in/?next=//evil.example/');
    await settle(page);
    await page
      .getByRole('textbox', { name: 'Email' })
      .fill('reader@example.com');
    await page.getByRole('button', { name: 'Email me a code' }).click();
    await page
      .getByRole('textbox', { name: 'Code from the email' })
      .first()
      .click();
    await page.keyboard.type(OTP);
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/account\/$/);
  });
});
