import * as Phaser from 'phaser';
import BaseScene from './BaseScene';
import { SCENES } from '../utils/Scenes';
import { GlobVar } from '../../utils/Global';
import { COLORS } from '../constants/Colors';
import { GAME_CONFIG } from '../constants/GameConstants';
import { SaveManager } from '../managers/SaveManager';
import { AudioManager } from '../managers/AudioManager';
import { LeaderboardManager } from '../managers/LeaderboardManager';
import FPS from '../model/FPS';

interface GameData {
    resumeScore?: number;
    resumeRound?: number;
}

type IncrementAmount = 1 | 10 | 100 | 1000;

const INCREMENT_AMOUNTS: IncrementAmount[] = [1, 10, 100, 1000];

const BTN_SCHEME = {
    1:    { face: 0x3366ff, side: 0x1133aa, glow: 0x3366ff },
    10:   { face: 0x00c853, side: 0x007733, glow: 0x39ff14 },
    100:  { face: 0xff6b35, side: 0xaa3311, glow: 0xff6b35 },
    1000: { face: 0xb44bff, side: 0x6600aa, glow: 0xb44bff },
} as const;

export default class Game extends BaseScene {
    // ── State ───────────────────────────────────────────────────────────────
    private score        = 0;
    private round        = 1;
    private currentTotal = 0;
    private targetTotal  = 0;
    private timeLeft     = 0;
    private timerDuration = GAME_CONFIG.TIMER_BASE_SEC * 1000;
    private roundActive  = false;
    private gameOver     = false;

    // ── UI refs ─────────────────────────────────────────────────────────────
    private targetText!:    Phaser.GameObjects.BitmapText;
    private currentText!:   Phaser.GameObjects.BitmapText;
    private remainingText!: Phaser.GameObjects.BitmapText;
    private scoreText!:     Phaser.GameObjects.BitmapText;
    private roundText!:     Phaser.GameObjects.BitmapText;
    private timerFill!:     Phaser.GameObjects.Graphics;

    // 4 increment buttons (index 0–3 → +1, +10, +100, +1000)
    private btnFaces:      Phaser.GameObjects.Graphics[]   = [];
    private btnGlows:      Phaser.GameObjects.Graphics[]   = [];
    private btnContainers: Phaser.GameObjects.Container[]  = [];

    // ── Timer bar geometry ───────────────────────────────────────────────────
    private barW = 0;
    private barX = 0;
    private barY = 0;
    private barH = 0;

    // hint debounce
    private lastHintRemaining = -1;

    constructor() {
        super({ key: SCENES.Game });
    }

    init(data: GameData): void {
        this.initScene();
        this.score        = data?.resumeScore ?? 0;
        this.round        = data?.resumeRound ?? 1;
        this.currentTotal = 0;
        this.targetTotal  = 0;
        this.gameOver     = false;
        this.roundActive  = false;
        this.timeLeft     = 0;
        this.timerDuration = GAME_CONFIG.TIMER_BASE_SEC * 1000;
        this.lastHintRemaining = -1;
        this.btnFaces      = [];
        this.btnGlows      = [];
        this.btnContainers = [];
    }

    create(): void {
        GlobVar.consolelog(`Scene: ${SCENES.Game}`);
        AudioManager.init();

        this.createBackground();
        this.createHUD();
        this.createIncrementButtons();
        this.fpsView = new FPS(this);

        this.cameras.main.fadeIn(300);
        this.time.delayedCall(500, () => this.startRound());
    }

