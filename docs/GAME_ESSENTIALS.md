# Every-game essentials

Four features every Rehovot game ships with. Tap Sum is the reference implementation, and [FIREBASE_SETUP.md](FIREBASE_SETUP.md) covers Firebase and analytics.

| Feature | Platforms | Package | In Tap Sum |
|---|---|---|---|
| 1. Buy-a-coffee IAP | web, iOS, Android | `@rehovottech/capacitor-purchases` | ✅ |
| 2. "New update" alert | iOS, Android | `@rehovottech/capacitor-app-update` (`plugins/rehovot-app-update`) | ❌ plugin ready, popup not built yet |
| 3. Local notifications | iOS, Android | `@capacitor/local-notifications` | ✅ |
| 4. Leaderboards | web: Firebase · Android: Play Games · iOS: Game Center | `@rehovottech/firebase` + `@rehovottech/game-service` | ✅ code done; store boards still to create |

The first three are started once from `initServices()` in `src/App.tsx`. Leaderboards start from the Boot scene (`LeaderboardManager.init()`).

```ts
PurchasesManager.initialize().catch(() => {});
NotificationManager.initialize().catch(() => {});
// UpdateManager.check().catch(() => {});      // once item 2 is built
```

---

## 1. Buy-a-coffee IAP

The only in-app purchase is the coffee donation. There's no remove-ads IAP.

| Platform | How the donation is paid |
|---|---|
| Android | Google Play Billing (consumable products) |
| iOS | StoreKit (consumable products) |
| Web | Razorpay checkout |

### Files to copy

- **`src/config/Purchases.ts`:** product IDs, web prices (INR) and popup text.
- **`src/services/Purchases.ts`:** `PurchasesManager`. While the popup is open, it turns off Phaser input via the `popupOpened` / `popupClosed` events.
- **The coffee button in the Menu scene** (`checkPurchaseButton` / `createDonateButton` in `Menu.ts`):
  - It shows only while `hasSupported()` is false, so it's hidden after someone donates.
  - Tapping it calls `PurchasesManager.showDonate()`.

### Per game

1. **Install:** `npm i @rehovottech/capacitor-purchases@file:../../plugins/rehovot-purchase @capacitor/preferences`.
2. **Product IDs:** use `com.rehovot.game.<game>.donate_small | donate_medium | donate_large`, with the same IDs on both stores.
   - **Play Console:** Monetize ▸ In-app products. Create all 3 and set them **active**.
   - **App Store Connect:** In-App Purchases. Create all 3 as **Consumable**, and attach them to the version you submit.
3. **Web:** set `VITE_RAZORPAY_KEY` in `.env` and in the web host's environment variables. Keep only a placeholder in `.env.example`.
4. **When the popup shows:**
   - **Automatically:** once the app has been opened **3 days in a row**, then at most every 30 days (each time after a new 3-day streak).
   - **Any time:** from the coffee button.
   - **Config:** `donation: { enabled: true, showAfterConsecutiveDays: 3, showAfterLaunches: 1, remindEveryDays: 30, parentalGate: true }`.
   - **Kids' games must keep `parentalGate: true`** (Play Families policy). Tapping a donate amount first shows "Ask a grown-up": type three numbers written as words, three tries. Only after that does the store or Razorpay sheet open.
5. **Premium:** leave `premium.enabled` off unless the game sells premium. It changes where the donate popup may appear (see the plugin README).
6. **Portrait lock:** `MainActivity` must re-lock portrait on resume and focus change. The Play billing sheet can leave the app in landscape.

### Test

- **Android:** use a licence-tester account on an internal-testing build.
- **iOS:** use a sandbox account or a StoreKit configuration file.
- **Web:** use a Razorpay **test** key.
- **After a purchase:** check that the button disappears.
- **3-day popup without waiting 3 days:** on web, set `localStorage["CapacitorStorage.rehovot_purchases_reminder_state"]` to `lastLaunchDay` = yesterday (`YYYY-MM-DD`) and `launchDayStreak: 2`, with `firstInstallDate` a few days back and no `lastPopupDate`. Reload, and the popup should show.

---

## 2. In-app "new update" alert

Our own plugin, **`@rehovottech/capacitor-app-update`** (`plugins/rehovot-app-update`, see its README), reads the version that's live on the store:
- **Android:** Play in-app updates.
- **iOS:** the App Store lookup by bundle ID.

Install: `npm i @rehovottech/capacitor-app-update@file:../../plugins/rehovot-app-update && npx cap sync`.

