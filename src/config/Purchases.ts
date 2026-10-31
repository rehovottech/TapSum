import type { PurchasesConfig } from '@rehovottech/capacitor-purchases';
import { AUDIENCE } from './Ads';

const RAZORPAY_KEY = String(import.meta.env.VITE_RAZORPAY_KEY ?? "");
const PREMIUM_STORE_KEY = "com.rehovot.game.tapsum.premium"

// One purchase only: "Remove Ads + Buy us a Coffee" is the premium product (non-consumable,
// restorable). It removes ads and counts as a coffee. No separate coffee tips.
export const PurchasesConfigData: PurchasesConfig = {
    appName: 'Tap Sum',
    platform: {
        android: {
            products: {
                premium: PREMIUM_STORE_KEY,
            },
        },
        ios: {
            products: {
                premium: PREMIUM_STORE_KEY,
            },
        },
        web: {
            razorpayKey: RAZORPAY_KEY,
            products: {
                premium: 199,
            },
        },
    },
    supporterPack: {
        enabled: true,
        title: 'Remove Ads + Buy us a Coffee',
        message: 'One purchase, yours for good.',
        buttonText: 'Remove Ads + Coffee',
        icon: '☕',
        showTips: false,
    },
    donation: {
        // Support popup (docs/GAME_ESSENTIALS.md § 4): once the app has been opened 3 days in a row,
        // then at most every 30 days (after another 3-day streak). Menu shows it once no other popup
        // is open (PurchasesManager.remindIfDue), not at launch. The coffee button opens it any time.
        // With the supporter pack above, this popup offers that one purchase.
        // Kids game: every purchase goes through the grown-up check (Families policy).
        enabled: true,
        showAfterConsecutiveDays: 3,
        showOnInitialize: false,
        parentalGate: AUDIENCE === 'kids',
        title: 'Remove Ads + Buy us a Coffee',
        message: 'Your support helps us keep building free games like Tap Sum.',
        buttonText: 'Remove Ads + Coffee',
        laterText: 'Maybe Later',
        icon: '☕',
        showAfterLaunches: 1,
        remindEveryDays: 30,
    },
};
