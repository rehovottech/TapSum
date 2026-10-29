import * as Phaser from 'phaser';
import BaseScene from './BaseScene';
import { SCENES } from '../utils/Scenes';
import { GlobVar } from '../../utils/Global';
import { THEME, INCREMENT_SCHEME } from '../constants/Colors';
import { GAME_CONFIG, TUTORIAL_NUMBERS, ProfileRules } from '../constants/GameConstants';
import { SaveManager } from '../managers/SaveManager';
import { AudioManager } from '../managers/AudioManager';
import { LeaderboardManager } from '../managers/LeaderboardManager';
import { Firebase } from '../../services/Firebase';
import { Mascot } from '../ui/Mascot';
import { Feel } from '../utils/Feel';
import { Ads } from '../../services/Ads';
import { PurchasesManager } from '../../services/Purchases';
import { NotificationManager } from '../../services/Notification';
import FPS from '../model/FPS';

interface GameData {
    resumeScore?: number;
    resumeRound?: number;
}

export type EndReason = 'wrong' | 'timeout' | 'quit';
type FailReason = 'wrong' | 'timeout';

type IncrementAmount = 1 | 10 | 100 | 1000 | -1;

const INCREMENT_AMOUNTS: IncrementAmount[] = [1, 10, 100, 1000, -1];

interface IncrementButton {
    amount:    IncrementAmount;
    container: Phaser.GameObjects.Container;
    face:      Phaser.GameObjects.Graphics;
    side:      Phaser.GameObjects.Graphics;
    glow:      Phaser.GameObjects.Graphics;
    text:      Phaser.GameObjects.BitmapText;
    locked:    boolean;
    w:         number;
    h:         number;
    sideH:     number;
    radius:    number;
}

const TAPE_SIZE = 3;

