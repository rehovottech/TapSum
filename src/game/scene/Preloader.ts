import * as Phaser from 'phaser';
import BaseScene from './BaseScene';
import { SCENES } from '../utils/Scenes';
import { GlobVar } from '../../utils/Global';
import { COLORS } from '../constants/Colors';
import FPS from '../model/FPS';

export default class Preload extends BaseScene {
    private barFill!: Phaser.GameObjects.Graphics;
    private barBg!:   Phaser.GameObjects.Graphics;
    private pctText!: Phaser.GameObjects.BitmapText;
    private barW!: number;
    private barH!: number;
    private barX!: number;
    private barY!: number;

    constructor() {
        super({ key: SCENES.Preload });
    }

    init(): void {
        this.initScene();
    }

    preload(): void {
        // Place audio files here when available, e.g.:
        this.load.audio('snd_tap',      'assets/audio/tap.mp3');
        this.load.audio('snd_success',  'assets/audio/success.mp3');
        this.load.audio('snd_fail',     'assets/audio/fail.mp3');
        this.load.audio('snd_click',    'assets/audio/click.mp3');
        this.load.audio('snd_reward',   'assets/audio/reward.mp3');
        this.load.audio('snd_bg_music', 'assets/audio/background-music.mp3');

        this.load.on('progress', (v: number) => this.setProgress(v));
    }

    create(): void {
        GlobVar.consolelog(`Scene: ${SCENES.Preload}`);

        this.createBackground();
        this.createLoadingUI();
        this.fpsView = new FPS(this);

        // Animate bar to 100 % (actual assets may be empty), then go to Menu.
        const prog = { v: 0 };
        this.tweens.add({
            targets: prog,
            v: 1,
            duration: 1800,
            ease: 'Sine.easeIn',
            onUpdate: () => this.setProgress(prog.v),
            onComplete: () => {
                this.time.delayedCall(1500, () => this.fadeToScene(SCENES.Menu));
            },
        });
    }

    update(): void {
        this.fpsView?.update();
    }

    // ─────────────────────────────────────────────────────────────────────────

    private createBackground(): void {
        this.createGradientBg(COLORS.BG_TOP, COLORS.BG_BOTTOM);
    }

    private createLoadingUI(): void {
        // Title
        const title = this.add.bitmapText(this.CX, this.H * 0.32, 'coiny-bmp', 'TapSum', 140, 0).setOrigin(0.5);
        this.tweens.add({
            targets: title,
            y: this.H * 0.32 - 18,
            scaleX: 1.02,
            scaleY: 1.04,
            duration: 800,
            delay: 200,
            repeatDelay: 200,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
        });

        this.add.bitmapText(this.CX, this.H * 0.44, 'coiny-bmp', 'Remember. Count. Tap!', 40, 0).setOrigin(0.5)
        .setTint(Phaser.Display.Color.ValueToColor(COLORS.TEXT_NEON).color);

        // Dots loading animation
        const dots1 = this.add.bitmapText(this.CX, this.H * 0.52, 'coiny-bmp', '• • •', 90, 0).setOrigin(0.5);
        dots1.setTint(Phaser.Display.Color.ValueToColor(COLORS.TEXT_ACCENT).color);

        this.tweens.add({
            targets: dots1,
            alpha: 0.2,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // Progress bar
        this.barW = this.W * 0.65;
        this.barH = Math.floor(this.H * 0.018);
        this.barX = this.CX - this.barW / 2;
        this.barY = this.H * 0.62;
        const radius = this.barH / 2;

        // Track
        this.barBg = this.add.graphics();
        this.barBg.fillStyle(0x333355, 1);
        this.barBg.fillRoundedRect(this.barX, this.barY, this.barW, this.barH, radius);

        this.barBg.lineStyle(1, COLORS.NEON_BLUE, 0.5);
        this.barBg.strokeRoundedRect(this.barX, this.barY, this.barW, this.barH, radius);

        this.barFill = this.add.graphics();

        // Percentage text
        this.pctText = this.add.bitmapText(this.CX, this.barY + this.barH + Math.floor(this.H * 0.03), 'coiny-bmp', '0%', 40, 0).setOrigin(0.5);

        this.setProgress(0);
    }

    private setProgress(value: number): void {
        if (!this.barFill) return;

        const ratio = Phaser.Math.Clamp(value, 0, 1);
        const radius = this.barH / 2;

        const r1 = 0x00, g1 = 0xd4, b1 = 0xff; // NEON_BLUE
        const r2 = 0xb4, g2 = 0x4b, b2 = 0xff; // NEON_PURPLE
        const r = Math.round(r1 + (r2 - r1) * ratio);
        const g = Math.round(g1 + (g2 - g1) * ratio);
        const b = Math.round(b1 + (b2 - b1) * ratio);
        const fillColor = (r << 16) | (g << 8) | b;

        this.barFill.clear();
        if (ratio > 0) {
            this.barFill.fillStyle(fillColor, 1);
            this.barFill.fillRoundedRect(this.barX, this.barY, this.barW * ratio, this.barH, radius);
        }

        if (this.pctText) {
            this.pctText.setText(`${Math.floor(ratio * 100)}%`);
        }
    }
}
