import type { FirebaseConfigInput } from '@rehovottech/firebase';

/**
 * One Firebase web-app config for every platform (web, Android and iOS).
 *
 * @rehovottech/firebase is the Firebase JS SDK running in the WebView, so every platform shares this
 * config for auth and the leaderboard. Only web sends Analytics through it; iOS and Android use
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
