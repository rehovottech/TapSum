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
                donateSmall: 49,
                donateMedium: 99,
                donateLarge: 149,
                premium: 299,
            },
        },
    },
    donation: {
        // No automatic reminder popup: Tap Sum is played by kids (Families policy).
        // The donate popup only opens from the coffee button in Menu.
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
