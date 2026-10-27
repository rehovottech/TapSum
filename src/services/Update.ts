import { AppUpdate, AppUpdateAvailability } from '@rehovottech/capacitor-app-update';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { PurchasesManager } from './Purchases';

const SNOOZE_KEY = 'update_snooze_until';
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * "New version available" check (docs/GAME_ESSENTIALS.md § 5), native only: once per launch, from
 * Menu, never during a game. The store only opens after a tap on Update, and in this Kids game only
 * after the grown-up check.
 */
export class UpdateManager {
    private static checked = false;
    /** Store version waiting to be shown (the check finished while another popup was open). */
    static pending: string | null = null;

    static async check(): Promise<void> {
        if (!Capacitor.isNativePlatform() || UpdateManager.checked) return;
        UpdateManager.checked = true;
        try {
            const { value } = await Preferences.get({ key: SNOOZE_KEY });
            if (value && Date.now() < Number(value)) return;
            const info = await AppUpdate.getAppUpdateInfo();
            if (info.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE) {
                UpdateManager.pending = info.availableVersionName ?? '';
            }
        } catch { /* store unreachable / not installed from the store */ }
    }

    static async later(): Promise<void> {
        UpdateManager.pending = null;
        await Preferences.set({ key: SNOOZE_KEY, value: String(Date.now() + SNOOZE_MS) }).catch(() => {});
    }

    /** Opens the store page once a grown-up allows it. If they don't, the alert snoozes like Later. */
    static async update(): Promise<void> {
        UpdateManager.pending = null;
        if (!(await PurchasesManager.askGrownUp())) {
            await UpdateManager.later();
            return;
        }
        await AppUpdate.openAppStore().catch(() => {});
    }
}
