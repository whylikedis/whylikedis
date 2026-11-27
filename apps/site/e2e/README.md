# The site in a browser

Playwright checks of the built site. They answer one question: does every page work for every
reader, the way a reader meets it?

## Run them

```bash
npm run e2e:build --workspace @whylikedis/site   # the site, with a fake back end (env.mjs)
npm run e2e:docker --workspace @whylikedis/site  # everything, in the pinned image, as CI runs it
npm run e2e --workspace @whylikedis/site         # the no-pixel checks only, on this machine
```

The Docker script needs a running Docker. Screenshots run only there, so a laptop, a cloud agent
and CI render the same pixels.

## What is checked

| File                 | What                                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pages.spec.ts`      | Every page in six reading conditions: axe, no sideways scroll, one `h1`, the skip link, Hebrew and Arabic marked, the header                                                          |
| `journeys.spec.ts`   | Daily question, practice round, booking a session, signing in and the account page, and what analytics heard                                                                          |
| `states.spec.ts`     | Storage off, offline, a slow or failing back end, long words, keyboard only, no JavaScript, an address that leads nowhere                                                             |
| `rooms.spec.ts`      | Live rooms: a host and phones over a fake Realtime that drops, delays, repeats and reorders; late joiners, a host reload, thirty players, keyboard only, live regions, reduced motion |
| `room-rules.spec.ts` | The rules of a room without a browser: who may join and when, repeats, late and out-of-order messages, thirty players                                                                 |
| `settles.spec.ts`    | A ready page does not change between screenshots on a slow CPU (what the nightly check needs), and a flip card stays flat with reduced motion                                         |
| `visual.spec.ts`     | Every page at 390, 820 and 1440 pixels, light and dark, against `baselines/`                                                                                                          |

Every check also fails on a console error and on any request to a host other than the site and
its two fakes. A test that expects an error says so with a `console-error` annotation.

## When a check fails

- **A new page.** Add it to `pages.ts`. `every page under app/ is checked` names what is missing.
- **An intended visual change.** `npm run e2e:docker:update --workspace @whylikedis/site`, look at
  the new PNGs, and commit only the ones your change meant to move.
- **A known failure.** `known.json` lists failures not fixed yet. A new failure fails CI, and so
  does a fixed one still listed: delete its line in the PR that fixes it. Never add a line to get
  a PR green without saying why in the PR.

Never add a retry or loosen a threshold to get green: fix the cause.
