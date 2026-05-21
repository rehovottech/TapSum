export const GAME_CONFIG = {
    BASE_TIMER: 5000,
    DIFFICULTY_STEP: 3,
    SCORE_PER_ROUND: 10,
    INTERSTITIAL_COOLDOWN: 120_000, // 2 minutes

    // Time bonus on success: requiredTaps × multiplier seconds
    TIME_BONUS_MULTIPLIER:        0.5,  // normal rounds
    TIME_BONUS_DOUBLE_MULTIPLIER: 1.5,    // every 10th round
    TIME_BONUS_MILESTONE:         10,   // every Nth success triggers 2x

    // Number range thresholds
    RANGE_MID_ROUND:  6,   // rounds 6+  → 1–5
    RANGE_HARD_ROUND: 11,  // rounds 11+ → 1–10
};
