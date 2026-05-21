import * as Phaser from 'phaser';
import { SaveManager } from './SaveManager';

// Sound keys - drop matching audio files into public/assets/audio/ to enable sounds.
// AudioManager silently skips playback for any key that hasn't been loaded.
export const SOUND_KEYS = {
    TAP:     'snd_tap',
    SUCCESS: 'snd_success',
    FAIL:    'snd_fail',
    CLICK:   'snd_click',
    REWARD:  'snd_reward',
};

const MUSIC_KEY   = 'snd_bg_music';
const MUSIC_VOL   = 0.2;

class AudioManagerClass {
    private scene: Phaser.Scene | null = null;
    private music: Phaser.Sound.BaseSound | null = null;

    init(scene: Phaser.Scene): void {
        this.scene = scene;
    }

    play(key: string): void {
        if (!SaveManager.isSoundEnabled() || !this.scene) return;
        try {
            if (this.scene.cache.audio.exists(key)) {
                this.scene.sound.play(key, { volume: 0.7 });
            }
        } catch (_) {}
    }

    playMusic(): void {
        if (!this.scene) return;
        if (this.music?.isPlaying) return;
        try {
            if (!this.scene.cache.audio.exists(MUSIC_KEY)) return;
            if (!this.music) {
                this.music = this.scene.sound.add(MUSIC_KEY, {
                    loop: true,
                    volume: SaveManager.isSoundEnabled() ? MUSIC_VOL : 0,
                });
            }
            this.music.play();
        } catch (_) {}
    }

    stopMusic(): void {
        try {
            this.music?.stop();
            this.music?.destroy();
            this.music = null;
        } catch (_) {}
    }

    toggleSound(): boolean {
        const next = !SaveManager.isSoundEnabled();
        SaveManager.setSoundEnabled(next);
        try {
            if (this.music) (this.music as any).setVolume(next ? MUSIC_VOL : 0);
        } catch (_) {}
        return next;
    }

    isSoundEnabled(): boolean {
        return SaveManager.isSoundEnabled();
    }
}

export const AudioManager = new AudioManagerClass();
