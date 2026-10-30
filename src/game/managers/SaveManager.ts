import { OUTFITS, OutfitId, SCENERIES, SceneryId } from '../constants/Outfits';
import { PROFILES, ProfileId, ProfileRules } from '../constants/GameConstants';

const KEYS = {
    BEST_SCORE:    'tapsum_best_score',   // Explorer (original key, keeps old bests)
    SOUND_ENABLED: 'tapsum_sound',
    PROFILE:       'tapsum_profile',
    TUTORIAL_DONE: 'tapsum_tutorial_done',
    MUSIC_VOL:     'tapsum_music_vol',
    SFX_VOL:       'tapsum_sfx_vol',
    HAPTICS:       'tapsum_haptics',
    REDUCE_MOTION: 'tapsum_reduce_motion',
    STARS:         'tapsum_stars',
    OUTFIT:        'tapsum_outfit',
    SCENERY:       'tapsum_scenery',
    PLAY_DAYS:     'tapsum_play_days',    // comma list of local YYYY-MM-DD, last 30 days
};

const read = (key: string): string | null => {
    try { return localStorage.getItem(key); } catch { return null; }
};
const write = (key: string, value: string): void => {
    try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
};

/** Dev/QA switch (VITE_UNLOCK_ALL=true in .env): every outfit and scene is unlocked. */
const UNLOCK_ALL = String(import.meta.env.VITE_UNLOCK_ALL ?? '') === 'true';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const readVol = (key: string): number => {
    const n = parseFloat(read(key) ?? '');
    return Number.isFinite(n) ? clamp01(n) : 0.5;
};

const dayKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const readDays = (): string[] => (read(KEYS.PLAY_DAYS) ?? '').split(',').filter(Boolean);

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
        return this.getBestScoreFor(this.getProfile().id);
    },

    getBestScoreFor(id: ProfileId): number {
        return parseInt(read(bestKey(id)) ?? '0', 10) || 0;
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

    // ── Settings ────────────────────────────────────────────────────────────

    /** 0..1 slider value; 0.5 when never set. */
    getMusicVolume(): number { return readVol(KEYS.MUSIC_VOL); },
    setMusicVolume(v: number): void { write(KEYS.MUSIC_VOL, String(clamp01(v))); },
    getSfxVolume(): number { return readVol(KEYS.SFX_VOL); },
    setSfxVolume(v: number): void { write(KEYS.SFX_VOL, String(clamp01(v))); },

    isHapticsEnabled(): boolean { return read(KEYS.HAPTICS) !== 'false'; },
    setHapticsEnabled(on: boolean): void { write(KEYS.HAPTICS, String(on)); },

    /** Skips screen shake and big celebration bursts. */
    isReducedMotion(): boolean { return read(KEYS.REDUCE_MOTION) === 'true'; },
    setReducedMotion(on: boolean): void { write(KEYS.REDUCE_MOTION, String(on)); },

    // ── Daily streak ────────────────────────────────────────────────────────

    /** Call when a run finishes: today counts as played. */
    recordPlayDay(): void {
        const today = dayKey(new Date());
        const days = readDays();
        if (days.includes(today)) return;
        write(KEYS.PLAY_DAYS, [...days, today].slice(-30).join(','));
    },

    /** Consecutive days played, ending today (or yesterday, so the streak is still alive until tonight). */
    getDayStreak(): number {
        const days = new Set(readDays());
        let i = days.has(dayKey(daysAgo(0))) ? 0 : 1;
        let n = 0;
        while (days.has(dayKey(daysAgo(i)))) { n++; i++; }
        return n;
    },

    /** The last 7 days, oldest first, with whether each was played. */
    getWeek(): { label: string; played: boolean; today: boolean }[] {
        const days = new Set(readDays());
        return Array.from({ length: 7 }, (_, k) => {
            const d = daysAgo(6 - k);
            return { label: 'SMTWTFS'[d.getDay()], played: days.has(dayKey(d)), today: k === 6 };
        });
    },

    // ── Stars and outfits ───────────────────────────────────────────────────

    /** Lifetime stars (1 per round cleared). They are never spent, so unlocks are permanent. */
    getStars(): number {
        return parseInt(read(KEYS.STARS) ?? '0', 10) || 0;
    },

    /** Adds stars and returns the outfits this unlocked. */
    addStars(n: number) {
        const before = this.getStars();
        if (n <= 0) return [];
        write(KEYS.STARS, String(before + n));
        const crossed = (o: { stars: number }) => o.stars > before && o.stars <= before + n;
        return [...OUTFITS.filter(crossed), ...SCENERIES.filter(crossed)];
    },

    isOutfitUnlocked(id: OutfitId): boolean {
        const o = OUTFITS.find((x) => x.id === id);
        return !!o && (UNLOCK_ALL || this.getStars() >= o.stars);
    },

    isSceneryUnlocked(id: SceneryId): boolean {
        const o = SCENERIES.find((x) => x.id === id);
        return !!o && (UNLOCK_ALL || this.getStars() >= o.stars);
    },

    getScenery(): SceneryId {
        const v = read(KEYS.SCENERY) as SceneryId | null;
        return v && this.isSceneryUnlocked(v) ? v : 'meadow';
    },

    setScenery(id: SceneryId): void {
        if (this.isSceneryUnlocked(id)) write(KEYS.SCENERY, id);
    },

    getOutfit(): OutfitId {
        const v = read(KEYS.OUTFIT) as OutfitId | null;
        return v && this.isOutfitUnlocked(v) ? v : 'none';
    },

    setOutfit(id: OutfitId): void {
        if (this.isOutfitUnlocked(id)) write(KEYS.OUTFIT, id);
    },
};
