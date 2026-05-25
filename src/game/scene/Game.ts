import * as Phaser from 'phaser';
import BaseScene from './BaseScene';
import { SCENES } from '../utils/Scenes';
import { GlobVar } from '../../utils/Global';
import { COLORS } from '../constants/Colors';
import { GAME_CONFIG } from '../constants/GameConstants';
import { SaveManager } from '../managers/SaveManager';
import { AudioManager } from '../managers/AudioManager';
import { AdManager } from '../managers/AdManager';
import { LeaderboardManager } from '../managers/LeaderboardManager';
import FPS from '../model/FPS';

interface GameData {
    resumeScore?: number;
    resumeRound?: number;
}

export default class Game extends BaseScene {
    // ── State ───────────────────────────────────────────────────────────────
    private score           = 0;
    private round           = 1;
    private tapCount        = 0;
    private requiredTaps    = 0;
    private currentNumber   = 1;   // delta shown this round (positive or negative)
    private cumulativeSum   = 0;   // running total — defines required taps
    private consecutiveNegs = 0;   // streak of negative rounds
    private timeLeft        = 0;
    private timerDuration   = GAME_CONFIG.TIMER_BASE_SEC * 1000;
    private roundActive     = false;
    private gameOver        = false;

    // ── UI refs ─────────────────────────────────────────────────────────────
    private numberText!:   Phaser.GameObjects.BitmapText;
    private scoreText!:    Phaser.GameObjects.BitmapText;
    private roundText!:    Phaser.GameObjects.BitmapText;
    private tapCountText!: Phaser.GameObjects.BitmapText;
    private hintText!:     Phaser.GameObjects.BitmapText;
    private timerFill!:    Phaser.GameObjects.Graphics;
    private tapButton!:    Phaser.GameObjects.Container;
    private plusOneFace!:  Phaser.GameObjects.Graphics;
    private plusTenFace!:  Phaser.GameObjects.Graphics;

    // ── Timer bar geometry ───────────────────────────────────────────────────
    private barW = 0;
    private barX = 0;
    private barY = 0;
    private barH = 0;

    private get btnRadius(): number { return Math.floor(this.W * 0.27); }

    constructor() {
        super({ key: SCENES.Game });
    }

    init(data: GameData): void {
        this.initScene();
        this.score           = data?.resumeScore ?? 0;
        this.round           = data?.resumeRound ?? 1;
        this.cumulativeSum   = 0;
        this.requiredTaps    = 0;
        this.consecutiveNegs = 0;
        this.gameOver        = false;
        this.roundActive     = false;
        this.timeLeft        = 0;
        this.timerDuration   = GAME_CONFIG.TIMER_BASE_SEC * 1000;
    }

    create(): void {
        GlobVar.consolelog(`Scene: ${SCENES.Game}`);
        AudioManager.init();

        this.createBackground();
        this.createHUD();
        this.createSplitCircleButtons();
        this.fpsView = new FPS(this);

        AdManager.hideBanner();
        this.cameras.main.fadeIn(300);
        this.time.delayedCall(400, () => this.startRound());
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
        const topY = this.H * 0.065;
        const numY = this.H * 0.30;
        const fs   = Math.floor(this.H * 0.032);

        const back = this.add.bitmapText(this.W * 0.08, topY, 'coiny-bmp', '<-', Math.floor(this.H * 0.042), 0).setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
        back.on('pointerdown', () => {
            AudioManager.play('snd_click');
            this.triggerGameOver(true);
        });

        this.roundText = this.add.bitmapText(this.CX, topY, 'coiny-bmp', 'Round 1', fs, 0).setOrigin(0.5)
            .setTint(Phaser.Display.Color.ValueToColor(COLORS.TEXT_NEON).color);

        this.scoreText = this.add.bitmapText(this.W * 0.92, topY, 'coiny-bmp', '0', Math.floor(this.H * 0.042), 0).setOrigin(1, 0.5)
            .setTint(Phaser.Display.Color.ValueToColor(COLORS.TEXT_GOLD).color);

        this.barW = Math.floor(this.W * 0.72);
        this.barH = Math.floor(this.H * 0.014);
        this.barX = this.CX - this.barW / 2;
        this.barY = this.H * 0.115;

        const barTrack = this.add.graphics();
        barTrack.fillStyle(0x222244, 1);
        barTrack.fillRoundedRect(this.barX, this.barY, this.barW, this.barH, this.barH / 2);

        this.timerFill = this.add.graphics();
        this.redrawTimerBar();

        this.numberText = this.add.bitmapText(this.CX, numY, 'coiny-bmp', '?', Math.floor(this.H * 0.22), 0).setOrigin(0.5)
            .setTint(Phaser.Display.Color.ValueToColor(COLORS.TEXT_WHITE).color);

        // Target label (replaces old "Tap N times")
        this.hintText = this.add.bitmapText(this.CX, this.H * 0.460, 'coiny-bmp', '', Math.floor(this.H * 0.028), 0).setOrigin(0.5).setVisible(false)
            .setTint(Phaser.Display.Color.ValueToColor(COLORS.TEXT_ACCENT).color);

        // Live tap progress
        this.tapCountText = this.add.bitmapText(this.CX, this.H * 0.498, 'coiny-bmp', 'Current: 0', Math.floor(this.H * 0.028), 0).setOrigin(0.5)
            .setTint(Phaser.Display.Color.ValueToColor(COLORS.TEXT_NEON).color);
    }

