# TapSum concept exploration

## Screen inventory

- **Purpose:** give a returning or new player a clear way into a round, with enough context to understand the memory-and-sum challenge.
- **Main action:** Play starts the game scene.
- **Required information:** TapSum name, personal best (the observed first-run value is `0`), a concise sample of the arithmetic loop, and access to help.
- **Required utilities:** sound toggle, support/donation, leaderboard, and how-to-play.
- **Game explanation:** each round shows a signed number; the player keeps a running total and uses `+1`, `+10`, `+100`, or `+1000` to reach the target exactly. Overshoot or timeout ends the run.
- **Rendering:** the Ionic React app is a shell. The screen is drawn in Phaser; Capacitor locks native devices to portrait. The web build scales a portrait canvas to the available viewport. These concepts are static HTML/CSS so they can be compared without changing Ionic or Phaser.
- **Assets:** existing TapSum icon and bundled Coiny font are reused where they suit the direction. No image or player data is invented.

## Four directions

### Arithmetic Broadside — editorial / Swiss

- **Philosophy:** treat the running total as a piece of editorial arithmetic. The equation itself is the graphic; whitespace and an asymmetric grid provide the energy.
- **Palette:** paper `#F7F8F5`, ink `#10253A`, cobalt `#315BCB`, signal yellow `#F2C94C`.
- **Type:** system grotesk for reading, Coiny reserved for the TapSum wordmark, oversized tabular sans numerals for the sum.
- **Composition:** left-aligned headline; open equation spans the width with the result enlarged at the far edge; record and Play sit on separate grid columns. No feature card.
- **Navigation / interactions:** utilities are small, named text controls; Play appears within the equation’s reading path; leaderboard and help remain plain links.
- **Difference:** replaces the centered stack with an asymmetrical page-like grid and makes the arithmetic, rather than a logo card, the visual anchor.
- **Advantages:** fast to scan, clear at a glance, works well for older players and small screens.
- **Limitations / audience fit:** less exuberant for younger players; strongest for a learning-oriented or all-ages presentation.

### Number Carnival — playful / expressive

- **Philosophy:** make the start screen feel like a physical toy. The sample numbers orbit a large target button in a custom SVG illustration.
- **Palette:** midnight `#14213D`, coral `#FF5A4E`, aqua `#4DD6C8`, lemon `#FFD84D`, violet `#9074FF`.
- **Type:** Chicle for the expressive wordmark and headline; Coiny for numbers and brief labels; restrained system sans for utility text.
- **Composition:** one bright play stage fills the center; number pieces, a tap target, and the illustrated hand create a single focal scene. The name and primary action occupy a bold lower band; utilities sit in small corner controls.
- **Navigation / interactions:** large Play control, with help and leaderboard as small tactile secondary controls; sound is a corner toggle; support is a quiet utility.
- **Difference:** replaces typographic restraint with an authored illustration, overlapping forms, and a more energetic focal point.
- **Advantages:** strongest immediate appeal for children and casual play; the core interaction is communicated visually.
- **Limitations / audience fit:** more visually busy and less neutral; older players may prefer a calmer direction.

### Quiet Scorekeeper — modern / premium

- **Philosophy:** make the personal best feel like a considered practice record. Calm space, precise typography, and one restrained accent put attention on the player’s progress.
- **Palette:** cool mist `#F4F7F5`, ink `#17242E`, secondary `#5C6B72`, deep teal `#137E72`.
- **Type:** system sans throughout, with tabular numerals for scores; no decorative display face beyond the existing brand mark.
- **Composition:** score leads in a tall open field; the `+5 +3 = 8` example sits beneath as a quiet line; Play follows as a simple, dark action. Secondary destinations are a short footer list.
- **Navigation / interactions:** clear text links for leaderboard and instructions, utility controls in a quiet top row, one filled primary action.
- **Difference:** score-first hierarchy and low-chrome layout; no illustration, colorful number chips, or large branded title block.
- **Advantages:** feels focused and mature, gives repeat players a clear personal reference, and uses minimal visual noise.
- **Limitations / audience fit:** may understate the fun and feel too restrained for younger players or a hypercasual tone.

### Sum Machine — experimental

- **Philosophy:** render memory as a vertical machine tape. The values travel down a route and converge on the result; Play becomes the machine’s physical control.
- **Palette:** carbon `#121821`, paper `#F4F5EF`, acid lime `#D0F35C`, sky `#65D3FF`, coral `#FF6F59`.
- **Type:** bundled Akt SemiBold for labels, Coiny as a compact brand signature, large tabular numerals for each stage of the route.
- **Composition:** an off-center vertical sum tape occupies the main field; the record sits in a counter block; a tall right-edge Play control anchors the screen. The utility navigation forms a compact bottom rail.
- **Navigation / interactions:** edge-mounted Play is visibly labelled and thumb-sized; help, leaderboard, sound, and support remain separately named controls. Focus outlines and pressed feedback stay visible.
- **Difference:** replaces the familiar header-and-content stack with a route diagram, side action, and bottom utility rail.
- **Advantages:** memorable and specific to the game’s sequence of signed values; the route suggests progression without adding mechanics.
- **Limitations / audience fit:** highest novelty and learning cost; needs careful testing to keep the edge action obvious and comfortable on short screens.

All interactions are mockup-only. Play and support display a notice, sound only toggles its visual state, and leaderboard/help dialogs use no invented player data.
