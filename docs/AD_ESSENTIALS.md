# Ad essentials: LevelPlay + Unity Ads + AdMob

How ads are set up for Rehovot mobile games, with Turns as the reference. Follow it in order for every new game. It also covers the dashboard traps we hit while setting up Turns.

Code and SDK details (adapter versions, SKAdNetwork, plugin internals) are in [exclude/doc/levelplay-ads-setup.md](../exclude/doc/levelplay-ads-setup.md). Whether a game shows ads at all, and the Kids/General profile, is decided in [GAME_ESSENTIALS.md § 1](GAME_ESSENTIALS.md).

---

## 1. How it fits together

```
Game code (src/game/services/Ads.ts)
  └─ @rehovottech/capacitor-ads plugin
       └─ LevelPlay ad unit  (ID in src/config/Ads.ts)
            ├─ ironSource instance   (built into LevelPlay)
            ├─ Unity Ads instance    (Game ID + placement)
            └─ Google instance       (AdMob App ID + ad unit, bidding)
```

The game only knows the **LevelPlay** app key and ad unit IDs. LevelPlay runs a real-time auction between the networks attached to each ad unit. **An ad unit with no network instances always returns "Mediation No fill".**

Each dashboard owns one thing:

| Dashboard | What you create there | Where it ends up |
|---|---|---|
| **LevelPlay** (platform.ironsrc.com) | App key, ad units (Rewarded, Interstitial) | `src/config/Ads.ts` |
| **Unity** (cloud.unity.com) › Monetization | Game ID, placements | LevelPlay › Instances › UnityAds |
| **AdMob** (admob.google.com) | App ID, ad units with Partner bidding | LevelPlay › Instances › Google |

## 2. Turns reference IDs

| What | Android | iOS |
|---|---|---|
| LevelPlay app key | `28e6fb82d` | `28e702b3d` |
| LevelPlay interstitial ad unit | `lk7gu1lny5piho89` | `fk5vlojne1y102h4` |
| LevelPlay rewarded ad unit | `7037x184bzfccew5` | `mvl0num5wwy3zjk4` |
| Unity Game ID | `800416316` | `800416317` |
| Unity interstitial placement | `BP_Interstitial_Android` | `BP_Interstitial_iOS` |
| Unity rewarded placement | `BP_Rewarded_Android` | `BP_Rewarded_iOS` |
| AdMob App ID and ad units | AdMob › Apps › Turns (Android) | AdMob › Apps › Turns (iOS) |

The LevelPlay values must match [src/config/Ads.ts](../src/config/Ads.ts). AdMob IDs are not stored in the repo; look them up in AdMob.

## 3. One-time account setup (shared by all games)

1. **One account each**: one Unity organization, one LevelPlay account, one AdMob account for all Rehovot games.
2. **Unity ↔ LevelPlay**: in Unity, a service account called *LevelPlay Service Account* exists with the LevelPlay/Ads roles. Its **API key** and the **Organization Core ID** are entered in LevelPlay › Setup › Networks › UnityAds.
   - The API key is a secret. Never paste it in docs, chats or screenshots. If it leaks, delete the key in Unity, create a new one, and update LevelPlay.
3. **Google ↔ LevelPlay**: LevelPlay › Setup › Networks › Google › *Sign in with Google* with the account that owns AdMob.
4. **Bidder auto-setup: OFF** for both UnityAds and Google. It isn't supported for Unity accounts on the new Unity dashboard, and for AdMob it silently created nothing. Set every game up by hand.

## 4. Per-game setup (in this order)

### 4.1 Unity: project and Game IDs
1. **Development** › create **one project per game** (e.g. *Turns*). Don't share a project between games: COPPA designation, Developer Data access and members are per project.
2. Project **Settings** › **COPPA designation**: *not directed to children under 13* for a General game, *directed to children* for a Kids game (must match `AUDIENCE` in `src/config/Ads.ts`).
3. **Monetization** › select the project. If asked which mediation you use, pick **LevelPlay**. Note the **Game IDs**, one for Android and one for iOS (Unity creates them).
4. Monetization › **Placements** › *Create placement*, 4 times: `BP_Rewarded_Android`, `BP_Interstitial_Android`, `BP_Rewarded_iOS`, `BP_Interstitial_iOS`. Check each one sits under the right platform's Game ID.

