# Firebase setup: one config per platform

How Tap Sum wires up Firebase. To set up another Rehovot game, copy the steps below.

## The model

| Platform | Analytics | Auth + leaderboard |
|---|---|---|
| Web | Web SDK, web config (`src/config/Firebase.ts`) | Web config |
| Android | **Native**, `android/app/google-services.json` | Web config |
| iOS | **Native**, `ios/App/App/GoogleService-Info.plist` | Web config |

- **Analytics:** each platform reports to its own Firebase app or project.
- **Auth and the leaderboard:** all three platforms share the **web config** through `@rehovottech/firebase`, the Firebase JS SDK running in the WebView. Players on every platform therefore share one leaderboard.
- **Platform tag:** every event and user carries `app_platform` = `web` | `android` | `ios`.

**Why native analytics on mobile:**
- **iOS:** the GA4 web tag sends nothing from iOS, because the WebView origin is `capacitor://`.
- **Android:** the web tag does work there, but native analytics is used for consistency with iOS and to give each platform its own data stream.

**Child-directed defaults (all platforms):**
- No advertising ID.
- `ad_storage`, `ad_user_data` and `ad_personalization` are denied from launch.
- Google signals are off.

## Checklist for a new game

1. **Firebase console:**
   - Add a **Web app** to the web project and copy its config.
   - Add an **Android app** with the game's package name and download `google-services.json`.
   - Add an **iOS app** with the bundle ID and download `GoogleService-Info.plist`.
   - Keep copies in `exclude/data/`.
2. **Packages:**
   ```bash
   npm i firebase@^12 @capacitor-firebase/analytics@^8 @rehovottech/firebase@file:../../plugins/rehovot-firebase
   ```
3. **Web config:** put it in `src/config/Firebase.ts`. Change `apiKey`, `appId` and `measurementId` per game.
4. **Service:** copy `src/services/Firebase.ts` (see [The service](#the-service)).
5. **Vite:** add the vite changes (see [Vite](#vite)).
6. **Android:** add the Android steps (see [Android](#android)).
7. **iOS:** add the iOS steps (see [iOS](#ios)). The iOS project must use **CocoaPods**.
8. **Build and sync:** `npm run build && npx cap sync`.
9. **GA4 console:** do this in **each** property the game uses.
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
        // the web SDK still starts on every platform (auth + leaderboard); analytics only on web
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

The full file is in Tap Sum. Copy it as is; it has no game-specific code apart from the leaderboard IDs.

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
