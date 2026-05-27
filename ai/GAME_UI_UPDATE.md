# Claude Prompt — Update TapSum Controls To 4 Square Increment Buttons

You are a senior Phaser 3 + Ionic React + TypeScript game developer.

Update the EXISTING TapSum gameplay UI and input system.

IMPORTANT:
Keep ALL existing gameplay systems exactly the same:
- Number generation
- Cumulative calculation logic
- Positive/negative numbers
- Timer system
- Score system
- Firebase leaderboard
- Difficulty scaling

ONLY replace the bottom tap control UI.

---

# Updated Input System

Remove:
- Split semi-circle buttons
- +1 / +10 half-circle UI

Replace with:

FOUR square increment buttons.

---

# New Button Layout

Bottom gameplay section should contain:

+1
+10
+100
+1000

Arrange them in:
- 2x2 grid
OR
- Horizontal responsive row

Choose the BEST mobile-friendly layout.

---

# Button Actions

Each tap adds:

+1 button:
Adds 1

+10 button:
Adds 10

+100 button:
Adds 100

+1000 button:
Adds 1000

---

# Core Gameplay Rule

Player must reach EXACT target total.

Examples:

Target = 234

Possible taps:
+100
+100
+10
+10
+10
+1
+1
+1
+1

Total = 234

SUCCESS.

---

# Overshoot Rule

If current total exceeds target:
→ Immediate FAIL

Example:

Target = 234

Current = 200

Player taps +100

Total = 300

→ GAME OVER instantly

---

# Validation Rules

Success:
currentTotal === targetTotal

Fail:
currentTotal > targetTotal

Continue:
currentTotal < targetTotal

---

# UI Requirements

Buttons should:
- Be large
- Mobile friendly
- Easy to tap
- Hypercasual polished style
- Responsive

Visual hierarchy:

+1
- Smallest glow
- Blue

+10
- Medium glow
- Green

+100
- Strong glow
- Orange

+1000
- Premium powerful glow
- Purple/red

---

# Visual Style

Style:
- Modern hypercasual
- 3D button depth
- Neon gradients
- Rounded corners
- Soft shadows
- Gloss highlights
- Press animation

---

# Button Press Effects

Each tap should:
- Scale down slightly
- Bounce back
- Emit particles
- Play unique sound

Larger buttons should feel more powerful:
- +100 stronger shake
- +1000 stronger particles + tiny camera shake

---

# Smart Gameplay Balancing

Update number generation to match new input system.

Requirements:
- Ensure targets are solvable
- Avoid awkward impossible-feeling numbers
- Maintain satisfying flow

Suggested:
Generate targets strategically using:
1
10
100
1000 combinations

Examples:
111
240
1032
2121
999

---

# Difficulty Scaling

Early game:
- Mostly smaller targets
- Encourage +1 and +10 usage

Mid game:
- Introduce +100 usage

Late game:
- Require efficient +1000 usage

---

# Number Display Requirements

Top section should show:

Target Number
Current Progress
Remaining Difference
Score
Round Number
Timer

Example:

TARGET: 2341
CURRENT: 1340
LEFT: 1001

---

# Smart UX Features

Add:
- Remaining difference helper
- Number rolling animation
- Success flash
- Overshoot flash red
- Button glow hints (optional)

Example:
If remaining = 1000
→ Pulse +1000 button subtly

---

# Timer System

Keep existing updated timer system:

Task 1–9:
5 sec

Task 10–19:
7 sec

Task 20–29:
9 sec

Task 30+:
10 sec MAX

---

# Sound Design

Separate sound effects:

+1:
Soft click

+10:
Medium click

+100:
Heavy tap

+1000:
Power impact

Additional:
- Success sound
- Overshoot fail sound
- Timer warning sound

---

# Animation Requirements

Use Phaser tweens for:
- Button press
- Floating increment text
- Score fly animation
- Overshoot shake
- Timer pulse
- Success particles
- UI transitions

---

# Technical Requirements

Update:
- Game.ts
- UI layout system
- Input handlers
- Validation logic
- Responsive scaling
- Animations
- Audio hooks

---

# Required Helper Methods

Create reusable methods:

createIncrementButtons()

handleIncrementTap()

validateCurrentProgress()

updateRemainingDifference()

animateIncrementButton()

showOvershootEffect()

generateBalancedTarget()

---

# Mobile Optimization

Ensure:
- Large touch areas
- Fast tap response
- Multi-touch safe
- Responsive scaling
- Low memory usage
- Smooth FPS

---

# Deliverables

Generate COMPLETE production-ready TypeScript implementation for:
1. 4-button UI system
2. Input logic
3. Overshoot validation
4. Responsive layout
5. Number generation balancing
6. Animations
7. Sound integration
8. Phaser scene updates
9. Helper methods
10. Mobile optimization

Do NOT generate pseudo code.

Generate complete implementation-ready code.