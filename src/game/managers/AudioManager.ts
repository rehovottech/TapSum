// Howler.js replaces Phaser's built-in audio system because Phaser's Web Audio API
// integration fails silently inside Capacitor Android/iOS WebViews — sounds either
// never play or cause crashes on low-end devices.
import { Howl, Howler } from 'howler';
import { App as CapApp } from '@capacitor/app';
import { Capacitor, registerPlugin } from '@capacitor/core';
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
// Full-slider levels. The sliders default to 50%, which gives the original mix (music 0.1, effects 0.5).
const MUSIC_VOL = 0.2;
const SFX_VOL   = 1.0;

// iOS app, or iPhone / iPad Safari (iPadOS reports itself as a Mac with touch)
const IS_IOS = Capacitor.getPlatform() === 'ios'
    || /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const IS_ANDROID = Capacitor.getPlatform() === 'android' || /Android/i.test(navigator.userAgent);
// html5 music streaming on desktop browsers only: the iOS and Android WebViews ignore an
// <audio> element's volume (music plays at 100%), so MUSIC_VOL and mute need Web Audio there.
const MUSIC_HTML5 = !IS_IOS && !IS_ANDROID;

/**
 * iOS app: after an ad SDK runs, WebKit's Web Audio freezes for the rest of the run (ctx.state still says 'running',
 * its clock stops, nothing revives it) while native players keep working. So SFX and music play natively there
 * (SceneDelegate.swift, plugin 'AudioSession') and Howler is unused. Android and web keep Howler.
 */