    update(_t: number, delta: number): void {
        this.fpsView?.update();

        if (!this.roundActive || this.gameOver) return;

        this.timeLeft -= delta;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.triggerGameOver();
        }
        this.redrawTimerBar();
    }

    // ── Background ──────────────────────────────────────────────────────────

    private createBackground(): void {
        this.createGradientBg(COLORS.BG_TOP, COLORS.BG_BOTTOM);
        const midY = this.H * 0.52;
        const line = this.add.graphics();
        line.lineStyle(1, COLORS.NEON_BLUE, 0.2);
        line.lineBetween(this.W * 0.08, midY, this.W * 0.92, midY);
    }

    // ── HUD (top half) ──────────────────────────────────────────────────────

    private createHUD(): void {
        const topY    = this.H * 0.065;
        const labelFs = Math.floor(this.H * 0.026);
        const valueFs = Math.floor(this.H * 0.044);

        const back = this.add.bitmapText(this.W * 0.08, topY, 'coiny-bmp', '<-', Math.floor(this.H * 0.042), 0)
            .setOrigin(0.5).setInteractive({ useHandCursor: true });
        back.on('pointerdown', () => {
            AudioManager.play('snd_click');
            this.triggerGameOver(true);
        });

        this.roundText = this.add.bitmapText(this.CX, topY, 'coiny-bmp', 'Round 1', Math.floor(this.H * 0.032), 0)
            .setOrigin(0.5)
            .setTint(Phaser.Display.Color.ValueToColor(COLORS.TEXT_NEON).color);

        this.scoreText = this.add.bitmapText(this.W * 0.92, topY, 'coiny-bmp', '0', Math.floor(this.H * 0.042), 0)
            .setOrigin(1, 0.5)
            .setTint(Phaser.Display.Color.ValueToColor(COLORS.TEXT_GOLD).color);

        // Timer bar
        this.barW = Math.floor(this.W * 0.72);
        this.barH = Math.floor(this.H * 0.014);
        this.barX = this.CX - this.barW / 2;
        this.barY = this.H * 0.115;

        const barTrack = this.add.graphics();
        barTrack.fillStyle(0x222244, 1);
        barTrack.fillRoundedRect(this.barX, this.barY, this.barW, this.barH, this.barH / 2);

        this.timerFill = this.add.graphics();
        this.redrawTimerBar();

        // TARGET label + big number
        this.add.bitmapText(this.CX, this.H * 0.175, 'coiny-bmp', 'TARGET', Math.floor(this.H * 0.024), 0)
            .setOrigin(0.5)
            .setTint(Phaser.Display.Color.ValueToColor(COLORS.TEXT_ACCENT).color);

        this.targetText = this.add.bitmapText(this.CX, this.H * 0.28, 'coiny-bmp', '?', Math.floor(this.H * 0.18), 0)
            .setOrigin(0.5)
            .setTint(Phaser.Display.Color.ValueToColor(COLORS.TEXT_WHITE).color);

        // NOW label + value (left side)
        this.add.bitmapText(this.W * 0.22, this.H * 0.445, 'coiny-bmp', 'NOW', labelFs, 0)
            .setOrigin(0.5).setVisible(false)
            .setTint(Phaser.Display.Color.ValueToColor(COLORS.TEXT_NEON).color);

        this.currentText = this.add.bitmapText(this.W * 0.22, this.H * 0.482, 'coiny-bmp', '0', valueFs, 0)
            .setOrigin(0.5).setVisible(false)
            .setTint(Phaser.Display.Color.ValueToColor(COLORS.TEXT_NEON).color);

        // LEFT label + value (right side)
        this.add.bitmapText(this.W * 0.78, this.H * 0.445, 'coiny-bmp', 'LEFT', labelFs, 0)
            .setOrigin(0.5).setVisible(false)
            .setTint(Phaser.Display.Color.ValueToColor(COLORS.TEXT_ACCENT).color);

        this.remainingText = this.add.bitmapText(this.W * 0.78, this.H * 0.482, 'coiny-bmp', '?', valueFs, 0)
            .setOrigin(0.5).setVisible(false)
            .setTint(Phaser.Display.Color.ValueToColor(COLORS.TEXT_ACCENT).color);
    }

    // ── 4 Increment buttons (2×2 grid) ──────────────────────────────────────

    private createIncrementButtons(): void {
        const btnW   = Math.floor(this.W * 0.44);
        const btnH   = Math.floor(this.H * 0.115);
        const gapX   = Math.floor(this.W * 0.03);
        const gapY   = Math.floor(this.H * 0.022);
        const radius = Math.floor(btnH * 0.12);
        const sideH  = Math.round(btnH * 0.06);
        const gridCY = this.H * 0.765;

        const layout = [
            { col: 0, row: 0, amount: 1    as IncrementAmount },
            { col: 1, row: 0, amount: 10   as IncrementAmount },
            { col: 0, row: 1, amount: 100  as IncrementAmount },
            { col: 1, row: 1, amount: 1000 as IncrementAmount },
        ];

        for (const { col, row, amount } of layout) {
            const x = this.CX + (col - 0.5) * (btnW + gapX);
            const y = gridCY + (row - 0.5) * (btnH + gapY);
            const scheme = BTN_SCHEME[amount];

            const container = this.add.container(x, y);

            const shadow = this.add.graphics();
            shadow.fillStyle(0x000000, 0.35);
            shadow.fillRoundedRect(-btnW / 2 + 4, -btnH / 2 + sideH, btnW, btnH-5, radius);

            const side = this.add.graphics();
            side.fillStyle(scheme.side, 1);
            side.fillRoundedRect(-btnW / 2, -btnH / 2 + sideH, btnW, btnH, radius);

            const face = this.add.graphics();
            face.fillStyle(scheme.face, 1);
            face.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH - sideH, radius);

            const gloss = this.add.graphics();
            gloss.fillStyle(0xffffff, 0.18);
            gloss.fillRoundedRect(-btnW / 2 + 5, -btnH / 2 + 5, btnW - 10, (btnH - sideH) * 0.42, radius);

            const glow = this.add.graphics();
            glow.lineStyle(10, scheme.glow, 0.5);
            glow.strokeRoundedRect(-btnW / 2, -btnH / 2 - 2, btnW, btnH + 10, radius);

            const label = this.add.bitmapText(0, -Math.round(sideH * 0.35), 'coiny-bmp',
                `+${amount}`, Math.floor(btnH * 0.50), 0).setOrigin(0.5).setTint(0xffffff);

            container.add([shadow, side, face, gloss, glow, label]);
            container.setSize(btnW, btnH);
            container.setInteractive({ useHandCursor: true });

            const btnIndex = this.btnContainers.length;
            this.btnFaces.push(face);
            this.btnGlows.push(glow);
            this.btnContainers.push(container);

            // Idle pulse
            this.tweens.add({
                targets: glow, alpha: 0.12,
                duration: 900 + btnIndex * 230,
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            });

            container.on('pointerdown', () => {
                if (!this.roundActive || this.gameOver) return;
                this.handleIncrementTap(amount, btnIndex);
            });
        }
    }

    // ── Increment tap handler ───────────────────────────────────────────────

    private handleIncrementTap(amount: IncrementAmount, btnIndex: number): void {
        this.currentTotal += amount;
        this.updateRemainingDifference();
        this.animateIncrementButton(btnIndex, amount);
        this.spawnFloatingLabel(btnIndex, amount);

        const sndMap: Record<IncrementAmount, string> = {
            1:    'snd_tap',
            10:   'snd_click',
            100:  'snd_tap',
            1000: 'snd_click',
        };
        AudioManager.play(sndMap[amount]);

        this.validateCurrentProgress();
    }

    private spawnFloatingLabel(btnIndex: number, amount: number): void {
        const container = this.btnContainers[btnIndex];
        const tints = [0x99bbff, 0x99ffcc, 0xffcc99, 0xddaaff];
        const txt = this.add.bitmapText(container.x, container.y - 30, 'coiny-bmp',
            `+${amount}`, Math.floor(this.H * 0.040), 0)
            .setOrigin(0.5).setDepth(30).setTint(tints[btnIndex]);

        this.tweens.add({
            targets: txt,
            y: txt.y - 90, alpha: 0, scaleX: 1.4, scaleY: 1.4,
            duration: 600, ease: 'Power2',
            onComplete: () => txt.destroy(),
        });
    }

    // ── Progress display ─────────────────────────────────────────────────────

    private updateRemainingDifference(): void {
        const remaining = this.targetTotal - this.currentTotal;
        this.currentText.setText(`${this.currentTotal}`);
        this.remainingText.setText(`${Math.max(0, remaining)}`);
        this.popObject(this.currentText);
        this.popObject(this.remainingText);

        if (remaining !== this.lastHintRemaining) {
            this.lastHintRemaining = remaining;
            this.applyButtonHints(remaining);
        }
    }

    private applyButtonHints(remaining: number): void {
        // Find the largest increment that exactly divides remaining and fits within one "digit"
        let hintIdx = -1;
        if (remaining > 0) {
            for (let i = INCREMENT_AMOUNTS.length - 1; i >= 0; i--) {
                const amt = INCREMENT_AMOUNTS[i];
                if (remaining % amt === 0 && remaining < amt * 10) {
                    hintIdx = i;
                    break;
                }
            }
        }

        for (let i = 0; i < 4; i++) {
            const glow = this.btnGlows[i];
            this.tweens.killTweensOf(glow);
            if (i === hintIdx) {
                this.tweens.add({
                    targets: glow, alpha: 0.9,
                    duration: 280, yoyo: true, repeat: 4, ease: 'Sine.easeInOut',
                    onComplete: () => {
                        this.tweens.add({
                            targets: glow, alpha: 0.12,
                            duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
                        });
                    },
                });
            } else {
                this.tweens.add({
                    targets: glow, alpha: 0.12,
                    duration: 900 + i * 230, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
                });
            }
        }
    }

    // ── Button press animation ───────────────────────────────────────────────

    private animateIncrementButton(btnIndex: number, amount: IncrementAmount): void {
        const container = this.btnContainers[btnIndex];

        this.tweens.add({
            targets: container,
            scaleX: 0.88, scaleY: 0.88,
            duration: 65, yoyo: true, ease: 'Power2',
        });

        if (amount === 100)  this.cameras.main.shake(25, 0.004);
        if (amount === 1000) this.cameras.main.shake(50, 0.010);

        const burstColors = [COLORS.NEON_BLUE, COLORS.NEON_GREEN, COLORS.ACCENT, COLORS.NEON_PURPLE];
        const counts      = [5, 8, 12, 20];
        const minSpeeds   = [50, 90, 140, 220];
        this.spawnBurst(
            container.x, container.y,
            [burstColors[btnIndex]],
            counts[btnIndex], minSpeeds[btnIndex], minSpeeds[btnIndex] * 2.5,
        );
    }

    // ── Validation ───────────────────────────────────────────────────────────

    private validateCurrentProgress(): void {
        if (this.currentTotal > this.targetTotal) {
            this.showOvershootEffect();
            this.triggerGameOver();
        } else if (this.currentTotal === this.targetTotal) {
            this.onRoundSuccess();
        }
    }

    private showOvershootEffect(): void {
        const btnW   = Math.floor(this.W * 0.44);
        const btnH   = Math.floor(this.H * 0.115);
        const sideH  = Math.round(btnH * 0.06);
        const radius = Math.floor(btnH * 0.12);

        for (const face of this.btnFaces) {
            face.clear();
            face.fillStyle(COLORS.FAIL, 1);
            face.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH - sideH, radius);
        }

        const txt = this.add.bitmapText(this.CX, this.H * 0.50, 'coiny-bmp', 'TOO MUCH!',
            Math.floor(this.H * 0.050), 0)
            .setOrigin(0.5).setDepth(20).setTint(COLORS.FAIL);

        this.tweens.add({
            targets: txt,
            scaleX: 1.4, scaleY: 1.4, alpha: 0, y: txt.y - 60,
            duration: 600, ease: 'Power2',
            onComplete: () => txt.destroy(),
        });
    }

    // ── Round logic ──────────────────────────────────────────────────────────

    private generateBalancedTarget(): number {
        let min = 1;
        let max = 10;

        // Difficulty scaling
        if (this.round <= 10) {
            min = 1;
            max = 10;
        } else if (this.round <= 20) {
            min = 1;
            max = 15;
        } else if (this.round <= 40) {
            min = 5;
            max = 25;
        } else if (this.round <= 80) {
            min = 15;
            max = 50;
        } else {
            min = 50;
            max = 100;
        }

        let value = Phaser.Math.Between(min, max);

        // Negative chance based on round
        let negativeChance = 0;

        if (this.round <= 15) {
            negativeChance = 25;
        } else if (this.round <= 30) {
            negativeChance = 35;
        } else {
            negativeChance = 50;
        }

        // Current cumulative total
        const currentTotal = this.targetTotal || 0;

        // Apply negative randomly
        const shouldBeNegative =
            Phaser.Math.Between(1, 100) <= negativeChance;

        if (shouldBeNegative && currentTotal > value) {
            value = -value;
        }

        return value;
    }

    private calculateTaskTime(): number {
        const extra = Math.floor(this.round / GAME_CONFIG.TIMER_STEP_ROUNDS) * GAME_CONFIG.TIMER_STEP_SEC;
        return Math.min(GAME_CONFIG.TIMER_MAX_SEC, GAME_CONFIG.TIMER_BASE_SEC + extra) * 1000;
    }

    private startRound(): void {
        if (this.gameOver) return;

        this.currentTotal      = 0;
        const balancedValue    = this.generateBalancedTarget();
        this.targetTotal       += balancedValue;
        this.timeLeft          = this.calculateTaskTime();
        this.timerDuration     = this.timeLeft;
        this.lastHintRemaining = -1;

        this.roundText.setText(`Round ${this.round}`);
        this.scoreText.setText(`${this.score}`);

        // Reset progress display
        this.currentText.setText('0');
        this.remainingText.setText(`${balancedValue}`);

        // Pop-in target number
        this.targetText.setText(`${balancedValue}`).setScale(2.4);
        this.tweens.add({
            targets: this.targetText,
            scaleX: 1, scaleY: 1,
            duration: 300, ease: 'Back.Out',
        });

        // Reset button faces to original colors
        this.restoreButtonColors();

        AudioManager.play('snd_click');
        this.roundActive = true;
    }

    private restoreButtonColors(): void {
        const btnW   = Math.floor(this.W * 0.44);
        const btnH   = Math.floor(this.H * 0.115);
        const sideH  = Math.round(btnH * 0.06);
        const radius = Math.floor(btnH * 0.12);

        for (let i = 0; i < 4; i++) {
            const face   = this.btnFaces[i];
            const amount = INCREMENT_AMOUNTS[i];
            face.clear();
            face.fillStyle(BTN_SCHEME[amount].face, 1);
            face.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH - sideH, radius);
        }
    }

    // ── Round success ─────────────────────────────────────────────────────────

    private onRoundSuccess(): void {
        this.roundActive = false;
        this.score += GAME_CONFIG.SCORE_PER_ROUND;
        AudioManager.play('snd_success');

        this.spawnScoreLabel(
            this.CX, this.H * 0.55,
            this.W * 0.87, this.H * 0.065,
            `+${GAME_CONFIG.SCORE_PER_ROUND}`,
        );

        this.spawnBurst(
            this.CX, this.H * 0.50,
            [COLORS.SUCCESS, COLORS.NEON_GREEN, COLORS.NEON_BLUE, COLORS.ACCENT],
            22, 120, 340,
        );

        this.cameras.main.flash(180, 80, 255, 80, false);
        this.scoreText.setText(`${this.score}`);
        this.popObject(this.scoreText);

        // Flash all buttons green then restore
        const btnW   = Math.floor(this.W * 0.44);
        const btnH   = Math.floor(this.H * 0.115);
        const sideH  = Math.round(btnH * 0.13);
        const radius = Math.floor(btnH * 0.24);

        for (const face of this.btnFaces) {
            face.clear();
            face.fillStyle(COLORS.SUCCESS, 1);
            face.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH - sideH, radius);
        }
        this.time.delayedCall(280, () => this.restoreButtonColors());

        this.round++;
        this.time.delayedCall(660, () => this.startRound());
    }

    // ── Timer bar ─────────────────────────────────────────────────────────────

    private redrawTimerBar(): void {
        if (!this.timerFill) return;

        const ratio  = Phaser.Math.Clamp(this.timeLeft / this.timerDuration, 0, 1);
        const radius = this.barH / 2;

        let color: number;
        if      (ratio > 0.5)  color = COLORS.NEON_GREEN;
        else if (ratio > 0.25) color = COLORS.ACCENT;
        else                   color = COLORS.FAIL;

        this.timerFill.clear();
        if (ratio > 0.01) {
            this.timerFill.fillStyle(color, 1);
            this.timerFill.fillRoundedRect(this.barX, this.barY, this.barW * ratio, this.barH, radius);
        }
    }

    // ── Game over ─────────────────────────────────────────────────────────────

    private triggerGameOver(voluntary = false): void {
        if (this.gameOver) return;
        this.gameOver    = true;
        this.roundActive = false;

        if (!voluntary) {
            AudioManager.play('snd_fail');
            this.cameras.main.shake(320, 0.018);
            this.cameras.main.flash(280, 255, 40, 40, false);
        }

        LeaderboardManager.submitScore(this.score);

        this.time.delayedCall(voluntary ? 50 : 700, () => {
            this.fadeToScene(SCENES.End, {
                score:     this.score,
                round:     this.round,
                bestScore: SaveManager.getBestScore(),
            });
        });
    }
}
