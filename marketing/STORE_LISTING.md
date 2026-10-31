# TapSum: store listing (Google Play + App Store)

Package / bundle id `com.rehovot.game.tapsum` · Prepared 26 Oct 2026

The text below is also in `android/metadata` and `ios/metadata` (fastlane format), so you can upload with fastlane or paste each field into the console.

> Items marked **[CONFIRM]** are my best guess. Check them before you submit.

---

## 1. App identity

| Field | Value |
|---|---|
| App name | **TapSum: Memory Math** (19/30) |
| Developer | Rehovot Games **[CONFIRM legal name]** |
| Version | Android: the live build is versionCode 12, so the next upload must use **13** (set in `android/app/build.gradle`) |
| Orientation | Portrait only |
| Price | Free. Ads, plus an optional "buy us a coffee" donation |
| Privacy policy | https://policy.rehovottech.com/general/privacy (shared by every Rehovot game; its § 8 covers games made for children) |
| Terms of service | https://policy.rehovottech.com/general/terms |
| Support / marketing URL | https://www.rehovottech.com **[CONFIRM: a page with a contact email]** |

---

## 2. Google Play

### Text
| Field | Limit | Text |
|---|---|---|
| **App name** | 30 | `TapSum: Memory Math` (19) |
| **Short description** | 80 | `Remember the numbers, tap the total! A fun mental math game for ages 5 and up.` (78) |
| **Full description** | 4000 | `android/metadata/en-US/full_description.txt` (1,542) |
| **What's new** | 500 | `android/metadata/en-US/changelogs/13.txt` |

### Graphics
- **Icon:** `android/app-icon_512.png`
- **Feature graphic:** `android/feature-graphic_1024x500.png`
- **Phone screenshots, in this order:** `android/screenshots/phone_1080x1920/01…07`
  1. Play
  2. Menu
  3. Take away
  4. Profiles
  5. Streak
  6. New best
  7. Leaderboard

### Category and tags
- **Category:** Game › **Educational**. Puzzle is the alternative, but Educational fits the Families listing better.
- **Tags:** Math, Educational, Brain games, Puzzle, Casual

### Target audience and content (Families policy)
Two of the profiles are labelled Ages 5-8 and 9-12, so the app **is directed at children**. Answer accordingly:

| Question | Answer |
|---|---|
| Target age groups | **5 & under? No** · **6–8 ✔** · **9–12 ✔** · **13–15 ✔** · **16–17 ✔** · **18+ ✔** |
| Could the app unintentionally appeal to children? | N/A (children are a target) |
| Contains ads | **Yes** |
| Ads SDKs | Unity LevelPlay (ironSource), Unity Ads and Google AdMob, all on the Families Self-Certified Ads SDK list |
| In-app purchases | **Yes** (optional donation) |
| Teacher Approved | Optional: you can apply once the listing is approved |

What the app already does to comply (see the ads work in `src/services/Ads.ts`):
- Every ad request is flagged child-directed (COPPA), non-personalised only.
- The advertising ID permission (`AD_ID`) is removed in the manifest.
- The rewarded ad is opt-in only. Interstitials are paced and never show at launch or during play.
- No automatic purchase popup. The donation opens only from the coffee button.

**Dashboard settings, which you need to set:**
- **LevelPlay:** COPPA = **Directed** (done) and playable ads off (done).
- **Unity Ads:** in the project settings, mark the game as directed to children under 13.
- **AdMob:** set the max ad content rating to **G**.

### Content rating (IARC questionnaire)
- Category: Game.
- Violence, fear, sexuality, language, drugs, gambling: **No** to all.
- **Users can interact:** No. The leaderboards show scores under a fixed name ("Player"). Players can't enter names, and there's no chat.
- Expected rating: **Everyone / PEGI 3**.

### Data safety **[CONFIRM against the SDK disclosures]**
| Data | Collected | Shared | Why |
|---|---|---|---|
| App interactions (game events) | Yes | No | Analytics (Firebase) |
| Crash logs / diagnostics | Yes | No | App functionality, analytics |
| Device or other IDs | Yes | Yes | Advertising (LevelPlay, Unity, AdMob, in child-directed mode), analytics |
| Approximate location (from IP) | Yes | Yes | Advertising (contextual, non-personalised) |
| Purchase history | Yes | No | Donations (Google Play Billing) |

