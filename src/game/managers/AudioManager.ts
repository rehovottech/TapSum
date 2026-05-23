// Howler.js replaces Phaser's built-in audio system because Phaser's Web Audio API
// integration fails silently inside Capacitor Android/iOS WebViews — sounds either
// never play or cause crashes on low-end devices.
import { Howl, Howler } from 'howler';
import { SaveManager } from './SaveManager';

export const SOUND_KEYS = {
    TAP:     'snd_tap',
    SUCCESS: 'snd_success',
    FAIL:    'snd_fail',
    CLICK:   'snd_click',
    REWARD:  'snd_reward',
};

const AUDIO_SRCS: Record<string, string> = {
    [SOUND_KEYS.TAP]:     'assets/audio/tap.mp3',
    [SOUND_KEYS.SUCCESS]: 'assets/audio/success.mp3',
    [SOUND_KEYS.FAIL]:    'assets/audio/fail.mp3',
    [SOUND_KEYS.CLICK]:   'assets/audio/click.mp3',
    [SOUND_KEYS.REWARD]:  'assets/audio/reward.mp3',
};

const MUSIC_SRC = 'assets/audio/background-music.mp3';
const MUSIC_VOL = 0.2;
const SFX_VOL   = 0.7;

class AudioManagerClass {
    private sounds        = new Map<string, Howl>();
    private bgMusic:        Howl | null = null;
    private _ready        = false;
    private _pendingMusic = false;

    /** Call once at app startup (idempotent). */
    init(): void {
        if (this._ready) return;
        this._ready = true;

        // SFX — Web Audio API (no html5) for low-latency, overlapping replay via pool
        Object.entries(AUDIO_SRCS).forEach(([key, src]) => {
            this.sounds.set(key, new Howl({
                src:     [src],
                preload: true,
                pool:    5,
                volume:  SFX_VOL,
            }));
        });

        // Music — html5 mode avoids large ArrayBuffer decode on low-end Android devices
        this.bgMusic = new Howl({
            src:    [MUSIC_SRC],
            loop:   true,
            html5:  true,
            volume: SaveManager.isSoundEnabled() ? MUSIC_VOL : 0,
        });

        // Flush any playMusic() call that arrived before the first user gesture
        const onInteraction = () => {
            if (this._pendingMusic) {
                this._pendingMusic = false;
                this._doPlayMusic();
            }
        };
        document.addEventListener('touchstart', onInteraction, { once: true, passive: true });
        document.addEventListener('mousedown',  onInteraction, { once: true });
    }

    play(key: string): void {
        if (!SaveManager.isSoundEnabled()) return;
        this.sounds.get(key)?.play();
    }

    playMusic(): void {
        if (!this.bgMusic || this.bgMusic.playing()) return;

        // AudioContext is suspended until the first user gesture on iOS/Android WebView
        const ctx = (Howler as any).ctx as (AudioContext | undefined);
        if (ctx && ctx.state !== 'running') {
            this._pendingMusic = true;
            return;
        }
        this._doPlayMusic();
    }

    stopMusic(): void {
        this._pendingMusic = false;
        try { this.bgMusic?.stop(); } catch (_) {}
    }

    toggleSound(): boolean {
        const next = !SaveManager.isSoundEnabled();
        SaveManager.setSoundEnabled(next);
        this._applyMusicVolume(next);
        return next;
    }

    setMute(muted: boolean): void {
        SaveManager.setSoundEnabled(!muted);
        this._applyMusicVolume(!muted);
    }

    isSoundEnabled(): boolean {
        return SaveManager.isSoundEnabled();
    }

    /** Call from Capacitor's App.addListener('resume', ...) to restore audio after backgrounding. */
    onResume(): void {
        try {
            const ctx = (Howler as any).ctx as (AudioContext | undefined);
            ctx?.resume().catch(() => {});
        } catch (_) {}
    }

    private _doPlayMusic(): void {
        if (!this.bgMusic || this.bgMusic.playing()) return;
        if (!SaveManager.isSoundEnabled()) return;
        this.bgMusic.volume(MUSIC_VOL);
        this.bgMusic.play();
    }

    private _applyMusicVolume(enabled: boolean): void {
        this.bgMusic?.volume(enabled ? MUSIC_VOL : 0);
    }
}

export const AudioManager = new AudioManagerClass();
