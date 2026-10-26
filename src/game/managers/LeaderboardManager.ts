import { Firebase } from '../../services/Firebase';
import { SaveManager } from './SaveManager';

// One leaderboard per profile so kids and adults never compete on the same board.
class LeaderboardManagerClass {
    get boardId(): string {
        return SaveManager.getProfile().leaderboard;
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

        try {
            await Firebase.submitScore(this.boardId, score);
        } catch (e) {
            console.warn('LeaderboardManager: submitScore failed', e);
        }
    }

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
