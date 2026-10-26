import * as Phaser from 'phaser';
import BaseScene from './BaseScene';
import { SCENES } from '../utils/Scenes';
import { GlobVar } from '../../utils/Global';
import { THEME, INCREMENT_SCHEME } from '../constants/Colors';
import { GAME_CONFIG } from '../constants/GameConstants';
import { SaveManager } from '../managers/SaveManager';
import { AudioManager } from '../managers/AudioManager';
import { LeaderboardManager } from '../managers/LeaderboardManager';
import FPS from '../model/FPS';

interface GameData {
    resumeScore?: number;
    resumeRound?: number;
}

export type EndReason = 'overshoot' | 'timeout' | 'quit';

type IncrementAmount = 1 | 10 | 100 | 1000;

const INCREMENT_AMOUNTS: IncrementAmount[] = [1, 10, 100, 1000];

interface IncrementButton {
    amount:    IncrementAmount;
    container: Phaser.GameObjects.Container;
    face:      Phaser.GameObjects.Graphics;
    glow:      Phaser.GameObjects.Graphics;
    w:         number;
    h:         number;
    sideH:     number;
    radius:    number;
}

const MAX_PIPS = 12;
const TAPE_SIZE = 3;

export default class Game extends BaseScene {
    // ── State ───────────────────────────────────────────────────────────────
    private score         = 0;
    private round         = 1;
    private currentTotal  = 0;
    private targetTotal   = 0;
    private currentDelta  = 0;
    private tapsThisRound = 0;
    private history: number[] = [];
    private timeLeft      = 0;
    private timerDuration = GAME_CONFIG.TIMER_BASE_SEC * 1000;
    private roundActive   = false;
    private gameOver      = false;
    private paused        = false;

    // ── UI refs ─────────────────────────────────────────────────────────────
    private targetLabel!: Phaser.GameObjects.BitmapText;
    private targetText!:  Phaser.GameObjects.BitmapText;
    private secondsText!: Phaser.GameObjects.BitmapText;
    private scoreText!:   Phaser.GameObjects.BitmapText;
    private scoreStar!:   Phaser.GameObjects.Graphics;
    private roundText!:   Phaser.GameObjects.BitmapText;
    private ring!:        Phaser.GameObjects.Graphics;
    private tape!:        Phaser.GameObjects.Container;
    private pips!:        Phaser.GameObjects.Graphics;
    private pipsText!:    Phaser.GameObjects.BitmapText;
    private pauseOverlay?: Phaser.GameObjects.Container;

    // Index matches INCREMENT_AMOUNTS (0 → +1 … 3 → +1000), not screen position
    private buttons: IncrementButton[] = [];

    // ── Geometry ────────────────────────────────────────────────────────────
    private ringCX = 0;
    private ringCY = 0;
    private ringR  = 0;
    private ringThick = 0;
    private numberMaxW = 0;
    private numberFs   = 0;

    // hint debounce
    private lastHintRemaining = -1;

    constructor() {
        super({ key: SCENES.Game });
    }

    init(data: GameData): void {
        this.initScene();
        this.score         = data?.resumeScore ?? 0;
        this.round         = data?.resumeRound ?? 1;
        this.currentTotal  = 0;
        this.targetTotal   = 0;
        this.currentDelta  = 0;
        this.tapsThisRound = 0;
        this.history       = [];
        this.gameOver      = false;
        this.roundActive   = false;
        this.paused        = false;
        this.pauseOverlay  = undefined;
        this.timeLeft      = 0;
        this.timerDuration = GAME_CONFIG.TIMER_BASE_SEC * 1000;
        this.lastHintRemaining = -1;
        this.buttons       = [];
    }

    create(): void {
        GlobVar.consolelog(`Scene: ${SCENES.Game}`);
        AudioManager.init();

        this.createGradientBg(THEME.BG_TOP, THEME.BG_BOTTOM);
        this.createTopBar();
        this.createTimerRing();
        this.createTape();
        this.createPips();
        this.createIncrementButtons();
        this.fpsView = new FPS(this);

        this.cameras.main.fadeIn(300);
        this.time.delayedCall(500, () => this.startRound());
    }

