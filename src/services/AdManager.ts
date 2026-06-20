/**
 * AdManager — Unity LevelPlay Ad Manager
 *
 * Singleton service that wraps the LevelPlay Capacitor plugin.
 * All IDs and settings come from src/config/Ads.ts — nothing is hardcoded here.
 *
 * Usage:
 *   await AdManager.initialize();
 *
 *   // Menu scene
 *   AdManager.showBanner();
 *
 *   // Game over
 *   if (AdManager.isInterstitialReady()) AdManager.showInterstitial();
 *
 *   // Continue button
 *   AdManager.showRewarded(() => { // resume gameplay });
 */

import { Capacitor } from '@capacitor/core';
import { AdsConfig, AdsPlatformConfig } from '../config/Ads';
import { LevelPlay, PluginListenerHandle } from '../plugins/LevelPlay';

export type RewardCallback = () => void;

// ─── AdManager ────────────────────────────────────────────────────────────────

class AdManagerClass {
    private static _instance: AdManagerClass | null = null;

    // ── State ──────────────────────────────────────────────────────────────────
    private initialized = false;
    private bannerLoaded = false;
    private interstitialReady = false;
    private rewardedReady = false;

    private config: AdsPlatformConfig | null = null;
    private rewardCallback: RewardCallback | null = null;
    private interstitialCloseCallback: (() => void) | null = null;
    private listenerHandles: PluginListenerHandle[] = [];

    private constructor() { }

    static getInstance(): AdManagerClass {
        if (!AdManagerClass._instance) {
            AdManagerClass._instance = new AdManagerClass();
        }
        return AdManagerClass._instance;
    }

    // ── Logging ────────────────────────────────────────────────────────────────

    private log(...args: unknown[]): void {
        if (AdsConfig.debug) console.log('[AdManager]', ...args);
    }

    private logError(...args: unknown[]): void {
        if (AdsConfig.debug) console.error('[AdManager]', ...args);
    }

    // ── Platform config ────────────────────────────────────────────────────────

    private resolvePlatformConfig(): AdsPlatformConfig | null {
        if (!Capacitor.isNativePlatform()) {
            this.log('Non-native platform — ads disabled.');
            return null;
        }

        const platform = Capacitor.getPlatform();

        if (platform === 'android') {
            const cfg = AdsConfig.android;
            if (!cfg.appKey) {
                this.logError('AdsConfig.android.appKey is empty.');
                return null;
            }
            return cfg;
        }

        if (platform === 'ios') {
            const cfg = AdsConfig.ios;
            if (!cfg.appKey || !cfg.bannerId || !cfg.interstitialId || !cfg.rewardedId) {
                this.logError('AdsConfig.ios is incomplete — fill in all IDs.');
                return null;
            }
            return cfg as AdsPlatformConfig;
        }

        this.logError(`Unsupported platform: ${platform}`);
        return null;
    }

    // ── Event listeners ────────────────────────────────────────────────────────

