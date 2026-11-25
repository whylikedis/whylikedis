# The WhyLikeDIs app

The iOS and Android app, built with Expo and React Native. It is the home of the games, so it does
not copy the site screen by screen.

## What it does today

- **Play** is the home tab. It holds today's question ("What would you say?"), the streak that the
  question keeps, and a practice round of five questions that brings back the ones a player has not
  got yet.
- **Answers** is every answer in the app, searchable, with each quote opening its source.
- Progress stays on the phone. There is no account yet, and nothing is sent anywhere.

## Content

The app bundles its answers in `content/pack.json`, so it opens fast and works offline. `npm run content`
writes that file from the fact base: it runs `apps/site/export.py`, then `appPack` from
`@whylikedis/content`. A store build ships verified cards only, as the hosted site does.
`APP_PREVIEW=1 npm run content` includes the drafts, labelled "Still being checked".

## Interlace

Every component comes from Interlace's native layer, `@interlace/native`, copied into `interlace/` by
`npm run sync:interlace -- <path to an interlace checkout>`. `interlace/source.json` names the commit
it came from. Never edit the copies. A missing piece is built in Interlace, then synced here. The
brand reaches Interlace through token overrides in `lib/theme.ts`, and `lib/theme.test.ts` holds
them to the WCAG floors.

## Performance

- React Native's New Architecture and Hermes. The bundle ships as bytecode.
- Motion runs on the UI thread (Reanimated), and the slider uses Gesture Handler.
- Long lists use FlashList. Tabs are the platform's own tab bar.
- The fonts are the system's, and the answers are bundled, so nothing loads before the first screen.

## Commands

```bash
npm run start -w @whylikedis/mobile          # Expo dev server (scan the QR code with Expo Go or a dev build)
npm run ios -w @whylikedis/mobile            # build and run on the iOS simulator (needs Xcode)
npm run preview:web -w @whylikedis/mobile    # a quick look in a browser, for screenshots only
npm run typecheck -w @whylikedis/mobile
npm test -w @whylikedis/mobile               # game rules and brand contrast
npm run bundle:check -w @whylikedis/mobile   # compile the iOS and Android bundles
```

Store builds (EAS) and store accounts are not set up. They need an Apple Developer account
($99 a year) and a Google Play account ($25 once), and both wait for the owners.
