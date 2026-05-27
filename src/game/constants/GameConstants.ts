export const GAME_CONFIG = {
    SCORE_PER_ROUND:       10,
    INTERSTITIAL_COOLDOWN: 120_000, // 2 minutes

    // Per-round timer (scales with round count)
    // rounds  1–9: 5s | 10–19: 7s | 20–29: 9s | 30+: 10s
    TIMER_BASE_SEC:    5,
    TIMER_STEP_ROUNDS: 10,
    TIMER_STEP_SEC:    2,
    TIMER_MAX_SEC:     10,
};
