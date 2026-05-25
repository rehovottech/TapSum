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
    private timerDuration   = GAME_CONFIG.BASE_TIMER;
    private roundActive     = false;
    private gameOver        = false;
    private isHolding       = false;
    private holdTimer?:     Phaser.Time.TimerEvent;

    // ── UI refs ─────────────────────────────────────────────────────────────
    private numberText!:   Phaser.GameObjects.BitmapText;
    private scoreText!:    Phaser.GameObjects.BitmapText;
    private roundText!:    Phaser.GameObjects.BitmapText;
    private tapCountText!: Phaser.GameObjects.BitmapText;
    private hintText!:     Phaser.GameObjects.BitmapText;
    private timerFill!:    Phaser.GameObjects.Graphics;
    private tapButton!:    Phaser.GameObjects.Container;
    private tapBtnFace!:   Phaser.GameObjects.Graphics;

    // ── Timer bar geometry ───────────────────────────────────────────────────
    private barW = 0;
    private barX = 0;
    private barY = 0;
    private barH = 0;

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
        this.timeLeft        = GAME_CONFIG.BASE_TIMER;
        this.timerDuration   = GAME_CONFIG.BASE_TIMER;
    }

    create(): void {
        GlobVar.consolelog(`Scene: ${SCENES.Game}`);
        AudioManager.init();

        this.createBackground();
        this.createHUD();
        this.createTapButton();
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

        // Horizontal split line
        const midY = this.H * 0.52;
        const line = this.add.graphics();
        line.lineStyle(1, COLORS.NEON_BLUE, 0.2);
        line.lineBetween(this.W * 0.08, midY, this.W * 0.92, midY);
    }

    // ── HUD (top half) ──────────────────────────────────────────────────────

    private createHUD(): void {
        const topY  = this.H * 0.065;
        const numY  = this.H * 0.30;
        const fs    = Math.floor(this.H * 0.032);

        // ← back button
        const back = this.add.bitmapText(this.W * 0.08, topY, 'coiny-bmp', '<-', Math.floor(this.H * 0.042), 0).setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
        back.on('pointerdown', () => {
            AudioManager.play('snd_click');
            this.triggerGameOver(true);
        });

        // Round label (top-center)
        this.roundText = this.add.bitmapText(this.CX, topY, 'coiny-bmp', 'Round 1', fs, 0).setOrigin(0.5)
        .setTint(Phaser.Display.Color.ValueToColor(COLORS.TEXT_NEON).color);

        // Score (top-right)
        this.scoreText = this.add.bitmapText(this.W * 0.92, topY, 'coiny-bmp', '0', Math.floor(this.H * 0.042), 0).setOrigin(1, 0.5)
        .setTint(Phaser.Display.Color.ValueToColor(COLORS.TEXT_GOLD).color);

        // Timer bar geometry
        this.barW = Math.floor(this.W * 0.72);
        this.barH = Math.floor(this.H * 0.014);
        this.barX = this.CX - this.barW / 2;
        this.barY = this.H * 0.115;

        // Bar track
        const barTrack = this.add.graphics();
        barTrack.fillStyle(0x222244, 1);
        barTrack.fillRoundedRect(this.barX, this.barY, this.barW, this.barH, this.barH / 2);

        this.timerFill = this.add.graphics();
        this.redrawTimerBar();

        // Big round number
        this.numberText = this.add.bitmapText(this.CX, numY, 'coiny-bmp', '?', Math.floor(this.H * 0.22), 0).setOrigin(0.5)
        .setTint(Phaser.Display.Color.ValueToColor(COLORS.TEXT_WHITE).color);

        // Hint: "tap N times"
        this.hintText = this.add.bitmapText(this.CX, this.H * 0.465, 'coiny-bmp', '', Math.floor(this.H * 0.028), 0).setOrigin(0.5).setVisible(false)
        .setTint(Phaser.Display.Color.ValueToColor(COLORS.TEXT_ACCENT).color);

        // Current tap count
        this.tapCountText = this.add.bitmapText(this.CX, this.H * 0.50, 'coiny-bmp', 'Taps: 0', Math.floor(this.H * 0.038), 0).setOrigin(0.5)
        .setTint(Phaser.Display.Color.ValueToColor(COLORS.TEXT_NEON).color);
    }

    // ── Tap button (bottom half) ────────────────────────────────────────────

    private createTapButton(): void {
        const btnY   = this.H * 0.74;
        const radius = Math.floor(this.W * 0.27);

        this.tapButton = this.add.container(this.CX, btnY);

        // Glow ring
        const glow = this.add.graphics();
        glow.lineStyle(8, COLORS.NEON_BLUE, 0.45);
        glow.strokeCircle(0, 0, radius + 14);

        // Shadow
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.4);
        shadow.fillCircle(6, 10, radius);

        // Side (3-D depth)
        const side = this.add.graphics();
        side.fillStyle(COLORS.BUTTON_PRIMARY_DARK, 1);
        side.fillCircle(0, 10, radius);

        // Face
        this.tapBtnFace = this.add.graphics();
        this.tapBtnFace.fillStyle(COLORS.BUTTON_PRIMARY, 1);
        this.tapBtnFace.fillCircle(0, 0, radius);

        // Highlight
        const hl = this.add.graphics();
        hl.fillStyle(0xffffff, 0.18);
        hl.fillEllipse(0, -radius * 0.32, radius * 1.3, radius * 0.45);

        // Label
        const lbl = this.add.text(0, 0, 'TAP', {
            fontFamily: 'Akt-SemiBold',
            fontSize: `${Math.floor(this.H * 0.065)}px`,
            color: '#ffffff',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        this.tapButton.add([glow, shadow, side, this.tapBtnFace, hl, lbl]);
        this.tapButton.setSize(radius * 2, radius * 2);
        this.tapButton.setInteractive({ useHandCursor: true });

        // Pulsing glow
        this.tweens.add({
            targets: glow, alpha: 0.15,
            duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });

        this.tapButton.on('pointerdown', () => this.onTap());
        this.tapButton.on('pointerup',   () => this.onRelease());
        this.tapButton.on('pointerout',  () => this.onRelease());
    }

    // ── Round logic ─────────────────────────────────────────────────────────

    private generateNextValue(): number {
        const negChance = this.round >= GAME_CONFIG.ROUND_LATE_NEG ? GAME_CONFIG.NEG_CHANCE_LATE
                        : this.round >= GAME_CONFIG.ROUND_MID_NEG  ? GAME_CONFIG.NEG_CHANCE_MID
                        : GAME_CONFIG.NEG_CHANCE_EARLY;

        const maxPos = this.round >= GAME_CONFIG.RANGE_HARD_ROUND ? 9
                     : this.round >= GAME_CONFIG.RANGE_MID_ROUND  ? 5
                     : 3;

        // Force positive if we have too many consecutive negatives or the total is already at floor
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

        this.roundText.setText(`Round ${this.round}`);
        this.scoreText.setText(`${this.score}`);
        this.tapCountText.setText('Taps: 0');
        this.animateRequiredTapsCounter(oldRequired, this.requiredTaps);

        // Number display with sign and color
        const isNeg  = this.currentNumber < 0;
        const prefix = isNeg ? '' : '+';
        this.numberText
            .setText(`${prefix}${this.currentNumber}`)
            .setScale(2.2)
            .setTint(isNeg ? COLORS.FAIL : COLORS.NEON_GREEN);

        // Pop-in tween; shake follows for negative numbers
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
            this.hintText.setText(`Tap ${to} times`);
            return;
        }
        const obj = { val: from };
        this.tweens.add({
            targets: obj,
            val: to,
            duration: 350,
            ease: 'Power2',
            onUpdate: () => this.hintText.setText(`Tap ${Math.round(obj.val)} times`),
            onComplete: () => this.hintText.setText(`Tap ${to} times`),
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

    // ── Tap / hold handler ──────────────────────────────────────────────────

    private onTap(): void {
        if (!this.roundActive || this.gameOver) return;

        this.isHolding = true;
        this.doTapIncrement();

        if (this.tapCount > this.requiredTaps) return; // already failed

        // Hold: after 300 ms starts repeating every 300 ms
        this.holdTimer = this.time.addEvent({
            delay: 300,
            loop: true,
            callback: () => {
                if (!this.roundActive || this.gameOver) { this.stopHold(); return; }
                this.doTapIncrement();
            },
        });
    }

    private onRelease(): void {
        if (!this.isHolding) return;
        this.stopHold();
        if (!this.roundActive || this.gameOver) return;
        if (this.tapCount === this.requiredTaps) this.onRoundSuccess();
    }

    private doTapIncrement(): void {
        this.tapCount++;
        AudioManager.play('snd_tap');

        this.tweens.add({
            targets: this.tapButton,
            scaleX: 0.86, scaleY: 0.86,
            duration: 65, yoyo: true, ease: 'Power2',
        });

        if (this.round >= GAME_CONFIG.DIFFICULTY_STEP) {
            this.cameras.main.shake(35, 0.005 + this.round * 0.0005);
        }

        this.spawnBurst(
            this.tapButton.x, this.tapButton.y,
            [COLORS.NEON_BLUE, COLORS.ACCENT, 0xffffff],
            6, 60, 140,
        );

        this.tapCountText.setText(`Taps: ${this.tapCount}`);
        this.popObject(this.tapCountText);

        if (this.tapCount > this.requiredTaps) {
            this.stopHold();
            this.triggerGameOver();
        }
    }

    private stopHold(): void {
        this.isHolding = false;
        this.holdTimer?.remove(false);
        this.holdTimer = undefined;
    }

    // ── Round success ───────────────────────────────────────────────────────

    private onRoundSuccess(): void {
        this.roundActive = false;
        this.score += GAME_CONFIG.SCORE_PER_ROUND;
        AudioManager.play('snd_success');

        // +requiredTaps × 1.5s; every 10th success gives ×2 instead
        const multiplier = this.round % GAME_CONFIG.TIME_BONUS_MILESTONE === 0
            ? GAME_CONFIG.TIME_BONUS_DOUBLE_MULTIPLIER
            : GAME_CONFIG.TIME_BONUS_MULTIPLIER;
        const cap          = this.requiredTaps * 1.25 * 1000;
        this.timeLeft      = Math.min(this.timeLeft + this.requiredTaps * 1000, cap);
        this.timeLeft      = Math.floor(this.timeLeft * multiplier);
        this.timerDuration = this.timeLeft; // bar rescales to the new total

        // Score fly to counter
        this.spawnScoreLabel(
            this.tapButton.x, this.tapButton.y,
            this.W * 0.87, this.H * 0.065,
            `+${GAME_CONFIG.SCORE_PER_ROUND}`,
        );

        // Celebration burst
        this.spawnBurst(
            this.tapButton.x, this.tapButton.y,
            [COLORS.SUCCESS, COLORS.NEON_GREEN, COLORS.NEON_BLUE, COLORS.ACCENT],
            20, 120, 320,
        );

        this.cameras.main.flash(180, 80, 255, 80, false);
        this.scoreText.setText(`${this.score}`);
        this.popObject(this.scoreText);

        // Button flash green briefly
        this.tapBtnFace.clear();
        this.tapBtnFace.fillStyle(COLORS.SUCCESS, 1);
        this.tapBtnFace.fillCircle(0, 0, Math.floor(this.W * 0.27));
        this.time.delayedCall(250, () => {
            if (this.tapBtnFace?.active) {
                this.tapBtnFace.clear();
                this.tapBtnFace.fillStyle(COLORS.BUTTON_PRIMARY, 1);
                this.tapBtnFace.fillCircle(0, 0, Math.floor(this.W * 0.27));
            }
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
        this.stopHold();

        if (!voluntary) {
            AudioManager.play('snd_fail');
            this.cameras.main.shake(320, 0.018);
            this.cameras.main.flash(280, 255, 40, 40, false);

            // Button flash red
            this.tapBtnFace.clear();
            this.tapBtnFace.fillStyle(COLORS.FAIL, 1);
            this.tapBtnFace.fillCircle(0, 0, Math.floor(this.W * 0.27));
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
