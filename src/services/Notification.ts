import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

const PLAY_REMINDER_ID = 1002;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
//const FRIDAY_NOTIF_ID = 1001;

export class NotificationManager {

    static async initialize(): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;
        await NotificationManager.requestPermissions();
        await NotificationManager.schedulePlayReminder();
    }

    // Call when the user starts or resumes a game session.
    // Reschedules a "come back and play" reminder 3 days from now,
    // pushing the timer forward so it only fires if the user goes 3 days idle.
    static async schedulePlayReminder(): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;
        try {
            const status = await LocalNotifications.checkPermissions();
            if (status.display !== 'granted') return;

            const pending = await LocalNotifications.getPending();
            const existing = pending.notifications.filter(n => n.id === PLAY_REMINDER_ID);
            if (existing.length > 0) {
                await LocalNotifications.cancel({ notifications: existing });
            }

            const fireAt = new Date(Date.now() + THREE_DAYS_MS);

            await LocalNotifications.schedule({
                notifications: [
                    {
                        id: PLAY_REMINDER_ID,
                        title: 'TapSum',
                        body: "You haven't played in a while — come back and beat your best score! 🎯",
                        schedule: {
                            at: fireAt,
                            allowWhileIdle: true,
                        },
                        iconColor: '#f6ff00',
                        autoCancel: true,
                    },
                ],
            });
        } catch (e) {
            console.error('Play reminder scheduling error:', e);
        }
    }

    private static async requestPermissions(): Promise<void> {
        try {
            const localResult = await LocalNotifications.requestPermissions();
            if (localResult.display !== 'granted') {
                console.warn('Local notification permission denied');
            }
        } catch (e) {
            console.error('Notification permission error:', e);
        }
    }

    // Schedules a repeating local notification every Friday at 8:00 PM
    /*
    private static async scheduleFridayNightNotification(): Promise<void> {
        try {
            const status = await LocalNotifications.checkPermissions();
            if (status.display !== 'granted') return;

            // Cancel existing Friday notification before re-scheduling to avoid duplicates
            const pending = await LocalNotifications.getPending();
            const existing = pending.notifications.filter(n => n.id === FRIDAY_NOTIF_ID);
            if (existing.length > 0) {
                await LocalNotifications.cancel({ notifications: existing });
            }

            await LocalNotifications.schedule({
                notifications: [
                    {
                        id: FRIDAY_NOTIF_ID,
                        title: 'Tamil Agaram',
                        body: "It's Friday night! Perfect time to practice your Tamil spelling 🌟",
                        schedule: {
                            on: {
                                // Weekday: 1=Sunday, 2=Monday, 3=Tue, 4=Wed, 5=Thu, 6=Friday, 7=Saturday
                                weekday: 6,
                                hour: 20,
                                minute: 0,
                            },
                            allowWhileIdle: true,
                        },
                        iconColor: '#f6ff00',
                        autoCancel: false,
                    },
                ],
            });

            console.log('Friday night notification scheduled (every Friday 20:00)');
        } catch (e) {
            console.error('Local notification scheduling error:', e);
        }
    }
    */
}
