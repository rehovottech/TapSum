import * as Phaser from 'phaser';
import BaseScene from './BaseScene';
import { SCENES } from '../utils/Scenes';
import { GlobVar } from '../../utils/Global';
import { COLORS } from '../constants/Colors';
import { SaveManager } from '../managers/SaveManager';
import { AudioManager } from '../managers/AudioManager';
import { AdManager } from '../managers/AdManager';
import { LeaderboardPanel } from '../ui/LeaderboardPanel';
import FPS from '../model/FPS';

export default class Menu extends BaseScene {
    private soundBtn?: Phaser.GameObjects.Container;

    constructor() {
        super({ key: SCENES.Menu });
    }

    init(): void {
        this.initScene();
    }

    create(): void {
        GlobVar.consolelog(`Scene: ${SCENES.Menu}`);
        AudioManager.init(this);
        AudioManager.playMusic();

        this.createBackground();
        this.createFloatingParticles();
        this.createTitle();
        this.createBestScore();
        this.createButtons();
        this.createSoundToggle();

        this.fpsView = new FPS(this);

        this.cameras.main.fadeIn(400);
        AdManager.showBanner();
    }

    update(): void {
        this.fpsView?.update();
    }

    // ─────────────────────────────────────────────────────────────────────────

    private createBackground(): void {
        this.createGradientBg(COLORS.BG_TOP, COLORS.BG_BOTTOM);

        // Decorative neon circles
        const gfx = this.add.graphics();
        gfx.lineStyle(2, COLORS.NEON_BLUE, 0.12);
        gfx.strokeCircle(this.CX, this.H * 0.42, this.W * 0.55);
        gfx.lineStyle(2, COLORS.NEON_PURPLE, 0.08);
        gfx.strokeCircle(this.CX, this.H * 0.42, this.W * 0.72);

        // Pulse decorative ring
        this.tweens.add({
            targets: gfx, alpha: 0.3,
            duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
    }

    private createFloatingParticles(): void {
        for (let i = 0; i < 18; i++) {
            this.time.delayedCall(i * 300, () => {
                if (!this.sceneClose) this.spawnFloatingParticle();
            });
        }
    }

    private spawnFloatingParticle(): void {
        const x    = Phaser.Math.Between(0, this.W);
        const size  = Phaser.Math.Between(3, 9);
        const palette = [COLORS.NEON_BLUE, COLORS.NEON_PURPLE, COLORS.ACCENT, 0xffffff];
        const color = palette[Phaser.Math.Between(0, palette.length - 1)];
        const dur   = Phaser.Math.Between(3500, 7000);

        const gfx = this.add.graphics().setDepth(1);
        gfx.fillStyle(color, 0.65);
        gfx.fillCircle(0, 0, size);
        gfx.setPosition(x, this.H + 20);

        this.tweens.add({
            targets: gfx,
            y: -20,
            x: x + Phaser.Math.Between(-120, 120),
            alpha: 0,
            duration: dur,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                gfx.destroy();
                if (!this.sceneClose) this.spawnFloatingParticle();
            },
        });
    }

    private createTitle(): void {
        // Glow shadow layer
        this.add.text(this.CX + 3, this.H * 0.18 + 3, 'TapSum', {
            fontFamily: 'Coiny',
            fontSize: `${Math.floor(this.H * 0.115)}px`,
            color: '#0044ff',
            fontStyle: 'bold',
            alpha: 0.5,
        } as any).setOrigin(0.5).setAlpha(0.45);

        const title = this.add.text(this.CX, this.H * 0.18, 'TapSum', {
            fontFamily: 'Coiny',
            fontSize: `${Math.floor(this.H * 0.115)}px`,
            color: COLORS.TEXT_WHITE,
            fontStyle: 'bold',
        }).setOrigin(0.5);

        // Gentle float
        this.tweens.add({
            targets: title,
            y: this.H * 0.18 - 12,
            duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });

        this.add.text(this.CX, this.H * 0.29, 'Remember · Count · Tap', {
            fontFamily: 'Coiny',
            fontSize: `${Math.floor(this.H * 0.028)}px`,
            color: COLORS.TEXT_NEON,
        }).setOrigin(0.5);
    }

    private createBestScore(): void {
        const best = SaveManager.getBestScore();

        this.add.text(this.CX, this.H * 0.36, 'BEST SCORE', {
            fontFamily: 'Coiny',
            fontSize: `${Math.floor(this.H * 0.024)}px`,
            color: COLORS.TEXT_ACCENT,
            fontStyle: 'bold',
        }).setOrigin(0.5);

        this.add.text(this.CX, this.H * 0.40, `${best}`, {
            fontFamily: 'Coiny',
            fontSize: `${Math.floor(this.H * 0.062)}px`,
            color: COLORS.TEXT_GOLD,
            fontStyle: 'bold',
        }).setOrigin(0.5);
    }

    private createButtons(): void {
        const bw = Math.floor(this.W * 0.62);
        const bh = Math.floor(this.H * 0.09);
        const fs = Math.floor(this.H * 0.042);

        // PLAY button
        const playBtn = this.createButton(
            this.CX, this.H * 0.54,
            bw, bh,
            'PLAY',
            fs,
            COLORS.BUTTON_PRIMARY, COLORS.BUTTON_PRIMARY_DARK,
            () => {
                AudioManager.play('snd_click');
                AdManager.hideBanner();
                this.fadeToScene(SCENES.Game);
            },
        );

        // Pulse animation on play button
        this.tweens.add({
            targets: playBtn, scaleX: 1.04, scaleY: 1.04,
            duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });

        // Leaderboard button
        this.createButton(
            this.CX, this.H * 0.66,
            Math.floor(bw * 0.75), Math.floor(bh * 0.78),
            'LEADERBOARD',
            Math.floor(fs * 0.72),
            COLORS.BUTTON_SECONDARY, COLORS.BUTTON_SECONDARY_DARK,
            () => {
                AudioManager.play('snd_click');
                new LeaderboardPanel(this);
            },
        );
    }

    private createSoundToggle(): void {
        const x = this.W * 0.85;
        const y = this.H * 0.075;
        const size = Math.floor(this.H * 0.06);

        this.soundBtn = this.add.container(x, y);

        const bg = this.add.graphics();
        this.soundBtn.add(bg);

        const label = this.add.text(0, 0, '', {
            fontFamily: 'Akt-SemiBold',
            fontSize: `${Math.floor(size * 0.55)}px`,
            color: COLORS.TEXT_WHITE,
        }).setOrigin(0.5);
        this.soundBtn.add(label);

        const refresh = () => {
            const on = AudioManager.isSoundEnabled();
            bg.clear();
            bg.fillStyle(on ? COLORS.BUTTON_SUCCESS : 0x555566, 0.8);
            bg.fillRoundedRect(-size / 2, -size / 2, size, size, size * 0.3);
            label.setText(on ? 'SFX\nON' : 'SFX\nOFF');
        };
        refresh();

        this.soundBtn.setSize(size, size).setInteractive({ useHandCursor: true });
        this.soundBtn.on('pointerdown', () => {
            AudioManager.toggleSound();
            AudioManager.play('snd_click');
            refresh();
            this.tweens.add({
                targets: this.soundBtn,
                scaleX: 0.85, scaleY: 0.85,
                duration: 80, yoyo: true, ease: 'Power2',
            });
        });
    }
}
