/**
 * Ads through Unity LevelPlay mediation (shared @rehovottech/capacitor-ads plugin).
 * Unity Ads and Google AdMob bid for every ad; their adapters are in android/app/build.gradle.
 * Setup guide: turns/exclude/doc/levelplay-ads-setup.md
 *  - appKey:       LevelPlay > Apps > Tap Sum (Android / iOS) > App Key
 *  - interstitial / rewarded: LevelPlay > Ad units > the ad unit ID (not the Unity Ads placement name)
 * Ads stay off while the values below start with REPLACE.
 * Keep TEST_MODE true until the store build is approved.
 *
 * Tap Sum is played by kids (ages 5-12), so every request is child-directed (COPPA),
 * non-personalised, and the AD_ID permission is removed in AndroidManifest.xml.
 * LevelPlay dashboard: mark the app as child-directed; AdMob max ad content rating = G.
 */
/**
 * Audience profile (docs/GAME_ESSENTIALS.md § 1). Tap Sum is a Kids game: child-directed ad requests,
 * no consent card, no tracking prompt, no advertising ID, and the grown-up check before purchases
 * and links out of the app.
 */
export const AUDIENCE: 'kids' | 'general' = 'kids';

export const ADS_CONFIG = {
    TEST_MODE: true,
    android: {
        appKey:       '290389935',
        interstitial: '5h3xprwr9zq0bja8',
        rewarded:     'fr6jasil839nfb5r',
    },
    ios: {
        appKey:       '29038d2bd',
        interstitial: 'rsy5rqhtr7bkded1',
        rewarded:     'ngp1uyg1x9a1mdhx',
    },
    /**
     * Web (Rehovot portal): Google H5 Games Ads (docs/GAME_ESSENTIALS.md § 1). appKey = the AdSense
     * publisher id shared by every game on the portal. The placement names are adBreak() labels only,
     * nothing to create in AdSense. TEST_MODE serves Google's H5 test ads. As a Kids game, Tap Sum gets
     * non-personalised ads; tag the site child-directed in AdSense before it goes on the portal.
     */
    web: {
        appKey:       'ca-pub-6155959110986539',
        interstitial: 'level_complete',
        rewarded:     'reward',
    },
    /** Interstitial pacing (shown only when leaving the End screen) */
    interstitialAfterGames: 2,     // never during the first N finished games
    interstitialEveryGames: 2,     // at most once per N finished games
    interstitialMinGapSec:  90,    // and at least this many seconds apart
};
