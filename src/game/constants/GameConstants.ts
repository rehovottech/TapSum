export const GAME_CONFIG = {
    SCORE_PER_ROUND:       10,
    INTERSTITIAL_COOLDOWN: 120_000, // 2 minutes

    // Per-round timer (scales with round count)
    // rounds  1–9: 7s | 10–19: 9s | 20–29: 11s | 30+: 15s
    TIMER_BASE_SEC:    7,
    TIMER_STEP_ROUNDS: 10,
    TIMER_STEP_SEC:    2,
    TIMER_MAX_SEC:     15,
};
