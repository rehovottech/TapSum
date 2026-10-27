/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        // Firebase 12 uses BigInt literals, so the modern bundle targets BigInt-capable browsers
        // (all supported WebViews: iOS 15+, Android System WebView). Older browsers get the legacy bundle.
        legacy({ modernTargets: ['chrome >= 87', 'edge >= 88', 'firefox >= 78', 'safari >= 14', 'ios >= 14'] })
    ],
    resolve: {
        dedupe: ['react', 'react-dom', '@ionic/react', '@ionic/core', '@capacitor/core', 'ionicons', 'firebase'],
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/setupTests.ts',
    }
})
