# Firebase setup: three shared projects

How every Rehovot game wires up Firebase analytics and the General leaderboard. Turns is the reference. To set up another game, follow the checklist below.

## The three projects

All Rehovot games share **three** Firebase projects, one per platform. A new game doesn't get its own project: it's added as an **app** inside each of the three.

| Project | Used for | Each game adds | Config in the game |
|---|---|---|---|
| **`rehovt-web-games`** | Web analytics **and every game's General leaderboard** (Firestore + anonymous Auth) | a **Web app** | `src/config/Firebase.ts` |
| **`rehovt-android-games`** | Android analytics only | an **Android app** (the game's package name) | `android/app/google-services.json` |
| **`rehovt-ios-games`** | iOS analytics only | an **iOS app** (the game's bundle ID) | `ios/App/App/GoogleService-Info.plist` |

- **Analytics:** each platform reports to its own project. Inside it, each game is its own app or data stream, so games never mix. Filter by app or stream in GA4.
- **General leaderboard:** lives only in `rehovt-web-games`. Android and iOS connect to it with the game's **web config** (`src/config/Firebase.ts`), only for the leaderboard; their analytics stays native. That's what puts web, Android and iOS players on one board. See [GAME_ESSENTIALS.md § 7](GAME_ESSENTIALS.md#7-leaderboards-general-board-web--mobile--platform-boards).
- **No leaderboards in the Android or iOS projects.** Their Firestore isn't used. On mobile, the platform boards are Play Games and Game Center.
- **Platform tag:** every event and user carries `app_platform` = `web` | `android` | `ios`.

| Platform | Analytics | General board | Platform board |
|---|---|---|---|
| Web | Web SDK → `rehovt-web-games` | `rehovt-web-games` | — |
| Android | **Native** → `rehovt-android-games` | `rehovt-web-games` (web config) | Google Play Games |
| iOS | **Native** → `rehovt-ios-games` | `rehovt-web-games` (web config) | Game Center |

**Why native analytics on mobile:**
- **iOS:** the GA4 web tag sends nothing from iOS, because the WebView origin is `capacitor://`.
- **Android:** the web tag does work there, but native analytics is used for consistency with iOS and to give each platform its own data stream.

**Child-directed defaults (all platforms):**
- No advertising ID.
- `ad_storage`, `ad_user_data` and `ad_personalization` are denied from launch.
- Google signals are off.

## Leaderboards in `rehovt-web-games`

Every game's General boards live in the same Firestore, kept apart by their **board ID**:

- **Board IDs start with the game's name:** `turns_stars`, `turns_time_attack`, `turns_daily_streak`, `tapsum_little`, `tapsum`, `tapsum_adult`, …. Entries are stored at `leaderboards/{boardId}/entries/{playerId}`. A new board appears with its first score; there's nothing to create.
- **Pick a new, unique prefix for each game**, so two games can never write to the same board.
- **One rules file for the whole project.** A deploy replaces the project's entire rules, so all games share **one** `firestore.rules`.
  - **Master copy:** `/Volumes/T7/Work/Office/Firebase/rehovt-web-games/firestore.rules`, a shared folder that belongs to no game. Its `.firebaserc` points at `rehovt-web-games`; deploy only from there.
  - **New game:** add its boards to `maxScore()` in that file, with each board's highest possible score, then deploy:
    ```bash
    cd /Volumes/T7/Work/Office/Firebase/rehovt-web-games && firebase deploy --only firestore:rules
    ```
  - **Never deploy `rehovt-web-games` rules from a game's folder.** That would replace every other game's limits.
- **What the rules allow:**
  - any signed-in player can read the boards;
  - a player can only write their own entry;
  - a score can never go down, and can't be above the board's `maxScore()`;
  - boards that aren't listed in `maxScore()` only get the first three checks.

### How the master connects to each game

No file or code links them. The games and the rules meet only inside Firebase:

```
 /Volumes/T7/Work/Office/Firebase/rehovt-web-games/firestore.rules   (master, on the Mac)
                 │
                 │  firebase deploy --only firestore:rules   (only when someone runs it)
                 ▼
 ┌──────────── Firebase project "rehovt-web-games" (Google's servers) ────────────┐
 │  Live Firestore rules  ← checked by Google on every read and write             │
 │  leaderboards/turns_stars/entries/…                                            │
 │  leaderboards/tapsum/entries/…                                                 │
 └────────────────────────────────────────────────────────────────────────────────┘
        ▲                                     ▲
        │ projectId: "rehovt-web-games"       │ projectId: "rehovt-web-games"
  Turns (src/config/Firebase.ts)        Tap Sum (src/config/Firebase.ts)
  writes board "turns_stars"            writes board "tapsum"
```

1. **Project ID:** each game's `src/config/Firebase.ts` has `projectId: "rehovt-web-games"`. That sends its scores to the shared Firestore. The game holds no copy of the rules.
2. **Board ID:** a score lands at `leaderboards/<boardId>/entries/<player>`. Google runs the **live** rules, and `maxScore('<boardId>')` finds that board's line. The ID comes from `firebase: '…'` in the game's `src/config/GameServices.ts`.

What follows:
- **No app update needed:** a rules deploy applies to every game at once.
- **The master file only matters at deploy time.** Editing it changes nothing until you deploy; the live rules stay in Firebase even if the file is lost (keep it in git or backed up).
- **Board IDs must match exactly** in `GameServices.ts` and `maxScore()`. A board that isn't listed still works, with only the basic checks (sign-in, own entry, score never goes down).
- **What's live:** Firebase console ▸ `rehovt-web-games` ▸ Firestore ▸ **Rules**, with the history of every deploy.

## Status

| Game | Web + General board | Android analytics | iOS analytics |
|---|---|---|---|
| **Turns** | `rehovt-web-games` ✅ | `turns-d1448` → move to `rehovt-android-games` | `turns-d1448` → move to `rehovt-ios-games` |
| **Tap Sum** | `rehovotgames` → move to `rehovt-web-games` | `rehovotgames` → move to `rehovt-android-games` | `rehovot-ios-games` → move to `rehovt-ios-games` |

**Moving a game:**
1. Add it as an app in the target project.
2. Replace its config: the web config, `google-services.json` or the plist.
3. Add its boards to the master `firestore.rules` and deploy.

Moving the web config to `rehovt-web-games` starts that game's General board fresh: old scores stay in the old project. Analytics history also stays in the old GA4 property.

## Checklist for a new game

1. **Firebase console:** add the game as an app in each of the three projects. Don't create a new project.
   - **`rehovt-web-games`:** add a **Web app** and copy its config.
   - **`rehovt-android-games`:** add an **Android app** with the game's package name, and download `google-services.json`.
   - **`rehovt-ios-games`:** add an **iOS app** with the bundle ID, and download `GoogleService-Info.plist`.
   - Keep copies in `exclude/data/`.
2. **Packages:**
   ```bash
   npm i firebase@^12 @capacitor-firebase/analytics@^8 @rehovottech/firebase@file:../../plugins/rehovot-firebase
   ```
3. **Web config:** put the game's **own** web app config in `src/config/Firebase.ts`. Its `appId` and `measurementId` are per game; don't copy another game's, or the two games' web analytics mix. The same config is used on every platform for the General board.
   - **Board IDs:** pick a prefix for the game and add each board's limit to `maxScore()` in `/Volumes/T7/Work/Office/Firebase/rehovt-web-games/firestore.rules`, then deploy it from that shared folder (see [Leaderboards](#leaderboards-in-rehovt-web-games)).
4. **Service:** copy `src/services/Firebase.ts` (see [The service](#the-service)).
5. **Vite:** add the vite changes (see [Vite](#vite)).
6. **Android:** add the Android steps (see [Android](#android)).
7. **iOS:** add the iOS steps (see [iOS](#ios)). The iOS project must use **CocoaPods**.
8. **Build and sync:** `npm run build && npx cap sync`.
9. **GA4 console:** each of the three projects has its own GA4 property. These settings are per **property**, so they're done once and then cover every game.
   - Turn **Google signals off**.
   - Add custom dimensions `app_platform`: one **event**-scoped and one **user**-scoped.
10. **Verify:** check events in **DebugView** on each platform (see [Verify](#verify)).

## The service

`src/services/Firebase.ts`, key parts:

```ts
import { Capacitor } from '@capacitor/core';
import { FirebaseAnalytics, ConsentType, ConsentStatus } from '@capacitor-firebase/analytics';

const APP_PLATFORM = Capacitor.getPlatform();          // 'android' | 'ios' | 'web'
const NATIVE_ANALYTICS = APP_PLATFORM === 'ios' || APP_PLATFORM === 'android';

init():
    const prepare = NATIVE_ANALYTICS ? this.prepareNativeAnalytics() : this.prepareChildSafeAnalytics();
    prepare.catch(warn)
        // the web SDK starts on every platform: web analytics on web, the General leaderboard everywhere
        .then(() => RehovotFirebase.initialize({ ...FirebaseConfig, analyticsEnabled: !NATIVE_ANALYTICS }));

prepareNativeAnalytics():           // iOS / Android
    FirebaseAnalytics.setConsent AnalyticsStorage = Granted
    FirebaseAnalytics.setConsent AdStorage / AdUserData / AdPersonalization = Denied
    FirebaseAnalytics.setUserProperty({ key: 'app_platform', value: APP_PLATFORM })

prepareChildSafeAnalytics():        // web
    setConsent({ analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' })
    app = getApps()[0] ?? initializeApp(webConfig)
    if (await isSupported()) {
        analytics = initializeAnalytics(app, { config: { allow_google_signals: false, allow_ad_personalization_signals: false } })
        setUserProperties(analytics, { app_platform: APP_PLATFORM })
    }

logEvent(name, params):
    const p = { ...params, app_platform: APP_PLATFORM };   // attach on every event
    NATIVE_ANALYTICS ? FirebaseAnalytics.logEvent({ name, params: p })
                     : RehovotFirebase.Analytics.logEvent(name, p);
```

The full file is in Turns (`src/services/Firebase.ts`), including the General-board calls (`signInAnonymous`, `submitScore`, `getTopPlayers`, `getPlayerRank`). Copy it as is; it has no game-specific code. The board IDs live in `src/config/GameServices.ts`.

## Vite

In `vite.config.ts`:

```ts
legacy({ modernTargets: ['chrome >= 87', 'edge >= 88', 'firefox >= 78', 'safari >= 14', 'ios >= 14'] }),
...
resolve: { dedupe: [..., '@capacitor/core', 'firebase'] },
```

- **`modernTargets`:** Firebase 12 uses BigInt literals. Without this line, the legacy plugin's default targets (Safari 12) fail the build.
- **`dedupe: 'firebase'`:** the app and `@rehovottech/firebase` must share one Firebase copy. Otherwise the consent and analytics setup doesn't reach the plugin.

## Android

1. Copy `google-services.json` to **`android/app/google-services.json`**.
   - The Capacitor template applies the `google-services` plugin automatically when this file exists.
   - The file can list many apps. It must include the game's `applicationId`.
2. In `android/app/src/main/AndroidManifest.xml`, add `xmlns:tools="http://schemas.android.com/tools"` on `<manifest>`, then:

```xml
<!-- No advertising ID (Play Families policy / "Advertising ID: No" in Play Console) -->
<uses-permission android:name="com.google.android.gms.permission.AD_ID" tools:node="remove" />
<uses-permission android:name="android.permission.ACCESS_ADSERVICES_AD_ID" tools:node="remove" />
<uses-permission android:name="android.permission.ACCESS_ADSERVICES_ATTRIBUTION" tools:node="remove" />
<uses-permission android:name="android.permission.ACCESS_ADSERVICES_TOPICS" tools:node="remove" />

<application ...>
    <meta-data android:name="google_analytics_adid_collection_enabled" android:value="false" />
    <meta-data android:name="google_analytics_default_allow_ad_storage" android:value="false" />
    <meta-data android:name="google_analytics_default_allow_ad_user_data" android:value="false" />
    <meta-data android:name="google_analytics_default_allow_ad_personalization_signals" android:value="false" />
```

**Check:** after `./gradlew :app:processDebugMainManifest`, the merged manifest at `app/build/intermediates/merged_manifest/debug/processDebugMainManifest/AndroidManifest.xml` must contain **no** `AD_ID` or `ADSERVICES` permissions.

## iOS

The ads (LevelPlay) are CocoaPods-only, so the iOS project must use CocoaPods: `npx cap add ios --packagemanager CocoaPods`.

1. **Plist:** copy `GoogleService-Info.plist` to **`ios/App/App/`**. In Xcode, add it to the **App** target (Copy Bundle Resources).
2. **`ios/App/Podfile`**, inside `target 'App'` after `capacitor_pods`:

```ruby
use_frameworks! :linkage => :static   # at the top: needed by LevelPlay's static binaries

# Native Firebase Analytics without the advertising ID (IDFA)
pod 'CapacitorFirebaseAnalytics/AnalyticsWithoutAdIdSupport', :path => '../../node_modules/@capacitor-firebase/analytics'
```

3. **`AppDelegate.swift`:**

```swift
import FirebaseCore
...
func application(_ application: UIApplication, didFinishLaunchingWithOptions ...) -> Bool {
    if FirebaseApp.app() == nil {
        FirebaseApp.configure()   // reads GoogleService-Info.plist; crashes if the plist is missing
    }
    return true
}
```

4. **`Info.plist`:**

```xml
<key>GOOGLE_ANALYTICS_ADID_COLLECTION_ENABLED</key><false/>
<key>GOOGLE_ANALYTICS_DEFAULT_ALLOW_AD_STORAGE</key><false/>
<key>GOOGLE_ANALYTICS_DEFAULT_ALLOW_AD_USER_DATA</key><false/>
<key>GOOGLE_ANALYTICS_DEFAULT_ALLOW_AD_PERSONALIZATION_SIGNALS</key><false/>
```

Do **not** add `NSUserTrackingUsageDescription`: there's no IDFA and no tracking prompt.

5. **Install pods:** `cd ios/App && pod install`.
6. **Open the workspace:** from now on, open **`App.xcworkspace`**, not `App.xcodeproj`.

## Verify

**DebugView:** turn on debug mode, play one game, then open GA4 ▸ DebugView. You should see the game events with `app_platform`.
- **Android:** `adb shell setprop debug.firebase.analytics.app <package>`
- **iOS:** add `-FIRDebugEnabled` to the scheme's launch arguments.
- **Web:** use the GA Debugger extension, or check the network tab for `collect?...&ep.app_platform=web&gcs=G101&npa=1`.

**iOS log** should show "Ad storage consent is denied".

**Expected noise:**
- **"Firebase app has not yet been configured"** appearing early in the iOS log is harmless.
- **Error -34018 (Installation ID)** only happens on unsigned simulator builds. Sign the build to avoid it.

## Store answers this setup supports

- **Play Console:**
  - Advertising ID: **No**
  - Contains ads: Yes
  - Certified ad networks only
- **App Store privacy:**
  - Data: usage data and diagnostics, not linked to the user and not used for tracking.
  - No ATT prompt.
