# Every-game essentials

What every Rehovot game ships with. Turns (a general game with ads) and Tap Sum (a kids' game) are the reference implementations. [FIREBASE_SETUP.md](FIREBASE_SETUP.md) has the full Firebase steps. [AD_ESSENTIALS.md](AD_ESSENTIALS.md) has the full ads setup (LevelPlay, Unity Ads, AdMob).

## At a glance

| # | Essential | The rule | Reference |
|---|---|---|---|
| 1 | **Ads** | Each game is either **Kids** or **General**, set by one `AUDIENCE` constant. Mobile: LevelPlay. Web portal: Google H5 Games Ads | Turns (General), Tap Sum (Kids) |
| 2 | **Firebase Analytics** | Three shared projects, one per platform: `rehovt-web-games`, `rehovt-android-games` and `rehovt-ios-games`. Each game is an app in each of them, with its own config | Turns |
| 3a | **Buy a coffee** | **Only for learning games with no ads.** Coffee tips are the only purchase | Tap Sum |
| 3b | **Remove Ads + Buy a coffee** | **For games with ads.** One purchase that removes ads. Once bought, the popup never shows again and the button is hidden | Turns |
| 4 | **Support popup** | Shows automatically on the **3rd day in a row**, then at most every 30 days | Turns |
| 5 | **In-game alert for a new update** | Own popup on Home when a newer store version exists: **Update** / **Later** (snooze 3 days). Once per launch, never during a game | Turns |
| 6 | **Local notifications** | Local reminders only, no push | Turns, Tap Sum |
| 7 | **Leaderboards** | **General board** = web + Android + iOS combined, in `rehovt-web-games`. On mobile, **plus** the platform's own board (Play Games / Game Center) | Turns |
| 8 | **Privacy policy & terms** | One shared policy and terms for every game | Turns |
| 9 | **Audio: mobile music volume** | ⚠️ Music on iOS and Android must use Web Audio (`html5: false`). Their WebViews ignore `<audio>` volume, so html5 music plays at full volume | Turns |

**First decision for every game: its audience and whether it has ads.** That decides § 1 (Kids or General ads) and § 3 (Buy a coffee or Remove Ads + coffee).

Services start once from `initServices()` in `src/App.tsx`:

```ts
Firebase.init().catch(() => {});
PurchasesManager.initialize().catch(() => {});
Ads.init().catch(() => {});                  // games with ads only
Leaderboards.init().catch(() => {});
NotificationManager.initialize().catch(() => {});
// From the Home scene: UpdateManager.check() and PurchasesManager.remindIfDue()
```

---

## 1. Ads: two audience profiles

Every game picks **one** profile with a single constant in `src/config/Ads.ts`, and everything below follows from it:

```ts
export const AUDIENCE: 'kids' | 'general' = 'general';
```

| | **Kids** | **General** |
|---|---|---|
| Who it's for | Under 13. Listed in Designed for Families / Kids category | Everyone else (13+) |
| Reference | Tap Sum | Turns |
| First-launch consent card | None | "Keep <Game> free" card: **Allow** / **No thanks** |
| `CapacitorAds.setConsent(...)`, before `initialize` | Always `{ childDirected: true, gdprConsent: false, doNotSell: true }` | From the player's choice: `{ gdprConsent: yes, doNotSell: !yes }` |
| iOS tracking prompt (ATT) | Never. No `NSUserTrackingUsageDescription` in Info.plist | Only after **Allow** on the consent card |
| Android advertising ID | Removed: `AD_ID` and `ACCESS_ADSERVICES_*` with `tools:node="remove"` | Kept (`com.google.android.gms.permission.AD_ID`) |
| Ad types | Optional rewarded videos, plus interstitials between games. No banners | Rewarded, interstitial. Banner optional |
| Interstitial pacing | Not in the first 2 games, then at most every 2 games and ≥ 90 s apart | Not before an early level (Turns: level 8), then every N boards and ≥ 90 s apart |
| Settings | No ad-choice row | **Ad choices** row that reopens the consent card |
| LevelPlay / AdMob dashboards | App marked **child-directed**. AdMob max ad content rating **G**. Only Families-certified networks | Normal setup. Pick an AdMob rating that fits the game |
| Purchases | Behind the "Ask a grown-up" check (see § 3) | Direct |
| Play Console answers | Ads: Yes · Advertising ID: **No** · Target audience includes children | Ads: Yes · Advertising ID: **Yes** (advertising) |
| App Store privacy answers | No tracking · Kids category | Tracking: **Yes**, ad data used by Unity/AdMob |

**The same in both profiles:**
- Firebase Analytics never uses the advertising ID (§ 2).
- Rewarded ads are always optional, and the reward is shown before the player chooses.
- No ad ever appears during a puzzle. Ads only show between games, or when the player taps a rewarded button.
- Buying the Remove Ads + Coffee pack (§ 3b) turns off interstitials and banners. Rewarded ads stay available because the player chooses them.
- **iOS: all audio must survive an ad.** Native ads reconfigure the iOS audio session and leave the Howler `AudioContext` dead while it still reports `running`, so music **and** sound effects stay silent after the ad closes (until a cold start). `ctx.resume()` does not fix this. Wrap every rewarded and interstitial show with `AudioManager.pauseForAd()` before and `AudioManager.recoverAfterAd()` in `finally` (native only; on web `Howler.mute` handles it). On iOS, `recoverAfterAd()` waits 0.5 s, then **rebuilds the audio engine**: `Howler.unload()` (closes the dead context and creates a fresh one), reloads the SFX and the current music track, and restarts the music. Android keeps the `ctx.resume()` retries (0.3 s, 1 s, 2 s). Keep the `init()` document listeners behind a once-only flag so a rebuild doesn't register them twice. Applied in Turns and Tap Sum; any new game with ads must copy it. Test on a real iPhone: play music, watch a rewarded ad and an interstitial, and check that both the music and the sound effects return.

**Sketch (`src/game/services/Ads.ts`):**

```ts
const consent = AUDIENCE === 'kids'
    ? { childDirected: true, gdprConsent: false, doNotSell: true }
    : { gdprConsent: allowed, doNotSell: !allowed };   // `allowed` = the player's answer on the consent card (and ATT on iOS)
await CapacitorAds.setConsent(consent);
await CapacitorAds.initialize({ ... });
```

The privacy policy already covers both profiles (its § 8 "Games made for children"). A Kids game must actually behave like the Kids column, or the policy is wrong for it.

### Web ads: Google H5 Games Ads (Rehovot portal)

On the web build (our own portal on `rehovottech.com`) the same `@rehovottech/capacitor-ads` plugin shows **Google H5 Games Ads** instead of LevelPlay. The game code doesn't change: `Ads.ts` calls the same `showInterstitial` / `showRewarded`, and the plugin's web layer turns them into Google `adBreak()` calls.

| | Native (iOS / Android) | Web (portal) |
|---|---|---|
| Network | Unity LevelPlay (Unity Ads + AdMob) | Google H5 Games Ads (AdSense) |
| `appKey` | LevelPlay App Key | AdSense publisher id `ca-pub-…` |
| Placements | LevelPlay ad unit ids | `adBreak()` names, reporting labels only (`level_complete`, `reward`) |
| Interstitial | LevelPlay interstitial | `adBreak({ type: 'next' })`. Google applies its **own frequency cap** on top of our pacing, so some calls show nothing |
| Rewarded | LevelPlay rewarded | `adBreak({ type: 'reward' })`. Reward only when the player watches to the end |
| Banner | Optional | None (not part of H5 Games Ads) |
| `TEST_MODE: true` | LevelPlay Test Suite + test devices | Google's H5 test ads (`data-adbreak-test="on"`), no revenue |
| Consent | As in the table above | Declined consent, `doNotSell` or Kids → non-personalised ads (`requestNonPersonalizedAds`) |
| Remove Ads | Store purchase | Razorpay purchase. Same `premium` flag turns off interstitials |

**Account setup (once, for every game on the portal):**
1. AdSense account (adsense.google.com) → **Sites** → add `rehovottech.com` and verify it (meta tag or code snippet in the portal's `<head>`).
2. `https://rehovottech.com/ads.txt` at the **root of the main domain** (it covers subdomains such as `games.rehovottech.com`), one plain-text line:
   ```
   google.com, pub-6155959110986539, DIRECT, f08c47fec0942fa0
   ```
3. **Request review**. The portal has to be live and finished: real games, About, Privacy policy, Contact.
4. **Auto ads: off.** Otherwise Google puts banners and pop-ups over the games.
5. After AdSense approves the site, apply separately for **H5 Games Ads** (developers.google.com/ad-placement/docs/beta). Approval is not guaranteed.

**Per game (`src/config/Ads.ts`):**

```ts
web: {
    appKey: 'ca-pub-6155959110986539',   // shared by every game on the portal
    interstitial: 'level_complete',
    rewarded: 'reward',
},
```

Keep `TEST_MODE: true` until H5 Games Ads is approved. Without a `ca-pub-` appKey, web ads stay off and the game runs ad-free. `Ads.ts` mutes the game's audio (`Howler.mute`) while a web ad plays, because H5 ads play inside the page.

**Kids games on the web:** H5 Games Ads has no documented per-request child-directed tag. The plugin requests non-personalised ads, and the site must also be tagged child-directed in AdSense before a Kids game goes on the portal.

**Web Remove Ads needs accounts:** a Razorpay purchase is only stored in the browser until the portal has player login plus server-side payment checks. Clearing site data or changing device loses it.

**Test:** run the web build with `TEST_MODE: true` and a real `ca-pub-` id. Interstitials appear between levels after the pacing allows, rewarded buttons show Google's test ad, a skipped reward grants nothing, game audio is muted during the ad, and after a Remove Ads purchase no interstitial shows. With an ad blocker, every ad call resolves as "no ad" within 8 s and the game keeps working.

---

## 2. Firebase Analytics: one config per platform

All Rehovot games share **three Firebase projects, one per platform**. Each game is added as an **app** inside each project and gets its own config, so games never mix:

| Platform | Firebase project | Analytics runs through | Config file in the game |
|---|---|---|---|
| Web | **`rehovt-web-games`** | Firebase web SDK (`@rehovottech/firebase`) | The game's own Web app config in `src/config/Firebase.ts` |
| Android | **`rehovt-android-games`** | **Native** Firebase Analytics (`@capacitor-firebase/analytics`) | `android/app/google-services.json` |
| iOS | **`rehovt-ios-games`** | **Native** Firebase Analytics (`@capacitor-firebase/analytics`) | `ios/App/App/GoogleService-Info.plist` (added to the App target) |

- **Never create a new Firebase project for a game.** Add it as an app to the three above.

- **Platform tag:** every event and user carries `app_platform` = `web` | `android` | `ios`.
- **No advertising ID, on every platform:** ad storage, ad user data and ad personalisation are denied, Google signals are off, and iOS uses the `AnalyticsWithoutAdIdSupport` pod. This is the same for Kids and General games; the ads SDK handles ad consent separately (§ 1).
- **Leaderboards use the web project only:** the web config in `src/config/Firebase.ts` (`rehovt-web-games`) is **also** used on Android and iOS, but only for the General leaderboard (§ 7). It doesn't send analytics there. The Android and iOS projects hold analytics only.
- **Service:** copy `src/services/Firebase.ts` from Turns or Tap Sum. It picks native or web analytics by platform.

**Per game:**
1. Add a Web app in `rehovt-web-games`, an Android app in `rehovt-android-games` and an iOS app in `rehovt-ios-games`, and put the three configs in place.
2. Follow [FIREBASE_SETUP.md](FIREBASE_SETUP.md): Vite `modernTargets` + `dedupe`, Android manifest flags, iOS Podfile, `AppDelegate`, `Info.plist`.
3. The GA4 settings (Google signals off, the `app_platform` dimension) are per property, so they're done once per project and already cover every game.

**Status:** Turns' web config is on `rehovt-web-games`. Its Android and iOS analytics, and all of Tap Sum, still use older projects. See the status table in [FIREBASE_SETUP.md](FIREBASE_SETUP.md#status).

**Test:** DebugView on each platform shows the game's events with the right `app_platform`.

---

## 3. In-app purchase: two models

Every game uses **exactly one** of these, depending on whether it has ads:

| | **3a. Buy a coffee** | **3b. Remove Ads + Buy a coffee** |
|---|---|---|
| For | **Learning games with no ads** | **Games with ads** |
| What's sold | Coffee tips: small / medium / large | **One** purchase: "Remove Ads + Buy us a coffee" |
| Product type | Consumable (`…donate_small`, `…donate_medium`, `…donate_large`) | **Non-consumable** (`com.rehovot.game.<game>.premium`), restorable |
| After buying | The coffee button hides (`hasDonated()`) and the reminder stops | Ads are removed, **the popup never shows again and the Support button is hidden**. A small thank-you can stay (Turns: a "Thank you, supporter ♥" note and Golden tiles) |
| Plugin config | `donation` only. No `supporterPack`, `premium.enabled` off | `premium.enabled` + `supporterPack` with `showTips: false` |
| Reference | Tap Sum | Turns |

| Platform | How it's paid |
|---|---|
| Android | Google Play Billing |
| iOS | StoreKit |
| Web | Razorpay checkout |

### 3a. Buy a coffee (learning games without ads)

```ts
donation: {
    enabled: true,
    title: '☕ Buy us a Coffee', message: '…', buttonText: 'Support', laterText: 'Maybe Later', icon: '☕',
    showAfterConsecutiveDays: 3, showAfterLaunches: 1, remindEveryDays: 30,
    showOnInitialize: false,
    parentalGate: AUDIENCE === 'kids',
},
```

- **Coffee button** on the Menu/Home: shown while `hasDonated()` is false, and calls `Purchases.showDonate()`.
- **Tap Sum:** `checkPurchaseButton` / `createDonateButton` in `Menu.ts`.

### 3b. Remove Ads + Buy a coffee (games with ads)

```ts
premium: { enabled: true },
supporterPack: {
    enabled: true,
    title: 'Remove Ads + Buy us a Coffee',
    message: 'One small purchase removes ads for good and helps our tiny team make more games.',
    buttonText: 'Remove Ads + Coffee',
    icon: '☕',
    benefits: ['🚫 No more ads, for good', '☕ A coffee for the team'],
    showTips: false,          // one purchase only
},
donation: { enabled: true, laterText: 'Maybe Later', showAfterConsecutiveDays: 3, showAfterLaunches: 1, remindEveryDays: 30, showOnInitialize: false, parentalGate: AUDIENCE === 'kids', ... },
```

- **Why it's non-consumable:** it unlocks something permanent, so the stores require it to be restorable. Apple rejects permanent unlocks sold as consumables.
- **Support button** (Shop / Menu): shown while `isPremium()` is false, and calls `Purchases.showDonate()`. **Hide it once the pack is owned.**
- **After buying (or restoring):**
  - the plugin fires `premiumUnlocked` and `donationCompleted`;
  - the game turns off interstitials and banners (rewarded ads stay optional);
  - `showDonate()` and the reminder **never open again**.
- **Turns:**
  - `src/config/Purchases.ts` sets up `supporterPack`.
  - The Shop's **Remove Ads + Coffee** card calls `PurchasesManager.showSupport()`. Once the pack is owned, it becomes a "Thank you, supporter ♥" note with no button.

### Kids' games (both models)

- **"Ask a grown-up"** before **every** purchase (`parentalGate: true`): type three numbers written as words, three tries. Only after that does the store or Razorpay sheet open (Play Families policy). It covers `showDonate()`, the reminder and `showPremium()`.
- Never call `Purchases.purchase()` directly in a Kids game, because it isn't gated.
- Wording is aimed at the parent ("Grown-ups: remove ads and support the makers").

### Per game

1. **Install:** `npm i @rehovottech/capacitor-purchases@file:../../plugins/rehovot-purchase @capacitor/preferences` (plugin ≥ 1.2.0 for 3b).
2. **Files to copy:**
   - **`src/config/Purchases.ts`:** product IDs, web prices (INR) and popup text.
   - **`src/services/Purchases.ts`:** `PurchasesManager`. While the popup is open, it turns off Phaser input via the `popupOpened` / `popupClosed` events.
3. **Products:** create them with the same IDs on both stores.
   - **Play Console:** Monetize ▸ In-app products. Create them and set them **active**.
   - **App Store Connect:** In-App Purchases. Tips as **Consumable**, `premium` as **Non-Consumable**. Attach them to the version you submit.
4. **Web:** set `VITE_RAZORPAY_KEY` in `.env` and in the web host's environment variables. Keep only a placeholder in `.env.example`.
5. **Restore purchases:** a Settings row that calls `PurchasesManager.restore()`. Apple requires one for 3b.
6. **Portrait lock:** `MainActivity` must re-lock portrait on resume and focus change. The Play billing sheet can leave the app in landscape.

### Test

- **Android:** use a licence-tester account on an internal-testing build.
- **iOS:** use a sandbox account or a StoreKit configuration file.
- **Web:** use a Razorpay **test** key.
- **3a, after a tip:** the coffee button disappears.
- **3b, after buying:** interstitials stop, the Support button is gone, the reminder doesn't come back, and **Restore purchases** brings it all back after a reinstall.

---

## 4. Support popup: 3 days in a row

The same rule for every game, whichever purchase model it uses:

- **When:** the game has been opened on **3 days in a row** (local calendar days; missing a day restarts the count). After that, at most every **30 days**, and only after a new 3-day streak.
- **Where:** only on the Home / Menu screen, once no other popup is open (consent, daily login, update). **Never** during a game.
- **Never again** once the player has bought: a coffee tip (3a) or the Remove Ads + Coffee pack (3b).
- **What it shows:** the coffee tips (3a) or the Remove Ads + Coffee pack (3b).
- **Any time:** the player can also open it from the coffee / Support button.

**How:** the plugin keeps the streak and the cadence (`showAfterConsecutiveDays: 3`, `remindEveryDays: 30`). The game picks the moment:

```ts
// config: donation.showOnInitialize: false   (don't show it at launch)
// Home scene, ~1 s after it appears, once no other popup is open:
await Purchases.showReminderIfDue();          // shows at most once per launch, only when due
```

Turns: `Home.supportPrompt()` → `PurchasesManager.remindIfDue()`.

**Test without waiting 3 days:** on web, set `localStorage["CapacitorStorage.rehovot_purchases_reminder_state"]` to `lastLaunchDay` = yesterday (`YYYY-MM-DD`) and `launchDayStreak: 2`, with `firstInstallDate` a few days back and no `lastPopupDate`. Reload and open Home, and the popup should show.

---

## 5. In-game alert for a new update

When a newer version is live on Google Play or the App Store, the game shows **its own in-game popup** asking the player to update. Every game ships with it.

### How it looks and behaves

- **Where:** a popup in the game's own style (the same box as the other popups), on the **Home / Menu screen** only.
  - Title **"New version available!"**
  - Short text, e.g. "A new version of Turns is ready with fixes and improvements."
  - Buttons **Update** and **Later**
- **When:**
  - checked **once per launch**, on Android and iOS only (the web build is always the latest);
  - a few seconds (3 s) after Home appears;
  - shown only when no other popup is open (consent, daily login, the support popup), otherwise it waits;
  - **never** during a game.
- **Update:** opens the game's store page (`AppUpdate.openAppStore()`). On Android, `performImmediateUpdate()` can update in place instead.
- **Later:** hides the alert for **3 days** (stored in Preferences), then it can show again.
- **Store only opens on a tap.** Never open the store by itself.
- **Forced update (optional):** keep a `min_version` in Firebase. If the installed version is below it, hide **Later**. Use this only for breaking changes, such as a leaderboard format change.

### How it works (Turns)

- **Plugin:** `@rehovottech/capacitor-app-update` (`plugins/rehovot-app-update`, see its README) reads the version that's live on the store.
  - **Android:** Play in-app updates.
  - **iOS:** the App Store lookup by bundle ID.
- **`src/services/Update.ts`:** `UpdateManager`.
  - `check()`: native only, once per launch, skips while snoozed, then asks the store. If an update exists, it keeps the store version in `UpdateManager.pending`.
  - `later()`: clears `pending` and snoozes for 3 days.
  - `update()`: clears `pending` and opens the store.
- **`src/game/scene/Home.ts` ▸ `updatePrompt()`:** 3 s after Home appears, runs `check()`. If `pending` is set and no other popup is open (`Modal.stack` empty and `PurchasesManager.popupOpen` false), it shows the popup with `confirmBox(…, 'Update', 'Later', …)`. Otherwise it retries every 1.5 s while Home is open. If the player leaves Home first, the popup shows on the next visit in the same launch.

```ts
// Home.ts
private updatePrompt(): void {
    this.time.delayedCall(3000, async () => {
        await UpdateManager.check();
        const show = () => {
            if (UpdateManager.pending === null || !this.sys.isActive()) return;
            if (Modal.stack.length || PurchasesManager.popupOpen) { this.time.delayedCall(1500, show); return; }
            confirmBox(this, this.L, 'New version available!', 'A new version of Turns is ready with fixes and improvements.', 'Update', 'Later',
                (yes) => { if (yes) UpdateManager.update(); else UpdateManager.later(); });
        };
        show();
    });
}
```

### Per game

1. **Install:** `npm i @rehovottech/capacitor-app-update@file:../../plugins/rehovot-app-update && npx cap sync`. No permissions, capabilities or Info.plist keys are needed.
2. **Copy** `src/services/Update.ts` from Turns as is.
3. **Home / Menu scene:** add `updatePrompt()` as above, using the game's own popup and the game's name in the text.
4. **Kids' games:** put the **"Ask a grown-up"** check between **Update** and the store. Apple's Kids category requires a grown-up check before any link out of the app, including the App Store.

### Test

- **Android:** the check only answers for installs **from Google Play**.
  1. Upload a build with a higher `versionCode` to internal testing or internal app sharing.
  2. Install the **older** build from Play.
  3. Open the Play Store app once so it notices the new build.
  4. Open the game. The popup should show on Home after about 3 s.
  - Sideloaded or debug builds never show it.
- **iOS:** the check only works once the app is live on the App Store. To test, lower `CFBundleShortVersionString` in a dev build of a live app.
- **Later:** tap it, relaunch, and the popup shouldn't come back for 3 days.
- **During a game:** the popup never appears.

---

## 6. Local notifications

Every game sends at least one "come back and play" reminder **3 days after the last session**. Turns goes further: a daily reminder at 19:00 (it mentions the daily streak), plus comeback reminders after 3, 7 and 14 days, all off with one Settings toggle (`src/services/Notification.ts`). The reminder is local only, with no push and no Firebase Messaging. That keeps it child-safe, and the iOS app needs no Push capability.

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

## 7. Leaderboards: General board (web + mobile) + platform boards

Every game has two layers of leaderboards:

- **Web:** the General board only.
- **Android:** its own **Play Games** board, **plus** the General board shared with web and iOS.
- **iOS:** its own **Game Center** board, **plus** the General board shared with web and Android.

| | **General board** | **Platform board** |
|---|---|---|
| Who's on it | **Everyone**: web, Android and iOS players together | Only that platform's players |
| Backend | Firebase: Firestore in **`rehovt-web-games`**, shared by every game and every platform (`@rehovottech/firebase`, anonymous sign-in) | Android: Google Play Games Services v2 · iOS: Apple Game Center (`@rehovottech/game-service`) |
| Where players see it | The game's own **Leaderboard** screen, on every platform | The platform's own screen, from an **Open Play Games / Open Game Center** button on our Leaderboard screen |
| Player name | Generated nickname, e.g. "Player 7K2Q" | The platform nickname |
| Rank on the End screen | ✅ "World rank" on every platform | ❌ (the platforms don't return it) |
| Sign-in | Silent anonymous sign-in, no prompt | Android: silent check at launch. iOS: only when the player taps the button |

**Why both:** the General board gives every player one world ranking and a rank on the End screen. The Platform board adds friends, achievements and the system UI players already know.

### Rules

- **All General boards live in `rehovt-web-games`.** Each game's `src/config/Firebase.ts` holds its web config for that project, used on **every platform**. Don't switch projects per platform, or the board splits.
  - Analytics is separate: on Android and iOS it is native and goes to `rehovt-android-games` / `rehovt-ios-games` (§ 2).
- **Separate boards per game.** All games share one Firestore, so each game's boards are kept apart by a **unique board-ID prefix**: Turns `turns_…`, Tap Sum `tapsum…`. A new game picks a new prefix.
- **Same scores to both layers.** Each board keeps the player's **best**. `sync()` sends every best that went up since the last successful submit, to Firebase and to the platform board, with a separate "last sent" record for each. Scores made offline or before sign-in arrive later.
- **Anti-cheat:** one shared `firestore.rules` for `rehovt-web-games` sets a maximum score per board, so impossible scores are rejected.
  - **Master copy:** `/Volumes/T7/Work/Office/Firebase/rehovt-web-games/firestore.rules` (a shared folder, not part of any game), deployed **only** from that folder (`cd /Volumes/T7/Work/Office/Firebase/rehovt-web-games && firebase deploy --only firestore:rules`). A deploy replaces the whole project's rules, so never deploy them from a game's folder.
  - **New game:** add its boards to `maxScore()` there, e.g. `'turns_stars': 4560` (1520 levels × 3 stars). Boards that aren't listed still get the basic checks: sign-in, own entry only, and a score can't go down.
  - **Platform boards:** set a score range in the Play Console / App Store Connect board settings.
- **One board per profile:** games with profiles (Tap Sum: kids/adults) have a separate board per profile on both layers.
- **Board IDs:** every board lives in `src/config/GameServices.ts` with all three IDs:
  ```ts
  stars: { title: 'Journey stars', firebase: 'turns_stars', android: 'CgkI…', ios: 'com.rehovot.game.<game>.stars' },
  ```
  Any native ID starting with `REPLACE` is skipped on that platform.

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

### Kids' games

- **General board:** anonymous sign-in collects no personal information. Names are **always generated** and can never be edited.
- **Platform board:** no Game Center prompt at launch. Sign-in happens only when the player taps the button. Android's Play Games check is silent.
- **Policy check:** before release, check the Play Families policy and Apple's Kids guidelines for social features, such as Play Games profiles or friends lists.

### How it works (Turns)

- **`src/services/Leaderboards.ts`:**
  - **`init()`:** syncs the General board. On native, signs in to the Platform board (Android: silent check).
  - **`sync()`:** after each game, pushes improved bests to both layers. Safe to call often.
  - **`open()`:** signs in to Play Games / Game Center if needed, syncs, and opens the platform's leaderboard UI.
- **`src/services/Firebase.ts`:** anonymous sign-in, `submitScore`, `getTopPlayers`, `getPlayerRank`.
- **`src/game/scene/Leaderboard.ts`:** a tab per board, the top 50 and the player's own rank, plus the **Open Play Games / Game Center** button on native.
  - If sign-in is declined, it shows a toast: "Sign in to Game Center / Play Games to see the leaderboards".

### Per game

1. **Install:** `npm i @rehovottech/game-service@file:../../plugins/rehovot-game-service && npx cap sync`.
2. **General board (Firebase):** nothing to create, because boards appear with the first score. Pick the game's board-ID prefix, add each board's limit to `maxScore()` in `/Volumes/T7/Work/Office/Firebase/rehovt-web-games/firestore.rules`, and deploy from the shared folder.
3. **Android (Play Console ▸ Play Games Services):**
   1. Set up the service for the app.
      - Add an **Android OAuth credential** for each signing key: debug, upload and the Play app-signing SHA-1.
      - Publish the Play Games configuration, or add testers.
   2. **Leaderboards:** create one per board, type "higher is better". Copy each `CgkI…` ID into `GameServices.ts`.
   3. **`android/app/src/main/res/values/strings.xml`:** set `game_services_project_id` to the **Project ID**, shown under Play Games Services ▸ Configuration (numeric).
   4. **`AndroidManifest.xml`:** inside `<application>`, add:
      ```xml
      <meta-data android:name="com.google.android.gms.games.APP_ID" android:value="@string/game_services_project_id" />
      ```
4. **iOS:**
   1. **Entitlement:** `ios/App/App/App.entitlements` with `com.apple.developer.game-center = true`, and `CODE_SIGN_ENTITLEMENTS = App/App.entitlements` in both build configs. This is the same as adding **+ Game Center** under Signing & Capabilities.
   2. **App Store Connect ▸ the app ▸ Services ▸ Game Center ▸ Leaderboards:** create **Classic** leaderboards, "High score", Integer format.
      - Use **exactly** the IDs in `GameServices.ts`, e.g. `com.rehovot.game.<game>.<board>`.
      - Turn Game Center on for the app version you submit.

### Test

- **General board:** score on web, then on Android or iOS. Both scores appear in the same list on every platform.
- **Android:** use a build signed with a key that has an OAuth credential, and a tester account listed in Play Games Services. Unknown keys fail to sign in.
- **iOS:** sign in to Game Center in the simulator (Settings ▸ Game Center) with a sandbox account. Leaderboards only show once they exist in App Store Connect.
- **Offline scores:** play while offline or signed out, then open the Leaderboard and sign in. The earlier best should appear on both layers.

---

## 8. Privacy policy & terms

All Rehovot games share **one** Privacy Policy and **one** Terms of Service:

| Page | URL | Master copy |
|---|---|---|
| Privacy Policy | `https://policy.rehovottech.com/general/privacy` | `turns/docs/privacy.html` |
| Terms of Service | `https://policy.rehovottech.com/general/terms` | `turns/docs/terms.html` |

- **Hosting:** upload both files to `policy.rehovottech.com/general/`, served without the `.html` extension. The pages link to each other with relative links (`privacy`, `terms`).
- **Kids' games:** the policy's § 8 "Games made for children" describes how they work: no ad ID or IDFA, no tracking prompt, non-personalised ads only, no Game Center / Play Games sign-in at launch, and an adult check before payments. A kids' game must actually do all of these, or the policy is wrong for it.

### Per game

1. **Constants:** put both URLs next to each other, e.g. in `src/game/ui/SettingsModal.ts`:
   ```ts
   export const PRIVACY_URL = 'https://policy.rehovottech.com/general/privacy';
   export const TERMS_URL = 'https://policy.rehovottech.com/general/terms';
   ```
2. **In the game:** Settings needs a **Privacy policy** row and a **Terms of service** row, each opening its URL with `window.open(url, '_blank')`. The About popup can repeat them.
   - Keep the ad-consent choice as its own row (e.g. **Ad choices**), so the policy can be opened on every platform.
3. **Stores:**
   - **Play Console:** App content ▸ Privacy policy = the privacy URL.
   - **App Store Connect:** App Privacy ▸ Privacy Policy URL = the privacy URL. Add the terms URL at the end of the description, or paste the terms into the custom EULA field.
4. **New SDK:** if a game adds a service that isn't in the policy's § 3 table (a new ad network, crash reporting, push…), add a row, set **Last updated** to today, and re-upload.

### Test

- Settings ▸ Privacy policy and Settings ▸ Terms of service open the right pages, on web, Android and iOS.
- Both pages read well on a phone, in light and dark mode.

---

## 9. Audio: music volume on mobile

> **Important: never play music with Howler `html5: true` on iOS or Android.** The iOS WebView (and Safari) and the Android WebView ignore the volume of `<audio>` elements, so html5 music always plays at **full volume**. `MUSIC_VOL`, fade-ins, cross-fades, and any mute that works by setting the volume to 0 all silently stop working. This shipped as a bug on iOS in another Rehovot game, and on Android in Turns (music louder than the sound effects).

**The rule (Turns: `src/game/managers/AudioManager.ts`)**
- **iOS and Android** (the apps, iPhone/Android browsers, and iPadOS Safari, which reports itself as a Mac): play music through **Web Audio**, `html5: false`.
- **Desktop web only:** `html5: true` is fine. Desktop browsers respect the volume, and streaming saves memory.
- Web Audio decodes a whole track into memory (about 40–60 MB for a 2-minute stereo track). So on mobile, **unload** a track once it stops (`howl.unload()`), keeping at most one music track decoded.
- Switch music off by **pausing**, not by setting the volume to 0.
- Sound effects always use Web Audio (no `html5`), so they are fine on every platform.

```ts
const IS_IOS = Capacitor.getPlatform() === 'ios'
    || /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);
const IS_ANDROID = Capacitor.getPlatform() === 'android' || /Android/i.test(navigator.userAgent);
const MUSIC_HTML5 = !IS_IOS && !IS_ANDROID;
new Howl({ src: [musicSrc], loop: true, html5: MUSIC_HTML5, volume: MUSIC_VOL });
```

On iOS, Web Audio follows the silent switch. With the switch on silent, music is silent too, the same as sound effects.

**Test on a real iPhone and a real Android phone, not only in a desktop browser:** music is clearly quieter than sound effects, fades in on start, cross-fades between tracks, and Music off in Settings silences it.

---

## Release checklist (per game)

- [ ] **Ads (§ 1):** `AUDIENCE` set, and the game matches its column. General: consent card, tracking prompt, `AD_ID`. Kids: child-directed consent, no `AD_ID`, no tracking prompt, rating G.
- [ ] **Web ads (§ 1):** `web.appKey` is the `ca-pub-` id, `TEST_MODE` is `false` only once H5 Games Ads is approved, `rehovottech.com/ads.txt` is live, and Auto ads are off.
- [ ] **Analytics (§ 2):** the web config, `google-services.json` and `GoogleService-Info.plist` (in the App target) are in place. Events arrive in DebugView from all three platforms with `app_platform`.
- [ ] **Purchase (§ 3):** the right model. Learning game without ads: coffee tips only. Game with ads: the one Remove Ads + Coffee non-consumable, `showTips: false`. Products are active on both stores, and the Razorpay key is set on the web host.
- [ ] **After buying:** coffee button hidden (3a), or ads off + Support button hidden + no more popup (3b). Restore purchases works. Kids: the grown-up check shows before **every** purchase.
- [ ] **Support popup (§ 4):** appears on Home on the 3rd day in a row, never during a game, never after a purchase.
- [ ] **Update alert (§ 5):** an older build from the store shows the in-game popup on Home, **Update** opens the store page, **Later** snoozes it for 3 days, and it never shows during a game.
- [ ] **Notifications (§ 6):** the 3-day reminder fires, with the right text and icon.
- [ ] **Leaderboards (§ 7):** a score from each platform shows on the General board. The native IDs are in `GameServices.ts`, the Play Games project ID is set, the Game Center boards exist, and `/Volumes/T7/Work/Office/Firebase/rehovt-web-games/firestore.rules` has limits for every board (deployed to `rehovt-web-games`).
- [ ] **Privacy (§ 8):** Settings opens the Privacy policy and the Terms of service, the store listings use the same two URLs, and the policy's § 3 table lists every SDK the game ships.
- [ ] **Audio (§ 9):** on iOS and Android the music is quiet (respects `MUSIC_VOL`), fades in, and Music off silences it. Mobile music uses Web Audio (`html5: false`), never html5.