- Data is encrypted in transit: **Yes**.
- Users can request deletion: **Yes**, via the support email.
- Data isn't sold, and isn't used for personalised ads.

---

## 3. App Store (when the iOS app is built)

### Text
| Field | Limit | Text |
|---|---|---|
| **Name** | 30 | `TapSum: Memory Math` (19) |
| **Subtitle** | 30 | `Add, take away & tap the total` (30) |
| **Keywords** | 100 | `addition,subtraction,arithmetic,brain,training,learn,numbers,count,place,value,school,educational` (97) |
| **Promotional text** | 170 | see `ios/metadata/en-US/promotional_text.txt` (134) |
| **Description** | 4000 | `ios/metadata/en-US/description.txt` (1,426) |

> **Apple guideline 1.3:** apps **outside** the Kids category must not use phrases like "for kids" or "for children" in their metadata. The iOS text deliberately says "all ages" and never "kids". Don't put the app in Apple's **Kids category**: that category doesn't allow third-party ads like LevelPlay/AdMob without a human-review exception. The Play text is separate and can say "kids".

### Category and age rating
- **Primary category:** Games › **Educational** (second subcategory: **Puzzle**)
- **Secondary category:** Education
- **Age rating:** answer None to all content questions. Contains ads: Yes. Unrestricted web access: No. Expected rating: **4+**.
- **App Privacy:** mirror the Play data safety table. For **Tracking**, answer **No**: there's no personalised ads and no ATT prompt, by design.

### Graphics
- **Icon:** `ios/app-icon_1024.png` (no transparency)
- **iPhone 6.9":** `ios/screenshots/iphone-6.9in_1320x2868/`
- **iPhone 6.5":** `ios/screenshots/iphone-6.5in_1284x2778/`
- **iPhone 6.1"/6.3":** `ios/screenshots/iphone-6.3in_1206x2622/`
- **iPad 13":** `ios/screenshots/ipad-13in_2064x2752/`. Smaller iPad sizes are scaled from this one by App Store Connect.

### Also needed for iOS (code)
- Purchases: a **parental gate** before the donation popup. Apple requires one for purchases in apps that children use.
- Ads: the LevelPlay iOS SKAdNetwork list in `Info.plist`, plus `GADApplicationIdentifier` for AdMob.

### ⚠️ iOS Game Center: leaderboards and achievements are NOT set up yet
- **Leaderboards (missing in App Store Connect):** the app already submits scores to Game Center, but the boards don't exist yet. Create 3 **Classic** leaderboards under App Store Connect ▸ Tap Sum ▸ Services ▸ Game Center ▸ Leaderboards (score format Integer, "High score", higher is better), using **exactly** these IDs from `src/config/GameServices.ts`:
  - `com.rehovot.game.tapsum.little` (Little Learner)
  - `com.rehovot.game.tapsum.explorer` (Explorer)
  - `com.rehovot.game.tapsum.adult` (Brain Trainer)
- **Achievements (not built):** the game has no achievements in code or in App Store Connect. Decide whether to add them. If so: create them in App Store Connect, add their IDs to `GameServices.ts`, and submit them from the game. Until then, don't mention achievements in the store text.
- **Release:** turn Game Center on for the app version you submit, and add the new leaderboards to that version. Without this the **Leaderboard ▸ OPEN** button shows nothing, and the Leaderboard screenshot's claim won't hold on iOS.

---

## 4. Checklist
- [ ] iOS: create the 3 Game Center leaderboards in App Store Connect (and decide on achievements). See the warning in section 3
- [ ] Bump Android `versionCode` to 13 and build the release bundle
- [ ] `src/config/Ads.ts`: set `TEST_MODE: false` for the store build
- [ ] Unity Ads COPPA setting and AdMob content rating G
- [ ] Publish `app-ads.txt` at rehovottech.com, using the lines from LevelPlay › Settings
- [ ] Privacy policy covers the ad SDKs, Firebase and children's data
- [ ] Play Console: target audience, ads declaration, data safety, content rating
- [ ] Upload the screenshots, feature graphic and icon, and paste the text
