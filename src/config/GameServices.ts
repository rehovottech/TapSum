import type { ProfileId } from '../game/constants/GameConstants';

/**
 * Leaderboards (docs/GAME_ESSENTIALS.md § 7), one per profile so kids and adults never compete:
 *  - firebase: the General board. Every platform (web, Android, iOS) together, in the in-game panel.
 *  - android / ios: the platform board (Google Play Games Services v2 / Apple Game Center), opened from
 *    the panel's "Open Play Games / Game Center" button.
 *
 * Android: Play Console > Play Games Services > Leaderboards - paste each generated id ("CgkI...").
 *          Also set game_services_project_id in android/app/src/main/res/values/strings.xml.
 * iOS:     App Store Connect > Tap Sum > Services > Game Center > Leaderboards - create them with
 *          exactly the ids below (Classic leaderboard, "High score", score format Integer).
 * Firebase: boards appear with the first score; their score limits are in the shared master rules,
 *           turns/firestore.rules (deployed only from the turns folder, docs/FIREBASE_SETUP.md).
 *
 * A native id starting with REPLACE is skipped on that platform (no submit, no button).
 */
export const LEADERBOARDS: Record<ProfileId, { title: string; firebase: string; android: string; ios: string }> = {
    little: {
        title: 'Little Learner',
        firebase: 'tapsum_little',
        android: 'REPLACE_WITH_PLAY_LEADERBOARD_ID',
        ios: 'com.rehovot.game.tapsum.little',
    },
    explorer: {
        title: 'Explorer',
        firebase: 'tapsum',
        android: 'REPLACE_WITH_PLAY_LEADERBOARD_ID',
        ios: 'com.rehovot.game.tapsum.explorer',
    },
    adult: {
        title: 'Brain Trainer',
        firebase: 'tapsum_adult',
        android: 'REPLACE_WITH_PLAY_LEADERBOARD_ID',
        ios: 'com.rehovot.game.tapsum.adult',
    },
};
