// Howler.js replaces Phaser's built-in audio system because Phaser's Web Audio API
// integration fails silently inside Capacitor Android/iOS WebViews — sounds either
// never play or cause crashes on low-end devices.
import { Howl, Howler } from 'howler';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
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
const MUSIC_VOL = 0.5;
const SFX_VOL   = 1;

class AudioManagerClass {
    private sounds               = new Map<string, Howl>();
    private bgMusic:               Howl | null = null;
    private _ready               = false;
    private _pendingMusic        = false;
    private _pausedByLifecycle   = false;
    private _lifecycleRegistered = false;

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

    pauseMusic(): void {
        if (this.bgMusic?.playing()) {
            this._pausedByLifecycle = true;
            try { this.bgMusic.pause(); } catch (_) {}
        }
    }

    resumeMusic(): void {
        if (!this._pausedByLifecycle) return;
        this._pausedByLifecycle = false;
        const ctx = (Howler as any).ctx as (AudioContext | undefined);
        const doResume = () => { try { this.bgMusic?.play(); } catch (_) {} };
        if (ctx && ctx.state !== 'running') {
            ctx.resume().then(doResume).catch(() => {});
        } else {
            doResume();
        }
    }

    /** Wire up tab-visibility and Capacitor app-suspend events. Call once at app startup. */
    registerAppLifecycle(): void {
        if (this._lifecycleRegistered) return;
        this._lifecycleRegistered = true;

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) this.pauseMusic();
            else                  this.resumeMusic();
        });

        if (Capacitor.isNativePlatform()) {
            CapApp.addListener('appStateChange', ({ isActive }) => {
                if (!isActive) this.pauseMusic();
                else           this.resumeMusic();
            });
        }
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
