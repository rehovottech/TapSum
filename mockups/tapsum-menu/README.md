# TapSum main menu concept

This folder contains a browser-only visual mockup. It does not import, edit, or run the production Ionic or Phaser scenes.

## Open it

Open `index.html` directly in Chrome or another modern browser. The mockup loads the existing Coiny font and TapSum app icon by relative path from `public/assets/`.

The left preview shows the portrait game canvas inside a desktop viewport. The right preview shows the 390 × 844 phone layout. Narrow browser windows stack the two previews vertically.

The controls only demonstrate visual states. Play and support show a preview notice; How to play opens the existing instructions; Leaderboard explains that live leaderboard data is not faked; and the sound control toggles its display state without playing audio.

## Design notes

- Main question: what should I tap to start a round? Play is the clearest and largest action.
- The signature element is a number trail: `+5 +3 = 8`, pairing the existing sample with Remember, Count, and Tap.
- The Coiny face, TapSum icon, sky-blue ground, navy ink, green Play action, and yellow target are reused from the existing project theme and assets.
- The best score is shown as a real zero, matching the current first-run screen, rather than an invented leaderboard or vanity score.
- The layout keeps the portrait game surface and adapts its text and spacing inside the desktop and phone frames.
