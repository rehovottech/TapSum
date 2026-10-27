import { Purchases } from '@rehovottech/capacitor-purchases';
import { PurchasesConfigData } from '../config/Purchases';

class PurchasesManagerClass {
    private initialized = false;

    async initialize(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;

        Purchases.addListener("popupOpened", () => {
            if (window.game) {
                window.game.scene.getScenes(true).forEach((scene) => {
                    scene.input.enabled = false;
                });
            }
        });

        Purchases.addListener("popupClosed", () => {
            if (window.game) {
                window.game.scene.getScenes(true).forEach((scene) => {
                    scene.input.enabled = true;
                });
            }
        });

        // Counts this launch; the donate popup opens by itself after a 3-day streak (config/Purchases.ts),
        // otherwise from the coffee button in Menu. Purchases sit behind a parental gate.
        await Purchases.initialize(PurchasesConfigData);
    }

    showDonate(): Promise<void> {
        return Purchases.showDonate();
    }

    async hasSupported(): Promise<boolean> {
        const [donated, premium] = await Promise.all([Purchases.hasDonated(), Purchases.isPremium()]);
        return donated || premium;
    }
}

export const PurchasesManager = new PurchasesManagerClass();
