import * as Phaser from 'phaser';
import BaseScene from './BaseScene';
import { SCENES } from '../utils/Scenes';
import { GlobVar } from '../../utils/Global';
import { COLORS } from '../constants/Colors';
import { AudioManager } from '../managers/AudioManager';
import { AdManager } from '../managers/AdManager';
import { Firebase } from '../../services/Firebase';
import { GameIds } from '../../constants/GameIds';
import FPS from '../model/FPS';

interface EndData {
    score?:     number;
    round?:     number;
    bestScore?: number;
}

export default class End extends BaseScene {
    private finalScore = 0;
    private finalRound = 1;
    private bestScore  = 0;
    private isNewBest  = false;
    private adBusy     = false;
    private rankText?: Phaser.GameObjects.BitmapText;

    constructor() {
        super({ key: SCENES.End });
    }

    init(data: EndData): void {
        this.initScene();
        this.finalScore = data?.score     ?? 0;
        this.finalRound = data?.round     ?? 1;
        this.bestScore  = data?.bestScore ?? 0;
        this.isNewBest  = this.finalScore > 0 && this.finalScore >= this.bestScore;
        this.adBusy     = false;
    }

    create(): void {
        GlobVar.consolelog(`Scene: ${SCENES.End}`);
        AudioManager.init();

        this.createBackground();
        this.createCard();
        this.createButtons();
        this.fpsView = new FPS(this);

        this.cameras.main.fadeIn(350);
        this.celebrationBurst();
        AdManager.showBanner();

        this.fetchAndShowRank();
    }

    update(): void {
        this.fpsView?.update();
    }

    // ── Background ──────────────────────────────────────────────────────────

