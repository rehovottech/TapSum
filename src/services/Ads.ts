import { Capacitor } from '@capacitor/core';
import { Howler } from 'howler';
import { CapacitorAds } from '@rehovottech/capacitor-ads';
import { ADS_CONFIG, AUDIENCE } from '../config/Ads';
import { AudioManager } from '../game/managers/AudioManager';
import { Firebase } from './Firebase';

const KEYS = {
    GAMES_ENDED: 'tapsum_ads_games_ended',   // finished runs, ever
    GAMES_SINCE: 'tapsum_ads_games_since',   // finished runs since the last interstitial
    LAST_AT:     'tapsum_ads_last_at',       // time of the last interstitial (ms)
};

const readNum = (key: string): number => {
    try { return parseInt(localStorage.getItem(key) ?? '0', 10) || 0; } catch { return 0; }
};
const writeNum = (key: string, value: number): void => {
    try { localStorage.setItem(key, String(value)); } catch { /* storage unavailable */ }
};

/**
 * Unity LevelPlay mediation (Unity Ads + AdMob) on Android / iOS, Google H5 Games Ads on the web
 * portal, both through the shared Rehovot ads plugin.
 * The plugin preloads both formats after init and reloads after every show; this class
 * mirrors readiness and applies Tap Sum's rules:
 *  - every request is child-directed and non-personalised (Families policy / COPPA);
 *  - rewarded ads are opt-in only (the "keep going" offer);
 *  - interstitials only when leaving the End screen, paced by ADS_CONFIG;
 *  - premium (Remove Ads) players never see an interstitial.
 */
class AdsManager {
    private ready = false;
    private rewardedReady = false;
    private interstitialReady = false;
    private showing = false;
    private premium = false;
    private rewardedCheck?: Promise<boolean>;

    private get cfg() {
        const platform = Capacitor.getPlatform();
        return platform === 'ios' ? ADS_CONFIG.ios : platform === 'android' ? ADS_CONFIG.android : ADS_CONFIG.web;
    }

    /** On device once the ad IDs are configured; on web with an AdSense publisher id (H5 Games Ads). */
    get supported(): boolean {
        if ((window as any).__ADS_SIMULATE__) return true;
        return Capacitor.isNativePlatform()
            ? !this.cfg.appKey.startsWith('REPLACE')
            : ADS_CONFIG.web.appKey.startsWith('ca-pub-');
    }

    async init(): Promise<void> {
        if (!this.supported || this.ready) return;
        try {
            CapacitorAds.addListener('rewardedLoaded', () => { this.rewardedReady = true; });
            CapacitorAds.addListener('interstitialLoaded', () => { this.interstitialReady = true; });
            if (!Capacitor.isNativePlatform()) {
                // H5 ads play inside the page, over the game's own audio
                const mute = (muted: boolean) => () => Howler.mute(muted);
                CapacitorAds.addListener('interstitialOpened', mute(true));
                CapacitorAds.addListener('rewardedOpened', mute(true));
                CapacitorAds.addListener('interstitialClosed', mute(false));
                CapacitorAds.addListener('rewardedClosed', mute(false));
            }
            // Kids: child-directed, no personalisation, no consent prompt, no ATT.
            // General would need Turns' consent card first; until then it stays non-personalised.
            const consent = AUDIENCE === 'kids'
                ? { childDirected: true, gdprConsent: false, doNotSell: true }
                : { gdprConsent: false, doNotSell: true };
            await CapacitorAds.setConsent(consent).catch(() => {});
            await CapacitorAds.initialize({
                appKey: this.cfg.appKey,
                testMode: ADS_CONFIG.TEST_MODE,
                debug: ADS_CONFIG.TEST_MODE,
                autoStart: true,
                placements: { interstitial: this.cfg.interstitial, rewarded: this.cfg.rewarded },
            });
            this.ready = true;
            this.refresh();
            // QA: from the WebView console (chrome://inspect) run __ads.openTestSuite()
            if (ADS_CONFIG.TEST_MODE) (window as any).__ads = this;
        } catch (e) {
            console.warn('[Ads] init failed', e);
        }
    }

    /** LevelPlay Test Suite: lists the integrated networks and loads test ads (TEST_MODE builds only). */
    openTestSuite(): void {
        if (this.ready && ADS_CONFIG.TEST_MODE && Capacitor.isNativePlatform()) CapacitorAds.openTestSuite().catch(() => {});
    }