    // ── Split circle buttons (bottom half) ──────────────────────────────────

    private createSplitCircleButtons(): void {
        const r = this.btnRadius;
        this.tapButton = this.add.container(this.CX, this.H * 0.74);

        // Shadow (full circle, offset)
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.4);
        shadow.fillCircle(6, 10, r);

        // 3D depth ring (full circle, slightly lower)
        const side = this.add.graphics();
        side.fillStyle(0x111122, 1);
        side.fillCircle(0, 8, r);

        // Glow ring
        const glow = this.add.graphics();
        glow.lineStyle(10, COLORS.NEON_BLUE, 0.5);
        glow.strokeCircle(0, 0, r + 16);

        // Faces
        this.plusOneFace = this.add.graphics();
        this.plusTenFace = this.add.graphics();
        this.redrawPlusOneFace(COLORS.BUTTON_SECONDARY);
        this.redrawPlusTenFace(COLORS.BUTTON_PRIMARY);

        // Top highlight
        const hlTop = this.add.graphics();
        hlTop.fillStyle(0xffffff, 0.14);
        hlTop.beginPath();
        hlTop.moveTo(-r * 0.65, -r * 0.05);
        hlTop.arc(0, -r * 0.05, r * 0.65, Math.PI, Math.PI * 2, false);
        hlTop.closePath();
        hlTop.fillPath();

        // Extra glow arc on bottom half (+10 has stronger glow)
        const botGlow = this.add.graphics();
        botGlow.lineStyle(6, COLORS.ACCENT, 0.40);
        botGlow.beginPath();
        botGlow.moveTo(r, 0);
        botGlow.arc(0, 0, r, 0, Math.PI, false);
        botGlow.strokePath();

        // Divider line between the two halves
        const divider = this.add.graphics();
        divider.lineStyle(3, 0x000000, 0.7);
        divider.lineBetween(-r, 0, r, 0);

        // Labels
        const lblOne = this.add.bitmapText(0, -Math.floor(r * 0.44), 'coiny-bmp', '+1',
            Math.floor(this.H * 0.065), 0).setOrigin(0.5);
        const lblTen = this.add.bitmapText(0, Math.floor(r * 0.44), 'coiny-bmp', '+10',
            Math.floor(this.H * 0.060), 0).setOrigin(0.5);

        this.tapButton.add([shadow, side, glow, this.plusOneFace, this.plusTenFace,
                            hlTop, botGlow, divider, lblOne, lblTen]);
        this.tapButton.setSize(r * 2, r * 2);
        this.tapButton.setInteractive({ useHandCursor: true });

