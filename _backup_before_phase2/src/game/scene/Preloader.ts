import * as Phaser from 'phaser';
import BaseScene from './BaseScene';
import { SCENES } from '../utils/Scenes';
import { GlobVar } from '../../utils/Global';
import { THEME } from '../constants/Colors';
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
        // Audio is managed by Howler.js (AudioManager) — no Phaser audio loads needed.
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
        this.createGradientBg(THEME.BG_TOP, THEME.BG_BOTTOM);
    }

    private createLoadingUI(): void {
        // Title
        const title = this.add.bitmapText(this.CX, this.H * 0.32, 'coiny-bmp', 'TapSum', Math.floor(this.H * 0.1), 0).setOrigin(0.5).setTint(THEME.WHITE);
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

        this.add.bitmapText(this.CX, this.H * 0.44, 'coiny-bmp', 'Remember. Count. Tap!', Math.floor(this.H * 0.028), 0).setOrigin(0.5)
        .setTint(THEME.MUTED);

        // Dots loading animation
        const dots1 = this.add.bitmapText(this.CX, this.H * 0.52, 'coiny-bmp', '• • •', Math.floor(this.H * 0.06), 0).setOrigin(0.5);
        dots1.setTint(THEME.WARN);

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
        this.barBg.fillStyle(THEME.TRACK, 1);
        this.barBg.fillRoundedRect(this.barX, this.barY, this.barW, this.barH, radius);

        this.barBg.lineStyle(0, THEME.TRACK, 0);
        this.barBg.strokeRoundedRect(this.barX, this.barY, this.barW, this.barH, radius);

        this.barFill = this.add.graphics();

        // Percentage text
        this.pctText = this.add.bitmapText(this.CX, this.barY + this.barH + Math.floor(this.H * 0.03), 'coiny-bmp', '0%', 40, 0).setOrigin(0.5).setTint(THEME.WHITE);

        this.setProgress(0);
    }

    private setProgress(value: number): void {
        if (!this.barFill) return;

        const ratio = Phaser.Math.Clamp(value, 0, 1);
        const radius = this.barH / 2;

        const fillColor = THEME.GOLD;

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
