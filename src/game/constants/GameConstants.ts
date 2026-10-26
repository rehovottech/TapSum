export const GAME_CONFIG = {
    SCORE_PER_ROUND: 10,

    // Per-round timer (scales with round count)
    // rounds  1–9: 7s | 10–19: 9s | 20–29: 11s | 30+: 15s
    TIMER_BASE_SEC:    7,
    TIMER_STEP_ROUNDS: 10,
    TIMER_STEP_SEC:    2,
    TIMER_MAX_SEC:     15,

    // Hearts: a wrong answer costs one heart; the run ends at zero
    LIVES: 3,
    // How long the correct total stays on screen after a lost heart
    REVEAL_MS: 1600,

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
    leaderboard:  string;
    /** Number size by round: the first band whose upTo >= round applies. */
    ranges:       { upTo: number; min: number; max: number }[];
    /** Chance (0–100) that a number is TAKE AWAY, by round. */
    negatives:    { upTo: number; chance: number }[];
    timerBaseSec: number;
    timerStepSec: number;
    timerMaxSec:  number;
}

const INF = Number.MAX_SAFE_INTEGER;

export const PROFILES: Record<ProfileId, ProfileRules> = {
    little: {
        id: 'little', name: 'Little Learner', ages: 'Ages 5-8', blurb: 'Small numbers, more time',
        color: 0xffb703, leaderboard: 'tapsum_little',
        ranges:    [{ upTo: 10, min: 1, max: 5 }, { upTo: 20, min: 1, max: 9 }, { upTo: 40, min: 2, max: 12 }, { upTo: INF, min: 5, max: 20 }],
        negatives: [{ upTo: 10, chance: 0 }, { upTo: 25, chance: 15 }, { upTo: INF, chance: 25 }],
        timerBaseSec: 10, timerStepSec: 1, timerMaxSec: 15,
    },
    explorer: {
        id: 'explorer', name: 'Explorer', ages: 'Ages 9-12', blurb: 'Adding and taking away',
        color: 0x1e90e8, leaderboard: 'tapsum',
        ranges:    [{ upTo: 10, min: 1, max: 10 }, { upTo: 20, min: 1, max: 15 }, { upTo: 40, min: 5, max: 25 }, { upTo: 80, min: 15, max: 50 }, { upTo: INF, min: 50, max: 100 }],
        negatives: [{ upTo: 15, chance: 25 }, { upTo: 30, chance: 35 }, { upTo: INF, chance: 50 }],
        timerBaseSec: 7, timerStepSec: 2, timerMaxSec: 15,
    },
    adult: {
        id: 'adult', name: 'Brain Trainer', ages: 'Teens & adults', blurb: 'Bigger numbers, faster',
        color: 0x8b5cf6, leaderboard: 'tapsum_adult',
        ranges:    [{ upTo: 10, min: 1, max: 15 }, { upTo: 20, min: 5, max: 25 }, { upTo: 40, min: 10, max: 50 }, { upTo: 80, min: 20, max: 99 }, { upTo: INF, min: 50, max: 150 }],
        negatives: [{ upTo: 10, chance: 35 }, { upTo: INF, chance: 50 }],
        timerBaseSec: 6, timerStepSec: 1, timerMaxSec: 12,
    },
};

/** Fixed numbers for the guided first game (sum stays under 10). */
export const TUTORIAL_NUMBERS = [3, 2, 4];
