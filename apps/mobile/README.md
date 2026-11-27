# The WhyLikeDIs app

The iOS and Android app, built with Expo and React Native. It is a shell of sections: games, the
answers they draw from, and updates on our work, with room for what comes next (sessions and more).
It does not copy the site screen by screen.

## What it does today

- **Play** holds today's question ("What would you say?"), the streak that the question keeps, and
  a practice round of five that brings back the ones a player has not got yet.
- **Answers** is every answer in the app, searchable, with each quote opening its source.
- **Updates** lists answers as they are finished, newest first, dated by their last review. Only
  our own work appears there, and only once a second reader has checked it.
- **Reading** (on Play) sets the text size (100 to 150%, on top of the phone's own) and an opt-in AAA
  More contrast mode, which keeps the flag blue as the one accent. Both stay on the phone.
- Progress stays on the phone. There is no account yet, and nothing is sent anywhere.

## How it is built

| Piece        | Where                          | What it does                                                                                                                                                            |
| ------------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sections     | `lib/shell/sections.ts`        | The tab bar's table of contents. A new section is a route in `app/(tabs)/` plus one entry; `enabled: false` hides its tab.                                              |
| Game engine  | `lib/engine/`                  | The contract every game keeps (`types.ts`: modes, `deal`, `judge`), the round as a reducer (`session.ts`), and the event log (`events.ts`).                             |
| Games        | `lib/games/`, `app/play/<id>/` | A game's rules are pure and tested; its screens live under its own route folder. `catalog.ts` lists what Play shows, live or coming.                                    |
| Player state | `lib/store/`, `lib/player.tsx` | A versioned document with migrations, holding an append-only event log. Logs merge by event id, so syncing devices later cannot lose or double anything.                |
| Sync         | `lib/sync/`                    | `syncOnce` pushes this device's new events and pulls the rest, merging by id. Any remote that stores events by id works; none is wired up until there are accounts.     |
| Crash safety | `lib/errors/`                  | Every caught failure goes through `reportError`. A screen that throws shows `ScreenError` instead of a blank app. A crash service can be plugged in with `setReporter`. |

To add a game: write its `Game` in `lib/games/<id>.ts` with tests, add its screens under
`app/play/<id>/` using `useGameSession`, and set it live in `catalog.ts`.

Problems are also kept on the device (`lib/errors/log.ts`) and listed on the About screen (Play,
then "About this app"), with the startup times from `lib/perf.ts`. "Share diagnostics" opens the
share sheet; nothing is sent on its own. The Updates tab shows a badge for updates not yet seen.

## Content

The app bundles its answers and updates in `content/pack.json`, so it opens fast and works offline.
`npm run content` writes that file from the fact base: it runs `apps/site/export.py`, then `appPack`
from `@whylikedis/content`. A store build ships verified cards only, as the hosted site does.
`APP_PREVIEW=1 npm run content` includes the drafts, labelled "Still being checked". EAS runs the
same command after installing (`eas-build-post-install`).

## Interlace

Every component comes from Interlace's native layer, `@interlace/native`, copied into `interlace/` by
`npm run sync:interlace -- <path to an interlace checkout>`. `interlace/source.json` names the commit
it came from. Never edit the copies. A missing piece is built in Interlace, then synced here. The
brand reaches Interlace through token overrides in `lib/theme.ts`, and `lib/theme.test.ts` holds
them to the WCAG floors.

## Orientation

The app is portrait only (`orientation` in `app.json`). It also runs on iPad, where Apple wants every
orientation unless the app opts out of split view, so `ios.requireFullScreen` is `true` (iOS
`UIRequiresFullScreen`). `lib/app-config.test.ts` holds the two together. Landscape and split view
need their own layouts first; drop the flag when they exist.

## Performance

- React Native's New Architecture and Hermes. The bundle ships as bytecode.
- `budget.json` sets size budgets: the Hermes bytecode per platform and the content pack.
  `npm run bundle:check` makes a production export and fails over budget.
- Motion runs on the UI thread (Reanimated), and the slider uses Gesture Handler.
- Long lists use FlashList. Tabs are the platform's own tab bar.
- The fonts are the system's and the answers are bundled. The splash stays up until the player's
  state has loaded (one read), so no screen draws twice.

## Tests

- `npm test`: the engine, the store and its migrations, the games, the sections and error
  reporting, in Node.
- `npm run e2e`: [Maestro](https://maestro.dev) flows in `.maestro/` (the daily game, a practice
  round, every tab, progress surviving a restart). They need a simulator or emulator running a dev
  or preview build.

## Commands

```bash
npm run start -w @whylikedis/mobile          # Expo dev server (scan the QR code with Expo Go or a dev build)
npm run ios -w @whylikedis/mobile            # build and run on the iOS simulator (needs Xcode)
npm run preview:web -w @whylikedis/mobile    # a quick look in a browser, for screenshots only
npm run typecheck -w @whylikedis/mobile
npm test -w @whylikedis/mobile
npm run bundle:check -w @whylikedis/mobile   # production iOS and Android bundles, held to budget
npm run e2e -w @whylikedis/mobile            # Maestro flows on a running simulator
```

`eas.json` has development, preview and production profiles. Nothing has been built with it yet:
EAS builds and store accounts need an Apple Developer account ($99 a year) and a Google Play
account ($25 once), and both wait for the owners.
