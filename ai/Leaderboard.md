# Claude Prompt — Replace Google Play Services Leaderboard with Firebase Leaderboard System

You are a senior Ionic React + Phaser + Firebase game developer.

Refactor my existing mobile game project to REMOVE Google Play Games Services leaderboard integration completely and REPLACE it with a scalable Firebase leaderboard system shared across multiple games.

The project already uses:
- Ionic React
- Phaser 3
- Capacitor
- Firebase
- TypeScript
- AdMob

The project structure already exists.

---

# Main Goal

Replace:
- Google Play Games leaderboard
- GPS score submission
- GPS leaderboard popup

WITH:

A centralized Firebase leaderboard system that supports MULTIPLE games using a shared backend architecture.

---

# Important Requirements

The Firebase leaderboard system must:
- Work for multiple games
- Use separate game IDs
- Share same Firebase project
- Support anonymous login
- Be scalable
- Be mobile optimized
- Be reusable across future games
- Use TypeScript
- Follow clean architecture

---

# Existing Project Structure

Game scenes:

src/game/scenes/
- Boot.ts
- Preloader.ts
- Menu.ts
- Game.ts
- End.ts

---

# Required Firebase Features

Use:
- Firebase Authentication
- Firestore Database

Optional support structure for:
- Firebase Analytics
- Cloud Functions later

---

# Authentication Requirements

Use anonymous authentication silently on app startup.

Example:
- User opens game
- Automatically signs in anonymously
- No popup
- No login interruption

Requirements:
- Create user automatically if first time
- Store local player profile
- Handle reconnects gracefully

---

# Firestore Structure

Use this structure:

games/
    tapsum/
        leaderboard/
            uid_001
            uid_002

    memorytap/
        leaderboard/
            uid_003

---

# Leaderboard Document Structure

Each leaderboard user document:

{
  uid: string;
  name: string;
  bestScore: number;
  totalScore: number;
  gamesPlayed: number;
  country?: string;
  updatedAt: number;
}

---

# Create Shared Leaderboard Service

Create:

src/services/FirebaseLeaderboard.ts

Responsibilities:
- Submit score
- Get top players
- Get player rank
- Get leaderboard list
- Handle score updates
- Handle best score logic
- Prevent unnecessary writes

Methods:

submitScore(gameId: string, score: number)

getTopPlayers(gameId: string)

getPlayerRank(gameId: string)

getPlayerProfile()

updatePlayerProfile()

---

# Create Authentication Service

Create:

src/services/AuthService.ts

Responsibilities:
- Anonymous login
- Current user state
- Auth persistence
- Auto login on startup

---

# Create Game ID Enum

Create:

src/constants/GameIds.ts

Example:

export enum GameIds {
  TAP_SUM = 'tapsum',
  MEMORY_TAP = 'memorytap',
  NUMBER_RUSH = 'numberrush'
}

---

# Scene Changes Required

---

# Boot Scene

Replace:
- GPS initialization

With:
- Firebase initialization
- Anonymous auth login
- Player profile setup

Flow:
1. Initialize Firebase
2. Login anonymously
3. Create player profile if needed
4. Move to Preloader

---

# Menu Scene

Replace:
- Google Play leaderboard button

With:
- Firebase leaderboard popup/modal

Requirements:
- Show top 50 players
- Show current player rank
- Smooth scrolling
- Mobile-friendly UI
- Animated panel
- Player highlight row

---

# End Scene

Replace:
- GPS score submission

With:
- Firebase score submission

Flow:
1. Submit score
2. Update best score
3. Show updated rank
4. Then show reward ad/home buttons

---

# Score Submission Logic

Requirements:
- Only update Firestore if score > existing best score
- Increment gamesPlayed
- Update updatedAt timestamp

---

# Security Rules

Generate Firestore security rules.

Requirements:
- Auth required
- Users can only update their own score
- Prevent lowering best score
- Prevent editing other users

---

# UI Requirements

Leaderboard UI should include:
- Rank number
- Player name
- Score
- Current player highlight
- Crown for top 3
- Smooth tween animations
- Responsive mobile layout

---

# Additional Features

Prepare architecture for:
- Weekly leaderboard
- Monthly leaderboard
- Daily challenge leaderboard
- Friends leaderboard
- Seasonal events
- Cloud Functions anti-cheat later

---

# Performance Requirements

Optimize for:
- Minimal Firestore reads
- Efficient queries
- Offline-safe handling
- Cached leaderboard data
- Mobile network optimization

---

# Firestore Queries

Use:
- orderBy(bestScore, desc)
- limit(50)

Generate optimized query examples.

---

# Error Handling

Handle:
- Offline mode
- Firebase auth failures
- Firestore failures
- Retry logic
- Empty leaderboard
- Slow internet

---

# Deliverables

Generate COMPLETE production-ready TypeScript code for:

1. Firebase initialization
2. AuthService
3. FirebaseLeaderboard service
4. Firestore queries
5. Leaderboard UI modal
6. Scene integration
7. Firestore security rules
8. Player profile handling
9. Error handling
10. Best practices
11. Folder structure
12. Mobile optimization

Do NOT generate pseudo code.

Generate full clean reusable implementation.