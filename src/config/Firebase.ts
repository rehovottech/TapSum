import type { FirebaseConfigInput } from '@rehovottech/firebase';

/**
 * Firebase web-app config, used by @rehovottech/firebase (the Firebase JS SDK in the WebView).
 *
 * Web uses it for Analytics, anonymous auth and the leaderboard. Android and iOS use Play Games /
 * Game Center for leaderboards (game/managers/LeaderboardManager.ts), and
 * native Analytics with their own projects (ios/App/App/GoogleService-Info.plist,
 * android/app/google-services.json). Each event carries an `app_platform` parameter / user property
 * (android | ios | web), set in services/Firebase.ts.
 */
export const FirebaseConfig: FirebaseConfigInput = {
    apiKey: "AIzaSyBHv5cLgIAqEaBVnWX3IWAMMFrwr6ZLtUY",
    authDomain: "rehovotgames.firebaseapp.com",
    projectId: "rehovotgames",
    storageBucket: "rehovotgames.firebasestorage.app",
    messagingSenderId: "947127481548",
    appId: "1:947127481548:web:bf312c2f0402caac76be69",
    measurementId: "G-9CZ2C319HG"
};
