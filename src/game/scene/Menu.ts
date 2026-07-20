import * as Phaser from 'phaser';
import BaseScene from './BaseScene';
import { SCENES } from '../utils/Scenes';
import { GlobVar } from '../../utils/Global';
import { COLORS } from '../constants/Colors';
import { SaveManager } from '../managers/SaveManager';
import { AudioManager } from '../managers/AudioManager';
import { PurchasesManager } from '../../services/Purchases';
import { LeaderboardPanel } from '../ui/LeaderboardPanel';
import FPS from '../model/FPS';

export default class Menu extends BaseScene {
    private soundBtn?: Phaser.GameObjects.Container;
    private helpPopup?: Phaser.GameObjects.Container;

    constructor() {
        super({ key: SCENES.Menu });
    }

    init(): void {
        this.initScene();
    }

    create(){
        GlobVar.consolelog(`Scene: ${SCENES.Menu}`);
        AudioManager.init();
        AudioManager.playMusic();

        this.createBackground();
        this.createFloatingParticles();
        this.createTitle();
        this.createBestScore();
        this.createButtons();
        this.createSoundToggle();

        this.checkPurchaseButton();

        this.fpsView = new FPS(this);

        this.cameras.main.fadeIn(400);
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
        this.add.bitmapText(this.CX + 3, this.H * 0.22 + 3, 'coiny-bmp', 'TapSum', Math.floor(this.H * 0.1), 0).setOrigin(0.5).setAlpha(0.45)
        .setTint(Phaser.Display.Color.ValueToColor("#0044ff").color);

        const title = this.add.bitmapText(this.CX, this.H * 0.22, 'coiny-bmp', 'TapSum', Math.floor(this.H * 0.1), 0).setOrigin(0.5);

        // Gentle float
        this.tweens.add({
            targets: title,
            y: this.H * 0.22 - 12,
            duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });

        this.add.bitmapText(this.CX, this.H * 0.32, 'coiny-bmp', 'Remember. Count. Tap!', Math.floor(this.H * 0.028), 0).setOrigin(0.5)
        .setTint(Phaser.Display.Color.ValueToColor(COLORS.TEXT_NEON).color);
    }

    private createBestScore(): void {
        const best = SaveManager.getBestScore();
        this.add.bitmapText(this.CX, this.H * 0.42, 'coiny-bmp', 'BEST SCORE', Math.floor(this.H * 0.024), 0).setOrigin(0.5)
        .setTint(Phaser.Display.Color.ValueToColor(COLORS.ACCENT).color);

        this.add.bitmapText(this.CX, this.H * 0.48, 'coiny-bmp', `${best}`, Math.floor(this.H * 0.062), 0).setOrigin(0.5)
        .setTint(Phaser.Display.Color.ValueToColor(COLORS.TEXT_GOLD).color);
    }

    private createButtons(): void {
        const bw = Math.floor(this.W * 0.62);
        const bh = Math.floor(this.H * 0.09);
        const fs = Math.floor(this.H * 0.042);

        // PLAY button
        const playBtn = this.createButton(
            this.CX, this.H * 0.60,
            bw, bh,
            'PLAY',
            fs,
            COLORS.BUTTON_PRIMARY, COLORS.BUTTON_PRIMARY_DARK,
            () => {
                AudioManager.play('snd_click');
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
            this.CX, this.H * 0.72,
            Math.floor(bw * 0.75), Math.floor(bh * 0.78),
            'LEADERBOARD',
            Math.floor(fs * 0.5),
            COLORS.BUTTON_SECONDARY, COLORS.BUTTON_SECONDARY_DARK,
            () => {
                AudioManager.play('snd_click');
                new LeaderboardPanel(this);
            },
        );

        // Help button
        this.createButton(
            this.CX, this.H * 0.82,
            Math.floor(bw * 0.44), Math.floor(bh * 0.70),
            'HELP',
            Math.floor(fs * 0.56),
            COLORS.BUTTON_PURPLE, COLORS.BUTTON_PURPLE_DARK,
            () => {
                AudioManager.play('snd_click');
                this.toggleHelpPopup();
            },
        );
    }

    private toggleHelpPopup(): void {
        if (this.helpPopup) {
            this.closeHelpPopup();
            return;
        }

        this.openHelpPopup();
    }

    private openHelpPopup(): void {
        const panelW = Math.floor(this.W * 0.86);
        const panelH = Math.floor(this.H * 0.66);
        const px = this.W / 2;
        const py = this.H / 2;

        const root = this.add.container(0, 0).setDepth(60);
        this.helpPopup = root;

        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.72);
        overlay.fillRect(0, 0, this.W, this.H);
        overlay.setInteractive();
        overlay.on('pointerdown', () => this.closeHelpPopup());
        root.add(overlay);

        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.45);
        shadow.fillRoundedRect(px - panelW / 2 + 8, py - panelH / 2 + 12, panelW, panelH, 24);
        root.add(shadow);

        const panel = this.add.graphics();
        panel.fillStyle(0x12103a, 1);
        panel.fillRoundedRect(px - panelW / 2, py - panelH / 2, panelW, panelH, 24);
        panel.lineStyle(2, COLORS.NEON_BLUE, 0.5);
        panel.strokeRoundedRect(px - panelW / 2, py - panelH / 2, panelW, panelH, 24);
        root.add(panel);

