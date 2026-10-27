import * as Phaser from 'phaser';
import BaseScene from './BaseScene';
import { SCENES } from '../utils/Scenes';
import { GlobVar } from '../../utils/Global';
import { THEME } from '../constants/Colors';
import { LeaderboardManager } from '../managers/LeaderboardManager';
import { AudioManager } from '../managers/AudioManager';
import FPS from '../model/FPS';

export default class Boot extends BaseScene {
    
    private logoContiner?: Phaser.GameObjects.Container;
    private barFill!: Phaser.GameObjects.Graphics;
    private pctText?: Phaser.GameObjects.BitmapText;
    private barW!: number;
    private barH!: number;
    private barX!: number;
    private barY!: number;
    private progress = 0;

    constructor() {
        super({ key: SCENES.Boot });
    }

    init(): void {
        this.initScene();
        this.initDeviceInfo();
        this.createBackground();
    }

    preload(): void {
        this.load.path = 'assets/sprite/';
        this.load.image('studio-logo', 'studio-logo.png');

        // Load Bitmap
        this.load.path = 'assets/font/';
        this.load.bitmapFont('coiny-bmp', 'coiny.png', 'coiny.xml');
        this.load.bitmapFont('krungthep-bmp', 'krungthep.png', 'krungthep.xml');

        // Medal icons
        this.load.path = 'assets/medal/';
        this.load.svg('medal-gold',   '1-gold.svg',   { width: 64, height: 64 });
        this.load.svg('medal-silver', '2-silver.svg', { width: 64, height: 64 });
        this.load.svg('medal-bronze', '3-bronze.svg', { width: 64, height: 64 });
    }

    create(): void {
        GlobVar.consolelog(`Scene: ${SCENES.Boot}`);

        this.fpsView = new FPS(this);

        // Initialize Howler audio early so Howl instances are created before Menu loads.
        AudioManager.init();

        this.showLogo();
        this.finishLoading();

        // Kick off service initializations in the background
        // (web: Firebase sign-in for its leaderboard; Android: Play Games sign-in check).
        LeaderboardManager.init().catch(() => {});
    }

    update(): void {
        this.fpsView?.update();
    }

    // ─────────────────────────────────────────────────────────────────────────

    private initDeviceInfo(): void {
        GlobVar.suffix = '';
        GlobVar.imageRatio = GlobVar.getimageratio();

        const dpr = window.devicePixelRatio * 100;
        if      (dpr >= 200) GlobVar.suffix = '@4x';
        else if (dpr >= 100) GlobVar.suffix = '@2x';
    }

    private createBackground(): void {
        this.add.rectangle(this.CX, this.CY, this.W, this.H, THEME.BG_TOP);
        this.createLoadingBar();
    }

    // ── Loading bar ─────────────────────────────────────────────────────────

    private createLoadingBar(): void {
        this.barW = this.W * 0.65;
        this.barH = Math.floor(this.H * 0.018);
        this.barX = this.CX - this.barW / 2;
        this.barY = this.H * 0.82;

        const track = this.add.graphics();
        track.fillStyle(THEME.TRACK, 1);
        track.fillRoundedRect(this.barX, this.barY, this.barW, this.barH, this.barH / 2);

        this.barFill = this.add.graphics();

        // Real asset loading drives the first part of the bar; create() finishes it.
        this.load.on('progress', (v: number) => this.setProgress(v * 0.4));
        this.setProgress(0);
    }

    private finishLoading(): void {
        // Fonts are loaded now, so the percentage label can be shown.
        this.pctText = this.add.bitmapText(
            this.CX, this.barY + this.barH + Math.floor(this.H * 0.03),
            'coiny-bmp', '', 40, 0,
        ).setOrigin(0.5).setTint(THEME.INK);
        this.setProgress(this.progress);

        const prog = { v: this.progress };
        this.tweens.add({
            targets: prog,
            v: 1,
            delay: 200,
            duration: 1600,
            ease: 'Sine.easeIn',
            onUpdate: () => this.setProgress(prog.v),
            onComplete: () => {
                this.time.delayedCall(400, () => this.fadeToScene(SCENES.Menu));
            },
        });
    }

    private setProgress(value: number): void {
        this.progress = Phaser.Math.Clamp(value, 0, 1);

        this.barFill.clear();
        if (this.progress > 0) {
            this.barFill.fillStyle(THEME.GOLD, 1);
            this.barFill.fillRoundedRect(this.barX, this.barY, this.barW * this.progress, this.barH, this.barH / 2);
        }
        this.pctText?.setText(`${Math.floor(this.progress * 100)}%`);
    }

    private showLogo(): void {
        // Studio mark, sized by screen height but never wider than half the screen
        const size = Math.min(this.H * 0.15, this.W * 0.25);

        this.logoContiner = this.add.container();
            const logo = this.add.image(this.CX, this.H * 0.4, 'studio-logo')
                .setOrigin(0.5).setAlpha(0);
            logo.setScale(size / logo.height);
        this.logoContiner!.add(logo);

        this.tweens.add({ targets: logo, alpha: 1, delay: 150, duration: 500, ease: 'Cubic.InOut' });
    }
}
