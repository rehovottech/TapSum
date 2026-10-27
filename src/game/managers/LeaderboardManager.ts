import { Capacitor } from '@capacitor/core';
import { GameServices } from '@rehovottech/game-service';
import { Firebase } from '../../services/Firebase';
import { LEADERBOARDS } from '../../config/GameServices';
import { PROFILES, ProfileId } from '../constants/GameConstants';
import { SaveManager } from './SaveManager';

const PLATFORM = Capacitor.getPlatform();
const SENT_KEY = 'tapsum_gs_sent';

// One leaderboard per profile so kids and adults never compete on the same board.
// Web: Firebase boards, shown in the in-game LeaderboardPanel.
// Android / iOS: Google Play Games / Game Center, shown in the platform's own leaderboard UI.
class LeaderboardManagerClass {
    private signedIn = false;
    private syncing = false;

    /** Firebase board of the current profile (web). */
    get boardId(): string {
        return SaveManager.getProfile().leaderboard;
    }

    /** True on Android / iOS: scores go to Play Games / Game Center instead of Firebase. */
    get native(): boolean {
        return Capacitor.isNativePlatform();
    }

    private nativeId(id: ProfileId): string {
        const board = LEADERBOARDS[id];
        return PLATFORM === 'ios' ? board.ios : board.android;
    }

    private configured(id: ProfileId): boolean {
        return !this.nativeId(id).startsWith('REPLACE');
    }

    /**
     * Startup. Web signs in to Firebase. Android checks Play Games' automatic sign-in (no UI).
     * iOS waits for the leaderboard button, so kids don't get a Game Center prompt at launch.
     */
    async init(): Promise<void> {
        if (!this.native) {
            await Firebase.signInAnonymous();
            return;
        }
        if (PLATFORM !== 'android') return;
        try {
            this.signedIn = (await GameServices.isSignedIn()).isSignedIn;
            if (this.signedIn) this.sync();
        } catch (e) {
            console.warn('LeaderboardManager: init failed', e);
        }
    }

    async submitScore(score: number): Promise<void> {
        SaveManager.setBestScore(score);

        try {
            await Firebase.logEvent('level_end', {
                score,
                best: SaveManager.getBestScore(),
                profile: SaveManager.getProfile().id,
            });
        } catch (_) {}

        if (this.native) {
            this.sync();
            return;
        }

        try {
            await Firebase.submitScore(this.boardId, score);
        } catch (e) {
            console.warn('LeaderboardManager: submitScore failed', e);
        }
    }

    /**
     * Native: push each profile's best that improved since it was last sent. Bests come from the save,
     * so scores made before signing in (or offline) reach the board on the next sync.
     */
    private sync(): void {
        if (!this.signedIn || this.syncing) return;
        this.syncing = true;

        const sent = this.sent();
        const jobs = (Object.keys(PROFILES) as ProfileId[])
            .filter((id) => this.configured(id))
            .map((id) => ({ id, best: SaveManager.getBestScoreFor(id) }))
            .filter(({ id, best }) => best > 0 && best > (sent[id] ?? 0))
            .map(({ id, best }) => GameServices.submitScore({ leaderboardId: this.nativeId(id), score: best })
                .then(() => { sent[id] = best; })
                .catch((e) => console.warn(`LeaderboardManager: submit ${id} failed`, e)));

        Promise.all(jobs).finally(() => {
            try { localStorage.setItem(SENT_KEY, JSON.stringify(sent)); } catch { /* storage unavailable */ }
            this.syncing = false;
        });
    }

    private sent(): Partial<Record<ProfileId, number>> {
        try { return JSON.parse(localStorage.getItem(SENT_KEY) ?? '{}'); } catch { return {}; }
    }

    /**
     * Native leaderboard button: sign in if needed (Play Games / Game Center sheet), then open the
     * current profile's board. Returns false if it couldn't open (declined sign-in, board not set up).
     */
    async open(): Promise<boolean> {
        const id = SaveManager.getProfile().id;
        if (!this.native || !this.configured(id)) return false;
        try {
            if (!this.signedIn) {
                this.signedIn = (await GameServices.signIn()).isSignedIn;
                if (!this.signedIn) return false;
            }
            this.sync();
            await GameServices.showLeaderboard({ leaderboardId: this.nativeId(id) });
            Firebase.logEvent('leaderboard_open', { profile: id }).catch(() => {});
            return true;
        } catch (e) {
            console.warn('LeaderboardManager: open failed', e);
            return false;
        }
    }

    // ── Firebase boards (web) ───────────────────────────────────────────────

    async getTopPlayers(count = 50) {
        return Firebase.getTopPlayers(this.boardId, count);
    }

    async getPlayerRank(): Promise<number> {
        return Firebase.getPlayerRank(this.boardId);
    }

    async getPlayerProfile() {
        return Firebase.getPlayerProfile(this.boardId);
    }
}

export const LeaderboardManager = new LeaderboardManagerClass();
