import { Firebase } from '../../services/Firebase';
import { SaveManager } from './SaveManager';
import { GameIds } from '../../constants/GameIds';

class LeaderboardManagerClass {
    async submitScore(score: number): Promise<void> {
        SaveManager.setBestScore(score);

        try {
            await Firebase.logEvent('level_end', { score, best: SaveManager.getBestScore() });
        } catch (_) {}

        try {
            await Firebase.submitScore(GameIds.TAP_SUM, score);
        } catch (e) {
            console.warn('LeaderboardManager: submitScore failed', e);
        }
    }

    async getTopPlayers() {
        return Firebase.getTopPlayers(GameIds.TAP_SUM);
    }

    async getPlayerRank(): Promise<number> {
        return Firebase.getPlayerRank(GameIds.TAP_SUM);
    }
}

export const LeaderboardManager = new LeaderboardManagerClass();
