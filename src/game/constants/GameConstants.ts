export const GAME_CONFIG = {
    DIFFICULTY_STEP: 3,
    SCORE_PER_ROUND: 10,
    INTERSTITIAL_COOLDOWN: 120_000, // 2 minutes

    // Number range thresholds
    RANGE_MID_ROUND:  6,   // rounds 6+  → 1–5
    RANGE_HARD_ROUND: 11,  // rounds 11+ → 1–10

    // Negative number probability per difficulty band
    NEG_CHANCE_EARLY: 0.10,  // rounds 1–5:   10% negative
    NEG_CHANCE_MID:   0.30,  // rounds 6–15:  30% negative
    NEG_CHANCE_LATE:  0.50,  // rounds 16+:   50% negative
    ROUND_MID_NEG:    6,
    ROUND_LATE_NEG:   16,

    // Max negative magnitude per band (capped to avoid giant early punishes)
    NEG_MAX_EARLY: 2,
    NEG_MAX_MID:   3,
    NEG_MAX_LATE:  5,

    // Prevent more than this many consecutive negatives
    MAX_CONSECUTIVE_NEG: 2,

    // Per-round timer (fresh each round, scales with round count)
    // rounds  1–9:  5s  |  10–19: 7s  |  20–29: 9s  |  30+: 10s
    TIMER_BASE_SEC:    5,
    TIMER_STEP_ROUNDS: 10,
    TIMER_STEP_SEC:    2,
    TIMER_MAX_SEC:     10,
};