    private createBackground(): void {
        this.createGradientBg(COLORS.BG_TOP, COLORS.BG_BOTTOM);

        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.45);
        overlay.fillRect(0, 0, this.W, this.H);
    }

    // ── Result card (all content in one Container) ─────────────────────────

    private createCard(): void {
        const cardW  = Math.floor(this.W  * 0.82);
        const cardH  = Math.floor(this.H  * 0.50);
        const radius = Math.floor(cardW   * 0.07);
        const midX   = 0;   // local origin inside container
        const midY   = 0;

        // Place container centre at vertical centre of card area
        const containerX = this.CX;
        const containerY = this.H * 0.345;

        const container = this.add.container(containerX, containerY);
        container.setAlpha(0).setScale(0.7);

        // Shadow
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.5);
        shadow.fillRoundedRect(-cardW / 2 + 6, -cardH / 2 + 10, cardW, cardH, radius);
        container.add(shadow);

        // Card body
        const card = this.add.graphics();
        card.fillStyle(0x1a1a3e, 1);
        card.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, radius);
        card.lineStyle(2, COLORS.NEON_BLUE, 0.6);
        card.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, radius);
        container.add(card);

        // "GAME OVER" header
        const header = this.add.bitmapText(midX, -cardH * 0.38, 'coiny-bmp', 'GAME OVER', Math.floor(this.H * 0.050), 0).setOrigin(0.5)
        .setTint(Phaser.Display.Color.ValueToColor(COLORS.TEXT_ACCENT).color);
        container.add(header);

        // SCORE label
        const scoreLabel = this.add.bitmapText(midX, -cardH * 0.17, 'coiny-bmp', 'SCORE', Math.floor(this.H * 0.025), 0).setOrigin(0.5)
        .setTint(Phaser.Display.Color.ValueToColor(COLORS.TEXT_NEON).color);
        container.add(scoreLabel);

        // Score number
        const scoreNum = this.add.bitmapText(midX, cardH * 0.04, 'coiny-bmp', `${this.finalScore}`, Math.floor(this.H * 0.11), 0).setOrigin(0.5)
        .setTint(Phaser.Display.Color.ValueToColor(COLORS.TEXT_WHITE).color);
        container.add(scoreNum);

        // Rounds survived
        const roundsTxt = this.add.bitmapText(midX, cardH * 0.24, 'coiny-bmp', `Rounds survived: ${Math.max(0, this.finalRound - 1)}`, Math.floor(this.H * 0.026), 0).setOrigin(0.5)
        .setTint(Phaser.Display.Color.ValueToColor('#cccccc').color);
        container.add(roundsTxt);

        // Best score
        const bestLabel = this.isNewBest ? '★ NEW BEST!' : 'BEST';
        const bestColor = this.isNewBest ? COLORS.TEXT_GOLD : COLORS.TEXT_ACCENT;
        const bestTxt = this.add.bitmapText(midX, cardH * 0.35, 'coiny-bmp', `${bestLabel}  ${this.bestScore}`, Math.floor(this.H * 0.030), 0).setOrigin(0.5)
        .setTint(Phaser.Display.Color.ValueToColor(bestColor).color);
        container.add(bestTxt);

        // Rank row (filled async after Firestore responds)
        this.rankText = this.add.bitmapText(midX, cardH * 0.46, 'coiny-bmp', '', Math.floor(this.H * 0.024), 0).setOrigin(0.5).setAlpha(0);
        container.add(this.rankText);

        // Pop-in animation for the whole card
        this.tweens.add({
            targets: container,
            alpha: 1, scaleX: 1, scaleY: 1,
            duration: 460, ease: 'Back.Out',
        });

        // Score number bounces in separately
        scoreNum.setScale(0);
        this.tweens.add({
            targets: scoreNum,
            scaleX: 1, scaleY: 1,
            delay: 380, duration: 350, ease: 'Back.Out',
        });

        if (this.isNewBest) {
            this.time.delayedCall(850, () => {
                this.cameras.main.flash(300, 255, 215, 0, false);
                this.tweens.add({
                    targets: bestTxt, scaleX: 1.3, scaleY: 1.3,
                    duration: 160, yoyo: true, ease: 'Power2',
                });
            });
        }
    }

    // ── Rank fetch ───────────────────────────────────────────────────────────

    private async fetchAndShowRank(): Promise<void> {
        try {
            const rank = await Firebase.getPlayerRank(GameIds.TAP_SUM);
            if (!this.rankText || !this.scene.isActive()) return;
            if (rank > 0) {
                this.rankText.setText(`Global rank: #${rank}`);
                this.tweens.add({ targets: this.rankText, alpha: 1, duration: 400, ease: 'Power2' });
            }
        } catch (_) {}
    }

    // ── Buttons ─────────────────────────────────────────────────────────────

    private createButtons(): void {
        const btnW   = Math.floor(this.W * 0.55);
        const btnH   = Math.floor(this.H * 0.082);
        const fs     = Math.floor(this.H * 0.036);
        const smW    = Math.floor(this.W * 0.37);
        const smH    = Math.floor(this.H * 0.068);
        const smFs   = Math.floor(this.H * 0.028);
        const topBtn = this.H * 0.665;
        const gap    = btnH + Math.floor(this.H * 0.018);

        // CONTINUE (reward ad)
        this.createButton(
            this.CX, topBtn,
            btnW, btnH,
            '▶  CONTINUE  (Ad)',
            Math.floor(fs * 0.78),
            COLORS.BUTTON_SUCCESS, COLORS.BUTTON_SUCCESS_DARK,
            () => this.onContinue(),
        );

        // RETRY + HOME side by side
        const rowY = topBtn + gap;
        this.createButton(
            this.CX - smW * 0.57, rowY,
            smW, smH, 'RETRY', smFs,
            COLORS.BUTTON_SECONDARY, COLORS.BUTTON_SECONDARY_DARK,
            () => {
                AudioManager.play('snd_click');
                AdManager.hideBanner();
                AdManager.showInterstitial(() => this.fadeToScene(SCENES.Game));
            },
        );

        this.createButton(
            this.CX + smW * 0.57, rowY,
            smW, smH, 'HOME', smFs,
            COLORS.BUTTON_DANGER, COLORS.BUTTON_DANGER_DARK,
            () => {
                AudioManager.play('snd_click');
                AdManager.showInterstitial(() => this.fadeToScene(SCENES.Menu));
            },
        );
    }

    // ── Reward ad (continue) ─────────────────────────────────────────────────

    private onContinue(): void {
        if (this.adBusy) return;
        this.adBusy = true;
        AudioManager.play('snd_click');

        AdManager.showRewardVideo().then((rewarded) => {
            if (rewarded) {
                AudioManager.play('snd_reward');
                AdManager.hideBanner();
                this.fadeToScene(SCENES.Game, {
                    resumeScore: this.finalScore,
                    resumeRound: this.finalRound,
                });
            } else {
                this.adBusy = false;
                this.showAdUnavailable();
            }
        });
    }

    private showAdUnavailable(): void {
        const msg = this.add.bitmapText(this.CX, this.H * 0.625, 'coiny-bmp', 'Ad not available — try again later.', Math.floor(this.H * 0.025), 0)
        .setOrigin(0.5).setDepth(30);

        this.tweens.add({
            targets: msg,
            alpha: 0, delay: 2200, duration: 400,
            onComplete: () => msg.destroy(),
        });
    }

    // ── Celebration burst ────────────────────────────────────────────────────

    private celebrationBurst(): void {
        const count = this.isNewBest ? 5 : 3;
        for (let i = 0; i < count; i++) {
            this.time.delayedCall(i * 200, () => {
                const x = Phaser.Math.Between(Math.floor(this.W * 0.15), Math.floor(this.W * 0.85));
                const y = Phaser.Math.Between(Math.floor(this.H * 0.05), Math.floor(this.H * 0.32));
                this.spawnBurst(x, y, [
                    COLORS.NEON_BLUE, COLORS.NEON_PURPLE,
                    COLORS.ACCENT, COLORS.SUCCESS, 0xffd700,
                ], 14, 80, 230);
            });
        }
    }
}
