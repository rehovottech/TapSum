# Claude Prompt — Update TapSum Core Gameplay Logic With Dual Semi-Circle Buttons

You are a senior Phaser 3 + Ionic React + TypeScript game developer.

Update the EXISTING TapSum game core gameplay logic and UI.

IMPORTANT:
Keep the EXISTING cumulative number system exactly the same.

Do NOT change:
- Number generation
- Positive/negative logic
- Score system
- Cumulative calculation system

ONLY update:
1. Bottom tap button visual and interaction
2. Timer system

---

# Updated Core Gameplay

The top gameplay logic remains exactly the same:
- Numbers appear
- Required cumulative total is calculated
- Player must reach EXACT required total

BUT:

The bottom single tap button is now replaced with TWO semi-circle buttons.

---

# New Button Layout

Replace the existing circular button with:

A split circle made of:
- TOP semi-circle button
- BOTTOM semi-circle button

Visual:
Like a circle cut horizontally into two halves.

---

# Button Actions

## TOP Semi Circle Button
Each tap:
+1

## BOTTOM Semi Circle Button
Each tap:
+10

---

# Gameplay Example

Required total = 24

Possible user actions:
- Tap +10 twice
- Tap +1 four times

Result:
10 + 10 + 1 + 1 + 1 + 1 = 24

Correct.

---

# Important Gameplay Rules

Player must reach EXACT target total.

If total exceeds required target:
→ Immediate Game Over

Example:
Required = 24

Current = 20

Player taps +10

Result = 30

→ FAIL immediately

---

# Validation Logic

Success only if:

currentTapTotal === requiredTapCount

Failure if:

currentTapTotal > requiredTapCount

---

# Updated UI Requirements

Bottom section should now contain:

TOP HALF BUTTON:
- +1 label
- Bright blue gradient
- Small pulse effect

BOTTOM HALF BUTTON:
- +10 label
- Orange/red gradient
- Stronger glow effect

Both should:
- Have 3D feel
- Be touch responsive
- Use squash/stretch animations
- Have shadows
- Support particles

---

# Visual Design Requirements

The semi-circle buttons should:
- Look like a single split circle
- Be modern hypercasual style
- Smooth rounded edges
- Neon glow
- Responsive on all screens

---

# Interaction Feedback

TOP (+1) tap:
- Small pulse
- Small particles
- Soft sound

BOTTOM (+10) tap:
- Bigger impact animation
- Larger particles
- Stronger sound
- Tiny camera shake

---

# Current Progress Display

Add live tap progress display:

Example:

Target: 24
Current: 13

Update instantly after each tap.

---

# Timer System Update

Replace old timer logic completely.

---

# New Timer Rules

Start with:
Minimum timer = 5 seconds

Every 10th task:
Add +2 seconds to minimum timer

BUT:
Maximum timer must NEVER exceed 10 seconds

---

# Timer Scaling Examples

Task 1–9:
5 sec

Task 10–19:
7 sec

Task 20–29:
9 sec

Task 30+:
10 sec MAX

---

# Timer Formula

Suggested formula:

baseTime = 5

extraTime = Math.floor(taskNumber / 10) * 2

finalTime = Math.min(10, baseTime + extraTime)

---

# Timer UI Requirements

Display:
- Circular timer
OR
Top progress bar

Add:
- Color transitions
- Red warning state under 2 sec
- Pulse animation near timeout

---

# Updated Gameplay Flow

At each task:

1. Generate number
2. Calculate required cumulative target
3. Reset current tap progress to 0
4. Start timer
5. User taps:
   - +1
   - +10
6. Validate after every tap:
   - Equal → success
   - Greater → fail
7. On success:
   - Add score
   - Animate points
   - Move next round
8. On timeout:
   - Game Over

---

# Difficulty & Balance Requirements

Ensure:
- Early rounds easy
- Mid rounds require strategic use of +10 button
- Later rounds become pressure-based
- Gameplay remains fair and satisfying

Avoid:
- Impossible low numbers with huge time pressure

---

# Animation Requirements

Use Phaser tweens for:
- Button press depth
- Glow pulse
- Number pop
- Timer pulse
- Warning flash
- Success particles
- Failure shake
- Floating score text

---

# Audio Requirements

Separate sounds for:
- +1 tap
- +10 tap
- Success
- Fail
- Timeout warning

---

# Technical Requirements

Update:
- Game.ts
- UI creation
- Tap validation
- Timer manager
- Input handling
- Animations
- Sound manager integration

---

# Required Helper Methods

Create reusable methods:

createSplitCircleButtons()

handlePlusOneTap()

handlePlusTenTap()

updateCurrentTapProgress()

validateTapProgress()

calculateTaskTime()

startTaskTimer()

animateButtonPress()

showOvershootFailure()

---

# Mobile Optimization

Ensure:
- Multi-touch safe
- Responsive layout
- Smooth FPS
- Optimized tweens
- Low memory usage
- Touch latency minimized

---

# Deliverables

Generate COMPLETE production-ready TypeScript implementation for:
1. Updated split-circle UI
2. +1/+10 tap logic
3. Overshoot validation
4. Updated timer system
5. Timer scaling
6. UI updates
7. Animations
8. Sound integration
9. Phaser scene modifications
10. Helper methods

Do NOT generate pseudo code.

Generate full implementation-ready code.