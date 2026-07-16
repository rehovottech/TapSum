import { Firebase as RehovotFirebase } from '@rehovottech/firebase';
import { FirebaseConfig } from '../config/Firebase';

type AnalyticsEventParams = Record<string, string | number | boolean | null | undefined>;

export interface LeaderboardEntry {
    uid: string;
    name: string;
    bestScore: number;
    updatedAt: number;
    rank?: number;
}

const DEFAULT_PLAYER_NAME = 'Player';

class FireBaseService {
    private static instance: FireBaseService;
    private initPromise: Promise<void> | undefined;
    private authPromise: Promise<string | null> | undefined;

    private constructor() {}

    public static getInstance(): FireBaseService {
        if (!FireBaseService.instance) {
            FireBaseService.instance = new FireBaseService();
        }
        return FireBaseService.instance;
    }

    // ── Core init ────────────────────────────────────────────────────────────

    public init(): Promise<void> {
        if (!this.initPromise) {
            this.initPromise = RehovotFirebase.initialize(FirebaseConfig).then(() => undefined);
        }
        return this.initPromise;
    }

    // ── Auth ─────────────────────────────────────────────────────────────────

    public signInAnonymous(): Promise<string | null> {
        if (this.authPromise) return this.authPromise;

        this.authPromise = (async () => {
            await this.init();

            const existing = RehovotFirebase.Auth.getCurrentUser();
            if (existing) return existing.uid;

            try {
                const user = await RehovotFirebase.Auth.loginAnonymous();
                return user.uid;
            } catch (e) {
                console.warn('Firebase: anonymous sign-in failed', e);
                return null;
            }
        })();

        return this.authPromise;
    }

    public getUid(): string | null {
        return RehovotFirebase.Auth.getCurrentUser()?.uid ?? null;
    }

    // ── Analytics ────────────────────────────────────────────────────────────

    public async logEvent(eventName: string, eventParams?: AnalyticsEventParams): Promise<void> {
        await this.init();
        await RehovotFirebase.Analytics.logEvent(eventName, eventParams ?? {});
    }

    // ── Leaderboard ──────────────────────────────────────────────────────────

    public async submitScore(gameId: string, score: number): Promise<void> {
        await this.init();
        try {
            await RehovotFirebase.Leaderboard.submitScore(gameId, score, {
                displayName: DEFAULT_PLAYER_NAME,
            });
        } catch (e) {
            console.warn('Firebase: submitScore failed', e);
        }
    }

    public async getTopPlayers(gameId: string, count = 50): Promise<LeaderboardEntry[]> {
        await this.init();
        try {
            const players = await RehovotFirebase.Leaderboard.getTopPlayers(gameId, count);
            return players.map((p, i) => ({
                uid: p.playerId,
                name: p.displayName ?? DEFAULT_PLAYER_NAME,
                bestScore: p.score,
                updatedAt: Date.parse(p.updatedAt) || Date.now(),
                rank: i + 1,
            }));
        } catch (e) {
            console.warn('Firebase: getTopPlayers failed', e);
            return [];
        }
    }

    public async getPlayerRank(gameId: string): Promise<number> {
        await this.init();
        try {
            const rank = await RehovotFirebase.Leaderboard.getPlayerRank(gameId);
            return rank?.rank ?? -1;
        } catch (e) {
            console.warn('Firebase: getPlayerRank failed', e);
            return -1;
        }
    }

    public async getPlayerProfile(gameId: string): Promise<LeaderboardEntry | null> {
        await this.init();
        try {
            const profile = await RehovotFirebase.Leaderboard.getPlayerProfile(gameId);
            if (!profile) return null;
            return {
                uid: profile.playerId,
                name: profile.displayName ?? DEFAULT_PLAYER_NAME,
                bestScore: profile.score,
                updatedAt: Date.parse(profile.updatedAt) || Date.now(),
            };
        } catch (e) {
            console.warn('Firebase: getPlayerProfile failed', e);
            return null;
        }
    }
}

export const Firebase = FireBaseService.getInstance();
