import { OUTFITS, OutfitId, SCENERIES, SceneryId } from '../constants/Outfits';
import { GAME_CONFIG, PROFILES, ProfileId, ProfileRules } from '../constants/GameConstants';

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
    DAILY:         'tapsum_daily',        // "YYYY-MM-DD:roundsToday:claimed(0|1)"
    RECENT_RUNS:   'tapsum_recent_runs',  // rounds cleared in the last 5 finished runs
    MODE:          'tapsum_mode',         // 'classic' | 'memory'
    STATS:         'tapsum_stats',        // per-day progress for the Grown-ups panel (stays on device)
    MAX_SEQ:       'tapsum_max_seq',      // longest sequence ever solved
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
const memoryBestKey = (id: ProfileId) => `tapsum_best_memory_${id}`;

export type GameMode = 'classic' | 'memory';

/** One day of progress (Grown-ups panel). */
export interface DayStats {
    rounds: number;      // rounds attempted
    correct: number;
    wrong: number;
    answerMs: number;    // time spent answering, correct rounds only (speed)
    playMs: number;      // rough time played
    subRight: number;    // rounds with a take-away that were right
    subTotal: number;    // rounds with a take-away
    maxSeq: number;      // longest sequence solved that day
    maxNumber: number;   // biggest running total reached
}
const emptyDay = (): DayStats => ({ rounds: 0, correct: 0, wrong: 0, answerMs: 0, playMs: 0, subRight: 0, subTotal: 0, maxSeq: 0, maxNumber: 0 });
const readStats = (): Record<string, DayStats> => {
    try { return JSON.parse(read(KEYS.STATS) ?? '{}') as Record<string, DayStats>; } catch { return {}; }
};
export interface WeekAgg extends DayStats { daysPlayed: number }
const aggregate = (all: Record<string, DayStats>, from: number, to: number): WeekAgg => {
    const agg: WeekAgg = { ...emptyDay(), daysPlayed: 0 };
    for (let i = from; i <= to; i++) {
        const d = all[dayKey(daysAgo(i))];
        if (!d || d.rounds === 0) continue;
        agg.daysPlayed++;
        agg.rounds += d.rounds; agg.correct += d.correct; agg.wrong += d.wrong;
        agg.answerMs += d.answerMs; agg.playMs += d.playMs;
        agg.subRight += d.subRight; agg.subTotal += d.subTotal;
        agg.maxSeq = Math.max(agg.maxSeq, d.maxSeq); agg.maxNumber = Math.max(agg.maxNumber, d.maxNumber);
    }
    return agg;
};

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

    /** Best for the current mode. (The leaderboards only ever use Classic: getBestScoreFor.) */
    getBestScore(): number {
        if (this.getMode() === 'memory') return parseInt(read(memoryBestKey(this.getProfile().id)) ?? '0', 10) || 0;
        return this.getBestScoreFor(this.getProfile().id);
    },

    getBestScoreFor(id: ProfileId): number {
        return parseInt(read(bestKey(id)) ?? '0', 10) || 0;
    },

    setBestScore(score: number): void {
        if (score > this.getBestScore()) {
            const id = this.getProfile().id;
            write(this.getMode() === 'memory' ? memoryBestKey(id) : bestKey(id), score.toString());
        }
    },

    // ── Game mode ───────────────────────────────────────────────────────────

    getMode(): GameMode {
        return read(KEYS.MODE) === 'memory' ? 'memory' : 'classic';
    },

    setMode(m: GameMode): void {
        write(KEYS.MODE, m);
    },

    // ── Progress for the Grown-ups panel (local only) ───────────────────────

    /** Records one finished round. Not called for the guided practice rounds. */
    logRound(r: { correct: boolean; answerMs: number; playMs: number; parts: number; takeAway: boolean; maxNumber: number }): void {
        const all = readStats();
        const key = dayKey(new Date());
        const d = all[key] ?? emptyDay();
        d.rounds++;
        d.playMs += Math.max(0, r.playMs);
        if (r.correct) {
            d.correct++;
            d.answerMs += Math.max(0, r.answerMs);
            if (r.parts > 1) {
                d.maxSeq = Math.max(d.maxSeq, r.parts);
                if (r.parts > this.getMaxSequence()) write(KEYS.MAX_SEQ, String(r.parts));
            }
        } else {
            d.wrong++;
        }
        if (r.takeAway) { d.subTotal++; if (r.correct) d.subRight++; }
        d.maxNumber = Math.max(d.maxNumber, r.maxNumber);
        all[key] = d;
        // keep two weeks
        const keep = new Set(Array.from({ length: 14 }, (_, i) => dayKey(daysAgo(i))));
        for (const k of Object.keys(all)) if (!keep.has(k)) delete all[k];
        write(KEYS.STATS, JSON.stringify(all));
    },

    getMaxSequence(): number {
        return parseInt(read(KEYS.MAX_SEQ) ?? '0', 10) || 0;
    },

    /** This week (last 7 days), last week, and rounds per day for the bars (oldest first). */
    getProgress(): { week: WeekAgg; prev: WeekAgg; perDay: { label: string; rounds: number; today: boolean }[] } {
        const all = readStats();
        return {
            week: aggregate(all, 0, 6),
            prev: aggregate(all, 7, 13),
            perDay: Array.from({ length: 7 }, (_, k) => {
                const d = daysAgo(6 - k);
                return { label: 'SMTWTFS'[d.getDay()], rounds: all[dayKey(d)]?.rounds ?? 0, today: k === 6 };
            }),
        };
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

    // ── Daily goal and recent runs ──────────────────────────────────────────

    /** Rounds cleared today and whether today's goal bonus was already paid. */
    getDaily(): { rounds: number; goal: number; claimed: boolean } {
        const [day, rounds, claimed] = (read(KEYS.DAILY) ?? '').split(':');
        const goal = GAME_CONFIG.DAILY_GOAL_ROUNDS;
        if (day !== dayKey(new Date())) return { rounds: 0, goal, claimed: false };
        return { rounds: parseInt(rounds, 10) || 0, goal, claimed: claimed === '1' };
    },

    /** Adds today's cleared rounds. `completed` is true only on the run that reaches the goal. */
    addDailyRounds(n: number): { rounds: number; goal: number; completed: boolean } {
        const cur = this.getDaily();
        const rounds = cur.rounds + Math.max(0, n);
        const completed = !cur.claimed && rounds >= cur.goal;
        write(KEYS.DAILY, `${dayKey(new Date())}:${rounds}:${cur.claimed || completed ? 1 : 0}`);
        return { rounds, goal: cur.goal, completed };
    },

    /** Average rounds cleared over the previous finished runs (null with fewer than 2). */
    getRecentAverage(): number | null {
        const runs = (read(KEYS.RECENT_RUNS) ?? '').split(',').filter(Boolean).map(Number);
        return runs.length >= 2 ? runs.reduce((a, b) => a + b, 0) / runs.length : null;
    },

    recordRun(cleared: number): void {
        const runs = (read(KEYS.RECENT_RUNS) ?? '').split(',').filter(Boolean);
        write(KEYS.RECENT_RUNS, [...runs, String(Math.max(0, cleared))].slice(-5).join(','));
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
