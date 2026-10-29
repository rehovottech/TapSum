export const GAME_CONFIG = {
    SCORE_PER_ROUND: 10,

    // Per-round timer: sized to the taps the total needs, so a big total gets
    // more time (profile thinkSec + tapSec per tap, between minSec and maxSec).
    // tapSec tightens by TIMER_TAP_RAMP every TIMER_STEP_ROUNDS rounds, down to
    // TIMER_TAP_FLOOR of itself: early rounds stay relaxed, pressure builds slowly.
    TIMER_STEP_ROUNDS: 10,
    TIMER_TAP_RAMP:    0.05,
    TIMER_TAP_FLOOR:   0.75,

    // Hearts: a wrong answer costs one heart; the run ends at zero
    LIVES: 3,
    // How long the correct total stays on screen after a lost heart
    REVEAL_MS: 1600,
    // Pause after a lost heart before the "keep your chain?" sheet slides up
    OFFER_DELAY_MS: 600,

    // Increment buttons unlock the first time the running total reaches them
    // (+1 is always open). The round that unlocks one gets extra time.
    UNLOCK_BONUS_MS: 1200,
};

// ── Who's playing ───────────────────────────────────────────────────────────
// Each profile changes the rules, not just the look. Explorer keeps the
// original tuning (and the original leaderboard / best-score keys).

export type ProfileId = 'little' | 'explorer' | 'adult';

export interface ProfileRules {
    id:           ProfileId;
    name:         string;
    ages:         string;
    blurb:        string;
    color:        number;
    /** Number size by round: the first band whose upTo >= round applies. */
    ranges:       { upTo: number; min: number; max: number }[];
    /** Chance (0–100) that a number is TAKE AWAY, by round. */
    negatives:    { upTo: number; chance: number }[];
    /** Round timer (see GAME_CONFIG.TIMER_*): reading and adding time, plus time per tap. */
    timer:        { thinkSec: number; tapSec: number; minSec: number; maxSec: number };
}

const INF = Number.MAX_SAFE_INTEGER;

export const PROFILES: Record<ProfileId, ProfileRules> = {
    little: {
        id: 'little', name: 'Little Learner', ages: 'Ages 5-8', blurb: 'Small numbers, more time',
        color: 0xffb703,
        ranges:    [{ upTo: 10, min: 1, max: 5 }, { upTo: 20, min: 1, max: 9 }, { upTo: 40, min: 2, max: 12 }, { upTo: INF, min: 5, max: 20 }],
        negatives: [{ upTo: 10, chance: 0 }, { upTo: 25, chance: 15 }, { upTo: INF, chance: 25 }],
        // rounds 1–9: 10s, +1s every 10 rounds, 15s from round 50
        // ~1.1 s per tap early on: plenty for counting taps out loud
        timer: { thinkSec: 4, tapSec: 1.0, minSec: 8, maxSec: 25 },
    },
    explorer: {
        id: 'explorer', name: 'Explorer', ages: 'Ages 9-12', blurb: 'Adding and taking away',
        color: 0x1e90e8,
        ranges:    [{ upTo: 10, min: 1, max: 10 }, { upTo: 20, min: 1, max: 15 }, { upTo: 40, min: 5, max: 25 }, { upTo: 80, min: 15, max: 50 }, { upTo: INF, min: 50, max: 100 }],
        negatives: [{ upTo: 15, chance: 25 }, { upTo: 30, chance: 35 }, { upTo: INF, chance: 50 }],
        // rounds 1–9: 7s, +2s every 10 rounds, 15s from round 40
        timer: { thinkSec: 3, tapSec: 0.7, minSec: 6, maxSec: 18 },
    },
    adult: {
        id: 'adult', name: 'Brain Trainer', ages: 'Teens & adults', blurb: 'Bigger numbers, faster',
        color: 0x8b5cf6,
        ranges:    [{ upTo: 10, min: 1, max: 15 }, { upTo: 20, min: 5, max: 25 }, { upTo: 40, min: 10, max: 50 }, { upTo: 80, min: 20, max: 99 }, { upTo: INF, min: 50, max: 150 }],
        negatives: [{ upTo: 10, chance: 35 }, { upTo: INF, chance: 50 }],
        // rounds 1–9: 6s, +1s every 10 rounds, 12s from round 60
        timer: { thinkSec: 2.5, tapSec: 0.5, minSec: 5, maxSec: 14 },
    },
};

/** Fixed numbers for the guided first game (sum stays under 10). */
export const TUTORIAL_NUMBERS = [3, 2, 4];