The in-game popup isn't built in Tap Sum yet. Every game should follow the same design:
- **When it runs:** check once per launch on native only, a few seconds after the Menu appears, never during a game.
- **When an update exists:** show the game's own small popup, styled like the other popups.
  - Title "New version available!"
  - Buttons **Update** and **Later**
  - **Update** calls `AppUpdate.openAppStore()`. On Android, `performImmediateUpdate()` can update in place instead.
  - **Later** snoozes the popup for 3 days, stored in Preferences.
- **Forced updates (optional):** compare against a `min_version` stored in Firebase. Below that version, hide **Later**.
  - Use this only for breaking changes, such as a leaderboard format change.

### Sketch

```ts
import { AppUpdate, AppUpdateAvailability } from '@rehovottech/capacitor-app-update';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const SNOOZE_KEY = 'update_snooze_until';
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

export const UpdateManager = {
    async check(onUpdate: (version: string) => void): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;
        const { value } = await Preferences.get({ key: SNOOZE_KEY });
        if (value && Date.now() < Number(value)) return;

        const info = await AppUpdate.getAppUpdateInfo();     // rejects if the store can't be reached
        if (info.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE) {
            onUpdate(info.availableVersionName ?? '');     // show the in-game popup
        }
    },
    later: () => Preferences.set({ key: SNOOZE_KEY, value: String(Date.now() + SNOOZE_MS) }),
    update: () => AppUpdate.openAppStore(),
};
```

### Things to know

- **Testing:**
  - **Android:** the check only works for installs from the Play Store, so test with internal app sharing or internal testing.
  - **iOS:** the check only works once the app is live on the App Store.
- **Kids' games:** opening the store must not happen on its own. Only a tap on **Update** opens it.

---

## 3. Local notifications

The game sends one "come back and play" reminder **3 days after the last session**. The reminder is local only, with no push and no Firebase Messaging. That keeps it child-safe, and the iOS app needs no Push capability.

### Files to copy

- **`src/services/Notification.ts`:** `NotificationManager`.
  - `initialize()` asks for permission once, on native only.
  - It then calls `schedulePlayReminder()`.
  - `schedulePlayReminder()` cancels the pending reminder (fixed ID `1002`) and schedules a new one 3 days out. Each play session pushes the timer forward, so the reminder only fires after 3 idle days.

### Per game

1. **Install:** `npm i @capacitor/local-notifications && npx cap sync`.
2. **Edit the text:** change `title` / `body` / `iconColor` in `schedulePlayReminder()`. Use the game's name and tone.
3. **Reschedule on play:** call `NotificationManager.schedulePlayReminder()` whenever a game session starts, as well as at launch.
4. **Android:**
   - Add a white, transparent notification icon at `res/drawable/ic_stat_icon_config_sample`, or set `smallIcon` in `capacitor.config.ts` under `plugins.LocalNotifications`.
   - Android 13+ asks for permission at runtime. The plugin declares `POST_NOTIFICATIONS`.
5. **iOS:** no capabilities are needed for local notifications. Don't add Push Notifications or `aps-environment` unless you really use push.

### Recurring reminders

Need recurring reminders, such as "every Friday 8 PM" or a streak? Use **`rehovot-notify`** (`plugins/rehovot-notify`). It has the Rule Engine (`weekends`, `every N days`, …) plus `streakReminder()` and `rewardReminder()`, and it survives reboots and timezone changes.

Use local notifications only from rehovot-notify. Its push mode needs FCM, which kids' games should avoid.

### Test

Temporarily change `THREE_DAYS_MS` to about 60 seconds. Launch the app, background it, and wait for the notification. Change it back afterwards.

---

## 4. Leaderboards

| Platform | Backend | Where players see it |
|---|---|---|
| Web | Firebase (`@rehovottech/firebase`, anonymous sign-in) | The in-game `LeaderboardPanel`: top 50, the player's rank, "World rank" on the End screen |
| Android | **Google Play Games Services v2** (`@rehovottech/game-service`) | Play Games' own leaderboard screen |
| iOS | **Apple Game Center** (`@rehovottech/game-service`) | Game Center's own leaderboard screen |

- **Separate boards:** each platform has its own leaderboard, and they don't merge.
- **One board per profile:** each profile has its own board on every platform, so kids and adults never compete.
- **No Firebase sign-in on mobile:** analytics there is native (see [FIREBASE_SETUP.md](FIREBASE_SETUP.md)).

