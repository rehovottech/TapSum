import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.rehovot.game.tapsum',
    appName: 'Tap Sum',
    webDir: 'dist',

    server: {
        androidScheme: 'https'
    },

    plugins: {
        SplashScreen: {
            launchShowDuration: 2000,
            launchAutoHide: true,
            backgroundColor: "#000000",
            androidSplashResourceName: "splash",
            androidScaleType: "CENTER_CROP",
            showSpinner: false
        },

        StatusBar: {
            overlaysWebView: true,
            style: 'DARK'
        },

        AdMob: {
            // TODO: replace with your real AdMob App IDs from admob.google.com
            appId: {
                android: "ca-app-pub-6565358340023179~7956554247",
                ios:     "ca-app-pub-6565358340023179~8923214611",
            }
        },
    }
};

export default config;