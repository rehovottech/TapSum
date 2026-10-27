import { Firebase as RehovotFirebase } from '@rehovottech/firebase';
import { getApps, initializeApp } from 'firebase/app';
import { Capacitor } from '@capacitor/core';
import { initializeAnalytics, isSupported, setConsent, setUserProperties } from 'firebase/analytics';
import { FirebaseAnalytics, ConsentType, ConsentStatus } from '@capacitor-firebase/analytics';
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

// Every event and user is tagged with its platform
const APP_PLATFORM = Capacitor.getPlatform();   // 'android' | 'ios' | 'web'

// Each platform reports to its own Firebase project: iOS and Android use native Firebase Analytics
// (GoogleService-Info.plist / google-services.json), web uses the web SDK through
// @rehovottech/firebase (src/config/Firebase.ts). Auth and the leaderboard share the web config.
const NATIVE_ANALYTICS = APP_PLATFORM === 'ios' || APP_PLATFORM === 'android';

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
            const prepare = NATIVE_ANALYTICS ? this.prepareNativeAnalytics() : this.prepareChildSafeAnalytics();
            this.initPromise = prepare
                .catch((e) => console.warn('Firebase: analytics privacy setup failed', e))
                .then(() => RehovotFirebase.initialize({ ...FirebaseConfig, analyticsEnabled: !NATIVE_ANALYTICS }))
                .then(() => undefined);
        }
        return this.initPromise;
    }

    /** iOS / Android: native analytics with the same child-safe consent (no ad storage / ad personalisation). */
    private async prepareNativeAnalytics(): Promise<void> {
        const denied = ConsentStatus.Denied;
        await Promise.all([
            FirebaseAnalytics.setConsent({ type: ConsentType.AnalyticsStorage, status: ConsentStatus.Granted }),
            FirebaseAnalytics.setConsent({ type: ConsentType.AdStorage, status: denied }),
            FirebaseAnalytics.setConsent({ type: ConsentType.AdUserData, status: denied }),
            FirebaseAnalytics.setConsent({ type: ConsentType.AdPersonalization, status: denied }),
        ]);
        await FirebaseAnalytics.setUserProperty({ key: 'app_platform', value: APP_PLATFORM });
    }

    /**
     * Tap Sum is child-directed, so analytics must not feed Google's ad features.
     * Runs before the shared plugin starts: the plugin reuses this Firebase app and its
     * analytics instance (same SDK copy via `dedupe: ['firebase']` in vite.config.ts).
     */
    private async prepareChildSafeAnalytics(): Promise<void> {
        setConsent({
            analytics_storage:  'granted',
            ad_storage:         'denied',
            ad_user_data:       'denied',
            ad_personalization: 'denied',
        });

        const { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, measurementId } = FirebaseConfig;
        const app = getApps()[0] ?? initializeApp({ apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, measurementId });

        if (await isSupported()) {
            const analytics = initializeAnalytics(app, {
                config: { allow_google_signals: false, allow_ad_personalization_signals: false },
            });

            setUserProperties(analytics, { app_platform: APP_PLATFORM });
        }
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
        const params = { ...eventParams, app_platform: APP_PLATFORM };
        if (NATIVE_ANALYTICS) {
            await FirebaseAnalytics.logEvent({ name: eventName, params });
        } else {
            await RehovotFirebase.Analytics.logEvent(eventName, params);
        }
    }

    // ── Leaderboard ──────────────────────────────────────────────────────────

    public async submitScore(gameId: string, score: number): Promise<void> {
        await this.signInAnonymous();
        try {
            await RehovotFirebase.Leaderboard.submitScore(gameId, score, {
                displayName: DEFAULT_PLAYER_NAME,
            });
        } catch (e) {
            console.warn('Firebase: submitScore failed', e);
        }
    }

    public async getTopPlayers(gameId: string, count = 50): Promise<LeaderboardEntry[]> {
        await this.signInAnonymous();
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
        await this.signInAnonymous();
        try {
            const rank = await RehovotFirebase.Leaderboard.getPlayerRank(gameId);
            return rank?.rank ?? -1;
        } catch (e) {
            console.warn('Firebase: getPlayerRank failed', e);
            return -1;
        }
    }

    public async getPlayerProfile(gameId: string): Promise<LeaderboardEntry | null> {
        await this.signInAnonymous();
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
