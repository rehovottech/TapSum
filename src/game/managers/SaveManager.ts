import { PROFILES, ProfileId, ProfileRules } from '../constants/GameConstants';

const KEYS = {
    BEST_SCORE:    'tapsum_best_score',   // Explorer (original key, keeps old bests)
    SOUND_ENABLED: 'tapsum_sound',
    PROFILE:       'tapsum_profile',
    TUTORIAL_DONE: 'tapsum_tutorial_done',
};

const read = (key: string): string | null => {
    try { return localStorage.getItem(key); } catch { return null; }
};
const write = (key: string, value: string): void => {
    try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
};

const bestKey = (id: ProfileId) => (id === 'explorer' ? KEYS.BEST_SCORE : `${KEYS.BEST_SCORE}_${id}`);

export const SaveManager = {
    // ── Profile ─────────────────────────────────────────────────────────────

    /** null until the player has picked on the "who's playing" screen. */
    getProfileId(): ProfileId | null {
        const v = read(KEYS.PROFILE);
        return v === 'little' || v === 'explorer' || v === 'adult' ? v : null;
    },

    getProfile(): ProfileRules {
        return PROFILES[this.getProfileId() ?? 'explorer'];
    },

    setProfile(id: ProfileId): void {
        write(KEYS.PROFILE, id);
    },

    // ── Best score (per profile) ────────────────────────────────────────────

    getBestScore(): number {
        return parseInt(read(bestKey(this.getProfile().id)) ?? '0', 10) || 0;
    },

    setBestScore(score: number): void {
        if (score > this.getBestScore()) {
            write(bestKey(this.getProfile().id), score.toString());
        }
    },

    // ── Tutorial ────────────────────────────────────────────────────────────

    isTutorialDone(): boolean {
        return read(KEYS.TUTORIAL_DONE) === 'true';
    },

    setTutorialDone(done = true): void {
        write(KEYS.TUTORIAL_DONE, String(done));
    },

    // ── Sound ───────────────────────────────────────────────────────────────

    isSoundEnabled(): boolean {
        return read(KEYS.SOUND_ENABLED) !== 'false';
    },

    setSoundEnabled(enabled: boolean): void {
        write(KEYS.SOUND_ENABLED, enabled.toString());
    },
};
