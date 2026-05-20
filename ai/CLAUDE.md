# Claude Prompt — Ionic React + Phaser Memory Game

You are a senior game developer expert in Ionic React, Phaser 3, Capacitor, AdMob integration, Firebase, and mobile game UX.

Create a COMPLETE production-ready Phaser game inside an Ionic React project.

The game should be optimized for:
- Android mobile devices
- Smooth 60fps gameplay
- Low memory usage
- Clean scalable architecture
- Future extensibility
- Touch controls
- Kids-friendly polished UI
- Reward loop retention mechanics

Use modern TypeScript.

---

# Existing Project Structure

Game scenes are located under:

src/game/scenes/

Existing scenes:
- Boot.ts
- Preloader.ts
- Menu.ts
- Game.ts
- End.ts

The project already has:
- Capacitor
- AdMob integration
- Firebase integration
- Google Play Games Services support

Use existing AdMob helper/service functions if available.

---

# Game Concept

The game is a MEMORY + COUNTING reflex game.

Player must remember cumulative tap counts.

Example:
- Round 1 → Number shows 1 → Tap button 1 time
- Round 2 → Number shows 2 → Tap button 3 times total
- Round 3 → Number shows 3 → Tap button 6 times total
- Round 4 → Number shows 4 → Tap button 10 times total

Formula:
Current required taps = Previous total + Current round number

If player taps incorrectly OR timer ends:
→ Game Over

Each successful round:
+10 score

Game becomes progressively harder.

---

# Required Scenes

---

# 1. Boot Scene

Responsibilities:
- Show animated brand logo
- Smooth fade-in/fade-out
- Initialize save data
- Load game config JSON if needed
- Setup Firebase/Game Services
- Prepare responsive scaling
- Then move to Preloader scene

Requirements:
- Clean minimal animation
- Use Phaser tweens
- Mobile optimized

---

# 2. Preloader Scene

Responsibilities:
- Load ALL assets:
  - Images
  - Buttons
  - UI assets
  - Sounds
  - Particle textures
  - Spritesheets
  - Backgrounds

Requirements:
- Attractive loading bar
- Percentage text
- Small loading animations
- Responsive layout
- On complete → Menu scene

---

# 3. Menu Scene

UI Requirements:
- Beautiful modern mobile game menu
- Animated background
- Floating particles
- Big PLAY button
- Leaderboard button
- Sound toggle
- Best score display
- Brand logo/title

Buttons:
- Play → Game scene
- Leaderboard → Open Google Play leaderboard

Use:
- Button hover/tap animations
- Soft shadows
- 3D feel buttons
- Smooth transitions

AdMob:
- Show banner ad at bottom on menu scene

---

# 4. Game Scene

This is the MAIN gameplay scene.

---

## Layout

Split screen into 2 sections:

### TOP HALF
Contains:
- Current number in center
- Score in top-right
- Back button in top-left
- Round indicator
- Remaining time/progress bar

### BOTTOM HALF
Contains:
- Large circular 3D button
- Animated touch feedback
- Pulse animation
- Tap particles

---

# Gameplay Logic

At each round:
1. Show current number
2. Calculate required cumulative taps
3. Player taps button
4. Count taps
5. If correct:
   - Add +10 score
   - Animate score flying to score counter
   - Increase round
   - Increase speed/difficulty
6. If wrong OR timer ends:
   - Go to End Scene

---

# Difficulty System

Every few rounds:
- Reduce timer slightly
- Increase animation speed
- Add camera shake on tap
- Add combo effects

---

# Animations Required

Use polished game feel:
- Juice effects
- Button squash/stretch
- Floating particles
- Number pop animations
- Score fly animation
- Screen flash on success
- Tiny camera shake
- Pulse tween
- Glow effects

Make gameplay satisfying and addictive.

---

# Sound Design

Add support for:
- Tap sound
- Success sound
- Fail sound
- UI click sound
- Reward sound

Include sound manager structure.

---

# Scoring

Score:
+10 per successful round

Bonus:
- Combo multiplier possible
- Save best score locally
- Save to leaderboard

---

# Google Play Leaderboard

Requirements:
- Submit high score
- Open leaderboard popup/button
- Graceful fallback if unavailable

Use clean service abstraction.

---

# AdMob Requirements

Integrate:

## Banner Ads
Show:
- Menu Scene
- End Scene

Hide during gameplay.

---

## Interstitial Ads
Show:
- When player exits game
- When game over and player closes end popup

Use frequency control:
- Avoid showing too often

---

## Reward Video Ads

At End Scene:
- "Continue" button
- Watch reward ad
- Continue game from same score/round

Requirements:
- Handle ad loading state
- Handle failure fallback
- Reward callback support

---

# 5. End Scene

Show:
- Final score
- Best score
- Reward animation
- Particle explosion
- Continue button
- Home button
- Retry button

Buttons:
- Continue → Reward Video Ad
- Retry → Restart game
- Home → Show interstitial ad then go Menu

Add:
- Smooth popup tween
- Dimmed background
- Celebratory particles

---

# Architecture Requirements

Create clean scalable architecture:

Recommended:
- Managers/
- Services/
- UI/
- Utils/
- Constants/

Examples:
- AdManager
- AudioManager
- ScoreManager
- SaveManager
- LeaderboardManager

---

# Coding Standards

Requirements:
- Strong TypeScript typing
- Reusable helper methods
- Clean scene lifecycle
- No duplicated logic
- Mobile-safe memory cleanup
- Phaser best practices
- Comment important logic

---

# Mobile Optimization

Must:
- Support all screen sizes
- Use responsive scaling
- Handle pause/resume
- Avoid memory leaks
- Optimize textures
- Smooth touch controls

---

# Visual Style

Style:
- Modern hypercasual game
- Bright colorful gradients
- Smooth UI
- Slight neon glow
- Soft shadows
- Polished transitions
- Premium feel

---

# Deliverables

Generate:
1. Full Phaser scene code
2. Helper managers/services
3. AdMob integration structure
4. Firebase leaderboard integration
5. Asset loading examples
6. Scene transitions
7. UI creation helpers
8. Timer logic
9. Gameplay logic
10. Particle systems
11. Animation systems
12. Recommended folder structure

Generate COMPLETE code with explanations.

Do NOT give pseudo code.

Provide production-ready TypeScript implementation.