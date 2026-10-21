import * as Phaser from 'phaser';
import BaseScene from './BaseScene';
import { SCENES } from '../utils/Scenes';
import { GlobVar } from '../../utils/Global';
import { THEME } from '../constants/Colors';
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

        this.createGradientBg(THEME.BG_TOP, THEME.BG_BOTTOM);
        this.createFloatingParticles();
        this.createTitle();
        this.createHowItWorks();
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

    private createFloatingParticles(): void {
        for (let i = 0; i < 14; i++) {
            this.time.delayedCall(i * 350, () => {
                if (!this.sceneClose) this.spawnFloatingParticle();
            });
        }
    }

    private spawnFloatingParticle(): void {
        const x     = Phaser.Math.Between(0, this.W);
        const size  = Phaser.Math.Between(4, 10);
        const color = THEME.CANDY[Phaser.Math.Between(0, THEME.CANDY.length - 1)];
        const dur   = Phaser.Math.Between(4500, 8000);

        const gfx = this.add.graphics().setDepth(0);
        gfx.fillStyle(color, 0.35);
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

    // Each letter its own colour, like toy blocks
    private createTitle(): void {
        const y      = this.H * 0.19;
        const fs     = Math.floor(this.H * 0.09);
        const word   = 'TapSum';
        const title  = this.add.container(this.CX, y);
        const letters = [...word].map((ch, i) =>
            this.add.bitmapText(0, 0, 'coiny-bmp', ch, fs, 0).setOrigin(0, 0.5).setTint(THEME.CANDY[i % THEME.CANDY.length]),
        );
        const total = letters.reduce((s, l) => s + l.width, 0);
        let x = -total / 2;
        letters.forEach((l, i) => {
            l.setX(x);
            x += l.width;
            // Little bounce wave across the letters
            this.tweens.add({
                targets: l, y: -fs * 0.08,
                duration: 600, delay: i * 90, yoyo: true, repeat: -1, repeatDelay: 1400, ease: 'Sine.easeInOut',
            });
        });
        title.add(letters);

        this.label(this.CX, this.H * 0.247, 'Remember. Count. Tap!', this.H * 0.02, THEME.MUTED);
    }

    // "+5, +3 → tap 8" in three beats
    private createHowItWorks(): void {
        const pad   = Math.floor(this.W * 0.062);
        const top   = this.H * 0.29;
        const cardW = this.W - pad * 2;
        const cardH = Math.floor(this.H * 0.2);
        this.drawCard(this.add.graphics(), pad, top, cardW, cardH, 28);

        this.label(this.CX, top + this.H * 0.03, 'HOW IT WORKS', this.H * 0.014, THEME.MUTED);

        const steps = [
            { chip: '+5', caption: 'Remember', fill: THEME.SURFACE, text: THEME.ADD },
            { chip: '+3', caption: 'Count',    fill: THEME.SURFACE, text: THEME.ADD },
            { chip: '8',  caption: 'Tap it',   fill: THEME.STAR,    text: THEME.INK },
        ];
        const chipW = Math.floor(this.W * 0.185);
        const chipH = Math.floor(this.H * 0.066);
        const chipY = top + this.H * 0.095;
        const colW  = cardW / 3;

        steps.forEach((s, i) => {
            const cx = pad + colW * (i + 0.5);
            const g  = this.add.graphics();
            g.fillStyle(s.fill, 1);
            g.fillRoundedRect(cx - chipW / 2, chipY - chipH / 2, chipW, chipH, 18);
            const chip = this.label(cx, chipY, s.chip, this.H * 0.033, s.text);
            this.label(cx, top + this.H * 0.162, s.caption, this.H * 0.016);

            // Beats light up one after another
            g.setAlpha(0.55);
            chip.setAlpha(0.55);
            this.tweens.add({
                targets: [g, chip], alpha: 1,
                duration: 250, delay: 400 + i * 450, hold: 900, yoyo: true,
                repeat: -1, repeatDelay: 1350,
            });
        });
    }

    private createBestScore(): void {
        const best = SaveManager.getBestScore();
        this.label(this.CX, this.H * 0.54, 'BEST SCORE', this.H * 0.016, THEME.MUTED);
        this.label(this.CX, this.H * 0.595, `${best}`, this.H * 0.066, THEME.GOLD);
    }

    private createButtons(): void {
        const pad   = Math.floor(this.W * 0.062);
        const fullW = this.W - pad * 2;
        const gap   = Math.floor(this.W * 0.03);
        const smH   = Math.floor(this.H * 0.066);
        const bigH  = Math.floor(this.H * 0.085);
        const smY   = this.H - this.H * 0.04 - smH / 2;
        const bigY  = smY - smH / 2 - this.H * 0.016 - bigH / 2;
        const halfW = (fullW - gap) / 2;

        const playBtn = this.createButton(
            this.CX, bigY, fullW, bigH, 'PLAY', this.H * 0.04,
            THEME.GO, THEME.GO_DARK,
            () => {
                AudioManager.play('snd_click');
                this.fadeToScene(SCENES.Game);
            },
        );

        this.tweens.add({
            targets: playBtn, scaleX: 1.03, scaleY: 1.03,
            duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });

        this.createButton(
            pad + halfW / 2, smY, halfW, smH, 'LEADERBOARD', this.H * 0.02,
            THEME.CARD, THEME.CARD_SHADOW,
            () => {
                AudioManager.play('snd_click');
                new LeaderboardPanel(this);
            },
            THEME.INK,
        );

        this.createButton(
            this.W - pad - halfW / 2, smY, halfW, smH, 'HOW TO PLAY', this.H * 0.02,
            THEME.CARD, THEME.CARD_SHADOW,
            () => {
                AudioManager.play('snd_click');
                this.toggleHelpPopup();
            },
            THEME.INK,
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
        overlay.fillStyle(THEME.SCRIM, 0.45);
        overlay.fillRect(0, 0, this.W, this.H);
        overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.W, this.H), Phaser.Geom.Rectangle.Contains);
        overlay.on('pointerdown', () => this.closeHelpPopup());
        root.add(overlay);

        root.add(this.drawCard(this.add.graphics(), px - panelW / 2, py - panelH / 2, panelW, panelH, 32));

        const titleY = py - panelH / 2 + 90;
        root.add(this.label(px, titleY, 'HOW TO PLAY', this.H * 0.032));

        const lines = [
            'Each round shows a new + or - number.',
            'Keep a running total of every number shown.',
            'Tap +1, +10, +100 or +1000 to build up to that total.',
            'Match it exactly to score and reach the next round.',
            'Go over the total, or run out of time, and it\'s game over.',
        ];

        const maxTextWidth = panelW - 64;
        const lineSpacing  = Math.floor(this.H * 0.04);
        let cursorY = titleY + 110;

        lines.forEach((line, i) => {
            const text = this.add.bitmapText(px, cursorY, 'coiny-bmp', line, Math.floor(this.H * 0.024), 0)
                .setOrigin(0.5, 0)
                .setMaxWidth(maxTextWidth).setLineSpacing(Math.floor(this.H * 0.03))
                .setTint(i === 1 ? THEME.ADD : THEME.INK);
            root.add(text);
            cursorY += text.height + lineSpacing;
        });

        const closeX = px + panelW / 2 - 40;
        const closeY = py - panelH / 2 + 40;
        const closeBg = this.add.graphics();
        closeBg.fillStyle(THEME.SURFACE, 1);
        closeBg.fillCircle(closeX, closeY, 26);
        closeBg.lineStyle(5, THEME.INK, 1);
        closeBg.lineBetween(closeX - 9, closeY - 9, closeX + 9, closeY + 9);
        closeBg.lineBetween(closeX + 9, closeY - 9, closeX - 9, closeY + 9);
        root.add(closeBg);

        const closeHit = this.add.zone(closeX, closeY, 60, 60).setOrigin(0.5).setInteractive({ useHandCursor: true });
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

    // Round white button with a speaker icon; a cross shows when muted
    private createSoundToggle(): void {
        const x = this.W * 0.89;
        const y = this.H * 0.065;
        const size = Math.floor(this.H * 0.056);

        this.soundBtn = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(THEME.CARD_SHADOW, 1);
        bg.fillCircle(0, 3, size / 2);
        bg.fillStyle(THEME.CARD, 1);
        bg.fillCircle(0, 0, size / 2);
        const icon = this.add.graphics();
        this.soundBtn.add([bg, icon]);

        const s = size * 0.2;
        const refresh = () => {
            const on = AudioManager.isSoundEnabled();
            icon.clear();
            icon.fillStyle(THEME.INK, 1);
            icon.fillRect(-s * 1.4, -s * 0.5, s * 0.7, s);
            icon.fillPoints([
                new Phaser.Math.Vector2(-s * 0.75, -s * 0.5),
                new Phaser.Math.Vector2(-s * 0.05, -s * 1.1),
                new Phaser.Math.Vector2(-s * 0.05, s * 1.1),
                new Phaser.Math.Vector2(-s * 0.75, s * 0.5),
            ], true);
            icon.lineStyle(Math.max(3, s * 0.3), on ? THEME.INK : THEME.SUB, 1);
            if (on) {
                icon.beginPath();
                icon.arc(0, 0, s * 0.9, -0.9, 0.9, false);
                icon.strokePath();
                icon.beginPath();
                icon.arc(0, 0, s * 1.5, -0.9, 0.9, false);
                icon.strokePath();
            } else {
                icon.lineBetween(s * 0.4, -s * 0.6, s * 1.4, s * 0.6);
                icon.lineBetween(s * 1.4, -s * 0.6, s * 0.4, s * 0.6);
            }
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
        const x = this.W * 0.11;
        const y = this.H * 0.065;
        const size = Math.floor(this.H * 0.056);

        const btn = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(THEME.CARD_SHADOW, 1);
        bg.fillCircle(0, 3, size / 2);
        bg.fillStyle(THEME.CARD, 1);
        bg.fillCircle(0, 0, size / 2);
        btn.add(bg);

        // Coffee mug icon drawn with primitives — body, handle, steam.
        const mug = this.add.graphics();
        const cupW = size * 0.42;
        const cupH = size * 0.34;
        const cupX = -cupW / 2 - size * 0.04;
        const cupY = size * 0.02;

        mug.fillStyle(0x6f4e37, 1);
        mug.fillRoundedRect(cupX, cupY, cupW, cupH, cupW * 0.18);

        mug.lineStyle(Math.max(2, size * 0.06), 0x6f4e37, 1);
        mug.strokeCircle(cupX + cupW + size * 0.05, cupY + cupH / 2, cupH * 0.32);

        mug.fillStyle(0xc89b6d, 1);
        mug.fillRoundedRect(cupX + 2, cupY + 2, cupW - 4, cupH * 0.3, cupW * 0.14);

        mug.lineStyle(Math.max(1.5, size * 0.035), 0x6f4e37, 0.8);
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
