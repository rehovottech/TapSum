import { Capacitor } from '@capacitor/core';
import { GameServices } from '@rehovottech/game-service';
import { Firebase } from '../../services/Firebase';
import { LEADERBOARDS } from '../../config/GameServices';
import { FirebaseConfig } from '../../config/Firebase';
import { PROFILES, ProfileId } from '../constants/GameConstants';
import { SaveManager } from './SaveManager';

const PLATFORM = Capacitor.getPlatform();
const NATIVE_SENT_KEY = 'tapsum_gs_sent';
// Per Firebase project, so moving projects re-sends every best to the new General board
const FB_SENT_KEY = `tapsum_fb_sent_${FirebaseConfig.projectId}`;

type Sent = Partial<Record<ProfileId, number>>;

// Leaderboards (docs/GAME_ESSENTIALS.md § 7), one per profile so kids and adults never compete:
//  - General board (Firebase): web, Android and iOS together. In-game panel and End-screen rank.
//  - Platform board (Android: Play Games, iOS: Game Center), opened from the panel's button.
// Both layers get each profile's best from the save, so offline scores and scores made before
// sign-in arrive later. Each layer keeps its own "last sent" record.
class LeaderboardManagerClass {
    private signedIn = false;
    private syncing = false;
    private fbSyncing = false;

    /** General (Firebase) board of the current profile. */
    get boardId(): string {
        return LEADERBOARDS[SaveManager.getProfile().id].firebase;
    }

    private nativeId(id: ProfileId): string {
        const board = LEADERBOARDS[id];
        return PLATFORM === 'ios' ? board.ios : board.android;
    }

    private configured(id: ProfileId): boolean {
        return Capacitor.isNativePlatform() && !this.nativeId(id).startsWith('REPLACE');
    }

    /** True when the current profile has a Play Games / Game Center board on this platform. */
    get platformBoardAvailable(): boolean {
        return this.configured(SaveManager.getProfile().id);
    }

    /** "Game Center" on iOS, "Play Games" on Android. */
    get platformName(): string {
        return PLATFORM === 'ios' ? 'Game Center' : 'Play Games';
    }

    /**
     * Startup. Signs in to Firebase anonymously (General board) on every platform and syncs it.
     * Android checks Play Games' automatic sign-in (no UI). iOS waits for the Game Center button,
     * so kids don't get a prompt at launch.
     */
    async init(): Promise<void> {
        await Firebase.signInAnonymous();
        this.syncFirebase();
        if (PLATFORM !== 'android' || !this.platformBoardAvailable) return;
        try {
            this.signedIn = (await GameServices.isSignedIn()).isSignedIn;
            if (this.signedIn) this.syncNative();
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

        await this.syncFirebase();
        this.syncNative();
    }

    /** Each profile's best that's above what this layer last stored. */
    private pending(sent: Sent, skip?: (id: ProfileId) => boolean): { id: ProfileId; best: number }[] {
        return (Object.keys(PROFILES) as ProfileId[])
            .filter((id) => !skip?.(id))
            .map((id) => ({ id, best: SaveManager.getBestScoreFor(id) }))
            .filter(({ id, best }) => best > 0 && best > (sent[id] ?? 0));
    }

    /** General board: push every best that improved since the last stored submit. */
    private async syncFirebase(): Promise<void> {
        if (this.fbSyncing) return;
        this.fbSyncing = true;
        const sent = this.sent(FB_SENT_KEY);
        await Promise.all(this.pending(sent).map(({ id, best }) =>
            Firebase.submitScore(LEADERBOARDS[id].firebase, best).then((ok) => { if (ok) sent[id] = best; })));
        this.save(FB_SENT_KEY, sent);
        this.fbSyncing = false;
    }

    /** Platform board: same, once signed in to Play Games / Game Center. */
    private syncNative(): void {
        if (!this.signedIn || this.syncing) return;
        this.syncing = true;
        const sent = this.sent(NATIVE_SENT_KEY);
        const jobs = this.pending(sent, (id) => !this.configured(id))
            .map(({ id, best }) => GameServices.submitScore({ leaderboardId: this.nativeId(id), score: best })
                .then(() => { sent[id] = best; })
                .catch((e) => console.warn(`LeaderboardManager: submit ${id} failed`, e)));
        Promise.all(jobs).finally(() => {
            this.save(NATIVE_SENT_KEY, sent);
            this.syncing = false;
        });
    }

    private sent(key: string): Sent {
        try { return JSON.parse(localStorage.getItem(key) ?? '{}'); } catch { return {}; }
    }

    private save(key: string, sent: Sent): void {
        try { localStorage.setItem(key, JSON.stringify(sent)); } catch { /* storage unavailable */ }
    }

    /**
     * Panel's "Open Play Games / Game Center" button: sign in if needed (Play Games / Game Center
     * sheet), sync, then open the current profile's platform board. False if it couldn't open.
     */
    async openPlatformBoard(): Promise<boolean> {
        const id = SaveManager.getProfile().id;
        if (!this.configured(id)) return false;
        try {
            if (!this.signedIn) {
                this.signedIn = (await GameServices.signIn()).isSignedIn;
                if (!this.signedIn) return false;
            }
            this.syncNative();
            await GameServices.showLeaderboard({ leaderboardId: this.nativeId(id) });
            Firebase.logEvent('leaderboard_open', { profile: id, board: 'platform' }).catch(() => {});
            return true;
        } catch (e) {
            console.warn('LeaderboardManager: open failed', e);
            return false;
        }
    }

    // ── General board (Firebase), every platform ────────────────────────────

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
