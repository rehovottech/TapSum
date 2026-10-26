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
