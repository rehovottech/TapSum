import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// Haptic feedback. Every call is fire-and-forget: on web or unsupported
// devices the plugin rejects and we simply ignore it.
export const Feel = {
    tap():     void { Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}); },
    bigTap():  void { Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {}); },
    success(): void { Haptics.notification({ type: NotificationType.Success }).catch(() => {}); },
    fail():    void { Haptics.notification({ type: NotificationType.Error }).catch(() => {}); },
};
