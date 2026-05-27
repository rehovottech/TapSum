# Claude Prompt — Update ONLY Number Generation Function For TapSum

You are a senior Phaser 3 + TypeScript game developer.

IMPORTANT:
Update ONLY the number generation logic/function.

DO NOT modify:
- UI
- Timer system
- Button system
- Scene structure
- Firebase
- Score logic
- Validation logic
- Animation logic
- Sound system

Keep everything else untouched.

---

# Updated Number Generation Logic

The game uses cumulative arithmetic progression.

At every task:
- Generate a random signed number
- Add it to cumulative total
- Player must tap EXACT cumulative total

IMPORTANT:
The cumulative total must NEVER become:
0
OR negative

Minimum cumulative total:
1

Use:
Math.max(1, cumulativeTotal)

---

# Gameplay Examples

Task 1:
Generated = +2
Cumulative = 2
Player taps 2

---

Task 2:
Generated = +5
Calculation:
2 + 5 = 7
Player taps 7

---

Task 3:
Generated = -3
Calculation:
7 - 3 = 4
Player taps 4

---

Task 4:
Generated = -10
Calculation:
4 - 10 = -6

INVALID.

Clamp:
Cumulative = 1

Player taps 1

---

# Difficulty Scaling Rules

Update random generation difficulty based on task number.

---

# TASK 1–10

Generate:
Single digit numbers only

Range:
-9 to +9

Exclude:
0

Examples:
+1
-3
+7
-9

Requirements:
- Easier gameplay
- Mostly positive numbers
- Small negative numbers only

Suggested:
80% positive
20% negative

---

# TASK 11–40

Generate:
Two digit numbers

Range:
-99 to +99

Exclude:
0

Examples:
+24
-18
+77
-45

Requirements:
- Balanced difficulty
- More strategic play

Suggested:
65% positive
35% negative

---

# TASK 41+

Generate:
Three digit numbers

Range:
-999 to +999

Exclude:
0

Examples:
+245
-122
+888
-501

Requirements:
- Hard gameplay
- Faster mental calculations

Suggested:
50% positive
50% negative

---

# Important Rules

NEVER generate:
0

NEVER allow cumulative total:
<= 0

ALWAYS clamp minimum cumulative value to:
1

---

# Required Function Behavior

The number generation function should return:

{
  generatedValue,
  cumulativeTotal
}

Example:

{
  generatedValue: -5,
  cumulativeTotal: 12
}

---

# Random Generation Rules

Use smart randomization:
- Avoid repetitive patterns
- Avoid too many negatives in a row
- Avoid impossible-feeling swings
- Keep gameplay fair

---

# Required Logic Improvements

Add:
- Consecutive negative protection
- Weighted randomness
- Difficulty scaling
- Clamp protection

---

# Suggested Internal State

Track:
- currentTask
- cumulativeTotal
- previousGeneratedValues
- consecutiveNegativeCount

---

# Required Helper Methods

Create/update ONLY these methods:

generateTaskValue()

getDifficultyRange()

getWeightedRandomSign()

clampCumulativeTotal()

validateGeneratedValue()

---

# Important Validation

If generated negative value causes:
cumulativeTotal <= 0

Then:
Clamp cumulativeTotal to 1

DO NOT regenerate another number.

Example:

Current total = 3
Generated = -9

Result:
1

NOT:
regenerate value

---

# UI Display Requirements

Keep existing UI behavior.

Only ensure:
Generated values display correctly:

+5
-3
+77
-245

---

# Technical Requirements

Use:
- TypeScript
- Phaser-compatible logic
- Clean reusable functions
- Low memory allocation
- Deterministic logic

---

# Deliverables

Generate ONLY:
1. Updated number generation function
2. Helper methods
3. Difficulty scaling logic
4. Weighted random logic
5. Clamp logic

Do NOT modify unrelated systems.

Do NOT generate pseudo code.

Generate production-ready implementation only for the number generation system.