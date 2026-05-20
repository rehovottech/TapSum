import * as Phaser from 'phaser';
import BaseScene from './BaseScene';
import { SCENES } from '../utils/Scenes';
import { GlobVar } from '../../utils/Global';
import { COLORS } from '../constants/Colors';
import FPS from '../model/FPS';

export default class Preload extends BaseScene {
    private barFill!: Phaser.GameObjects.Graphics;
    private barBg!:   Phaser.GameObjects.Graphics;
    private pctText!: Phaser.GameObjects.Text;
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
        this.load.font('Coiny', 'assets/font/Coiny-Regular.ttf');
        this.load.font('Akt-SemiBold', 'assets/font/Akt-SemiBold.ttf');

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
                this.time.delayedCall(400, () => this.fadeToScene(SCENES.Menu));
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
        this.add.text(this.CX, this.H * 0.32, 'TapSum', {
            fontFamily: 'Coiny',
            fontSize: `${Math.floor(this.H * 0.1)}px`,
            color: COLORS.TEXT_WHITE,
            fontStyle: 'bold',
        }).setOrigin(0.5);

        this.add.text(this.CX, this.H * 0.44, 'Remember. Count. Tap!', {
            fontFamily: 'Coiny',
            fontSize: `${Math.floor(this.H * 0.03)}px`,
            color: COLORS.TEXT_NEON,
        }).setOrigin(0.5);

        // Dots loading animation
        const dots = this.add.text(this.CX, this.H * 0.52, '• • •', {
            fontFamily: 'Coiny',
            fontSize: `${Math.floor(this.H * 0.04)}px`,
            color: COLORS.TEXT_ACCENT,
        }).setOrigin(0.5);

        this.tweens.add({
            targets: dots,
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
        this.pctText = this.add.text(this.CX, this.barY + this.barH + Math.floor(this.H * 0.03), '0%', {
            fontFamily: 'Coiny',
            fontSize: `${Math.floor(this.H * 0.028)}px`,
            color: COLORS.TEXT_WHITE,
        }).setOrigin(0.5);

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
