# TapSum mockup coverage

## Coverage check

The companion `SCENE_INVENTORY.md` lists five registered Phaser scenes and seventeen screen/state records, including overlays, data states, end reasons, and the native support handoff. All seventeen records have a corresponding prototype state in `prototype.html`/`prototype.js` and a selectable route in `index.html`.

| Inventory state | Prototype route | Covered |
|---|---|---|
| Boot splash / initial progress | `?screen=boot` | Yes |
| TapSum preload | `?screen=preload` | Yes |
| Main menu / first-run record | `?screen=menu` | Yes |
| How-to-play overlay | `?screen=help` | Yes |
| Leaderboard loading | `?screen=leaderboard-loading` | Yes |
| Empty leaderboard | `?screen=leaderboard-empty` | Yes |
| Populated leaderboard / pinned personal row | `?screen=leaderboard-ranked` | Yes |
| Active positive early gameplay | `?screen=gameplay-start` | Yes |
| Low-time negative gameplay | `?screen=gameplay-warning` | Yes |
| Pause / sound / resume / quit | `?screen=pause` | Yes |
| Correct-answer feedback | `?screen=round-success` | Yes |
| Overshoot end | `?screen=end-overshoot` | Yes |
| Timeout end | `?screen=end-timeout` | Yes |
| Voluntary quit end | `?screen=end-quit` | Yes |
| New-best celebration / pending rank | `?screen=end-new-best` | Yes |
| Rank unavailable | `?screen=end-no-rank` | Yes |
| Purchase-plugin support handoff | `?screen=support` | Yes, handoff representation only |

**Count:** 5 registered scenes audited; 17 individually selectable mockup states created. The scenes are represented by their screen routes; state routes are not additive Phaser scenes.

## Navigation and interaction

- Open `index.html` for the screen index. Each entry opens its corresponding prototype state.
- In an individual screen, use **Previous**, **Next**, **All screens**, and the in-game actions to move between related states.
- Menu Play opens the early gameplay state; Help and Leaderboard open their overlays/states; leaderboard tabs switch among loading, empty, and populated examples.
- Gameplay increment controls demonstrate tap feedback and update the tap pips; the success state is separately selectable, avoiding a false simulation of the game rules. Pause opens the pause state. Pause Resume returns to gameplay, Sound changes its visual state, and Quit Run opens the quit summary.
- End screens link to Play Again and Menu. Sample scores, rank, timer, totals, and leaderboard rows are static design examples; game rules and backend services are not connected.

## Requirements accounted for

- No separate level picker, tutorial scene, victory scene, or dedicated settings page exists in source.
- Gameplay has no distinct success scene. Correct matching creates brief in-scene score/celebration feedback and advances to the next round; that transient state is mocked.
- The donation sheet itself belongs to the Rehovot Capacitor purchases plugin. The prototype can show the handoff entry but cannot reproduce the native vendor-rendered flow as a project-owned screen.
- Portrait is the actual game canvas on native and web; native is locked portrait and web scales/centers a portrait canvas. Gallery layout responds to desktop/tablet/mobile while the playable screen stays portrait.

## Verification

- `SCENE_INVENTORY.md` was compared against all 17 state keys in `prototype.js` and the gallery route builder in `index.html`; an automated DOM pass loaded each state from its direct file URL with no missing render cases.
- Navigation controls and related destinations were checked for all 17 states. The game screen index was captured in a real browser at 1440px, 768px, and 390px; the main menu was captured at 390px and refined after review.
- The Taste source lint passes with 0 FAIL and 0 WARN. Browser inspection of the game menu reports 0 FAIL and 1 WARN for compact sub-13px labels. The gallery in app-screen inspection reports 0 FAIL and 2 WARN: the gallery headline is intentionally editorial in scale, and the scrollable index shows seven of its seventeen entries above the desktop fold.
- Prototype interactions demonstrate navigation, tap pips, sound-state toggling, and pause/resume/quit paths. They are design examples; game rules, audio, network, authentication, leaderboard data, and purchases are not connected.
- The purchases plugin renders its own native donation/payment UI; only the project-owned handoff is mocked. That external vendor screen is the one UI surface not recreated in HTML.
