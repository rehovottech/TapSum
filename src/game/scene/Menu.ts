import * as Phaser from 'phaser';
import BaseScene from './BaseScene';
import { SCENES } from '../utils/Scenes';
import { GlobVar } from '../../utils/Global';
import { THEME } from '../constants/Colors';
import { SaveManager } from '../managers/SaveManager';
import { AudioManager } from '../managers/AudioManager';
import { PurchasesManager } from '../../services/Purchases';
import { UpdateManager } from '../../services/Update';
import { Firebase } from '../../services/Firebase';
import { Mascot } from '../ui/Mascot';
import { SettingsPanel } from '../ui/SettingsPanel';
import { WardrobePanel } from '../ui/WardrobePanel';
import { ProfilePicker } from '../ui/ProfilePicker';
import FPS from '../model/FPS';

export default class Menu extends BaseScene {
    private settings?: SettingsPanel;
    private wardrobe?: WardrobePanel;
    private mascot?: Mascot;
    private helpPopup?: Phaser.GameObjects.Container;
    private donateBtn?: Phaser.GameObjects.Container;

    constructor() {
        super({ key: SCENES.Menu });
    }

    init(): void {
        this.initScene();
        this.donateBtn = undefined;
        this.settings = undefined;
        this.wardrobe = undefined;
    }

