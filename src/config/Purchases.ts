import type { PurchasesConfig } from '@rehovottech/capacitor-purchases';

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
                donateSmall: 29,
                donateMedium: 99,
                donateLarge: 199,
                premium: 299,
            },
        },
    },
    donation: {
        // Let the app-level PurchasesManager control the auto-popup timing so
        // it only appears after 2 days of play and stops after donation/premium.
        enabled: false,
        title: '❤️ Buy us a Coffee',
        message: 'Your support helps us keep building free games like Tap Sum.',
        buttonText: 'Support',
        laterText: 'Maybe Later',
        icon: '☕',
        showAfterLaunches: 1,
        remindEveryDays: 30,
    },
};
