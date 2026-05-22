import { ShowBannerAd, ShowInterstitialAd, ShowRewardVideoAd, HideBannerAd } from '../../services/Admob';
import { SaveManager } from './SaveManager';
import { GAME_CONFIG } from '../constants/GameConstants';

class AdManagerClass {
    async showBanner(): Promise<void> {
        setTimeout(async () => {
            try { await ShowBannerAd(); } catch (_) {}
        }, 1500);
    }

    async hideBanner(): Promise<void> {
        try { await HideBannerAd(); } catch (_) {}
    }

    async showInterstitial(onClose?: () => void): Promise<void> {
        const elapsed = Date.now() - SaveManager.getLastInterstitialTime();
        if (elapsed < GAME_CONFIG.INTERSTITIAL_COOLDOWN) {
            onClose?.();
            return;
        }
        try {
            SaveManager.setLastInterstitialTime();
            await ShowInterstitialAd(onClose);
        } catch (_) {
            onClose?.();
        }
    }

    // Returns true if the player earned the reward, false if the ad failed.
    async showRewardVideo(): Promise<boolean> {
        try {
            await ShowRewardVideoAd();
            return true;
        } catch (_) {
            return false;
        }
    }
}

export const AdManager = new AdManagerClass();
