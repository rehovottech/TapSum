# TapSum scene inventory

Audited against the registered Phaser scene list in `src/config/Phaser.ts` and the UI/state branches in each scene. Ionic supplies the application shell only: `src/App.tsx` mounts one `IonPage` containing `src/components/Phaser.tsx`; there are no Ionic Router routes or separate Ionic game pages.

## Rendering and device constraints

- Native Capacitor startup calls `ScreenOrientation.lock({ orientation: 'portrait' })` in `src/App.tsx`.
- Web resizes a fixed portrait Phaser canvas to a 720×1280, 720×1440, or 720×1600 logical size based on viewport ratio in `src/game/utils/Resize.ts`. Wider desktop viewports letterbox/center the portrait canvas. There is no landscape gameplay layout.
- The prototype therefore keeps each game screen portrait at all viewport widths. The gallery and its screen selector reflow for desktop, tablet, and phone; landscape review keeps the portrait game frame centered.
- Existing visual assets: TapSum app icons at `public/assets/icons/`, Rehovot startup logo atlas at `public/assets/sprite/logo*.png` and JSON, Coiny and Krungthep bitmap fonts at `public/assets/font/`, display fonts Coiny/Chicle/Akt, medal SVGs at `public/assets/medal/`, and sound effects/music at `public/assets/audio/`.

## Registered scenes

| Scene | Source | Purpose | Entry point / how reached |
|---|---|---|---|
| Boot | `src/game/scene/Boot.ts` | Rehovot logo splash and initial asset progress bar; initializes audio and begins anonymous Firebase sign-in. | First entry in `scene` array in `src/config/Phaser.ts`; after its ~2 second logo hold, transitions to Preload. |
| Preload | `src/game/scene/Preloader.ts` | TapSum loading screen with animated progress bar, tagline, and percentage. | Started by Boot; transitions to Menu after progress animation and delay. |
| Menu | `src/game/scene/Menu.ts` | Main entry point; TapSum mark/title, three-step sample, personal best, Play, leaderboard, help, sound, and conditional support/donation action. | Started by Preload; returned to by End → Menu. |
| Game | `src/game/scene/Game.ts` | Endless timed memory-and-add rounds, score, timer, remembered-number tape, tap pips, increment controls, pause. | Menu → Play; End → Play Again; pause → Resume. |
| End | `src/game/scene/End.ts` | Run summary after failure or voluntary quit: reason, required vs tapped total, recent deltas, score, rounds survived, world rank, best comparison, replay/menu. | Game → End for `overshoot`, `timeout`, or `quit`. |

## Screen, overlay, and state inventory

The prototype exposes the following distinct review states. Some share a source scene and layout but have materially different content/state branches.

| ID | Screen/state | Source | Purpose and entry path |
|---|---|---|---|
| `boot` | Boot splash / startup progress | `src/game/scene/Boot.ts` | Opening the prototype gallery and choosing Boot; actual app starts here. Logo progress is part of Boot, not another scene. |
| `preload` | TapSum loading | `src/game/scene/Preloader.ts` | Boot → Preload. |
| `menu` | Main menu, first-run best 0 | `src/game/scene/Menu.ts` | Preload → Menu; End → Menu. |
| `help` | How-to-play overlay | `src/game/scene/Menu.ts` (`openHelpPopup`) | Menu → How to Play; close returns to Menu. |
| `leaderboard-loading` | Leaderboard loading | `src/game/ui/LeaderboardPanel.ts` (`build`, `load`) | Menu → Leaderboard, loading before Firebase resolves. |
| `leaderboard-empty` | Empty leaderboard and no personal rank | `src/game/ui/LeaderboardPanel.ts` (`renderList`) | Leaderboard when no players/rank; in source, fetch failure also falls back to an empty list. |
| `leaderboard-ranked` | Populated top list plus pinned personal row | `src/game/ui/LeaderboardPanel.ts` (`renderList`) | Leaderboard after data resolves; row list scrolls and personal row remains pinned. Names/scores in prototype are clearly marked illustrative examples, not live player data. |
| `gameplay-start` | Active early positive round | `src/game/scene/Game.ts` (`startRound`, `createTimerRing`, `createIncrementButtons`) | Menu → Play. Sample state: Round 1, target +8, current 5, score 0. |
| `gameplay-warning` | Active later round, negative target, low-time warning, remembered deltas and tap pips | `src/game/scene/Game.ts` (`redrawRing`, `showTape`, `redrawPips`) | Select the warning gameplay state in the prototype; source reaches low-time warning when timer ratio is at most 25%. |
| `pause` | Pause overlay with round/score, resume, sound toggle, quit run | `src/game/scene/Game.ts` (`openPause`, `closePause`) | Gameplay → pause control; Resume returns to the underlying round (target and tape are hidden while paused); Quit Run → End/quit. |
| `round-success` | Correct-total feedback / score award | `src/game/scene/Game.ts` (`onRoundSuccess`) | Gameplay when current total equals target; +10 score, celebration, buttons flash green, then next round begins. It is transient and does not create a separate Phaser scene. |
| `end-overshoot` | Game over: too much | `src/game/scene/End.ts`, reason `overshoot` | Game → End when current total exceeds target. Includes needed/tapped and recent values. |
| `end-timeout` | Game over: time's up | `src/game/scene/End.ts`, reason `timeout` | Game → End when timer expires. |
| `end-quit` | Run ended by player | `src/game/scene/End.ts`, reason `quit` | Pause → Quit Run → End; compact “stopped at round” summary. |
| `end-new-best` | New-best celebration and rank pending | `src/game/scene/End.ts` (`isNewBest`, `fetchAndShowRank`, `celebrationBurst`) | Any nonzero run that meets/exceeds saved best; header prioritizes “NEW BEST!” and rank initially displays pending. |
| `end-no-rank` | Summary with unavailable rank | `src/game/scene/End.ts` (`fetchAndShowRank` catch / rank ≤ 0) | Network/profile unavailable or player not ranked; rank shows a dash. |
| `support` | Support/donation handoff | `src/game/scene/Menu.ts` (`checkPurchaseButton`, `createDonateButton`), `src/services/Purchases.ts` | Conditional support action on unsupported/unowned state, or automatic donation prompt after the configured interval. The actual purchase UI is rendered by the native purchases plugin, not by a project scene; prototype shows a clearly identified handoff representation only. |

## Other branches checked

- **Pause sound state:** sound is switched ON/OFF inside the pause overlay; there is no standalone settings scene.
- **Menu sound state:** top-right speaker control toggles saved audio state; this is part of Menu, not a separate scene.
- **Leaderboard fetch failure:** service code returns an empty list / missing rank, so it resolves to the empty/rank-unavailable presentation rather than a bespoke error scene.
- **No level-selection scene:** the game is an endless round sequence; no level map or stage picker is registered.
- **No victory/completion scene:** rounds continue without a final completion condition. Success is a brief in-game feedback state; loss/quit are summarized in End.
- **Notifications and lifecycle:** `src/services/Notification.ts` schedules a reminder and `src/game/managers/AudioManager.ts` responds to app visibility/suspend. Neither adds an in-game screen.
- **No confirmation modal:** quitting ends the run directly; the existing pause sheet is the decision surface.
