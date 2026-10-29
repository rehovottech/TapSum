import { Purchases } from '@rehovottech/capacitor-purchases';
import { PurchasesConfigData } from '../config/Purchases';
import { AUDIENCE } from '../config/Ads';
import { Ads } from './Ads';

const setInput = (enabled: boolean): void => {
    window.game?.scene.getScenes(true).forEach((scene) => {
        scene.input.enabled = enabled;
    });
};

class PurchasesManagerClass {
    private initPromise?: Promise<void>;
    /** True while a plugin popup (Remove Ads + Coffee / grown-up check) is open. */
    popupOpen = false;
    /** Called once premium is bought or restored (Menu hides the coffee button). */
    onPremium?: () => void;

    initialize(): Promise<void> {
        if (!this.initPromise) {
            Purchases.addListener("popupOpened", () => { this.popupOpen = true; setInput(false); });
            Purchases.addListener("popupClosed", () => { this.popupOpen = false; setInput(true); });
            // Premium removes ads: bought now, or restored from an earlier install
            const unlocked = () => { Ads.setPremium(true); this.onPremium?.(); };
            Purchases.addListener("premiumUnlocked", unlocked);
            Purchases.addListener("restoreCompleted", (r) => { if (r.premiumActive) unlocked(); });

            // Counts this launch (and the day streak). The support popup itself is shown by Menu
            // through remindIfDue(), never at launch (showOnInitialize: false).
            this.initPromise = Purchases.initialize(PurchasesConfigData).then(async () => {
                Ads.setPremium(await Purchases.isPremium().catch(() => false));
            });
        }
        return this.initPromise;
    }

    showDonate(): Promise<void> {
        return Purchases.showDonate();
    }

    /** Support popup (docs/GAME_ESSENTIALS.md § 4): shows it when due (3-day streak, nothing bought). */
    async remindIfDue(): Promise<void> {
        try {
            await this.initialize();
            await Purchases.showReminderIfDue();
        } catch (e) {
            console.warn('Purchases: reminder failed', e);
        }
    }

    /** Kids game: "Ask a grown-up" before leaving the app (store page, privacy policy). True when allowed. */
    async askGrownUp(): Promise<boolean> {
        if (AUDIENCE !== 'kids') return true;
        try {
            return await Purchases.askGrownUp();
        } catch (e) {
            console.warn('Purchases: grown-up check failed', e);
            return false;
        }
    }

    /** Premium (Remove Ads + Coffee): no interstitials, and continues skip the rewarded ad. Never rejects. */
    async isPremium(): Promise<boolean> {
        try {
            await this.initialize();
            const premium = await Purchases.isPremium();
            Ads.setPremium(premium);
            return premium;
        } catch (e) {
            console.warn('Purchases: premium check failed', e);
            return false;
        }
    }

    /** Opens the premium purchase (grown-up check first in kids' builds). True when premium is owned afterwards. */
    async buyPremium(): Promise<boolean> {
        try {
            await this.initialize();
            // With the grown-up check, showPremium() returns as soon as the gate opens;
            // the purchase finishes later, so wait for the popup to close either way.
            let handle: { remove: () => Promise<void> } | undefined;
            const closed = new Promise<void>((resolve) => {
                handle = Purchases.addListener('popupClosed', () => resolve());
            });
            try {
                await Purchases.showPremium();
                await closed;
            } finally {
                await handle?.remove();
            }
        } catch (e) {
            console.warn('Purchases: premium purchase failed', e);
        }
        return this.isPremium();
    }

    /** Restore purchases (App Store requires a button for it). True when premium is owned afterwards. */
    async restore(): Promise<boolean> {
        try {
            await this.initialize();
            await Purchases.restore();
        } catch (e) {
            console.warn('Purchases: restore failed', e);
        }
        return this.isPremium();
    }

}

export const PurchasesManager = new PurchasesManagerClass();
