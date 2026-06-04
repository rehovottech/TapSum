import { FirebaseApp, initializeApp } from "firebase/app";
import { Analytics,AnalyticsCallOptions,
getAnalytics,isSupported,logEvent as firebaseLogEvent,} from "firebase/analytics";
import { Auth,getAuth,signInAnonymously,onAuthStateChanged,User} from "firebase/auth";
import { Firestore,getFirestore,doc,getDoc,setDoc,updateDoc,
    collection,query,orderBy,limit,getDocs,increment,} from "firebase/firestore";
import { FirebaseConfig } from "../config/Firebase";

type AnalyticsEventParams = Record<string, string | number | boolean | null | undefined>;

export interface LeaderboardEntry {
    uid: string;
    name: string;
    bestScore: number;
    totalScore: number;
    gamesPlayed: number;
    country?: string;
    updatedAt: number;
    rank?: number;
}

const DEFAULT_PLAYER_NAME = 'Player';
const LEADERBOARD_CACHE_TTL = 30_000;

class FireBaseService {
    private static instance: FireBaseService;
    public app: FirebaseApp | undefined;
    private analytics: Analytics | undefined;
    private auth: Auth | undefined;
    private db: Firestore | undefined;
    private currentUser: User | null = null;
    private initPromise: Promise<void> | undefined;
    private authPromise: Promise<User | null> | undefined;
    private leaderboardCache: Map<string, { data: LeaderboardEntry[]; ts: number }> = new Map();

    private constructor() {}

    public static getInstance(): FireBaseService {
        if (!FireBaseService.instance) {
            FireBaseService.instance = new FireBaseService();
        }
        return FireBaseService.instance;
    }

    // ── Core init ────────────────────────────────────────────────────────────

    public init() {
        if (!this.initPromise) {
            this.initPromise = (async () => {
                if (!this.app) {
                    this.app = initializeApp(FirebaseConfig);
                }
                this.auth = getAuth(this.app);
                this.db   = getFirestore(this.app);

                try {
                    if (await isSupported()) {
                        this.analytics = getAnalytics(this.app);
                    }
                } catch (error) {
                    console.error("Firebase analytics init failed", error);
                }
            })();
        }

        return this.initPromise;
    }

    // ── Auth ─────────────────────────────────────────────────────────────────

    public signInAnonymous(): Promise<User | null> {
        if (this.authPromise) return this.authPromise;

        this.authPromise = (async () => {
            await this.init();
            const auth = this.auth!;

            onAuthStateChanged(auth, (user) => {
                this.currentUser = user;
            });

            if (auth.currentUser) {
                this.currentUser = auth.currentUser;
                return auth.currentUser;
            }

            try {
                const cred = await signInAnonymously(auth);
                this.currentUser = cred.user;
                return cred.user;
            } catch (e) {
                console.warn('Firebase: anonymous sign-in failed', e);
                return null;
            }
        })();

        return this.authPromise;
    }

    public getUid(): string | null {
        return this.currentUser?.uid ?? null;
    }

    public getCurrentUser(): User | null {
        return this.currentUser;
    }

    // ── Analytics ────────────────────────────────────────────────────────────

    public async logEvent(
        eventName: string,
        eventParams?: AnalyticsEventParams,
        options?: AnalyticsCallOptions,
    ) {
        await this.init();

        if (this.analytics) {
            firebaseLogEvent(this.analytics, eventName, eventParams, options);
        }
    }

    // ── Leaderboard ──────────────────────────────────────────────────────────

    private playerRef(gameId: string, uid: string) {
        return doc(this.db!, 'games', gameId, 'leaderboard', uid);
    }

    public async submitScore(gameId: string, score: number): Promise<void> {
        await this.init();
        const uid = this.getUid();
        if (!uid) return;

        const ref = this.playerRef(gameId, uid);
        try {
            const snap = await getDoc(ref);
            if (!snap.exists()) {
                await setDoc(ref, {
                    uid,
                    name: DEFAULT_PLAYER_NAME,
                    bestScore: score,
                    totalScore: score,
                    gamesPlayed: 1,
                    updatedAt: Date.now(),
                });
            } else {
                const data = snap.data() as LeaderboardEntry;
                const updates: Record<string, unknown> = {
                    totalScore: increment(score),
                    gamesPlayed: increment(1),
                    updatedAt: Date.now(),
                };
                if (score > data.bestScore) {
                    updates.bestScore = score;
                    this.leaderboardCache.delete(gameId);
                }
                await updateDoc(ref, updates);
            }
        } catch (e) {
            console.warn('Firebase: submitScore failed', e);
        }
    }

    public async getTopPlayers(gameId: string, count = 50): Promise<LeaderboardEntry[]> {
        await this.init();

        const cacheKey = `${gameId}:${count}`;
        const cached = this.leaderboardCache.get(cacheKey);
        if (cached && Date.now() - cached.ts < LEADERBOARD_CACHE_TTL) {
            return cached.data;
        }

        try {
            const q = query(
                collection(this.db!, 'games', gameId, 'leaderboard'),
                orderBy('bestScore', 'desc'),
                limit(count),
            );
            const snap = await getDocs(q);
            const players = snap.docs.map((d, i) => ({
                ...(d.data() as LeaderboardEntry),
                rank: i + 1,
            }));
            this.leaderboardCache.set(cacheKey, { data: players, ts: Date.now() });
            return players;
        } catch (e) {
            console.warn('Firebase: getTopPlayers failed', e);
            return [];
        }
    }

    public async getPlayerRank(gameId: string): Promise<number> {
        await this.init();
        const uid = this.getUid();
        if (!uid) return -1;

        try {
            const players = await this.getTopPlayers(gameId, 1000);
            const idx = players.findIndex(p => p.uid === uid);
            return idx === -1 ? -1 : idx + 1;
        } catch (e) {
            console.warn('Firebase: getPlayerRank failed', e);
            return -1;
        }
    }

    public async getPlayerProfile(gameId: string): Promise<LeaderboardEntry | null> {
        await this.init();
        const uid = this.getUid();
        if (!uid) return null;

        try {
            const snap = await getDoc(this.playerRef(gameId, uid));
            return snap.exists() ? (snap.data() as LeaderboardEntry) : null;
        } catch {
            return null;
        }
    }

    public async updatePlayerName(gameId: string, name: string): Promise<void> {
        await this.init();
        const uid = this.getUid();
        if (!uid) return;

        try {
            const ref = this.playerRef(gameId, uid);
            const snap = await getDoc(ref);
            if (snap.exists()) {
                await updateDoc(ref, { name, updatedAt: Date.now() });
            } else {
                await setDoc(ref, {
                    uid, name,
                    bestScore: 0, totalScore: 0, gamesPlayed: 0,
                    updatedAt: Date.now(),
                });
            }
            this.leaderboardCache.delete(gameId);
        } catch (e) {
            console.warn('Firebase: updatePlayerName failed', e);
        }
    }
}

export const Firebase = FireBaseService.getInstance();