    create(){
        GlobVar.consolelog(`Scene: ${SCENES.Menu}`);
        AudioManager.init();
        AudioManager.playMusic();

        // Title, example, mascot + best, then Play: read top to bottom.
        this.createSkyBg();
        this.createTitle();
        this.createHowItWorks();
        this.createStreakStrip();
        this.createMascotAndBest();
        this.createButtons();
        this.createSettingsButton();
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

    // "+5, +3 → tap 8" in three beats, left to right
    private createHowItWorks(): void {
        const pad = Math.floor(this.W * 0.075);
        const top = this.H * 0.25;
        const cardW = this.W - pad * 2;
        const cardH = Math.floor(this.H * 0.17);
        this.drawCard(this.add.graphics(), pad, top, cardW, cardH, 24);

        const inner = Math.floor(this.W * 0.05);
        this.add.bitmapText(pad + inner, top + this.H * 0.03, 'coiny-bmp', 'SAMPLE ROUND', Math.floor(this.H * 0.016), 0)
            .setOrigin(0, 0.5).setTint(0x315bc3);

        const cells = [
            { caption: 'Remember', value: '+5', color: THEME.ADD },
            { caption: 'Add next', value: '+3', color: THEME.ADD },
            { caption: 'Tap total', value: '8', color: THEME.INK },
        ];
        const cellW = (cardW - inner * 2) / 3;
        cells.forEach((c, i) => {
            const cx = pad + inner + cellW * (i + 0.5);
            this.add.bitmapText(cx, top + this.H * 0.085, 'coiny-bmp', c.value, Math.floor(this.H * (i === 2 ? 0.06 : 0.052)), 0)
                .setOrigin(0.5).setTint(c.color);
            this.add.bitmapText(cx, top + this.H * 0.142, 'coiny-bmp', c.caption, Math.floor(this.H * 0.015), 0)
                .setOrigin(0.5).setTint(0x455c70);
        });
        // "=" between the second and third step
        this.add.bitmapText(pad + inner + cellW * 2, top + this.H * 0.085, 'coiny-bmp', '=', Math.floor(this.H * 0.04), 0)
            .setOrigin(0.5).setTint(0x657887);
    }

    // Daily streak: flame + count, then the last 7 days as dots (today ringed)
    private createStreakStrip(): void {
        const streak = SaveManager.getDayStreak();
        const y = this.H * 0.485;
        const pad = Math.floor(this.W * 0.075);
        const w = this.W - pad * 2;
        const h = Math.floor(this.H * 0.05);
        this.drawCard(this.add.graphics(), pad, y - h / 2, w, h, h / 2);

        // flame
        const fx = pad + h * 0.55;
        const flame = this.add.graphics();
        const lit = streak > 0;
        flame.fillStyle(lit ? 0xff7a1a : THEME.CARD_SHADOW, 1);
        flame.fillTriangle(fx - h * 0.2, y + h * 0.05, fx + h * 0.2, y + h * 0.05, fx, y - h * 0.34);
        flame.fillCircle(fx, y + h * 0.1, h * 0.2);
        if (lit) {
            flame.fillStyle(0xffd23f, 1);
            flame.fillCircle(fx, y + h * 0.15, h * 0.1);
        }
        this.add.bitmapText(fx + h * 0.4, y, 'coiny-bmp', lit ? `${streak} DAY${streak === 1 ? '' : 'S'}` : 'START A STREAK',
            Math.floor(this.H * 0.016), 0).setOrigin(0, 0.5).setTint(lit ? THEME.INK : THEME.MUTED);
        if (lit && !SaveManager.getWeek()[6].played) {
            this.tweens.add({ targets: flame, alpha: 0.55, duration: 700, yoyo: true, repeat: -1 });
        }

        // week dots, right-aligned
        const r = h * 0.2;
        const step = r * 3.1;
        const startX = pad + w - h * 0.5 - step * 6;
        SaveManager.getWeek().forEach((d, i) => {
            const x = startX + step * i;
            const g = this.add.graphics();
            g.fillStyle(d.played ? 0xff7a1a : THEME.SURFACE, 1);
            g.fillCircle(x, y - h * 0.08, r);
            if (d.today) {
                g.lineStyle(3, THEME.INK, 1);
                g.strokeCircle(x, y - h * 0.08, r + 3);
            }
            this.add.bitmapText(x, y + h * 0.3, 'coiny-bmp', d.label, Math.floor(this.H * 0.009), 0)
                .setOrigin(0.5).setTint(THEME.MUTED);
        });
    }

    // Summy stands next to the personal best and reacts when tapped
    private createMascotAndBest(): void {
        const y = this.H * 0.635;
        const mascot = new Mascot(this, this.W * 0.2, y, Math.floor(this.H * 0.042));
        this.mascot = mascot;
        mascot.setSize(this.H * 0.1, this.H * 0.11).setInteractive({ useHandCursor: true });
        mascot.on('pointerdown', () => {
            AudioManager.play('snd_tap', 1.3);
            mascot.setMood('happy', 900);
            mascot.hop();
        });

        const best = SaveManager.getBestScore();
        const x = this.W * 0.33;
        this.add.bitmapText(x, y - this.H * 0.026, 'coiny-bmp', 'Personal best', Math.floor(this.H * 0.02), 0)
            .setOrigin(0, 0.5).setTint(THEME.MUTED);
        this.add.bitmapText(x, y + this.H * 0.022, 'coiny-bmp', `${best}`, Math.floor(this.H * 0.05), 0)
            .setOrigin(0, 0.5).setTint(THEME.GOLD);

        // Wardrobe (outfits + scenes): unlocked with stars (1 per round cleared)
        const bw = Math.floor(this.W * 0.22);
        const bh = Math.floor(this.H * 0.06);
        this.createButton(
            this.W * 0.925 - bw / 2, y, bw, bh, 'WARDROBE', this.H * 0.013,
            THEME.CARD, THEME.CARD_SHADOW,
            () => {
                if (this.wardrobe) return;
                AudioManager.play('snd_click');
                this.wardrobe = new WardrobePanel(this, this.W, this.H, (sceneryChanged) => {
                    this.wardrobe = undefined;
                    if (sceneryChanged) this.scene.restart();
                    else this.mascot?.setOutfit(SaveManager.getOutfit());
                });
            },
            THEME.INK,
        );
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

    private toggleHelpPopup(): void {
        if (this.helpPopup) {
            this.closeHelpPopup();
            return;
        }

        this.openHelpPopup();
    }

    private openHelpPopup(): void {
        const panelW = Math.floor(this.W * 0.86);
        const panelH = Math.floor(this.H * 0.76);
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

    // Gear button, top right; opens the Settings popup
    private createSettingsButton(): void {
        const size = Math.floor(this.H * 0.056);
        const btn = this.add.container(this.W * 0.89, this.H * 0.065);
        const bg = this.add.graphics();
        bg.fillStyle(THEME.CARD_SHADOW, 1);
        bg.fillCircle(0, 3, size / 2);
        bg.fillStyle(THEME.CARD, 1);
        bg.fillCircle(0, 0, size / 2);
        const gear = this.add.graphics();
        const r = size * 0.24;
        gear.fillStyle(THEME.INK, 1);
        for (let i = 0; i < 8; i++) {
            const a = (Math.PI / 4) * i;
            gear.fillCircle(Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.15, r * 0.34);
        }
        gear.fillCircle(0, 0, r);
        gear.fillStyle(THEME.CARD, 1);
        gear.fillCircle(0, 0, r * 0.45);
        btn.add([bg, gear]);
        btn.setSize(size, size).setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => {
            if (this.settings) return;
            AudioManager.play('snd_click');
            this.settings = new SettingsPanel(this, this.W, this.H, () => { this.settings = undefined; }, () => {
                this.donateBtn?.destroy();
                this.donateBtn = undefined;
            });
        });
    }

    // ── Remove Ads + Coffee button (coffee mug icon) ────────────────────────

    /** Shown until premium is owned (past coffee donors still see ads, so they get it too). */
    private async checkPurchaseButton(): Promise<void> {
        const hide = () => { this.donateBtn?.destroy(); this.donateBtn = undefined; };
        PurchasesManager.onPremium = hide;
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            if (PurchasesManager.onPremium === hide) PurchasesManager.onPremium = undefined;
        });
        if (!(await PurchasesManager.isPremium()) && this.sys.isActive()) {
            this.createDonateButton();
        }
    }

    private createDonateButton(): void {
        const x = this.W * 0.11;
        const y = this.H * 0.065;
        const size = Math.floor(this.H * 0.056);

        const btn = this.add.container(x, y);
        this.donateBtn = btn;

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