    update(_t: number, delta: number): void {
        this.fpsView?.update();

        if (!this.roundActive || this.gameOver || this.paused) return;

        this.timeLeft -= delta;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.triggerGameOver('timeout');
        }
        this.redrawRing();
    }

    // ── Top bar: pause · round · score ──────────────────────────────────────

    private createTopBar(): void {
        const y = this.H * 0.088;

        this.createPauseButton(this.W * 0.108, y);

        this.roundText = this.label(this.CX, y, 'ROUND 1', this.H * 0.02, THEME.MUTED);

        this.scoreText = this.add.bitmapText(this.W * 0.95, y, 'coiny-bmp', '0', Math.floor(this.H * 0.034), 0)
            .setOrigin(1, 0.5).setTint(THEME.GOLD);

        this.scoreStar = this.add.graphics();
        this.drawStar(this.scoreStar, 0, 0, this.H * 0.013, THEME.STAR);
        this.placeScoreStar();
    }

    private placeScoreStar(): void {
        this.scoreStar.setPosition(this.scoreText.x - this.scoreText.width - this.H * 0.018, this.scoreText.y);
    }

    private drawStar(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color: number): void {
        const pts: Phaser.Math.Vector2[] = [];
        for (let i = 0; i < 10; i++) {
            const a   = -Math.PI / 2 + (i * Math.PI) / 5;
            const rad = i % 2 === 0 ? r : r * 0.45;
            pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * rad, y + Math.sin(a) * rad));
        }
        g.fillStyle(color, 1);
        g.fillPoints(pts, true);
    }

    // ── Timer ring with the round's signed number inside ────────────────────

    private createTimerRing(): void {
        this.ringR     = Math.min(this.W * 0.29, this.H * 0.135);
        this.ringThick = Math.max(8, Math.round(this.ringR * 0.11));
        this.ringCX    = this.CX;
        this.ringCY    = this.H * 0.29;
        this.numberMaxW = this.ringR * 1.6;
        this.numberFs   = Math.floor(this.H * 0.123);

        // Static drop edge under the dial
        const base = this.add.graphics();
        base.fillStyle(THEME.CARD_SHADOW, 1);
        base.fillCircle(this.ringCX, this.ringCY + this.ringThick * 0.8, this.ringR + this.ringThick / 2);

        this.ring = this.add.graphics();

        this.targetLabel = this.label(this.ringCX, this.ringCY - this.ringR * 0.52, 'ADD', this.H * 0.02, THEME.ADD);
        this.targetText  = this.label(this.ringCX, this.ringCY + this.ringR * 0.04, '', this.numberFs, THEME.ADD);
        this.secondsText = this.label(this.ringCX, this.ringCY + this.ringR * 0.6, '', this.H * 0.018, THEME.INK);

        this.redrawRing();
    }

    private redrawRing(): void {
        if (!this.ring) return;

        const ratio = this.timerDuration > 0
            ? Phaser.Math.Clamp(this.timeLeft / this.timerDuration, 0, 1)
            : 1;
        const { ringCX: cx, ringCY: cy, ringR: r, ringThick: t } = this;

        let color: number;
        if      (ratio > 0.5)  color = THEME.ADD;
        else if (ratio > 0.25) color = THEME.WARN;
        else                   color = THEME.SUB;

        const g = this.ring;
        g.clear();

        g.fillStyle(this.currentDelta < 0 ? THEME.SUB_TINT : THEME.CARD, 1);
        g.fillCircle(cx, cy, r);

        g.lineStyle(t, THEME.TRACK, 1);
        g.strokeCircle(cx, cy, r);

        if (ratio > 0.005) {
            const start = -Math.PI / 2;
            const end   = start + Math.PI * 2 * ratio;
            g.lineStyle(t, color, 1);
            g.beginPath();
            g.arc(cx, cy, r, start, end, false);
            g.strokePath();

            // Rounded caps
            g.fillStyle(color, 1);
            g.fillCircle(cx + Math.cos(start) * r, cy + Math.sin(start) * r, t / 2);
            g.fillCircle(cx + Math.cos(end) * r, cy + Math.sin(end) * r, t / 2);
        }

        // Last quarter: warning halo + seconds countdown
        const low = this.roundActive && ratio <= 0.25;
        if (low) {
            g.lineStyle(3, THEME.SUB, 0.35);
            g.strokeCircle(cx, cy, r + t * 0.9);
        }
        this.secondsText?.setText(low ? `${Math.ceil(this.timeLeft / 1000)}s` : '');
    }

    // ── Ghost tape: the last few numbers, fading out early in the round ─────

    private createTape(): void {
        this.tape = this.add.container(this.CX, this.H * 0.48).setAlpha(0);
    }

    private showTape(): void {
        this.tweens.killTweensOf(this.tape);
        this.tape.removeAll(true);

        const items = this.history.slice(-TAPE_SIZE);
        if (items.length === 0) {
            this.tape.setAlpha(0);
            return;
        }

        const fs    = Math.floor(this.H * 0.022);
        const chipH = Math.floor(this.H * 0.042);
        const padX  = Math.floor(this.W * 0.03);
        const gap   = Math.floor(this.W * 0.022);

        const caption = this.add.bitmapText(0, 0, 'coiny-bmp', 'BEFORE', Math.floor(this.H * 0.014), 0)
            .setOrigin(0, 0.5).setTint(THEME.MUTED);

        const chips: { g: Phaser.GameObjects.Graphics; t: Phaser.GameObjects.BitmapText; w: number }[] = [];
        items.forEach((v, i) => {
            const t = this.add.bitmapText(0, 0, 'coiny-bmp', this.formatDelta(v), fs, 0)
                .setOrigin(0.5).setTint(v < 0 ? THEME.SUB : THEME.ADD);
            const w = t.width + padX * 2;
            const g = this.add.graphics();
            this.drawCard(g, -w / 2, -chipH / 2, w, chipH, chipH * 0.3);
            // Older numbers are fainter
            const a = 0.45 + 0.4 * ((i + 1) / items.length);
            g.setAlpha(a);
            t.setAlpha(a);
            chips.push({ g, t, w });
        });

        const total = caption.width + gap + chips.reduce((s, c) => s + c.w, 0) + gap * (chips.length - 1);
        let x = -total / 2;
        caption.setX(x);
        this.tape.add(caption);
        x += caption.width + gap;
        for (const c of chips) {
            c.g.setX(x + c.w / 2);
            c.t.setX(x + c.w / 2);
            this.tape.add([c.g, c.t]);
            x += c.w + gap;
        }

        this.tape.setAlpha(1);
        this.tweens.add({ targets: this.tape, alpha: 0, delay: 1200, duration: 400, ease: 'Sine.easeIn' });
    }

    // ── Tap pips (taps made this round — never how many are needed) ─────────

    private createPips(): void {
        this.pips     = this.add.graphics();
        this.pipsText = this.label(this.CX, this.H * 0.558, '', this.H * 0.015, THEME.MUTED);
    }

    private redrawPips(): void {
        const r   = Math.max(5, Math.floor(this.H * 0.007));
        const gap = r * 1.4;
        const n   = Math.min(this.tapsThisRound, MAX_PIPS);
        const y   = this.H * 0.53;
        const w   = n * r * 2 + Math.max(0, n - 1) * gap;

        this.pips.clear();
        this.pips.fillStyle(THEME.GOLD, 1);
        for (let i = 0; i < n; i++) {
            this.pips.fillCircle(this.CX - w / 2 + r + i * (r * 2 + gap), y, r);
        }

        const t = this.tapsThisRound;
        this.pipsText.setText(t === 0 ? '' : `${t} tap${t === 1 ? '' : 's'}`);
    }

    // ── Increment buttons: +1000 · +100 · +10 on top, wide +1 under the thumb ──

    private createIncrementButtons(): void {
        const contentW = this.W * 0.897;
        const gap      = Math.floor(this.W * 0.03);
        const topW     = Math.floor((contentW - gap * 2) / 3);
        const topH     = Math.floor(this.H * 0.09);
        const bigW     = Math.floor(contentW);
        const bigH     = Math.floor(this.H * 0.123);
        const bigCY    = this.H - this.H * 0.04 - bigH / 2;
        const topCY    = bigCY - bigH / 2 - gap - topH / 2;
        const left     = this.CX - contentW / 2;

        const spec: Record<IncrementAmount, { x: number; y: number; w: number; h: number; fs: number }> = {
            1000: { x: left + topW / 2,                  y: topCY, w: topW, h: topH, fs: this.H * 0.031 },
            100:  { x: left + topW * 1.5 + gap,          y: topCY, w: topW, h: topH, fs: this.H * 0.033 },
            10:   { x: left + topW * 2.5 + gap * 2,      y: topCY, w: topW, h: topH, fs: this.H * 0.036 },
            1:    { x: this.CX,                          y: bigCY, w: bigW, h: bigH, fs: this.H * 0.057 },
        };

        for (const amount of INCREMENT_AMOUNTS) {
            const { x, y, w, h, fs } = spec[amount];
            const scheme = INCREMENT_SCHEME[amount];
            const sideH  = Math.round(h * 0.07);
            const radius = Math.floor(h * 0.26);

            const container = this.add.container(x, y);

            const side = this.add.graphics();
            side.fillStyle(scheme.side, 1);
            side.fillRoundedRect(-w / 2, -h / 2 + sideH, w, h - sideH, radius);

            const face = this.add.graphics();
            const glow = this.add.graphics().setAlpha(0);
            glow.lineStyle(8, scheme.face, 1);
            glow.strokeRoundedRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12, radius + 6);

            const text = this.add.bitmapText(0, -sideH / 2, 'coiny-bmp', `+${amount}`, Math.floor(fs), 0)
                .setOrigin(0.5).setTint(scheme.text);

            container.add([glow, side, face, text]);
            container.setSize(w, h);
            container.setInteractive({ useHandCursor: true });

            const btn: IncrementButton = { amount, container, face, glow, w, h, sideH, radius };
            this.buttons.push(btn);
            this.drawButtonFace(btn, scheme.face);

            const btnIndex = this.buttons.length - 1;
            container.on('pointerdown', () => {
                if (!this.roundActive || this.gameOver || this.paused) return;
                this.handleIncrementTap(amount, btnIndex);
            });
        }
    }

    private drawButtonFace(btn: IncrementButton, color: number): void {
        const { face, w, h, sideH, radius, amount } = btn;
        face.clear();
        face.fillStyle(color, 1);
        face.fillRoundedRect(-w / 2, -h / 2, w, h - sideH, radius);

        const border = INCREMENT_SCHEME[amount].border;
        if (border) {
            face.lineStyle(4, border, 1);
            face.strokeRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - sideH - 4, radius);
        }
    }

    private restoreButtonColors(): void {
        for (const btn of this.buttons) {
            this.drawButtonFace(btn, INCREMENT_SCHEME[btn.amount].face);
        }
    }

    // ── Increment tap handler ───────────────────────────────────────────────

    private handleIncrementTap(amount: IncrementAmount, btnIndex: number): void {
        this.currentTotal += amount;
        this.tapsThisRound++;
        this.redrawPips();
        this.updateHints();
        this.animateIncrementButton(btnIndex);
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
        const { container } = this.buttons[btnIndex];
        const txt = this.add.bitmapText(container.x, container.y - 30, 'coiny-bmp',
            `+${amount}`, Math.floor(this.H * 0.040), 0)
            .setOrigin(0.5).setDepth(30).setTint(INCREMENT_SCHEME[INCREMENT_AMOUNTS[btnIndex]].side);

        this.tweens.add({
            targets: txt,
            y: txt.y - 90, alpha: 0, scaleX: 1.4, scaleY: 1.4,
            duration: 600, ease: 'Power2',
            onComplete: () => txt.destroy(),
        });
    }

    private animateIncrementButton(btnIndex: number): void {
        const { container } = this.buttons[btnIndex];

        this.tweens.add({
            targets: container,
            scaleX: 0.92, scaleY: 0.92,
            duration: 65, yoyo: true, ease: 'Power2',
        });

        // Screen shake is reserved for failure; taps get particles only.
        const counts    = [5, 8, 12, 20];
        const minSpeeds = [50, 90, 140, 220];
        this.spawnBurst(
            container.x, container.y,
            [INCREMENT_SCHEME[INCREMENT_AMOUNTS[btnIndex]].face],
            counts[btnIndex], minSpeeds[btnIndex], minSpeeds[btnIndex] * 2.5,
        );
    }

    // ── Hints ────────────────────────────────────────────────────────────────

    private updateHints(): void {
        const remaining = this.targetTotal - this.currentTotal;
        if (remaining !== this.lastHintRemaining) {
            this.lastHintRemaining = remaining;
            this.applyButtonHints(remaining);
        }
    }

    private applyButtonHints(remaining: number): void {
        // Largest increment that exactly divides remaining and fits within one "digit"
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

        this.buttons.forEach((btn, i) => {
            this.tweens.killTweensOf(btn.glow);
            btn.glow.setAlpha(0);
            if (i === hintIdx) {
                this.tweens.add({
                    targets: btn.glow, alpha: 0.7,
                    duration: 280, yoyo: true, repeat: 4, ease: 'Sine.easeInOut',
                });
            }
        });
    }

    // ── Validation ───────────────────────────────────────────────────────────

    private validateCurrentProgress(): void {
        if (this.currentTotal > this.targetTotal) {
            this.showOvershootEffect();
            this.triggerGameOver('overshoot');
        } else if (this.currentTotal === this.targetTotal) {
            this.onRoundSuccess();
        }
    }

    private showOvershootEffect(): void {
        for (const btn of this.buttons) this.drawButtonFace(btn, THEME.RED);

        const txt = this.label(this.CX, this.H * 0.50, 'TOO MUCH!', this.H * 0.05, THEME.SUB).setDepth(20);
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

    private formatDelta(v: number): string {
        return v < 0 ? `-${-v}` : `+${v}`;
    }

    private startRound(): void {
        if (this.gameOver) return;

        // Previous round's number joins the tape before the new one appears
        if (this.currentDelta !== 0) this.history.push(this.currentDelta);

        this.currentTotal      = 0;
        this.tapsThisRound     = 0;
        this.currentDelta      = this.generateBalancedTarget();
        this.targetTotal      += this.currentDelta;
        this.timeLeft          = this.calculateTaskTime();
        this.timerDuration     = this.timeLeft;
        this.lastHintRemaining = -1;

        this.roundText.setText(`ROUND ${this.round}`);
        this.scoreText.setText(`${this.score}`);
        this.placeScoreStar();

        // Signed number: green "+7" ADD / red "-7" TAKE AWAY
        const isSub = this.currentDelta < 0;
        const color = isSub ? THEME.SUB : THEME.ADD;
        this.targetLabel.setText(isSub ? 'TAKE AWAY' : 'ADD').setTint(color);
        this.targetText.setText(this.formatDelta(this.currentDelta)).setTint(color).setScale(1);
        const fit = Math.min(1, this.numberMaxW / Math.max(1, this.targetText.width));

        this.targetText.setScale(fit * 2.2);
        this.tweens.add({
            targets: this.targetText,
            scaleX: fit, scaleY: fit,
            duration: 300, ease: 'Back.Out',
        });

        this.showTape();
        this.redrawPips();
        this.restoreButtonColors();
        this.applyButtonHints(-1);

        AudioManager.play('snd_click');
        this.roundActive = true;
        this.redrawRing();
    }

    // ── Round success ─────────────────────────────────────────────────────────

    private onRoundSuccess(): void {
        this.roundActive = false;
        this.score += GAME_CONFIG.SCORE_PER_ROUND;
        AudioManager.play('snd_success');

        this.spawnScoreLabel(
            this.CX, this.H * 0.55,
            this.scoreText.x - this.scoreText.width / 2, this.scoreText.y,
            `+${GAME_CONFIG.SCORE_PER_ROUND}`,
            '#b36b00',
        );

        this.spawnBurst(this.ringCX, this.ringCY, THEME.CANDY, 22, 120, 340);

        this.cameras.main.flash(160, 120, 220, 150, false);
        this.scoreText.setText(`${this.score}`);
        this.placeScoreStar();
        this.popObject(this.scoreText);

        // Flash all buttons green then restore
        for (const btn of this.buttons) this.drawButtonFace(btn, THEME.ADD);
        this.time.delayedCall(280, () => this.restoreButtonColors());

        this.round++;
        this.time.delayedCall(660, () => this.startRound());
    }

    // ── Pause sheet ──────────────────────────────────────────────────────────

    private createPauseButton(x: number, y: number): void {
        const size = Math.floor(this.H * 0.052);
        const barW = Math.max(4, Math.round(size * 0.14));
        const barH = Math.round(size * 0.4);
        const gap  = Math.round(size * 0.12);

        const container = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(THEME.CARD_SHADOW, 1);
        bg.fillCircle(0, 3, size / 2);
        bg.fillStyle(THEME.CARD, 1);
        bg.fillCircle(0, 0, size / 2);

        const bars = this.add.graphics();
        bars.fillStyle(THEME.INK, 1);
        bars.fillRoundedRect(-gap / 2 - barW, -barH / 2, barW, barH, barW / 2);
        bars.fillRoundedRect(gap / 2, -barH / 2, barW, barH, barW / 2);

        container.add([bg, bars]);
        container.setSize(size, size);
        container.setInteractive({ useHandCursor: true });
        container.on('pointerdown', () => {
            if (this.gameOver || this.paused) return;
            AudioManager.play('snd_click');
            this.openPause();
        });
    }

    private openPause(): void {
        this.paused = true;

        // Hide the number so pausing can't buy thinking time
        this.targetText.setVisible(false);
        this.targetLabel.setVisible(false);
        this.tape.setVisible(false);

        const sheetH = Math.floor(this.H * 0.47);
        const sheetY = this.H - sheetH;
        const pad    = Math.floor(this.W * 0.062);
        const innerW = this.W - pad * 2;
        const bh     = Math.floor(this.H * 0.08);
        const smH    = Math.floor(this.H * 0.066);
        const radius = Math.floor(this.W * 0.08);

        const overlay = this.add.container(0, 0).setDepth(50);

        // Full-screen scrim also swallows taps meant for the buttons underneath
        const scrim = this.add.rectangle(this.CX, this.CY, this.W, this.H, THEME.SCRIM, 0.35).setInteractive();

        const sheet = this.add.graphics();
        sheet.fillStyle(THEME.CARD, 1);
        sheet.fillRoundedRect(0, sheetY, this.W, sheetH + radius, radius);
        sheet.fillStyle(THEME.PIP_OFF, 1);
        sheet.fillRoundedRect(this.CX - 30, sheetY + 18, 60, 8, 4);

        const title = this.label(this.CX, sheetY + sheetH * 0.13, 'Paused', this.H * 0.045);
        const sub   = this.label(this.CX, sheetY + sheetH * 0.23, 'Timer stopped. The number is hidden.', this.H * 0.016, 0x52697b);

        // Round / score tiles
        const tileW = (innerW - pad * 0.5) / 2;
        const tileH = Math.floor(sheetH * 0.17);
        const tileY = sheetY + sheetH * 0.30;
        const tiles = this.add.graphics();
        tiles.fillStyle(0xe6eef2, 1);
        tiles.fillRoundedRect(pad, tileY, tileW, tileH, 18);
        tiles.fillRoundedRect(this.W - pad - tileW, tileY, tileW, tileH, 18);
        const t1x = pad + tileW / 2;
        const t2x = this.W - pad - tileW / 2;
        const tiles2 = [
            this.label(t1x, tileY + tileH * 0.3, 'ROUND', this.H * 0.013, 0x52697b),
            this.label(t1x, tileY + tileH * 0.66, `${this.round}`, this.H * 0.028),
            this.label(t2x, tileY + tileH * 0.3, 'SCORE', this.H * 0.013, 0x52697b),
            this.label(t2x, tileY + tileH * 0.66, `${this.score}`, this.H * 0.028, 0x52691e),
        ];

        const resume = this.createButton(this.CX, sheetY + sheetH * 0.64, innerW, bh, 'RESUME',
            this.H * 0.032, THEME.GO, THEME.GO_DARK, () => this.closePause());

        const halfW = (innerW - pad * 0.5) / 2;
        const rowY  = sheetY + sheetH * 0.84;
        const soundLabel = () => `SOUND: ${AudioManager.isSoundEnabled() ? 'ON' : 'OFF'}`;
        const sound = this.createButton(pad + halfW / 2, rowY, halfW, smH, soundLabel(),
            this.H * 0.019, THEME.SURFACE, THEME.CARD_SHADOW, () => {
                AudioManager.toggleSound();
                AudioManager.play('snd_click');
                const txt = sound.list.find((o) => o instanceof Phaser.GameObjects.BitmapText) as Phaser.GameObjects.BitmapText | undefined;
                txt?.setText(soundLabel());
            }, THEME.WHITE);

        const quit = this.createButton(this.W - pad - halfW / 2, rowY, halfW, smH, 'QUIT RUN',
            this.H * 0.019, THEME.SUB_TINT, 0xf5c2c8, () => {
                this.closePause();
                this.triggerGameOver('quit');
            }, THEME.SUB);

        // Only the sheet slides up; the scrim stays put
        const sheetC = this.add.container(0, sheetH, [sheet, title, sub, tiles, ...tiles2, resume, sound, quit]);
        overlay.add([scrim, sheetC]);
        scrim.setAlpha(0);
        this.tweens.add({ targets: sheetC, y: 0, duration: 220, ease: 'Cubic.Out' });
        this.tweens.add({ targets: scrim, alpha: 1, duration: 180 });
        this.pauseOverlay = overlay;
    }

    private closePause(): void {
        AudioManager.play('snd_click');
        this.pauseOverlay?.destroy();
        this.pauseOverlay = undefined;
        this.targetText.setVisible(true);
        this.targetLabel.setVisible(true);
        this.tape.setVisible(true);
        this.paused = false;
    }

    // ── Game over ─────────────────────────────────────────────────────────────

    private triggerGameOver(reason: EndReason): void {
        if (this.gameOver) return;
        this.gameOver    = true;
        this.roundActive = false;
        const voluntary  = reason === 'quit';

        if (!voluntary) {
            AudioManager.play('snd_fail');
            this.cameras.main.shake(320, 0.018);
            this.cameras.main.flash(280, 255, 80, 70, false);
        }

        LeaderboardManager.submitScore(this.score);

        this.time.delayedCall(voluntary ? 50 : 700, () => {
            this.fadeToScene(SCENES.End, {
                score:     this.score,
                round:     this.round,
                bestScore: SaveManager.getBestScore(),
                reason,
                needed:    this.targetTotal,
                tapped:    this.currentTotal,
                recent:    [...this.history, this.currentDelta].slice(-TAPE_SIZE),
            });
        });
    }
}
