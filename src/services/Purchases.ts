import { Preferences } from '@capacitor/preferences';
import { Purchases } from '@rehovottech/capacitor-purchases';
import { PurchasesConfigData } from '../config/Purchases';

const FIRST_PLAY_KEY = 'tapsum_first_play_at';
const LAST_SHOWN_KEY = 'tapsum_donate_last_shown_at';
const DAYS_BETWEEN_AUTO_DONATE = 3;
const MILLIS_IN_DAY = 24 * 60 * 60 * 1000;

class PurchasesManagerClass {
    private initialized = false;

    async initialize(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;

        await Purchases.initialize(PurchasesConfigData);
        await this.maybeShowAutoDonatePopup();
    }

    showDonate(): Promise<void> {
        return Purchases.showDonate();
    }

    // Shows the donate popup automatically every DAYS_BETWEEN_AUTO_DONATE days
    // of play, looping indefinitely until the player donates or unlocks premium.
    private async maybeShowAutoDonatePopup(): Promise<void> {
        try {
            const [donated, premium] = await Promise.all([Purchases.hasDonated(), Purchases.isPremium()]);
            if (donated || premium) return;

            const { value: firstPlayAt } = await Preferences.get({ key: FIRST_PLAY_KEY });
            if (!firstPlayAt) {
                await Preferences.set({ key: FIRST_PLAY_KEY, value: new Date().toISOString() });
                return;
            }

            const { value: lastShownAt } = await Preferences.get({ key: LAST_SHOWN_KEY });
            const referenceTime = new Date(lastShownAt ?? firstPlayAt).getTime();
            const elapsedDays = (Date.now() - referenceTime) / MILLIS_IN_DAY;
            if (elapsedDays < DAYS_BETWEEN_AUTO_DONATE) return;

            await Preferences.set({ key: LAST_SHOWN_KEY, value: new Date().toISOString() });
            await Purchases.showDonate();
        } catch (e) {
            console.warn('PurchasesManager: auto donate check failed', e);
        }
    }
}

export const PurchasesManager = new PurchasesManagerClass();