    /** Premium owned: no more interstitials (continues already skip the rewarded ad). */
    setPremium(value: boolean): void {
        this.premium = value;
    }

    /** Re-sync the cached readiness flags with the plugin. */
    private refresh(): void {
        if (!this.ready) return;
        CapacitorAds.isRewardedReady().then((r) => { this.rewardedReady = r.value; }).catch(() => {});
        CapacitorAds.isInterstitialReady().then((r) => { this.interstitialReady = r.value; }).catch(() => {});
    }

    rewardedAvailable(): boolean {
        if (!this.supported) return false;
        if (!this.rewardedReady) this.refresh();
        return this.rewardedReady;
    }

    /** Live readiness check; wait briefly for LevelPlay to finish its next preload. */
    async waitForRewarded(timeoutMs = 5000): Promise<boolean> {
        if (!this.supported || !this.ready || this.showing) return false;
        if (this.rewardedCheck) return this.rewardedCheck;
        this.rewardedCheck = (async () => {
            const end = Date.now() + timeoutMs;
            do {
                try {
                    const r = await CapacitorAds.isRewardedReady({ placementId: this.cfg.rewarded });
                    this.rewardedReady = r.value;
                    if (r.value) return true;
                } catch { /* plugin may be between loads */ }
                await new Promise((resolve) => setTimeout(resolve, 250));
            } while (Date.now() < end);
            return false;
        })().finally(() => { this.rewardedCheck = undefined; });
        return this.rewardedCheck;
    }

    /** Resolves true only if the player watched the full rewarded ad. */
    async showRewarded(reason: string, waitMs = 5000): Promise<boolean> {
        if (!(await this.waitForRewarded(waitMs)) || this.showing) return false;
        this.beginShow();
        this.rewardedReady = false;
        try {
            const r = await CapacitorAds.showRewarded({ placementId: this.cfg.rewarded });
            this.track('ad_rewarded', { reason, state: r.completed ? 'COMPLETED' : r.success ? 'SKIPPED' : 'FAILED' });
            return r.completed;
        } catch {
            return false;
        } finally {
            this.endShow();
        }
    }

    /** Call once per finished run (End screen) so interstitial pacing counts it. */
    noteGameEnded(): void {
        writeNum(KEYS.GAMES_ENDED, readNum(KEYS.GAMES_ENDED) + 1);
        writeNum(KEYS.GAMES_SINCE, readNum(KEYS.GAMES_SINCE) + 1);
    }

    /** Call when the player leaves the End screen; shows an interstitial only when pacing allows. Never rejects. */
    async maybeInterstitial(): Promise<void> {
        if (!this.ready || this.showing || this.premium) return;
        if (readNum(KEYS.GAMES_ENDED) <= ADS_CONFIG.interstitialAfterGames) return;
        if (readNum(KEYS.GAMES_SINCE) < ADS_CONFIG.interstitialEveryGames) return;
        if (Date.now() - readNum(KEYS.LAST_AT) < ADS_CONFIG.interstitialMinGapSec * 1000) return;
        if (!this.interstitialReady) { this.refresh(); return; }

        this.beginShow();
        this.interstitialReady = false;
        try {
            const r = await CapacitorAds.showInterstitial({ placementId: this.cfg.interstitial });
            if (r.success) {
                writeNum(KEYS.LAST_AT, Date.now());
                writeNum(KEYS.GAMES_SINCE, 0);
                this.track('ad_interstitial', {});
            }
        } catch { /* ignore */ } finally {
            this.endShow();
        }
    }

    // Pause music (native) and block taps on the game while a full-screen ad is up.
    private beginShow(): void {
        this.showing = true;
        AudioManager.pauseForAd();
        this.setGameInput(false);
    }

    private endShow(): void {
        this.showing = false;
        AudioManager.recoverAfterAd();
        this.setGameInput(true);
        this.refresh();
    }

    private setGameInput(enabled: boolean): void {
        window.game?.scene.getScenes(true).forEach((scene) => { scene.input.enabled = enabled; });
    }

    private track(name: string, params: Record<string, string | number | boolean>): void {
        Firebase.logEvent(name, params).catch(() => {});
    }
}

export const Ads = new AdsManager();
