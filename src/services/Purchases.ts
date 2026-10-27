import { Purchases } from '@rehovottech/capacitor-purchases';
import { PurchasesConfigData } from '../config/Purchases';
import { AUDIENCE } from '../config/Ads';

const setInput = (enabled: boolean): void => {
    window.game?.scene.getScenes(true).forEach((scene) => {
        scene.input.enabled = enabled;
    });
};

class PurchasesManagerClass {
    private initPromise?: Promise<void>;
    /** True while a plugin popup (donate / grown-up check) is open. */
    popupOpen = false;

    initialize(): Promise<void> {
        if (!this.initPromise) {
            Purchases.addListener("popupOpened", () => { this.popupOpen = true; setInput(false); });
            Purchases.addListener("popupClosed", () => { this.popupOpen = false; setInput(true); });

            // Counts this launch (and the day streak). The support popup itself is shown by Menu
            // through remindIfDue(), never at launch (showOnInitialize: false).
            this.initPromise = Purchases.initialize(PurchasesConfigData);
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

    async hasSupported(): Promise<boolean> {
        const [donated, premium] = await Promise.all([Purchases.hasDonated(), Purchases.isPremium()]);
        return donated || premium;
    }
}

export const PurchasesManager = new PurchasesManagerClass();