        this.tweens.add({
            targets: glow, alpha: 0.15,
            duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
        this.tweens.add({
            targets: botGlow, alpha: 0.08,
            duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });

        this.tapButton.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (!this.roundActive || this.gameOver) return;
            const localY = pointer.y - this.tapButton.y;
            if (localY < 0) this.handlePlusOneTap();
            else             this.handlePlusTenTap();
        });
    }

    private redrawPlusOneFace(color: number): void {
        const r = this.btnRadius;
        this.plusOneFace.clear();
        this.plusOneFace.fillStyle(color, 1);
        this.plusOneFace.beginPath();
        this.plusOneFace.moveTo(-r, 0);
        this.plusOneFace.arc(0, 0, r, Math.PI, Math.PI * 2, false);
        this.plusOneFace.closePath();
        this.plusOneFace.fillPath();
    }

    private redrawPlusTenFace(color: number): void {
        const r = this.btnRadius;
        this.plusTenFace.clear();
        this.plusTenFace.fillStyle(color, 1);
        this.plusTenFace.beginPath();
        this.plusTenFace.moveTo(r, 0);
        this.plusTenFace.arc(0, 0, r, 0, Math.PI, false);
        this.plusTenFace.closePath();
        this.plusTenFace.fillPath();
    }

    // ── Round logic ─────────────────────────────────────────────────────────

    private generateNextValue(): number {
        const negChance = this.round >= GAME_CONFIG.ROUND_LATE_NEG ? GAME_CONFIG.NEG_CHANCE_LATE
                        : this.round >= GAME_CONFIG.ROUND_MID_NEG  ? GAME_CONFIG.NEG_CHANCE_MID
                        : GAME_CONFIG.NEG_CHANCE_EARLY;

        const maxPos = this.round >= GAME_CONFIG.RANGE_HARD_ROUND ? 9
                     : this.round >= GAME_CONFIG.RANGE_MID_ROUND  ? 5
                     : 3;

        const forcePositive = this.consecutiveNegs >= GAME_CONFIG.MAX_CONSECUTIVE_NEG
                           || this.cumulativeSum <= 1;

        if (!forcePositive && Math.random() < negChance) {
            const maxNeg = this.round >= GAME_CONFIG.ROUND_LATE_NEG ? GAME_CONFIG.NEG_MAX_LATE
                         : this.round >= GAME_CONFIG.ROUND_MID_NEG  ? GAME_CONFIG.NEG_MAX_MID
                         : GAME_CONFIG.NEG_MAX_EARLY;
            this.consecutiveNegs++;
            return -Phaser.Math.Between(1, maxNeg);
        }

        this.consecutiveNegs = 0;
        return Phaser.Math.Between(1, maxPos);
    }

    private calculateTaskTime(): number {
        const extra = Math.floor(this.round / GAME_CONFIG.TIMER_STEP_ROUNDS) * GAME_CONFIG.TIMER_STEP_SEC;
        return Math.min(GAME_CONFIG.TIMER_MAX_SEC, GAME_CONFIG.TIMER_BASE_SEC + extra) * 1000;
    }

    private startTaskTimer(): void {
        this.timeLeft      = this.calculateTaskTime();
        this.timerDuration = this.timeLeft;
    }

    private startRound(): void {
        if (this.gameOver) return;

        const oldRequired  = this.requiredTaps;
        this.currentNumber = this.generateNextValue();

        const rawSum     = this.cumulativeSum + this.currentNumber;
        const clamped    = Math.max(1, rawSum);
        const wasClamped = rawSum < 1;

        this.cumulativeSum = clamped;
        this.requiredTaps  = clamped;
        this.tapCount      = 0;

        this.startTaskTimer();

        this.roundText.setText(`Round ${this.round}`);
        this.scoreText.setText(`${this.score}`);
        this.animateRequiredTapsCounter(oldRequired, this.requiredTaps);
        this.updateCurrentTapProgress();

        const isNeg  = this.currentNumber < 0;
        const prefix = isNeg ? '' : '+';
        this.numberText
            .setText(`${prefix}${this.currentNumber}`)
            .setScale(2.2)
            .setTint(isNeg ? COLORS.FAIL : COLORS.NEON_GREEN);

        this.tweens.add({
            targets: this.numberText,
            scaleX: 1, scaleY: 1,
            duration: 280, ease: 'Back.Out',
            onComplete: () => { if (isNeg) this.animateNegativeShake(); },
        });

        if (isNeg) {
            this.spawnBurst(this.CX, this.H * 0.30, [COLORS.FAIL, 0xff6688, 0xff9900], 6, 25, 70);
            AudioManager.play('snd_tap');
        } else {
            AudioManager.play('snd_click');
        }

        if (wasClamped) this.showMinimumClampEffect();

        this.roundActive = true;
    }

    private animateRequiredTapsCounter(from: number, to: number): void {
        this.hintText.setVisible(true);
        if (from <= 0) {
            this.hintText.setText(`Target: ${to}`);
            return;
        }
        const obj = { val: from };
        this.tweens.add({
            targets: obj,
            val: to,
            duration: 350,
            ease: 'Power2',
            onUpdate: () => this.hintText.setText(`Target: ${Math.round(obj.val)}`),
            onComplete: () => this.hintText.setText(`Target: ${to}`),
        });
        this.popObject(this.hintText);
    }

    private animateNegativeShake(): void {
        const origX = this.numberText.x;
        this.tweens.add({
            targets: this.numberText,
            x: origX + 10,
            duration: 50,
            yoyo: true,
            repeat: 5,
            ease: 'Linear',
            onComplete: () => this.numberText.setX(origX),
        });
    }

    private showMinimumClampEffect(): void {
        const txt = this.add.bitmapText(this.CX, this.H * 0.43, 'coiny-bmp', 'MINIMUM!',
            Math.floor(this.H * 0.030), 0)
            .setOrigin(0.5)
            .setDepth(20)
            .setTint(Phaser.Display.Color.ValueToColor(COLORS.ACCENT).color);

        this.tweens.add({
            targets: txt,
            scaleX: 1.4, scaleY: 1.4,
            duration: 180, yoyo: true, repeat: 1, ease: 'Power2',
            onComplete: () => {
                this.tweens.add({
                    targets: txt,
                    alpha: 0, y: txt.y - 40,
                    duration: 450,
                    onComplete: () => txt.destroy(),
                });
            },
        });
        AudioManager.play('snd_tap');
    }

    // ── Button tap handlers ─────────────────────────────────────────────────

    private handlePlusOneTap(): void {
        this.tapCount += 1;
        this.updateCurrentTapProgress();
        AudioManager.play('snd_tap');
        this.animateButtonPress(true);
        this.spawnBurst(
            this.tapButton.x, this.tapButton.y - this.btnRadius * 0.5,
            [COLORS.NEON_BLUE, COLORS.BUTTON_SECONDARY, 0x99ccff],
            5, 40, 100,
        );
        this.validateTapProgress();
    }

    private handlePlusTenTap(): void {
        this.tapCount += 10;
        this.updateCurrentTapProgress();
        AudioManager.play('snd_click');
        this.animateButtonPress(false);
        this.cameras.main.shake(30, 0.004);
        this.spawnBurst(
            this.tapButton.x, this.tapButton.y + this.btnRadius * 0.5,
            [COLORS.ACCENT, COLORS.BUTTON_PRIMARY, 0xff9900],
            10, 60, 160,
        );
        this.validateTapProgress();
    }

    private animateButtonPress(isTop: boolean): void {
        const face = isTop ? this.plusOneFace : this.plusTenFace;
        this.tweens.add({
            targets: face,
            scaleX: 0.88, scaleY: 0.88,
            duration: 60, yoyo: true, ease: 'Power2',
        });
        this.tweens.add({
            targets: this.tapButton,
            scaleX: 0.94, scaleY: 0.94,
            duration: 65, yoyo: true, ease: 'Power2',
        });
    }

    private updateCurrentTapProgress(): void {
        this.tapCountText.setText(`Current: ${this.tapCount}`);
        this.popObject(this.tapCountText);
    }

    private validateTapProgress(): void {
        if (this.tapCount > this.requiredTaps) {
            this.showOvershootFailure();
            this.triggerGameOver();
        } else if (this.tapCount === this.requiredTaps) {
            this.onRoundSuccess();
        }
    }

    private showOvershootFailure(): void {
        const txt = this.add.bitmapText(this.CX, this.H * 0.50, 'coiny-bmp', 'TOO MANY!',
            Math.floor(this.H * 0.040), 0)
            .setOrigin(0.5)
            .setDepth(20)
            .setTint(COLORS.FAIL);

        this.tweens.add({
            targets: txt,
            scaleX: 1.3, scaleY: 1.3, alpha: 0, y: txt.y - 50,
            duration: 550, ease: 'Power2',
            onComplete: () => txt.destroy(),
        });
    }

    // ── Round success ───────────────────────────────────────────────────────

    private onRoundSuccess(): void {
        this.roundActive = false;
        this.score += GAME_CONFIG.SCORE_PER_ROUND;
        AudioManager.play('snd_success');

        this.spawnScoreLabel(
            this.tapButton.x, this.tapButton.y,
            this.W * 0.87, this.H * 0.065,
            `+${GAME_CONFIG.SCORE_PER_ROUND}`,
        );

        this.spawnBurst(
            this.tapButton.x, this.tapButton.y,
            [COLORS.SUCCESS, COLORS.NEON_GREEN, COLORS.NEON_BLUE, COLORS.ACCENT],
            20, 120, 320,
        );

        this.cameras.main.flash(180, 80, 255, 80, false);
        this.scoreText.setText(`${this.score}`);
        this.popObject(this.scoreText);

        // Both faces flash green then restore original colors
        this.redrawPlusOneFace(COLORS.SUCCESS);
        this.redrawPlusTenFace(COLORS.SUCCESS);
        this.time.delayedCall(250, () => {
            if (this.plusOneFace?.active) this.redrawPlusOneFace(COLORS.BUTTON_SECONDARY);
            if (this.plusTenFace?.active) this.redrawPlusTenFace(COLORS.BUTTON_PRIMARY);
        });

        this.round++;
        this.time.delayedCall(650, () => this.startRound());
    }

    // ── Timer bar ───────────────────────────────────────────────────────────

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

    // ── Game over ───────────────────────────────────────────────────────────

    private triggerGameOver(voluntary = false): void {
        if (this.gameOver) return;
        this.gameOver    = true;
        this.roundActive = false;

        if (!voluntary) {
            AudioManager.play('snd_fail');
            this.cameras.main.shake(320, 0.018);
            this.cameras.main.flash(280, 255, 40, 40, false);

            // Both faces flash red
            this.redrawPlusOneFace(COLORS.FAIL);
            this.redrawPlusTenFace(COLORS.FAIL);
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
