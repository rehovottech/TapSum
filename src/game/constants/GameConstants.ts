export const GAME_CONFIG = {
    BASE_TIMER: 5000,
    MIN_TIMER: 2000,
    TIMER_REDUCTION: 200,
    DIFFICULTY_STEP: 3,
    SCORE_PER_ROUND: 10,
    INTERSTITIAL_COOLDOWN: 120_000, // 2 minutes

    // Time bonus awarded on successful round completion
    TIME_BONUS_BASE: 600,       // ms added per success
    TIME_BONUS_MILESTONE: 10,   // rounds completed to unlock 2x bonus

    // Number range thresholds
    RANGE_MID_ROUND:  6,   // rounds 6+  → 1–5
    RANGE_HARD_ROUND: 11,  // rounds 11+ → 1–10
};