    private async registerListeners(): Promise<void> {
        try {
            const h = this.listenerHandles;

            // Init
            h.push(await LevelPlay.addListener('onInitSuccess', () => {
                this.log('SDK init success.');
            }));
            h.push(await LevelPlay.addListener('onInitFailed', (d) => {
                this.logError('SDK init failed:', d.errorCode, d.errorMessage);
            }));

            // Banner
            h.push(await LevelPlay.addListener('onBannerLoaded', () => {
                this.bannerLoaded = true;
                this.log('Banner loaded.');
            }));
            h.push(await LevelPlay.addListener('onBannerLoadFailed', (d) => {
                this.bannerLoaded = false;
                this.logError('Banner load failed:', d.errorCode, d.errorMessage);
            }));
            h.push(await LevelPlay.addListener('onBannerClicked', () => this.log('Banner clicked.')));
            h.push(await LevelPlay.addListener('onBannerDisplayed', () => this.log('Banner displayed.')));

            // Interstitial
            h.push(await LevelPlay.addListener('onInterstitialLoaded', () => {
                this.interstitialReady = true;
                this.log('Interstitial ready.');
            }));
            h.push(await LevelPlay.addListener('onInterstitialLoadFailed', (d) => {
                this.interstitialReady = false;
                this.logError('Interstitial load failed:', d.errorCode, d.errorMessage);
                setTimeout(() => this.loadInterstitial(), 30_000);
            }));
            h.push(await LevelPlay.addListener('onInterstitialOpened', () => this.log('Interstitial opened.')));
            h.push(await LevelPlay.addListener('onInterstitialClosed', () => {
                this.interstitialReady = false;
                this.log('Interstitial closed — reloading.');
                const cb = this.interstitialCloseCallback;
                this.interstitialCloseCallback = null;
                this.loadInterstitial();
                cb?.();
            }));
            h.push(await LevelPlay.addListener('onInterstitialShowFailed', (d) => {
                this.logError('Interstitial show failed:', d.errorCode, d.errorMessage);
                const cb = this.interstitialCloseCallback;
                this.interstitialCloseCallback = null;
                this.loadInterstitial();
                cb?.();
            }));

            // Rewarded
            h.push(await LevelPlay.addListener('onRewardedLoaded', () => {
                this.rewardedReady = true;
                this.log('Rewarded ready.');
            }));
            h.push(await LevelPlay.addListener('onRewardedLoadFailed', (d) => {
                this.rewardedReady = false;
                this.logError('Rewarded load failed:', d.errorCode, d.errorMessage);
                setTimeout(() => this.loadRewarded(), 30_000);
            }));
            h.push(await LevelPlay.addListener('onRewardedOpened', () => this.log('Rewarded opened.')));
            h.push(await LevelPlay.addListener('onRewardedRewarded', (d) => {
                this.log('Reward granted:', d.rewardType, d.rewardAmount);
                if (this.rewardCallback) {
                    try {
                        this.rewardCallback();
                    } catch (err) {
                        this.logError('Reward callback error:', err);
                    }
                }
            }));
            h.push(await LevelPlay.addListener('onRewardedClosed', () => {
                this.rewardedReady = false;
                this.rewardCallback = null;
                this.log('Rewarded closed — reloading.');
                this.loadRewarded();
            }));
            h.push(await LevelPlay.addListener('onRewardedShowFailed', (d) => {
                this.logError('Rewarded show failed:', d.errorCode, d.errorMessage);
                this.rewardCallback = null;
                this.loadRewarded();
            }));
        } catch (err) {
            this.logError('registerListeners error:', err);
        }
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    /** Initializes the SDK. Idempotent — safe to call multiple times. */
    async initialize(): Promise<void> {
        if (this.initialized) {
            this.log('Already initialized.');
            return;
        }

        try {
            this.config = this.resolvePlatformConfig();
            if (!this.config) return;

            await this.registerListeners();

            this.log('Initializing SDK with appKey:', this.config.appKey);
            await LevelPlay.initialize({ appKey: this.config.appKey });

            this.initialized = true;
            this.log('AdManager ready.');

            // Pre-load both ad types immediately after init.
            this.loadInterstitial();
            this.loadRewarded();
        } catch (err) {
            this.logError('initialize error:', err);
        }
    }

    // ── Banner ─────────────────────────────────────────────────────────────────

    /**
     * Shows the bottom banner. First call loads + displays it.
     * Subsequent calls re-show a previously hidden banner without re-fetching.
     */
    showBanner(): void {
        if (!this.guard('showBanner')) return;

        try {
            if (this.bannerLoaded) {
                LevelPlay.showBanner().catch((err) => this.logError('showBanner error:', err));
            } else {
                this.log('Loading banner...');
                LevelPlay.loadBanner({
                    adUnitId: this.config!.bannerId,
                    size: 'BANNER',
                    position: 'BOTTOM',
                }).catch((err) => this.logError('loadBanner error:', err));
            }
        } catch (err) {
            this.logError('showBanner error:', err);
        }
    }

    hideBanner(): void {
        if (!this.guard('hideBanner')) return;
        try {
            LevelPlay.hideBanner().catch((err) => this.logError('hideBanner error:', err));
        } catch (err) {
            this.logError('hideBanner error:', err);
        }
    }

    destroyBanner(): void {
        if (!this.guard('destroyBanner')) return;
        try {
            LevelPlay.destroyBanner()
                .then(() => {
                    this.bannerLoaded = false;
                    this.log('Banner destroyed.');
                })
                .catch((err) => this.logError('destroyBanner error:', err));
        } catch (err) {
            this.logError('destroyBanner error:', err);
        }
    }

    // ── Interstitial ───────────────────────────────────────────────────────────

    loadInterstitial(): void {
        if (!this.guard('loadInterstitial')) return;
        try {
            this.log('Loading interstitial...');
            LevelPlay.loadInterstitial({ adUnitId: this.config!.interstitialId })
                .catch((err) => this.logError('loadInterstitial error:', err));
        } catch (err) {
            this.logError('loadInterstitial error:', err);
        }
    }

    isInterstitialReady(): boolean {
        return this.initialized && this.interstitialReady;
    }

    showInterstitial(onClose?: () => void): void {
        if (!this.guard('showInterstitial')) return;

        if (!this.interstitialReady) {
            this.log('Interstitial not ready — triggering load.');
            this.loadInterstitial();
            onClose?.();
            return;
        }

        try {
            this.interstitialCloseCallback = onClose ?? null;
            LevelPlay.showInterstitial({ adUnitId: this.config!.interstitialId })
                .catch((err) => this.logError('showInterstitial error:', err));
        } catch (err) {
            this.logError('showInterstitial error:', err);
            const cb = this.interstitialCloseCallback;
            this.interstitialCloseCallback = null;
            cb?.();
        }
    }

    // ── Rewarded ───────────────────────────────────────────────────────────────

    loadRewarded(): void {
        if (!this.guard('loadRewarded')) return;
        try {
            this.log('Loading rewarded...');
            LevelPlay.loadRewarded({ adUnitId: this.config!.rewardedId })
                .catch((err) => this.logError('loadRewarded error:', err));
        } catch (err) {
            this.logError('loadRewarded error:', err);
        }
    }

    isRewardedReady(): boolean {
        return this.initialized && this.rewardedReady;
    }

    /**
     * Shows the rewarded ad. `callback` fires ONLY when the user earns the reward.
     * It is never called on skip or failure.
     */
    showRewarded(callback?: RewardCallback): void {
        if (!this.guard('showRewarded')) return;

        if (!this.rewardedReady) {
            this.log('Rewarded not ready — triggering load.');
            this.loadRewarded();
            return;
        }

        try {
            this.rewardCallback = callback ?? null;
            LevelPlay.showRewarded({ adUnitId: this.config!.rewardedId })
                .catch((err) => this.logError('showRewarded error:', err));
        } catch (err) {
            this.logError('showRewarded error:', err);
        }
    }

    // ── State ──────────────────────────────────────────────────────────────────

    isInitialized(): boolean { return this.initialized; }

    // ── Guard ──────────────────────────────────────────────────────────────────

    private guard(method: string): boolean {
        if (!this.initialized || !this.config) {
            this.log(`${method}: not initialized — call AdManager.initialize() first.`);
            return false;
        }
        return true;
    }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const AdManager = AdManagerClass.getInstance();
