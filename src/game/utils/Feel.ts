import { SaveManager } from '../managers/SaveManager';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const on = () => SaveManager.isHapticsEnabled();

// Haptic feedback (off when the player turns
// Vibration off in Settings). Every call is fire-and-forget: on web or unsupported devices the plugin
// rejects and we simply ignore it.
export const Feel = {
    tap():     void { if (on()) Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}); },
    bigTap():  void { if (on()) Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {}); },
    success(): void { if (on()) Haptics.notification({ type: NotificationType.Success }).catch(() => {}); },
    fail():    void { if (on()) Haptics.notification({ type: NotificationType.Error }).catch(() => {}); },
};
