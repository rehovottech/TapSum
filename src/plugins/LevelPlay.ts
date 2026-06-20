/**
 * LevelPlay.ts — Capacitor plugin wrapper for the Unity LevelPlay native plugin.
 *
 * This file only declares the typed interface and registers the plugin.
 * All logic lives in AdManager.ts — nothing should import this file directly
 * except AdManager.
 */

import { registerPlugin } from '@capacitor/core';

// ─── Event data types ─────────────────────────────────────────────────────────

export interface LevelPlayInitSuccessData {
    success: boolean;
}

export interface LevelPlayErrorData {
    errorCode: number;
    errorMessage: string;
}

export interface LevelPlayAdData {
    adUnitId: string;
}

export interface LevelPlayRewardData {
    rewardType: string;
    rewardAmount: number;
    adUnitId: string;
}

export interface LevelPlayReadyResult {
    ready: boolean;
}

// ─── Method parameter types ────────────────────────────────────────────────────

export interface InitializeOptions {
    appKey: string;
}

export type LevelPlayBannerSize = 'BANNER' | 'LARGE' | 'MEDIUM_RECTANGLE' | 'SMART';
export type LevelPlayBannerPosition = 'TOP' | 'BOTTOM';

export interface LoadBannerOptions {
    adUnitId: string;
    size?: LevelPlayBannerSize;
    position?: LevelPlayBannerPosition;
}

export interface AdUnitOptions {
    adUnitId: string;
}

// ─── Listener handle ──────────────────────────────────────────────────────────

export interface PluginListenerHandle {
    remove: () => void;
}

// ─── Plugin interface ─────────────────────────────────────────────────────────

export interface LevelPlayPlugin {
    // Init
    initialize(options: InitializeOptions): Promise<void>;

    // Banner
    loadBanner(options: LoadBannerOptions): Promise<void>;
    showBanner(): Promise<void>;
    hideBanner(): Promise<void>;
    destroyBanner(): Promise<void>;

    // Interstitial
    loadInterstitial(options: AdUnitOptions): Promise<void>;
    showInterstitial(options: AdUnitOptions): Promise<void>;
    isInterstitialReady(): Promise<LevelPlayReadyResult>;

    // Rewarded
    loadRewarded(options: AdUnitOptions): Promise<void>;
    showRewarded(options: AdUnitOptions): Promise<void>;
    isRewardedReady(): Promise<LevelPlayReadyResult>;

    // Init listeners
    addListener(event: 'onInitSuccess', fn: (data: LevelPlayInitSuccessData) => void): Promise<PluginListenerHandle>;
    addListener(event: 'onInitFailed', fn: (data: LevelPlayErrorData) => void): Promise<PluginListenerHandle>;

    // Banner listeners
    addListener(event: 'onBannerLoaded' | 'onBannerClicked' | 'onBannerDisplayed', fn: (data: LevelPlayAdData) => void): Promise<PluginListenerHandle>;
    addListener(event: 'onBannerLoadFailed', fn: (data: LevelPlayErrorData) => void): Promise<PluginListenerHandle>;

    // Interstitial listeners
    addListener(event: 'onInterstitialLoaded' | 'onInterstitialOpened' | 'onInterstitialClosed' | 'onInterstitialClicked', fn: (data: LevelPlayAdData) => void): Promise<PluginListenerHandle>;
    addListener(event: 'onInterstitialLoadFailed' | 'onInterstitialShowFailed', fn: (data: LevelPlayErrorData) => void): Promise<PluginListenerHandle>;

    // Rewarded listeners
    addListener(event: 'onRewardedLoaded' | 'onRewardedOpened' | 'onRewardedClosed' | 'onRewardedClicked', fn: (data: LevelPlayAdData) => void): Promise<PluginListenerHandle>;
    addListener(event: 'onRewardedLoadFailed' | 'onRewardedShowFailed', fn: (data: LevelPlayErrorData) => void): Promise<PluginListenerHandle>;
    addListener(event: 'onRewardedRewarded', fn: (data: LevelPlayRewardData) => void): Promise<PluginListenerHandle>;
}

// ─── Singleton registration ───────────────────────────────────────────────────

export const LevelPlay = registerPlugin<LevelPlayPlugin>('LevelPlay');