### 4.2 AdMob: apps and ad units
Once per platform:
1. **Apps › Add app** › Android (or iOS). *Is the app listed on a supported app store?* **No** until the game is public. Name it after the game.
2. Copy the **App ID** (`ca-app-pub-…~…`, with a `~`).
3. **Ad units › Add ad unit**, two of them:
   - **Interstitial**: *"<Game> Interstitial Android"*. Default settings, **no frequency cap** (the game paces interstitials itself).
   - **Rewarded**: *"<Game> Rewarded Android"*. Reward amount 1, item *Reward* (the game ignores it). Server-side verification off.
   - Not *Rewarded interstitial*, *Banner*, *Native* or *App open*: the games don't use them.
4. On both ad units turn **Partner bidding ON** (*"I'm using this ad unit for real-time bidding on another mediation platform"*) and choose **ironSource / Unity LevelPlay**. Without it Google never bids.
5. Copy both **ad unit IDs** (`ca-app-pub-…/…`, with a `/`).

### 4.3 LevelPlay: app, ad units and instances
1. **Apps** › add the Android and iOS app. Copy each **app key**.
2. **Setup › Ad units** › create *Rewarded* and *Interstitial* for each app. Copy the **ad unit IDs**.
3. Put the app keys and ad unit IDs in the game's `src/config/Ads.ts`.
4. **Setup › Instances** › pick the app in the top-left picker. **Check the platform icon** (Android robot or Apple): it decides which app you are editing.
5. Click **UnityAds**:
   - **Game ID**: the Unity Game ID for *this platform*.
   - *+ Add instance* › Rewarded › placement `BP_Rewarded_<Platform>`, mediation group **All Countries**.
   - *+ Add instance* › Interstitial › placement `BP_Interstitial_<Platform>`, **All Countries**.
   - Save.
6. Click **Google** (the row under **Bidding**):
   - **App ID**: the AdMob App ID (with `~`).
   - *+ Add instance* › Rewarded › AdMob rewarded ad unit ID (with `/`), **All Countries**.
   - *+ Add instance* › Interstitial › AdMob interstitial ad unit ID, **All Countries**.
   - Save.
7. **Done when** the Instances table shows ✓ under Rewarded and Interstitial for **ironSource, UnityAds and Google**. Repeat steps 4–7 for the other platform.

## 5. Traps we hit (symptom › cause › fix)

| Symptom | Cause | Fix |
|---|---|---|
| Logcat: `interstitial load failed: Mediation No fill` (and rewarded) every few seconds | Networks had no instances, so only ironSource could bid. Also normal for an unpublished app requesting real ads | Finish § 4.3 until all three rows show ✓. Test with a test device (§ 6) |
| Google rows show nothing | Set up **Google AdManager** or **Google AdMob Native**. Those are other products; the game ships the AdMob bidding adapter | Use the **Google** row under **Bidding**. Leave AdManager and AdMob Native empty |
| AdMob Native page only offers *Banner*, and the app icon is an Apple | Wrong network **and** wrong platform | Cancel. Pick the Android app in the Instances picker, then **Google** |
| *"Bidder auto-setup isn't available for Unity Ads accounts on the new Unity dashboard"* | Unity's new dashboard doesn't support it | Turn it off, Save, set up by hand (§ 4.1, § 4.3) |
| AdMob auto-setup on, but no app appears in AdMob | Auto-setup didn't run for an app already in LevelPlay | Turn it off and create the app by hand (§ 4.2) |
| Unity: *"You can't add apps while Unity Ads User Acquisition has access to this project's Developer Data"* | User Acquisition data access on the project | Don't click *Allow Access*. Get the Game IDs from **Monetization** instead (§ 4.1 step 3) |
| Unity placements list empty | Unity doesn't create them when auto-setup is off | Create them under Monetization › Placements (§ 4.1 step 4) |
| UnityAds instance doesn't load | iOS placement or Game ID used on the Android app (or the other way round) | Placement, Game ID and app must all be the same platform |
| LevelPlay *Save* greyed out on a network page | No instance yet | Add at least one instance first |

## 6. Testing

