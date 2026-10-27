import * as Phaser from 'phaser';
import BaseScene from './BaseScene';
import { SCENES } from '../utils/Scenes';
import { GlobVar } from '../../utils/Global';
import { THEME } from '../constants/Colors';
import { SaveManager } from '../managers/SaveManager';
import { AudioManager } from '../managers/AudioManager';
import { PurchasesManager } from '../../services/Purchases';
import { UpdateManager } from '../../services/Update';
import { PRIVACY_URL, TERMS_URL } from '../../config/Links';
import { Firebase } from '../../services/Firebase';
import { Mascot } from '../ui/Mascot';
import { ProfilePicker } from '../ui/ProfilePicker';
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

        // Title, example, mascot + best, then Play: read top to bottom.
        this.createSkyBg();
        this.createTitle();
        this.createHowItWorks();
        this.createMascotAndBest();
        this.createButtons();
        this.createSoundToggle();
        this.createProfileChip();

        // First launch: ask who's playing before anything else
        if (SaveManager.getProfileId() === null) {
            this.time.delayedCall(450, () => this.openProfilePicker());
        }

        this.checkPurchaseButton();
        this.supportPrompt();
        this.updatePrompt();

        this.fpsView = new FPS(this);

        this.cameras.main.fadeIn(400);
    }

    update(): void {
        this.fpsView?.update();
    }

    // ─────────────────────────────────────────────────────────────────────────

    // Preserve the playful wordmark colours while reserving motion for controls.
    private createTitle(): void {
        const y      = this.H * 0.145;
        const fs     = Math.floor(Math.min(this.H * 0.075, this.W * 0.16));
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
        });
        title.add(letters);

        this.label(this.CX, this.H * 0.205, 'Remember. Count. Tap!', this.H * 0.024, THEME.INK);
    }

    // "+5, +3 → tap 8" in three beats
    private createHowItWorks(): void {
        const pad = Math.floor(this.W * 0.075);
        const top = this.H * 0.25;
        const cardW = this.W - pad * 2;
        const cardH = Math.floor(this.H * 0.3);
        this.drawCard(this.add.graphics(), pad, top, cardW, cardH, 24);

        const left = pad + Math.floor(this.W * 0.055);
        const right = pad + cardW - Math.floor(this.W * 0.06);
        this.add.bitmapText(left, top + this.H * 0.03, 'coiny-bmp', 'SAMPLE ROUND', Math.floor(this.H * 0.016), 0)
            .setOrigin(0, 0.5).setTint(0x315bc3);

        const rows = [
            { y: top + this.H * 0.08,  caption: 'Remember this number', value: '+5', color: THEME.ADD },
            { y: top + this.H * 0.16,  caption: 'Add the next one', value: '+3', color: THEME.ADD },
            { y: top + this.H * 0.245, caption: 'Tap the total exactly', value: '8', color: THEME.INK },
        ];

        const guide = this.add.graphics();
        guide.lineStyle(2, 0x9caab0, 1);
        guide.lineBetween(left + 6, rows[0].y, left + 6, rows[2].y);
        rows.forEach((row, i) => {
            const dot = this.add.graphics();
            dot.fillStyle(row.color, 1);
            dot.fillCircle(left + 6, row.y, 7);
            dot.lineStyle(2, THEME.CARD, 1);
            dot.strokeCircle(left + 6, row.y, 7);
            this.add.bitmapText(left + 25, row.y - this.H * 0.022, 'coiny-bmp', row.caption, Math.floor(this.H * 0.016), 0)
                .setOrigin(0, 0.5).setTint(0x455c70);
            this.add.bitmapText(left + 25, row.y + this.H * 0.016, 'coiny-bmp', row.value,
                Math.floor(this.H * (i === 2 ? 0.05 : 0.036)), 0)
                .setOrigin(0, 0.5).setTint(row.color);
            if (i < 2) {
                const sign = i === 0 ? '+' : '=';
                const midY = (row.y + rows[i + 1].y) / 2;
                this.add.bitmapText(right - 4, midY, 'coiny-bmp', sign, Math.floor(this.H * 0.028), 0)
                    .setOrigin(1, 0.5).setTint(0x657887);
            }
        });
    }

    // Summy stands next to the personal best and reacts when tapped
    private createMascotAndBest(): void {
        const y = this.H * 0.655;
        const mascot = new Mascot(this, this.W * 0.25, y, Math.floor(this.H * 0.042));
        mascot.setSize(this.H * 0.1, this.H * 0.11).setInteractive({ useHandCursor: true });
        mascot.on('pointerdown', () => {
            AudioManager.play('snd_tap', 1.3);
            mascot.setMood('happy', 900);
            mascot.hop();
        });

        const best = SaveManager.getBestScore();
        const x = this.W * 0.45;
        this.add.bitmapText(x, y - this.H * 0.026, 'coiny-bmp', 'Personal best', Math.floor(this.H * 0.02), 0)
            .setOrigin(0, 0.5).setTint(THEME.MUTED);
        this.add.bitmapText(x, y + this.H * 0.022, 'coiny-bmp', `${best}`, Math.floor(this.H * 0.05), 0)
            .setOrigin(0, 0.5).setTint(THEME.GOLD);
    }

    // ── Who's playing ────────────────────────────────────────────────────────

    private createProfileChip(): void {
        const p    = SaveManager.getProfile();
        const y    = this.H * 0.065;
        const h    = Math.floor(this.H * 0.042);
        const text = this.add.bitmapText(0, 0, 'coiny-bmp', p.name.toUpperCase(), Math.floor(this.H * 0.017), 0)
            .setOrigin(0.5).setTint(THEME.WHITE);
        const w    = text.width + this.W * 0.09;

        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.12);
        bg.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, h / 2);
        bg.fillStyle(p.color, 1);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);

        const chip = this.add.container(this.CX, y, [bg, text]);
        chip.setSize(w, h).setInteractive({ useHandCursor: true });
        chip.setVisible(SaveManager.getProfileId() !== null);
        chip.on('pointerdown', () => {
            AudioManager.play('snd_click');
            this.openProfilePicker();
        });
    }

    private openProfilePicker(): void {
        new ProfilePicker(this, (id) => {
            Firebase.logEvent('profile_selected', { profile: id }).catch(() => {});
            this.time.delayedCall(180, () => this.scene.restart());
        });
    }

    private createButtons(): void {
        const pad   = Math.floor(this.W * 0.075);
        const fullW = this.W - pad * 2;
        const gap   = Math.floor(this.W * 0.025);
        const smH   = Math.floor(this.H * 0.062);
        const bigH  = Math.floor(this.H * 0.095);
        const smY   = this.H - this.H * 0.052 - smH / 2;
        const bigY  = smY - smH / 2 - this.H * 0.035 - bigH / 2;
        const halfW = (fullW - gap) / 2;

        this.createButton(
            this.CX, bigY, fullW, bigH, 'PLAY', this.H * 0.045,
            THEME.GO, THEME.GO_DARK,
            () => {
                AudioManager.play('snd_click');
                this.fadeToScene(SCENES.Game);
            },
        );

        this.createButton(
            pad + halfW / 2, smY, halfW, smH, 'LEADERBOARD', this.H * 0.016,
            THEME.CARD, THEME.CARD_SHADOW,
            () => {
                AudioManager.play('snd_click');
                this.openLeaderboard();
            },
            THEME.INK,
        );

        this.createButton(
            this.W - pad - halfW / 2, smY, halfW, smH, 'HOW TO PLAY', this.H * 0.016,
            THEME.CARD, THEME.CARD_SHADOW,
            () => {
                AudioManager.play('snd_click');
                this.toggleHelpPopup();
            },
            THEME.INK,
        );
    }

    // ── Automatic popups (docs/GAME_ESSENTIALS.md § 4 and § 5) ──────────────

    /** Profile picker, help, leaderboard, a yes/no popup or a plugin popup is showing. */
    private isPopupOpen(): boolean {
        return PurchasesManager.popupOpen || this.children.list.some((o) => (o as Phaser.GameObjects.Container).depth >= 50);
    }

    /** Support popup: ~1 s after Menu appears, if it's due (3-day streak) and nothing else is open. */
    private supportPrompt(): void {
        this.time.delayedCall(1000, () => {
            if (!this.sys.isActive() || this.isPopupOpen()) return;
            PurchasesManager.remindIfDue();
        });
    }

    /** Update alert: checked once per launch, 3 s after Menu appears; waits while another popup is open. */
    private updatePrompt(): void {
        this.time.delayedCall(3000, async () => {
            await UpdateManager.check();
            const show = () => {
                if (UpdateManager.pending === null || !this.sys.isActive()) return;
                if (this.isPopupOpen()) { this.time.delayedCall(1500, show); return; }
                this.confirmPopup(
                    'New version available!',
                    'A new version of Tap Sum is ready with fixes and improvements.',
                    'UPDATE', 'LATER',
                    (yes) => { if (yes) UpdateManager.update(); else UpdateManager.later(); },
                );
            };
            show();
        });
    }

    /** Privacy policy / terms (§ 8). Leaving the app needs a grown-up first in this Kids game. */
    private async openLink(url: string): Promise<void> {
        if (await PurchasesManager.askGrownUp()) window.open(url, '_blank');
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
        const panelH = Math.floor(this.H * 0.72);
        const px = this.W / 2;
        const py = this.H / 2;

        const root = this.add.container(0, 0).setDepth(60);
        this.helpPopup = root;

        const overlay = this.add.graphics();
        overlay.fillStyle(THEME.SCRIM, 0.45);
        overlay.fillRect(0, 0, this.W, this.H);
        overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.W, this.H), Phaser.Geom.Rectangle.Contains);
        overlay.on('pointerdown', () => { AudioManager.play('snd_click'); this.closeHelpPopup(); });
        root.add(overlay);

        root.add(this.drawCard(this.add.graphics(), px - panelW / 2, py - panelH / 2, panelW, panelH, 32));

        const titleY = py - panelH / 2 + 90;
        root.add(this.label(px, titleY, 'HOW TO PLAY', this.H * 0.032));

        const lines = [
            'Each round shows a new + or - number.',
            'Keep a running total of every number shown.',
            'Tap the buttons to build that total, then tap DONE.',
            'Went too far? Use -1. Bigger buttons unlock as the total grows.',
            'A wrong total or running out of time costs a heart. You have 3.',
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

        // Privacy policy and terms of service, along the bottom of the panel
        const linkY = py + panelH / 2 - Math.floor(this.H * 0.04);
        [['Privacy policy', PRIVACY_URL, -1], ['Terms of service', TERMS_URL, 1]].forEach(([text, url, side]) => {
            const link = this.label(px + (side as number) * panelW * 0.22, linkY, text as string, this.H * 0.019, 0x1e90e8);
            link.setInteractive({ useHandCursor: true });
            link.on('pointerdown', () => { AudioManager.play('snd_click'); this.openLink(url as string); });
            root.add(link);
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
        closeHit.on('pointerdown', () => { AudioManager.play('snd_click'); this.closeHelpPopup(); });
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
