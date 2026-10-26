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
    /** Interstitial pacing (shown only when leaving the End screen) */
    interstitialAfterGames: 2,     // never during the first N finished games
    interstitialEveryGames: 2,     // at most once per N finished games
    interstitialMinGapSec:  90,    // and at least this many seconds apart
};
