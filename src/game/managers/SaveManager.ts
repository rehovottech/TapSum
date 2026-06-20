const KEYS = {
    BEST_SCORE:    'tapsum_best_score',
    SOUND_ENABLED: 'tapsum_sound',
};

export const SaveManager = {
    getBestScore(): number {
        return parseInt(localStorage.getItem(KEYS.BEST_SCORE) ?? '0', 10);
    },

    setBestScore(score: number): void {
        if (score > this.getBestScore()) {
            localStorage.setItem(KEYS.BEST_SCORE, score.toString());
        }
    },

    isSoundEnabled(): boolean {
        return localStorage.getItem(KEYS.SOUND_ENABLED) !== 'false';
    },

    setSoundEnabled(enabled: boolean): void {
        localStorage.setItem(KEYS.SOUND_ENABLED, enabled.toString());
    },


};
