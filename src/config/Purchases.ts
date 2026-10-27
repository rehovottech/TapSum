import type { PurchasesConfig } from '@rehovottech/capacitor-purchases';
import { AUDIENCE } from './Ads';

const RAZORPAY_KEY = String(import.meta.env.VITE_RAZORPAY_KEY ?? "");
const DONATE_STORE_KEY = {
    donateSmall: "com.rehovot.game.tapsum.donate_small",
    donateMedium: "com.rehovot.game.tapsum.donate_medium",
    donateLarge: "com.rehovot.game.tapsum.donate_large"
}

export const PurchasesConfigData: PurchasesConfig = {
    appName: 'Tap Sum',
    platform: {
        android: {
            products: {
                donateSmall: DONATE_STORE_KEY.donateSmall,
                donateMedium: DONATE_STORE_KEY.donateMedium,
                donateLarge: DONATE_STORE_KEY.donateLarge,
                premium: 'premium_unlock',
            },
        },
        ios: {
            products: {
                donateSmall: DONATE_STORE_KEY.donateSmall,
                donateMedium: DONATE_STORE_KEY.donateMedium,
                donateLarge: DONATE_STORE_KEY.donateLarge,
                premium: 'premium_unlock',
            },
        },
        web: {
            razorpayKey: RAZORPAY_KEY,
            products: {
                donateSmall: 49,
                donateMedium: 99,
                donateLarge: 149,
                premium: 299,
            },
        },
    },
    donation: {
        // Support popup (docs/GAME_ESSENTIALS.md § 4): once the app has been opened 3 days in a row,
        // then at most every 30 days (after another 3-day streak). Menu shows it once no other popup
        // is open (PurchasesManager.remindIfDue), not at launch. The coffee button opens it any time.
        // Kids game: every purchase goes through the grown-up check (Families policy).
        enabled: true,
        showAfterConsecutiveDays: 3,
        showOnInitialize: false,
        parentalGate: AUDIENCE === 'kids',
        title: '❤️ Buy us a Coffee',
        message: 'Your support helps us keep building free games like Tap Sum.',
        buttonText: 'Support',
        laterText: 'Maybe Later',
        icon: '☕',
        showAfterLaunches: 1,
        remindEveryDays: 30,
    },
};
