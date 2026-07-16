import type { PurchasesConfig } from '@rehovottech/capacitor-purchases';

export const PurchasesConfigData: PurchasesConfig = {
    appName: 'Tap Sum',
    platform: {
        android: {
            products: {
                donateSmall: 'donate_small',
                donateMedium: 'donate_medium',
                donateLarge: 'donate_large',
                premium: 'premium_unlock',
            },
        },
        ios: {
            products: {
                donateSmall: 'donate_small',
                donateMedium: 'donate_medium',
                donateLarge: 'donate_large',
                premium: 'premium_unlock',
            },
        },
        web: {
            razorpayKey: '',
            products: {
                donateSmall: 29,
                donateMedium: 99,
                donateLarge: 199,
                premium: 299,
            },
        },
    },
    donation: {
        // The built-in launch-count reminder is disabled — PurchasesManager
        // loops the popup itself every DAYS_BETWEEN_AUTO_DONATE days of play,
        // stopping permanently once the player donates or unlocks premium.
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
