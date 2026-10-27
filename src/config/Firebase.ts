import type { FirebaseConfigInput } from '@rehovottech/firebase';

/**
 * Firebase web config (docs/FIREBASE_SETUP.md), used on EVERY platform:
 *  - Web: analytics + the General leaderboard.
 *  - Android / iOS: only the General leaderboard (shared with web, so one world ranking). Their
 *    analytics is native and uses its own config: android/app/google-services.json and
 *    ios/App/App/GoogleService-Info.plist.
 * Don't switch projects per platform here, or the General leaderboard splits.
 *
 * Project rehovt-web-games, Tap Sum's own Web app ("TapSum"), shared with every Rehovot game's
 * General leaderboard. Android analytics: rehovotgames ("Rehovot Android Games");
 * iOS analytics: rehovot-ios-games ("Rehovot IOS Games").
 */
export const FirebaseConfig: FirebaseConfigInput = {
    apiKey: "AIzaSyBkNHhbVBekowh2nZNMkfMasAjql1eZ1t8",
    authDomain: "rehovt-web-games.firebaseapp.com",
    projectId: "rehovt-web-games",
    storageBucket: "rehovt-web-games.firebasestorage.app",
    messagingSenderId: "521325950905",
    appId: "1:521325950905:web:9b4e624fe0f7f373126868",
    measurementId: "G-395JTXHKEP"
};