### How it works (Tap Sum)

- **`src/config/GameServices.ts`:** the native board IDs per profile (`android`, `ios`).
  - The Firebase board IDs stay in `PROFILES[id].leaderboard`.
  - Any ID starting with `REPLACE` is skipped on that platform.
- **`src/game/managers/LeaderboardManager.ts`:**
  - **`init()` (Boot):**
    - **Web:** Firebase anonymous sign-in.
    - **Android:** a silent Play Games check, because Play Games signs players in automatically.
    - **iOS:** nothing. Game Center sign-in waits for the leaderboard button, so kids don't get a prompt at launch.
  - **`submitScore(score)` (game over):**
    - Saves the best score and logs `level_end`.
    - **Web:** submits to Firebase.
    - **Native:** runs `sync()`.
  - **`sync()`:** sends each profile's **best** that is higher than what was last sent (stored in `tapsum_gs_sent`).
    - Scores made offline or before sign-in reach the board later.
    - It is safe to call often.
  - **`open()`:** signs in if needed (Play Games / Game Center sheet), syncs, then opens the current profile's board.
- **`BaseScene.openLeaderboard()`:**
  - **Web:** opens the Firebase panel.
  - **Native:** calls `open()`.
  - If the player declines sign-in, shows a toast: "Sign in to Game Center / Play Games to see the leaderboard".
- **Menu ▸ LEADERBOARD:** calls `openLeaderboard()`.
- **End screen:** web shows **World rank**. On native, that row becomes **Leaderboard ▸ OPEN**, which opens the native board, because Play Games and Game Center don't give the rank back.

### Per game

1. **Install:** `npm i @rehovottech/game-service@file:../../plugins/rehovot-game-service && npx cap sync`.
2. **Android (Play Console ▸ Play Games Services):**
   1. Set up the service for the app.
      - Add an **Android OAuth credential** for each signing key: debug, upload and the Play app-signing SHA-1.
      - Publish the Play Games configuration, or add testers.
   2. **Leaderboards:** create one per board, type "higher is better". Copy each `CgkI…` ID into `GameServices.ts`.
   3. **`android/app/src/main/res/values/strings.xml`:** set `game_services_project_id` to the **Project ID**, shown under Play Games Services ▸ Configuration (numeric).
   4. **`AndroidManifest.xml`:** inside `<application>`, add:
      ```xml
      <meta-data android:name="com.google.android.gms.games.APP_ID" android:value="@string/game_services_project_id" />
      ```
3. **iOS:**
   1. **Entitlement:** `ios/App/App/App.entitlements` with `com.apple.developer.game-center = true`, and `CODE_SIGN_ENTITLEMENTS = App/App.entitlements` in both build configs. This is the same as adding **+ Game Center** under Signing & Capabilities.
   2. **App Store Connect ▸ the app ▸ Services ▸ Game Center ▸ Leaderboards:** create **Classic** leaderboards, "High score", Integer format.
      - Use **exactly** the IDs in `GameServices.ts`, e.g. `com.rehovot.game.<game>.<board>`.
      - Turn Game Center on for the app version you submit.
4. **Web:** nothing extra. Firebase boards are created on the first score.

### Kids' games

- **No sign-in at launch on iOS.** Game Center authenticates only when the player taps a leaderboard button. Android's Play Games check is silent.
- **Player names:** the boards show the platform nickname, not anything the game collects.
- **Policy check:** before release, check the Play Families policy and Apple's Kids guidelines for social features, such as Play Games profiles or friends lists.

### Test

- **Android:** use a build signed with a key that has an OAuth credential, and a tester account listed in Play Games Services. Unknown keys fail to sign in.
- **iOS:** sign in to Game Center in the simulator (Settings ▸ Game Center) with a sandbox account. Leaderboards only show once they exist in App Store Connect.
- **Offline scores:** play a game while signed out, then tap **Leaderboard** and sign in. The earlier best should appear.

---

## Release checklist (per game)

- [ ] 3 donate products are active on Play and on App Store Connect, and the Razorpay key is set on the web host.
- [ ] The coffee button opens the popup and hides after a purchase. The automatic popup appears on the 3rd day in a row, and the parental gate shows before payment.
- [ ] The update alert shows on an older build and snoozes for 3 days after **Later**.
- [ ] The 3-day reminder fires, with the right text and icon.
- [ ] Leaderboards: native IDs filled in `GameServices.ts`, the Play Games project ID is set, the Game Center boards exist, and a score shows on each platform.
