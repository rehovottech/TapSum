import type { ProfileId } from '../game/constants/GameConstants';

/**
 * Platform leaderboards (Google Play Games Services v2 / Apple Game Center), one per profile so kids
 * and adults never compete on the same board. Web uses the Firebase boards in PROFILES[id].leaderboard.
 *
 * Android: Play Console > Play Games Services > Leaderboards - paste each generated id ("CgkI...").
 *          Also set game_services_project_id in android/app/src/main/res/values/strings.xml.
 * iOS:     App Store Connect > Tap Sum > Services > Game Center > Leaderboards - create them with
 *          exactly the ids below (Classic leaderboard, "High score", score format Integer).
 *
 * A board whose id starts with REPLACE is skipped (no submit, no leaderboard button on that platform).
 */
export const LEADERBOARDS: Record<ProfileId, { android: string; ios: string }> = {
    little: {
        android: 'REPLACE_WITH_PLAY_LEADERBOARD_ID',
        ios: 'com.rehovot.game.tapsum.little',
    },
    explorer: {
        android: 'REPLACE_WITH_PLAY_LEADERBOARD_ID',
        ios: 'com.rehovot.game.tapsum.explorer',
    },
    adult: {
        android: 'REPLACE_WITH_PLAY_LEADERBOARD_ID',
        ios: 'com.rehovot.game.tapsum.adult',
    },
};
