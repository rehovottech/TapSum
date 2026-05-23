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
        }
    }
};

export default config;