type PlaceValue = 1 | 10 | 100 | 1000;
const HEART_COLOR = 0xff5d73;

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
    private continueUsed  = false;   // rewarded "keep going" is offered once per run
    private paused        = false;
    private lives         = GAME_CONFIG.LIVES;
    private roundsCleared = 0;
    private streak        = 0;
    private worriedShown  = false;
    private roundNote     = '';      // pill shown when the round after a lost heart starts
    private premium       = false;   // premium owned: continues skip the rewarded ad
    private tutorial      = false;
    private profile!: ProfileRules;
    private lastTapAmount: IncrementAmount | 0 = 0;

    // ── UI refs ─────────────────────────────────────────────────────────────
    private targetLabel!: Phaser.GameObjects.BitmapText;
    private targetText!:  Phaser.GameObjects.BitmapText;
    private secondsText!: Phaser.GameObjects.BitmapText;
    private scoreText!:   Phaser.GameObjects.BitmapText;
    private scoreStar!:   Phaser.GameObjects.Graphics;
    private roundText!:   Phaser.GameObjects.BitmapText;
    private ring!:        Phaser.GameObjects.Graphics;
    private tape!:        Phaser.GameObjects.Container;
    private tray!:        Phaser.GameObjects.Container;
    private hintPill?:    Phaser.GameObjects.Container;
    private mascot!:      Mascot;
    private doneBtn?:     { container: Phaser.GameObjects.Container; glow: Phaser.GameObjects.Graphics };
    private hearts!:      Phaser.GameObjects.Graphics;
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
        this.continueUsed  = false;
        this.roundActive   = false;
        this.paused        = false;
        this.pauseOverlay  = undefined;
        this.timeLeft      = 0;
        this.timerDuration = GAME_CONFIG.TIMER_BASE_SEC * 1000;
        this.lastHintRemaining = -1;
        this.buttons       = [];
        this.lives         = GAME_CONFIG.LIVES;
        this.roundsCleared = 0;
        this.streak        = 0;
        this.worriedShown  = false;
        this.roundNote     = '';
        this.premium       = false;
        this.profile       = SaveManager.getProfile();
        this.tutorial      = !SaveManager.isTutorialDone();
        this.lastTapAmount = 0;
        this.hintPill      = undefined;
        this.doneBtn       = undefined;
        this.timerDuration = this.profile.timerBaseSec * 1000;
    }

    create(): void {
        GlobVar.consolelog(`Scene: ${SCENES.Game}`);
        AudioManager.init();

        // Each session pushes the "come back and play" reminder 3 days forward (GAME_ESSENTIALS § 6)
        NotificationManager.schedulePlayReminder().catch(() => {});
        PurchasesManager.isPremium().then((v) => { this.premium = v; });

        this.createSkyBg(0.9);
        this.createTopBar();
        this.createHearts();
        this.createTimerRing();
        this.createTape();
        this.createTray();
        this.createIncrementButtons();
        this.mascot = new Mascot(this, this.CX, this.H * 0.655, Math.floor(this.H * 0.038));
        this.fpsView = new FPS(this);

        this.cameras.main.fadeIn(300);
        this.track('game_start', { lives: GAME_CONFIG.LIVES, profile: this.profile.id, tutorial: this.tutorial });
        this.time.delayedCall(500, () => this.startRound());
    }

    update(_t: number, delta: number): void {
        this.fpsView?.update();

        if (!this.roundActive || this.gameOver || this.paused) return;
        if (this.inTutorial()) return;   // guided rounds have no timer

        this.timeLeft -= delta;
        if (!this.worriedShown && this.timeLeft < this.timerDuration * 0.25) {
            this.worriedShown = true;
            this.mascot.setMood('worried');
        }
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.onFail('timeout');
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

    // ── Hearts under the round label ────────────────────────────────────────

    private createHearts(): void {
        this.hearts = this.add.graphics();
        this.redrawHearts(false);
    }

    private redrawHearts(justLost: boolean): void {
        const r     = Math.max(9, Math.floor(this.H * 0.013));
        const gap   = r * 0.9;
        const n     = GAME_CONFIG.LIVES;
        const y     = this.H * 0.122;
        const total = n * r * 2 + (n - 1) * gap;

        this.hearts.clear();
        for (let i = 0; i < n; i++) {
            const x = this.CX - total / 2 + r + i * (r * 2 + gap);
            this.drawHeart(this.hearts, x, y, r, i < this.lives ? HEART_COLOR : THEME.PIP_OFF);
        }

        if (justLost) {
            // The heart that just emptied pops out and fades
            const x   = this.CX - total / 2 + r + this.lives * (r * 2 + gap);
            const pop = this.add.graphics().setDepth(30);
            this.drawHeart(pop, 0, 0, r, HEART_COLOR);
            pop.setPosition(x, y);
            this.tweens.add({
                targets: pop, y: y - r * 3, scaleX: 1.8, scaleY: 1.8, alpha: 0,
                duration: 600, ease: 'Power2', onComplete: () => pop.destroy(),
            });
            this.tweens.add({ targets: this.hearts, x: { from: -10, to: 0 }, duration: 380, ease: 'Elastic.Out' });
        }
    }

    private drawHeart(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color: number): void {
        const h = r * 0.55;
        g.fillStyle(color, 1);
        g.fillCircle(x - h, y - r * 0.2, h);
        g.fillCircle(x + h, y - r * 0.2, h);
        g.fillTriangle(x - r * 1.08, y - r * 0.05, x + r * 1.08, y - r * 0.05, x, y + r * 0.95);
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
        this.tape = this.add.container(this.CX, this.H * 0.462).setAlpha(0);
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

    // ── Bead tray: what you have built this round, in place-value pieces ──
    // +1 = bead, +10 = rod, +100 = flat, +1000 = cube (the pieces teachers use).

    private createTray(): void {
        this.tray = this.add.container(this.CX, this.H * 0.548);
    }

    private redrawTray(): void {
        this.tray.removeAll(true);
        this.tray.setScale(1);

        // The tray shows what you have built so far, broken into place values,
        // so 20 then -1 visibly regroups into 1 rod + 9 beads.
        const total = Math.max(0, this.currentTotal);
        const counts: [PlaceValue, number][] = [
            [1000, Math.floor(total / 1000)],
            [100,  Math.floor(total / 100) % 10],
            [10,   Math.floor(total / 10) % 10],
            [1,    total % 10],
        ];

        const u = Math.max(8, this.H * 0.021);
        const shape: Record<PlaceValue, { w: number; h: number; gap: number }> = {
            1000: { w: u * 2.2, h: u * 2.2, gap: u * 0.4 },
            100:  { w: u * 1.9, h: u * 1.9, gap: u * 0.35 },
            10:   { w: u * 0.7, h: u * 2.2, gap: u * 0.4 },
            1:    { w: u * 1.1, h: u * 1.1, gap: u * 0.35 },
        };

        let x = 0;
        const groupGap = u * 1.4;
        const items: Phaser.GameObjects.GameObject[] = [];
        let newest: Phaser.GameObjects.Graphics | undefined;

        for (const [amt, count] of counts) {
            if (count === 0) continue;
            const { w, h, gap } = shape[amt];
            const scheme = INCREMENT_SCHEME[amt];
            // Thousands can exceed 9; draw up to 9 and label the rest
            const shown = Math.min(count, 9);

            for (let i = 0; i < shown; i++) {
                const g = this.add.graphics();
                g.fillStyle(scheme.side, 1);
                if (amt === 1) g.fillCircle(0, 1.5, w / 2);
                else g.fillRoundedRect(-w / 2, -h / 2 + 2, w, h, u * 0.2);
                g.fillStyle(scheme.face, 1);
                if (amt === 1) g.fillCircle(0, 0, w / 2);
                else g.fillRoundedRect(-w / 2, -h / 2, w, h, u * 0.2);
                if (amt === 100 || amt === 1000) {
                    // grid lines so a flat/cube reads as "made of tens"
                    g.lineStyle(1, scheme.side, 0.7);
                    for (let k = 1; k < 4; k++) {
                        g.lineBetween(-w / 2 + (w * k) / 4, -h / 2 + 2, -w / 2 + (w * k) / 4, h / 2 - 2);
                        g.lineBetween(-w / 2 + 2, -h / 2 + (h * k) / 4, w / 2 - 2, -h / 2 + (h * k) / 4);
                    }
                }
                g.setPosition(x + w / 2, u * 1.1 - h / 2);
                items.push(g);
                if (amt === this.lastTapAmount && i === shown - 1) newest = g;
                x += w + gap;
            }
            if (count > shown) {
                const more = this.add.bitmapText(x + u * 0.2, u * 0.2, 'coiny-bmp', `+${count - shown}`, Math.floor(u * 1.5), 0)
                    .setOrigin(0, 0.5).setTint(scheme.side);
                items.push(more);
                x += more.width + u * 0.6;
            }
            x += groupGap;
        }

        if (items.length === 0) return;
        const width = x - groupGap;
        for (const it of items) (it as unknown as Phaser.GameObjects.Components.Transform).x -= width / 2;
        this.tray.add(items);

        const maxW = this.W * 0.9;
        if (width > maxW) this.tray.setScale(maxW / width);

        if (newest) {
            newest.setScale(0);
            this.tweens.add({ targets: newest, scaleX: 1, scaleY: 1, duration: 180, ease: 'Back.Out' });
        }
    }

    private resetTray(): void {
        this.lastTapAmount = 0;
        this.redrawTray();
    }

    // ── Guided first game ───────────────────────────────────────────────────

    private inTutorial(): boolean {
        return this.tutorial && this.round <= TUTORIAL_NUMBERS.length;
    }

    private showHint(text: string): void {
        this.hideHint();
        const fs  = Math.floor(this.H * 0.02);
        const t   = this.add.bitmapText(0, 0, 'coiny-bmp', text, fs, 0).setOrigin(0.5).setTint(THEME.INK);
        const maxW = this.W * 0.86;
        if (t.width > maxW) t.setScale(maxW / t.width);
        const w   = t.width * t.scaleX + this.W * 0.08;
        const h   = Math.floor(this.H * 0.05);
        const bg  = this.add.graphics();
        this.drawCard(bg, -w / 2, -h / 2, w, h, h / 2);
        this.hintPill = this.add.container(this.CX, this.H * 0.462, [bg, t]).setDepth(15).setScale(0.6).setAlpha(0);
        this.tweens.add({ targets: this.hintPill, scaleX: 1, scaleY: 1, alpha: 1, duration: 260, ease: 'Back.Out' });
    }

    private hideHint(): void {
        this.hintPill?.destroy();
        this.hintPill = undefined;
    }

    private tutorialHint(): string {
        const [a, b, c] = TUTORIAL_NUMBERS;
        switch (this.round) {
            case 1:  return `Tap +1 ${a} times, then DONE`;
            case 2:  return `${a} + ${b} = ${a + b}. Make ${a + b}, then DONE`;
            default: return `Add ${c} from memory, then DONE`;
        }
    }

    /** In the guided rounds a mistake just clears the tray and lets them retry. */
    private tutorialRetry(): void {
        AudioManager.play('snd_fail');
        Feel.fail();
        this.mascot.setMood('sad', 700).wobble();
        this.currentTotal  = 0;
        this.tapsThisRound = 0;
        this.resetTray();
        this.restoreButtonColors();
        this.showHint('Not quite! Try again');
        this.time.delayedCall(1200, () => {
            if (this.roundActive && this.inTutorial()) this.showHint(this.tutorialHint());
        });
    }

    // ── Increment buttons: +1000 · +100 · +10 on top, wide +1 under the thumb ──

    private createIncrementButtons(): void {
        const contentW = this.W * 0.897;
        const gap      = Math.floor(this.W * 0.03);
        const topW     = Math.floor((contentW - gap * 2) / 3);
        const topH     = Math.floor(this.H * 0.09);
        const bigH     = Math.floor(this.H * 0.123);
        const minusW   = Math.floor(contentW * 0.2);
        const doneW    = Math.floor(contentW * 0.28);
        const plusW    = Math.floor(contentW - minusW - doneW - gap * 2);
        const bigCY    = this.H - this.H * 0.04 - bigH / 2;
        const topCY    = bigCY - bigH / 2 - gap - topH / 2;
        const left     = this.CX - contentW / 2;

        const spec: Record<IncrementAmount, { x: number; y: number; w: number; h: number; fs: number }> = {
            1000: { x: left + topW / 2,                  y: topCY, w: topW, h: topH, fs: this.H * 0.031 },
            100:  { x: left + topW * 1.5 + gap,          y: topCY, w: topW, h: topH, fs: this.H * 0.033 },
            10:   { x: left + topW * 2.5 + gap * 2,      y: topCY, w: topW, h: topH, fs: this.H * 0.036 },
            1:    { x: left + minusW + gap + plusW / 2,  y: bigCY, w: plusW, h: bigH, fs: this.H * 0.057 },
            [-1]: { x: left + minusW / 2,                y: bigCY, w: minusW, h: bigH, fs: this.H * 0.045 },
        };

        for (const amount of INCREMENT_AMOUNTS) {
            const { x, y, w, h, fs } = spec[amount];
            const scheme = INCREMENT_SCHEME[amount];
            const sideH  = Math.round(h * 0.07);
            const radius = Math.floor(h * 0.26);

            const container = this.add.container(x, y);

            const side = this.add.graphics();

            const face = this.add.graphics();
            const glow = this.add.graphics().setAlpha(0);
            glow.lineStyle(8, scheme.face, 1);
            glow.strokeRoundedRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12, radius + 6);

            const text = this.add.bitmapText(0, -sideH / 2, 'coiny-bmp', this.formatDelta(amount), Math.floor(fs), 0)
                .setOrigin(0.5).setTint(scheme.text);

            container.add([glow, side, face, text]);
            container.setSize(w, h);
            container.setInteractive({ useHandCursor: true });

            // +1 and -1 are open from the start; the rest unlock as the total grows
            const locked = amount !== 1 && amount !== -1;
            const btn: IncrementButton = { amount, container, face, side, glow, text, locked, w, h, sideH, radius };
            this.buttons.push(btn);
            this.drawButtonFace(btn, scheme.face);

            const btnIndex = this.buttons.length - 1;
            container.on('pointerdown', () => {
                if (!this.roundActive || this.gameOver || this.paused) return;
                if (this.buttons[btnIndex].locked) {
                    this.tweens.add({ targets: container, x: { from: x - 6, to: x }, duration: 260, ease: 'Elastic.Out' });
                    return;
                }
                this.handleIncrementTap(amount, btnIndex);
            });
        }

        this.createDoneButton(left + contentW - doneW / 2, bigCY, doneW, bigH);
    }

    // ── DONE: the player locks in the total they remember ────────────────────

    private createDoneButton(x: number, y: number, w: number, h: number): void {
        const sideH  = Math.round(h * 0.07);
        const radius = Math.floor(h * 0.26);
        const container = this.add.container(x, y);

        const glow = this.add.graphics().setAlpha(0);
        glow.lineStyle(8, THEME.GO, 1);
        glow.strokeRoundedRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12, radius + 6);
        const g = this.add.graphics();
        g.fillStyle(THEME.GO_DARK, 1);
        g.fillRoundedRect(-w / 2, -h / 2 + sideH, w, h - sideH, radius);
        g.fillStyle(THEME.GO, 1);
        g.fillRoundedRect(-w / 2, -h / 2, w, h - sideH, radius);
        // Tick mark drawn above the label
        const tick = this.add.graphics();
        tick.lineStyle(Math.max(4, h * 0.06), THEME.INK, 1);
        tick.beginPath();
        tick.moveTo(-h * 0.13, -h * 0.2);
        tick.lineTo(-h * 0.03, -h * 0.1);
        tick.lineTo(h * 0.15, -h * 0.3);
        tick.strokePath();
        const text = this.add.bitmapText(0, h * 0.12, 'coiny-bmp', 'DONE', Math.floor(this.H * 0.026), 0)
            .setOrigin(0.5).setTint(THEME.INK);

        container.add([glow, g, tick, text]);
        container.setSize(w, h).setInteractive({ useHandCursor: true });
        container.on('pointerdown', () => {
            if (!this.roundActive || this.gameOver || this.paused) return;
            this.tweens.add({ targets: container, scaleX: 0.92, scaleY: 0.92, duration: 65, yoyo: true, ease: 'Power2' });
            if (this.tapsThisRound === 0) {
                this.tweens.add({ targets: container, x: { from: x - 6, to: x }, duration: 260, ease: 'Elastic.Out' });
                return;
            }
            this.submitAnswer();
        });
        this.doneBtn = { container, glow };
    }

    private submitAnswer(): void {
        if (this.currentTotal === this.targetTotal) {
            this.onRoundSuccess();
        } else if (this.inTutorial()) {
            this.tutorialRetry();
        } else {
            this.onFail('wrong');
        }
    }

    private drawButtonFace(btn: IncrementButton, color: number): void {
        const { face, side, text, w, h, sideH, radius, amount, locked } = btn;
        const scheme = INCREMENT_SCHEME[amount];

        side.clear();
        side.fillStyle(locked ? THEME.CARD_SHADOW : scheme.side, 1);
        side.fillRoundedRect(-w / 2, -h / 2 + sideH, w, h - sideH, radius);

        face.clear();
        face.fillStyle(locked ? THEME.SURFACE : color, 1);
        face.fillRoundedRect(-w / 2, -h / 2, w, h - sideH, radius);

        text.setTint(locked ? THEME.PIP_OFF : scheme.text);

        const border = scheme.border;
        if (border && !locked) {
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
        if (amount < 0 && this.currentTotal + amount < 0) {
            const { container } = this.buttons[btnIndex];
            this.tweens.add({ targets: container, x: { from: container.x - 6, to: container.x }, duration: 260, ease: 'Elastic.Out' });
            return;
        }
        this.currentTotal += amount;
        this.tapsThisRound++;
        this.lastTapAmount = amount;
        this.redrawTray();
        this.updateHints();
        this.mascot.nudge();
        if (amount === 1) Feel.tap(); else Feel.bigTap();
        this.animateIncrementButton(btnIndex);
        this.spawnFloatingLabel(btnIndex, amount);

        const sndMap: Record<IncrementAmount, string> = {
            1:    'snd_tap',
            10:   'snd_click',
            100:  'snd_tap',
            1000: 'snd_click',
            [-1]: 'snd_tap',
        };
        // Pitch climbs a little with every tap in the round; -1 drops it
        AudioManager.play(sndMap[amount], amount < 0 ? 0.8 : 1 + Math.min(this.tapsThisRound, 15) * 0.035);
    }

    private spawnFloatingLabel(btnIndex: number, amount: number): void {
        const { container } = this.buttons[btnIndex];
        const txt = this.add.bitmapText(container.x, container.y - 30, 'coiny-bmp',
            this.formatDelta(amount), Math.floor(this.H * 0.040), 0)
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
        const counts    = [5, 8, 12, 20, 5];
        const minSpeeds = [50, 90, 140, 220, 50];
        this.spawnBurst(
            container.x, container.y,
            [INCREMENT_SCHEME[INCREMENT_AMOUNTS[btnIndex]].face],
            counts[btnIndex], minSpeeds[btnIndex], minSpeeds[btnIndex] * 2.5,
        );
    }

    // ── Unlocking increment buttons ─────────────────────────────────────────

    /** Opens every button the running total has reached. Returns true if one opened. */
    private unlockButtons(): boolean {
        let opened = false;
        this.buttons.forEach((btn, i) => {
            if (!btn.locked || this.targetTotal < btn.amount) return;
            btn.locked = false;
            opened = true;
            this.drawButtonFace(btn, INCREMENT_SCHEME[btn.amount].face);
            this.celebrateUnlock(i);
            this.track('button_unlocked', { amount: btn.amount, round: this.round });
        });
        return opened;
    }

    private celebrateUnlock(btnIndex: number): void {
        const { container, amount } = this.buttons[btnIndex];
        AudioManager.play('snd_reward');
        this.mascot?.setMood('wow', 1000);

        this.tweens.add({
            targets: container,
            scaleX: 1.15, scaleY: 1.15,
            duration: 180, yoyo: true, repeat: 1, ease: 'Back.Out',
        });
        this.spawnBurst(container.x, container.y, [INCREMENT_SCHEME[amount].face, THEME.WHITE], 18, 120, 300);

        const txt = this.label(container.x, container.y - container.height * 0.85,
            `NEW +${amount}!`, this.H * 0.03, INCREMENT_SCHEME[amount].face).setDepth(30).setScale(0.4);
        this.tweens.add({
            targets: txt, scaleX: 1, scaleY: 1, duration: 260, ease: 'Back.Out',
            onComplete: () => this.tweens.add({
                targets: txt, alpha: 0, y: txt.y - 40, delay: 700, duration: 400,
                onComplete: () => txt.destroy(),
            }),
        });
    }

    // ── Hints ────────────────────────────────────────────────────────────────

    /** Button glows give the answer away, so only beginners get them. */
    private hintsOn(): boolean {
        return this.inTutorial() || this.profile.id === 'little';
    }

    private updateHints(): void {
        if (!this.hintsOn()) return;
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
                if (this.buttons[i]?.locked) continue;
                const amt = INCREMENT_AMOUNTS[i];
                if (amt < 0) continue;
                if (remaining % amt === 0 && remaining < amt * 10) {
                    hintIdx = i;
                    break;
                }
            }
        }

        if (remaining < 0 && this.hintsOn()) hintIdx = INCREMENT_AMOUNTS.indexOf(-1);

        // In the guided rounds, point at DONE once the total is right
        if (this.doneBtn) {
            this.tweens.killTweensOf(this.doneBtn.glow);
            this.doneBtn.glow.setAlpha(0);
            if (remaining === 0 && this.inTutorial()) {
                this.tweens.add({ targets: this.doneBtn.glow, alpha: 0.8, duration: 300, yoyo: true, repeat: -1 });
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

    // ── Round logic ──────────────────────────────────────────────────────────

    private generateBalancedTarget(): number {
        if (this.inTutorial()) return TUTORIAL_NUMBERS[this.round - 1];

        const band = this.profile.ranges.find((r) => this.round <= r.upTo) ?? this.profile.ranges[this.profile.ranges.length - 1];
        let value  = Phaser.Math.Between(band.min, band.max);

        const neg = this.profile.negatives.find((n) => this.round <= n.upTo)?.chance ?? 0;
        // Only take away when the running total stays above zero
        if (Phaser.Math.Between(1, 100) <= neg && this.targetTotal > value) {
            value = -value;
        }
        return value;
    }

    private calculateTaskTime(): number {
        const p     = this.profile;
        const extra = Math.floor(this.round / GAME_CONFIG.TIMER_STEP_ROUNDS) * p.timerStepSec;
        return Math.min(p.timerMaxSec, p.timerBaseSec + extra) * 1000;
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
        this.worriedShown      = false;
        this.currentDelta      = this.generateBalancedTarget();
        this.targetTotal      += this.currentDelta;
        this.timeLeft          = this.calculateTaskTime();
        this.timerDuration     = this.timeLeft;
        this.lastHintRemaining = -1;

        // A newly opened button gets a moment of extra time to notice it
        if (this.unlockButtons()) {
            this.timeLeft     += GAME_CONFIG.UNLOCK_BONUS_MS;
            this.timerDuration = this.timeLeft;
        }

        this.roundText.setText(this.inTutorial() ? 'PRACTICE' : `ROUND ${this.round}`);
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

        if (this.inTutorial()) {
            this.showHint(this.tutorialHint());
        } else {
            this.hideHint();
            // The note sits where the tape does, and it already says where the chain stands
            if (this.roundNote) {
                this.tape.setAlpha(0);
                this.showHint(this.roundNote);
                this.roundNote = '';
                this.time.delayedCall(1400, () => this.hideHint());
            } else {
                this.showTape();
            }
        }
        this.resetTray();
        this.restoreButtonColors();
        this.applyButtonHints(Number.NaN);   // NaN = clear all hints
        this.mascot.look(0, -1).setMood('eat', 380);
        this.time.delayedCall(420, () => this.mascot.look(0, 0));

        AudioManager.play('snd_click');
        this.roundActive = true;
        this.redrawRing();
    }

    // ── Round success ─────────────────────────────────────────────────────────

    private onRoundSuccess(): void {
        this.roundActive = false;
        this.roundsCleared++;
        this.streak++;
        this.score += GAME_CONFIG.SCORE_PER_ROUND;
        AudioManager.play('snd_success');
        Feel.success();
        this.mascot.setMood('happy', 640).hop();

        if (this.tutorial && this.round === TUTORIAL_NUMBERS.length) {
            this.tutorial = false;
            SaveManager.setTutorialDone(true);
            this.track('tutorial_complete', { profile: this.profile.id });
            this.showHint("You're ready! Now beat the timer");
            this.time.delayedCall(1400, () => this.hideHint());
        } else if (this.inTutorial()) {
            this.showHint('Great job!');
        }

        if (this.streak > 0 && this.streak % 5 === 0) this.celebrateStreak();

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
        // Give the "you're ready" message a moment before the timer starts
        const wait = this.round === TUTORIAL_NUMBERS.length + 1 && this.roundsCleared === TUTORIAL_NUMBERS.length ? 1500 : 660;
        this.time.delayedCall(wait, () => this.startRound());
    }

    private celebrateStreak(): void {
        this.spawnConfetti(36);
        AudioManager.play('snd_reward');
        this.mascot.setMood('happy', 1400);
        const txt = this.label(this.CX, this.H * 0.462, `${this.streak} IN A ROW!`, this.H * 0.038, THEME.GOLD)
            .setDepth(30).setScale(0.3);
        this.tweens.add({
            targets: txt, scaleX: 1, scaleY: 1, duration: 280, ease: 'Back.Out',
            onComplete: () => this.tweens.add({
                targets: txt, alpha: 0, y: txt.y - 50, delay: 600, duration: 400,
                onComplete: () => txt.destroy(),
            }),
        });
        this.track('streak', { length: this.streak, round: this.round });
    }

    // ── Wrong answer: lose a heart, show the real total, keep or restart the chain ──

    private onFail(reason: FailReason): void {
        if (!this.roundActive || this.gameOver) return;
        this.roundActive = false;
        this.streak = 0;
        this.lives = Math.max(0, this.lives - 1);
        this.redrawHearts(true);
        Feel.fail();
        this.mascot.setMood('sad', GAME_CONFIG.REVEAL_MS).wobble();
        this.track('life_lost', { round: this.round, reason, lives_left: this.lives });

        if (this.lives <= 0 && !this.canOfferContinue()) {
            this.triggerGameOver(reason);
            return;
        }

        AudioManager.play('snd_fail');
        this.cameras.main.shake(200, 0.006);
        this.revealTotal(reason);

        if (this.lives <= 0) {
            this.time.delayedCall(450, () => this.showContinueOffer(reason));
        } else if (this.canOfferKeepChain()) {
            this.time.delayedCall(GAME_CONFIG.OFFER_DELAY_MS, () => this.showKeepChainOffer());
        } else {
            this.time.delayedCall(GAME_CONFIG.REVEAL_MS, () => this.nextRound(false));
        }
    }

    /** Next round, either adding onto the old total or a new chain from 0. */
    private nextRound(keepChain: boolean): void {
        if (this.gameOver) return;
        if (keepChain) {
            this.roundNote = `Keep going from ${this.targetTotal}`;
        } else {
            this.targetTotal  = 0;
            this.currentDelta = 0;   // keeps the failed number off the tape
            this.history      = [];
            this.roundNote    = 'New chain! Start from 0';
        }
        this.track(keepChain ? 'chain_kept' : 'chain_reset', { round: this.round, premium: this.premium });
        this.round++;
        this.startRound();
    }

    // ── Lost a heart: keep the chain (rewarded ad, or free with premium) ────

    private canOfferKeepChain(): boolean {
        return !this.inTutorial() && (this.premium || Ads.rewardedAvailable());
    }

    private showKeepChainOffer(): void {
        this.showContinueSheet({
            title:    'Keep your chain?',
            sub:      'Carry on from the total, or start again from 0.',
            adLabel:  'WATCH AD  CONTINUE',
            freeLabel: 'CONTINUE',
            noLabel:  'NEW CHAIN',
            adReason: 'keep_chain',
            onContinue: () => this.nextRound(true),
            onDecline:  () => this.nextRound(false),
        });
    }

    // ── Out of hearts: one more heart and the chain, once per run ───────────

    private canOfferContinue(): boolean {
        return !this.continueUsed && !this.inTutorial() && (this.premium || Ads.rewardedAvailable());
    }

    private showContinueOffer(reason: FailReason): void {
        this.continueUsed = true;
        this.showContinueSheet({
            title:    'Keep going?',
            sub:      'Get one more heart and carry on from the total.',
            adLabel:  'WATCH AD  +1 HEART',
            freeLabel: 'CONTINUE  +1 HEART',
            noLabel:  'NO THANKS',
            adReason: 'continue',
            onContinue: () => {
                this.track('continue_used', { round: this.round, score: this.score, premium: this.premium });
                this.lives = 1;
                this.redrawHearts(false);
                AudioManager.play('snd_reward');
                Feel.success();
                this.mascot.setMood('happy', 900);
                this.nextRound(true);
            },
            onDecline: () => this.triggerGameOver(reason),
        });
    }

    /**
     * Bottom sheet with a continue button (rewarded ad, or no ad with premium), a decline
     * button, and a link to buy premium. A skipped or failed ad counts as declining.
     */
    private showContinueSheet(o: {
        title: string; sub: string;
        adLabel: string; freeLabel: string; noLabel: string;
        adReason: string;
        onContinue: () => void;
        onDecline: () => void;
    }): void {
        if (this.gameOver) return;
        if (this.paused) this.closePause();

        const sheetH = Math.floor(this.H * 0.44);
        const sheetY = this.H - sheetH;
        const pad    = Math.floor(this.W * 0.062);
        const innerW = this.W - pad * 2;
        const bh     = Math.floor(this.H * 0.08);
        const smH    = Math.floor(this.H * 0.066);
        const radius = Math.floor(this.W * 0.08);

        const overlay = this.add.container(0, 0).setDepth(50);
        const scrim = this.add.rectangle(this.CX, this.CY, this.W, this.H, THEME.SCRIM, 0.35).setInteractive();

        const sheet = this.add.graphics();
        sheet.fillStyle(THEME.CARD, 1);
        sheet.fillRoundedRect(0, sheetY, this.W, sheetH + radius, radius);
        sheet.fillStyle(THEME.PIP_OFF, 1);
        sheet.fillRoundedRect(this.CX - 30, sheetY + 18, 60, 8, 4);

        const title = this.label(this.CX, sheetY + sheetH * 0.14, o.title, this.H * 0.045);
        const sub   = this.label(this.CX, sheetY + sheetH * 0.26, o.sub, this.H * 0.016, 0x52697b);

        let busy = false;
        const close = () => { overlay.destroy(); };
        const finish = (kept: boolean) => {
            close();
            if (!this.scene.isActive() || this.gameOver) return;
            if (kept) o.onContinue(); else o.onDecline();
        };

        const go = this.createButton(this.CX, sheetY + sheetH * 0.45, innerW, bh, this.premium ? o.freeLabel : o.adLabel,
            this.H * 0.028, THEME.GO, THEME.GO_DARK, async () => {
                if (busy) return;
                busy = true;
                AudioManager.play('snd_click');
                finish(this.premium || await Ads.showRewarded(o.adReason, 8000));
            });

        const no = this.createButton(this.CX, sheetY + sheetH * 0.67, innerW, smH, o.noLabel,
            this.H * 0.022, THEME.SURFACE, THEME.CARD_SHADOW, () => {
                if (busy) return;
                busy = true;
                AudioManager.play('snd_click');
                finish(false);
            }, THEME.INK);

        const items: Phaser.GameObjects.GameObject[] = [sheet, title, sub, go, no];

        if (!this.premium) {
            const buy = this.label(this.CX, sheetY + sheetH * 0.84, 'No ads? Continue with Premium', this.H * 0.017, THEME.MUTED)
                .setInteractive({ useHandCursor: true });
            buy.on('pointerdown', async () => {
                if (busy) return;
                busy = true;
                AudioManager.play('snd_click');
                this.track('premium_offer_tapped', { reason: o.adReason, round: this.round });
                const bought = await PurchasesManager.buyPremium();
                if (!this.scene.isActive() || this.gameOver) return;
                if (!bought) { busy = false; return; }
                this.premium = true;
                AudioManager.play('snd_reward');
                finish(true);
            });
            items.push(buy);
        }

        const sheetC = this.add.container(0, sheetH, items);
        overlay.add([scrim, sheetC]);
        scrim.setAlpha(0);
        this.tweens.add({ targets: sheetC, y: 0, duration: 220, ease: 'Cubic.Out' });
        this.tweens.add({ targets: scrim, alpha: 1, duration: 180 });
    }

    /** Shows what the running total should have been. */
    private revealTotal(reason: FailReason): void {
        this.targetLabel.setText('IT WAS').setTint(THEME.INK);
        this.targetText.setText(`${this.targetTotal}`).setTint(THEME.INK).setScale(1);
        const fit = Math.min(1, this.numberMaxW / Math.max(1, this.targetText.width));
        this.targetText.setScale(fit * 0.6);
        this.tweens.add({ targets: this.targetText, scaleX: fit, scaleY: fit, duration: 320, ease: 'Back.Out' });
        this.secondsText.setText(reason === 'timeout' ? 'Out of time' : `You had ${this.currentTotal}`);
        this.restoreButtonColors();
        this.applyButtonHints(Number.NaN);   // NaN = clear all hints
    }

    private track(name: string, params: Record<string, string | number | boolean> = {}): void {
        Firebase.logEvent(name, params).catch(() => {});
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
            }, THEME.INK);

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
        this.track('game_over', {
            score: this.score,
            rounds_cleared: this.roundsCleared,
            reached_round: this.round,
            reason,
            profile: this.profile.id,
        });

        this.time.delayedCall(voluntary ? 50 : 700, () => {
            this.fadeToScene(SCENES.End, {
                score:     this.score,
                round:     this.round,
                cleared:   this.roundsCleared,
                bestScore: SaveManager.getBestScore(),
                reason,
                needed:    this.targetTotal,
                tapped:    this.currentTotal,
                recent:    [...this.history, this.currentDelta].slice(-TAPE_SIZE),
            });
        });
    }
}