const NATIVE = Capacitor.getPlatform() === 'ios';
const AudioSession = registerPlugin<{
    reactivate(): Promise<{ active: boolean }>;
    load(o: { keys: string[] }): Promise<unknown>;
    play(o: { key: string; rate?: number; volume?: number }): Promise<unknown>;
    playMusic(o: { track: string; volume: number; fade: number }): Promise<unknown>;
    setMusicVolume(o: { volume: number; fade: number }): Promise<void>;
    pauseMusic(): Promise<void>;
    resumeMusic(): Promise<unknown>;
}>('AudioSession');
/** 'assets/audio/tap.mp3' -> 'tap' (the bundled file name the native side loads). */
const fileOf = (src: string) => src.replace(/^.*\//, '').replace(/\.mp3$/, '');

class AudioManagerClass {
    private sounds               = new Map<string, Howl>();
    private bgMusic:               Howl | null = null;
    private _ready               = false;
    private _pendingMusic        = false;
    private _pausedByLifecycle   = false;
    private _lifecycleRegistered = false;
    private _nativeMusicOn       = false;

    /** Call once at app startup (idempotent). */
    init(): void {
        if (this._ready) return;
        this._ready = true;
        if (NATIVE) {
            void AudioSession.load({ keys: [...Object.values(AUDIO_SRCS), MUSIC_SRC].map(fileOf) }).catch(() => {});
            return;
        }

        // SFX — Web Audio API (no html5) for low-latency, overlapping replay via pool
        Object.entries(AUDIO_SRCS).forEach(([key, src]) => {
            this.sounds.set(key, new Howl({
                src:     [src],
                preload: true,
                pool:    5,
                volume:  SFX_VOL * SaveManager.getSfxVolume(),
            }));
        });

        // Music — html5 streaming only on desktop (see MUSIC_HTML5). On mobile the one track
        // is decoded into memory by Web Audio, which is what makes MUSIC_VOL and mute work.
        this.bgMusic = new Howl({
            src:    [MUSIC_SRC],
            loop:   true,
            html5:  MUSIC_HTML5,
            volume: SaveManager.isSoundEnabled() ? this._musicLevel() : 0,
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

    /** rate > 1 raises the pitch (used for rising taps within a round). */
    play(key: string, rate = 1): void {
        if (!SaveManager.isSoundEnabled() || SaveManager.getSfxVolume() <= 0) return;
        if (NATIVE) {
            const src = AUDIO_SRCS[key];
            if (src) void AudioSession.play({ key: fileOf(src), rate, volume: SFX_VOL * SaveManager.getSfxVolume() }).catch(() => {});
            return;
        }
        const snd = this.sounds.get(key);
        if (!snd) return;
        const id = snd.play();
        if (rate !== 1) snd.rate(rate, id);
    }

    playMusic(): void {
        if (NATIVE) {
            if (!SaveManager.isSoundEnabled()) return;
            this._nativeMusicOn = true;
            void AudioSession.playMusic({ track: fileOf(MUSIC_SRC), volume: this._musicLevel(), fade: 0 }).catch(() => {});
            return;
        }
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
        if (NATIVE) { this._nativeMusicOn = false; void AudioSession.pauseMusic().catch(() => {}); return; }
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
        if (NATIVE) {
            if (this._nativeMusicOn) { this._pausedByLifecycle = true; void AudioSession.pauseMusic().catch(() => {}); }
            return;
        }
        if (this.bgMusic?.playing()) {
            this._pausedByLifecycle = true;
            try { this.bgMusic.pause(); } catch (_) {}
        }
    }

    resumeMusic(): void {
        if (!this._pausedByLifecycle) return;
        this._pausedByLifecycle = false;
        if (NATIVE) { if (SaveManager.isSoundEnabled()) void AudioSession.resumeMusic().catch(() => {}); return; }
        const ctx = (Howler as any).ctx as (AudioContext | undefined);
        const doResume = () => { try { this.bgMusic?.play(); } catch (_) {} };
        if (ctx && ctx.state !== 'running') {
            ctx.resume().then(doResume).catch(() => {});
        } else {
            doResume();
        }
    }

    /** Native ads take over the iOS audio session; pause cleanly so the system doesn't cut the music mid-stream. */
    pauseForAd(): void {
        if (Capacitor.isNativePlatform()) this.pauseMusic();
    }

    /**
     * After a native ad closes: iOS re-activates the native session and restarts the music (native playback is
     * unaffected). Android resumes the AudioContext with retries (it may be left suspended).
     */
    recoverAfterAd(): void {
        if (!Capacitor.isNativePlatform()) return;
        if (NATIVE) { AudioSession.reactivate().then(() => this.resumeMusic(), () => {}); return; }
        const ctx = (Howler as any).ctx as (AudioContext | undefined);
        const restart = () => {
            this._pausedByLifecycle = false;
            if (SaveManager.isSoundEnabled() && this.bgMusic && !this.bgMusic.playing()) this._doPlayMusic();
        };
        const attempt = (i: number) => {
            if (!ctx || ctx.state === 'running') { restart(); return; }
            ctx.resume().catch(() => {}).then(() => {
                if (ctx.state === 'running') restart();
                else if (i < 3) setTimeout(() => attempt(i + 1), [300, 1000, 2000][i]);
                else this._pendingMusic = true; // the next tap resumes it (onInteraction)
            });
        };
        attempt(0);
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

    setMusicVolume(v: number): void {
        SaveManager.setMusicVolume(v);
        if (NATIVE) { if (SaveManager.isSoundEnabled()) void AudioSession.setMusicVolume({ volume: this._musicLevel(), fade: 0 }).catch(() => {}); return; }
        if (SaveManager.isSoundEnabled()) this.bgMusic?.volume(this._musicLevel());
    }

    setSfxVolume(v: number): void {
        SaveManager.setSfxVolume(v);
        this.sounds.forEach((snd) => snd.volume(SFX_VOL * SaveManager.getSfxVolume()));
    }

    private _musicLevel(): number {
        return MUSIC_VOL * SaveManager.getMusicVolume();
    }

    private _doPlayMusic(): void {
        if (!this.bgMusic || this.bgMusic.playing()) return;
        if (!SaveManager.isSoundEnabled()) return;
        this.bgMusic.volume(this._musicLevel());
        this.bgMusic.play();
    }

    private _applyMusicVolume(enabled: boolean): void {
        if (NATIVE) { void AudioSession.setMusicVolume({ volume: enabled ? this._musicLevel() : 0, fade: 0 }).catch(() => {}); return; }
        this.bgMusic?.volume(enabled ? this._musicLevel() : 0);
    }
}

export const AudioManager = new AudioManagerClass();