1. **Test device first.** LevelPlay › Setup › **Test devices** › add the phone's advertising ID (phone: Settings › Google › Ads). Test devices get test ads from every network. Real ads rarely fill before the game is public on the store.
2. **Never tap real ads on your own or testers' phones.** AdMob treats it as invalid traffic and can limit or ban the account.
3. **Logs** (Android, phone on USB with USB debugging on):
   ```bash
   adb logcat -c
   adb logcat --pid=$(adb shell pidof -s com.rehovot.game.puzzle.turns) -v time \
     | grep -iE "CapacitorAds|Capacitor/Console|LevelPlay|ironsource|UnityAds|Ads\b|\[Ads\]"
   ```
   | Message | Meaning |
   |---|---|
   | `CapacitorAds W … load failed: Mediation No fill` | No network returned an ad (see § 5) |
   | `[Ads] init failed` | Wrong app key, or no network connection |
   | No ad, no error | Usually pacing: interstitials only from level 8, once per 3 boards, 90 s apart, never for Remove Ads buyers |
4. **More detail for one test build.**
   - `TEST_MODE` in `src/config/Ads.ts` also switches the plugin's `debug` logging. With it `false`, only failures are logged.
   - To get full logs but real ads, set `debug: true` in the `CapacitorAds.initialize` call in `src/game/services/Ads.ts`. **Revert before release.**
   - With `TEST_MODE: true`, open `chrome://inspect`, pick the app's WebView and run `__ads.openTestSuite()`. It lists each network and loads test ads from it.
5. Plugin behaviour to expect: it preloads both formats after init, reloads after every show, and retries a failed load after 5 s, 10 s, 20 s … up to 60 s.

## 7. Before and after going public

- [ ] `TEST_MODE: false` and no `debug: true` left in the store build.
- [ ] **iOS**: replace the Google sample App ID in `ios/App/App/Info.plist` (`GADApplicationIdentifier`) with the game's iOS AdMob App ID.
- [ ] Once the store listing is live: link it in **AdMob** (App settings › link to store) and in **LevelPlay** (app settings). AdMob serves few or no real ads until the app is linked.
- [ ] **app-ads.txt** is live at **https://rehovottech.com/app-ads.txt** (see § 8). Every game's store listing must point to `https://rehovottech.com`.
- [ ] Google Play **Data safety** and App Store **App Privacy** list advertising data.
- [ ] Unity project COPPA designation matches the game's audience.

## 8. app-ads.txt (shared by all games)

**Live file: https://rehovottech.com/app-ads.txt.** One file covers every Rehovot game on Android and iOS.

**What it is.** A plain text file that lists which ad companies may sell ads in our apps. Ad buyers check it against the developer website on the store listing. Without it, AdMob warns "app-ads.txt not found" and fewer advertisers bid.

**Rules**
- It is a **different file** from the website's `ads.txt`, which is for AdSense ads on the website itself. Keep both at the site root.
- **Never upload it empty or partial.** Once the file exists, networks it doesn't list count as unauthorized and can stop serving. A missing file is better than an incomplete one.
- One line per seller. The lines come from:
  - **AdMob** › Apps › **app-ads.txt** tab › *Set up app-ads.txt*. Format: `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`.
  - **LevelPlay**: the ironSource and Unity Ads lines (under Setup, or LevelPlay's help pages, search "app-ads.txt").
- When a new network is added in LevelPlay, add its lines to this file.

**Store listing website (must be `https://rehovottech.com` for every game)**

| Store | Where | Field |
|---|---|---|
| Google Play Console | App › Grow users › Store presence › **Store settings** › Store listing contact details | **Website** |
| App Store Connect | App › App Store tab › version page | **Marketing URL** (Support URL can be any page) |

- Use the bare domain, no path. With `www.` in the listing, the file must also open at `https://www.rehovottech.com/app-ads.txt`.
- The App Store Marketing URL goes live with the next version submission.

**Verification**
1. Open https://rehovottech.com/app-ads.txt in a browser. It must show the lines as plain text.
2. The game must be **public** on the store (not closed testing) and linked in AdMob (Apps › the game › App settings › link to store).
3. AdMob crawls within about 24 hours. AdMob › Apps › **app-ads.txt** tab should then show the app as verified.
