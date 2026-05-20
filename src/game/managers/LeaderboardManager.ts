import { Firebase } from '../../services/Firebase';
import { SaveManager } from './SaveManager';

// Replace with your actual Google Play leaderboard ID from the Play Console.
const LEADERBOARD_ID = 'CgkI_YOUR_LEADERBOARD_ID';

// Google Play Games Services plugin (injected by Capacitor / Cordova on Android).
const gps = () => (window as any).plugins?.googlePlayGamesServices;

class LeaderboardManagerClass {
    async submitScore(score: number): Promise<void> {
        SaveManager.setBestScore(score);

        // Firebase Analytics event
        try {
            await Firebase.logEvent('level_end', { score, best: SaveManager.getBestScore() });
        } catch (_) {}

        // Google Play Games Services
        const plugin = gps();
        if (!plugin) return;
        try {
            await new Promise<void>((resolve, reject) => {
                plugin.submitScore(score, LEADERBOARD_ID, resolve, reject);
            });
        } catch (e) {
            console.warn('LeaderboardManager: submitScore failed', e);
        }
    }

    async showLeaderboard(): Promise<void> {
        const plugin = gps();
        if (!plugin) {
            console.warn('LeaderboardManager: Google Play Games Services not available');
            return;
        }
        try {
            await new Promise<void>((resolve, reject) => {
                plugin.showLeaderboard(LEADERBOARD_ID, resolve, reject);
            });
        } catch (e) {
            console.warn('LeaderboardManager: showLeaderboard failed', e);
        }
    }
}

export const LeaderboardManager = new LeaderboardManagerClass();
