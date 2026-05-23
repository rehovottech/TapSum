import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.rehovot.game.tapsum',
    appName: 'tap-sum',
    webDir: 'dist',
    plugins: {
        ScreenOrientation: {
            orientation: 'portrait'
        }
    }
};

export default config;