        const titleY = py - panelH / 2 + 90;
        root.add(
            this.add.bitmapText(px, titleY, 'coiny-bmp', 'HOW TO PLAY', Math.floor(this.H * 0.032), 0)
                .setOrigin(0.5)
                .setTint(Phaser.Display.Color.ValueToColor(COLORS.TEXT_NEON).color),
        );

        const lines = [
            'Each round flashes a new + or - number.',
            'Keep a running total of every number shown.',
            'Tap +1, +10, +100 or +1000 to build up to that total.',
            'Match it exactly to score and reach the next round.',
            'Overshoot the total, or run out of time, and it\'s game over.',
        ];

        const maxTextWidth = panelW - 64;
        const lineSpacing  = Math.floor(this.H * 0.04);
        let cursorY = titleY + 110;

        lines.forEach((line) => {
            const text = this.add.bitmapText(px, cursorY, 'coiny-bmp', line, Math.floor(this.H * 0.024), 0)
                .setOrigin(0.5, 0)
                .setMaxWidth(maxTextWidth).setLineSpacing(Math.floor(this.H * 0.03))
                .setTint(Phaser.Display.Color.ValueToColor(COLORS.TEXT_WHITE).color);
            root.add(text);
            cursorY += text.height + lineSpacing;
        });

        const closeX = px + panelW / 2 - 30;
        const closeY = py - panelH / 2 + 30;
        const closeBg = this.add.graphics();
        closeBg.fillStyle(0xff1744, 0.9);
        closeBg.fillCircle(closeX, closeY, 22);
        root.add(closeBg);

        const closeTxt = this.add.bitmapText(closeX, closeY - 2, 'krungthep-bmp', 'x', Math.floor(this.H * 0.02), 0).setOrigin(0.5);
        root.add(closeTxt);

        const closeHit = this.add.zone(closeX, closeY, 50, 50).setOrigin(0.5).setInteractive({ useHandCursor: true });
        closeHit.on('pointerdown', () => this.closeHelpPopup());
        root.add(closeHit);

        root.setScale(0.9).setAlpha(0);
        this.tweens.add({
            targets: root,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 260,
            ease: 'Back.Out',
        });
    }

    private closeHelpPopup(): void {

        if (!this.helpPopup) return;

        this.tweens.add({
            targets: this.helpPopup,
            scaleX: 0.9,
            scaleY: 0.9,
            alpha: 0,
            duration: 200,
            ease: 'Back.In',
            onComplete: () => {
                this.helpPopup?.destroy();
                this.helpPopup = undefined;
            },
        });
    }

    private createSoundToggle(): void {
        const x = this.W * 0.90;
        const y = this.H * 0.05;
        const size = Math.floor(this.H * 0.06);

        this.soundBtn = this.add.container(x, y);

        const bg = this.add.graphics();
        this.soundBtn.add(bg);

        const label = this.add.bitmapText(0, 0, 'krungthep-bmp', '', 25, 0).setOrigin(0.5);
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

    // ── Donate button (coffee mug icon) ─────────────────────────────────────

    private async checkPurchaseButton(): Promise<void> {
        if (!(await PurchasesManager.hasSupported())) {
            this.createDonateButton();
        }
    }

    private createDonateButton(): void {
        const x = this.W * 0.10;
        const y = this.H * 0.05;
        const size = Math.floor(this.H * 0.06);

        const btn = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0xffb74d, 0.85);
        bg.fillRoundedRect(-size / 2, -size / 2, size, size, size * 0.3);
        btn.add(bg);

        // Coffee mug icon drawn with primitives — body, handle, steam.
        const mug = this.add.graphics();
        const cupW = size * 0.42;
        const cupH = size * 0.34;
        const cupX = -cupW / 2 - size * 0.04;
        const cupY = size * 0.02;

        mug.fillStyle(0x3e2723, 1);
        mug.fillRoundedRect(cupX, cupY, cupW, cupH, cupW * 0.18);

        mug.lineStyle(Math.max(2, size * 0.06), 0x3e2723, 1);
        mug.strokeCircle(cupX + cupW + size * 0.05, cupY + cupH / 2, cupH * 0.32);

        mug.fillStyle(0x6f4e37, 1);
        mug.fillRoundedRect(cupX + 2, cupY + 2, cupW - 4, cupH * 0.3, cupW * 0.14);

        mug.lineStyle(Math.max(1.5, size * 0.035), 0x3e2723, 0.8);
        mug.beginPath();
        mug.moveTo(cupX + cupW * 0.25, cupY - size * 0.10);
        mug.lineTo(cupX + cupW * 0.15, cupY - size * 0.20);
        mug.moveTo(cupX + cupW * 0.65, cupY - size * 0.10);
        mug.lineTo(cupX + cupW * 0.75, cupY - size * 0.20);
        mug.strokePath();

        btn.add(mug);

        btn.setSize(size, size).setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => {
            AudioManager.play('snd_click');
            this.tweens.add({
                targets: btn,
                scaleX: 0.85, scaleY: 0.85,
                duration: 80, yoyo: true, ease: 'Power2',
            });
            PurchasesManager.showDonate();
        });
    }
}
