import * as Phaser from 'phaser';
import BaseScene from './BaseScene';
import type { EndReason } from './Game';
import { SCENES } from '../utils/Scenes';
import { GlobVar } from '../../utils/Global';
import { THEME } from '../constants/Colors';
import { AudioManager } from '../managers/AudioManager';
import { LeaderboardManager } from '../managers/LeaderboardManager';
import { Mascot } from '../ui/Mascot';
import { Feel } from '../utils/Feel';
import { Ads } from '../../services/Ads';
import FPS from '../model/FPS';

interface EndData {
    score?:     number;
    round?:     number;
    cleared?:   number;
    bestScore?: number;
    reason?:    EndReason;
    needed?:    number;
    tapped?:    number;
    recent?:    number[];
}

export default class End extends BaseScene {
    private finalScore = 0;
    private finalRound = 1;
    private cleared    = 0;
    private bestScore  = 0;
    private isNewBest  = false;
    private reason: EndReason = 'quit';
    private needed = 0;
    private tapped = 0;
    private recent: number[] = [];
    private rankText?: Phaser.GameObjects.BitmapText;
    private leaving = false;

    constructor() {
        super({ key: SCENES.End });
    }

    init(data: EndData): void {
        this.initScene();
        this.finalScore = data?.score     ?? 0;
        this.finalRound = data?.round     ?? 1;
        this.cleared    = data?.cleared   ?? Math.max(0, this.finalRound - 1);
        this.bestScore  = data?.bestScore ?? 0;
        this.reason     = data?.reason    ?? 'quit';
        this.needed     = data?.needed    ?? 0;
        this.tapped     = data?.tapped    ?? 0;
        this.recent     = data?.recent    ?? [];
        this.isNewBest  = this.finalScore > 0 && this.finalScore >= this.bestScore;
        this.leaving    = false;
    }

    create(): void {
        GlobVar.consolelog(`Scene: ${SCENES.End}`);
        AudioManager.init();
        Ads.noteGameEnded();

        this.createSkyBg(0.93);
        const content = this.add.container(0, 0);
        this.createHeader(content);
        this.createWhatHappened(content);
        this.createStats(content);
        this.createButtons();
        this.createMascot();
        this.fpsView = new FPS(this);

        content.setAlpha(0).setY(this.H * 0.03);
        this.tweens.add({ targets: content, alpha: 1, y: 0, duration: 380, ease: 'Back.Out' });

        this.cameras.main.fadeIn(350);
        this.celebrationBurst();

        this.fetchAndShowRank();
    }

    update(): void {
        this.fpsView?.update();
    }

    private get pad(): number { return Math.floor(this.W * 0.062); }
    private get innerW(): number { return this.W - this.pad * 2; }

    // ── Header ──────────────────────────────────────────────────────────────

    private createHeader(content: Phaser.GameObjects.Container): void {
        const kicker =
            this.isNewBest          ? 'NEW BEST!' :
            this.reason === 'quit'  ? 'RUN ENDED' : 'OUT OF HEARTS';
        const kickerColor = this.isNewBest ? THEME.GOLD : THEME.MUTED;

        const n     = this.cleared;
        const title =
            this.isNewBest ? 'Amazing memory!' :
            n >= 15        ? 'Super memory!' :
            n >= 5         ? 'Nice run!' : 'Good try!';

        const k = this.label(this.CX, this.H * 0.085, kicker, this.H * 0.018, kickerColor);
        const t = this.label(this.CX, this.H * 0.135, title, this.H * 0.055, THEME.INK);
        t.setScale(Math.min(1, (this.W * 0.86) / Math.max(1, t.width)));
        content.add([k, t]);

        if (this.isNewBest) {
            this.time.delayedCall(700, () => {
                this.cameras.main.flash(300, 255, 215, 120, false);
                this.tweens.add({ targets: k, scaleX: 1.35, scaleY: 1.35, duration: 160, yoyo: true, ease: 'Power2' });
            });
        }
    }

    // ── What happened: needed vs tapped ─────────────────────────────────────

    private createWhatHappened(content: Phaser.GameObjects.Container): void {
        const { pad, innerW } = this;
        const top   = this.H * 0.19;
        const cardH = Math.floor(this.H * (this.reason === 'quit' ? 0.12 : 0.235));
        const card  = this.drawCard(this.add.graphics(), pad, top, innerW, cardH, 28);
        content.add(card);

        content.add(this.label(this.CX, top + this.H * 0.03, 'THE LAST ONE', this.H * 0.014, 0x52697b));

        if (this.reason === 'quit') {
            content.add(this.label(this.CX, top + cardH * 0.62, `You stopped at round ${this.finalRound}.`, this.H * 0.022));
            return;
        }

        // Two boxes with an arrow between
        const arrowW = this.W * 0.09;
        const boxW   = (innerW - this.W * 0.08 - arrowW) / 2;
        const boxH   = Math.floor(this.H * 0.095);
        const boxY   = top + this.H * 0.06;
        const leftX  = pad + this.W * 0.04;
        const rightX = this.W - pad - this.W * 0.04 - boxW;

        const boxes = this.add.graphics();
        boxes.fillStyle(0xe8f7ee, 1);
        boxes.fillRoundedRect(leftX, boxY, boxW, boxH, 20);
        boxes.lineStyle(4, THEME.ADD, 1);
        boxes.strokeRoundedRect(leftX, boxY, boxW, boxH, 20);
        boxes.fillStyle(0xfff1e3, 1);
        boxes.fillRoundedRect(rightX, boxY, boxW, boxH, 20);
        boxes.lineStyle(4, THEME.WARN, 1);
        boxes.strokeRoundedRect(rightX, boxY, boxW, boxH, 20);

        // Arrow
        const ax = this.CX;
        const ay = boxY + boxH / 2;
        const aw = arrowW * 0.32;
        boxes.lineStyle(5, 0x52697b, 1);
        boxes.lineBetween(ax - aw, ay, ax + aw, ay);
        boxes.lineBetween(ax + aw * 0.35, ay - aw * 0.6, ax + aw, ay);
        boxes.lineBetween(ax + aw * 0.35, ay + aw * 0.6, ax + aw, ay);
        content.add(boxes);

        const lcx = leftX + boxW / 2;
        const rcx = rightX + boxW / 2;
        content.add([
            this.label(lcx, boxY + boxH * 0.24, 'THE TOTAL WAS', this.H * 0.013, THEME.ADD),
            this.label(lcx, boxY + boxH * 0.62, `${this.needed}`, this.H * 0.048, THEME.ADD),
            this.label(rcx, boxY + boxH * 0.24, 'YOU TAPPED', this.H * 0.013, 0xc0600f),
            this.label(rcx, boxY + boxH * 0.62, `${this.tapped}`, this.H * 0.048, 0xc0600f),
        ]);

        // "Last three: +12 -3 +8" in their own colours
        if (this.recent.length > 0) {
            const y  = top + cardH - this.H * 0.035;
            const fs = Math.floor(this.H * 0.019);
            const parts: { text: string; tint: number }[] = [
                { text: this.recent.length === 1 ? 'Last number:' : `Last ${this.recent.length}:`, tint: 0x52697b },
                ...this.recent.map((v) => ({ text: v < 0 ? `-${-v}` : `+${v}`, tint: v < 0 ? THEME.SUB : THEME.ADD })),
            ];
            const gap   = this.W * 0.025;
            const texts = parts.map((p) => this.add.bitmapText(0, y, 'coiny-bmp', p.text, fs, 0).setOrigin(0, 0.5).setTint(p.tint));
            const total = texts.reduce((s, t) => s + t.width, 0) + gap * (texts.length - 1);
            let x = this.CX - total / 2;
            for (const t of texts) {
                t.setX(x);
                x += t.width + gap;
            }
            content.add(texts);
        }
    }

    // ── Score / round tiles, rank, best ─────────────────────────────────────

    private createStats(content: Phaser.GameObjects.Container): void {
        const { pad, innerW } = this;
        const top   = this.H * (this.reason === 'quit' ? 0.34 : 0.45);
        const gap   = this.W * 0.03;
        const tileW = (innerW - gap) / 2;
        const tileH = Math.floor(this.H * 0.1);

        const g = this.add.graphics();
        this.drawCard(g, pad, top, tileW, tileH, 24);
        this.drawCard(g, pad + tileW + gap, top, tileW, tileH, 24);
        content.add(g);

        const s1 = pad + tileW / 2;
        const s2 = pad + tileW * 1.5 + gap;
        const scoreNum = this.label(s1, top + tileH * 0.62, `${this.finalScore}`, this.H * 0.045, THEME.INK);
        content.add([
            this.label(s1, top + tileH * 0.25, 'SCORE', this.H * 0.014, 0x52697b),
            scoreNum,
            this.label(s2, top + tileH * 0.25, 'ROUNDS CLEARED', this.H * 0.014, 0x52697b),
            this.label(s2, top + tileH * 0.62, `${this.cleared}`, this.H * 0.045),
        ]);

        scoreNum.setScale(0);
        this.tweens.add({ targets: scoreNum, scaleX: 1, scaleY: 1, delay: 350, duration: 350, ease: 'Back.Out' });

        // World rank row (filled once Firestore answers)
        const rowY = top + tileH + this.H * 0.03;
        const rowH = Math.floor(this.H * 0.065);
        content.add(this.drawCard(this.add.graphics(), pad, rowY, innerW, rowH, 20, 0xe6eef2, THEME.CARD_SHADOW));
        content.add(this.add.bitmapText(pad + this.W * 0.05, rowY + rowH / 2, 'coiny-bmp', 'World rank', Math.floor(this.H * 0.02), 0)
            .setOrigin(0, 0.5).setTint(THEME.INK));
        this.rankText = this.add.bitmapText(this.W - pad - this.W * 0.05, rowY + rowH / 2, 'coiny-bmp', '...', Math.floor(this.H * 0.024), 0)
            .setOrigin(1, 0.5).setTint(THEME.INK);
        content.add(this.rankText);

        // Best line
        const bestY = rowY + rowH + this.H * 0.04;
        const diff  = this.bestScore - this.finalScore;
        const best  =
            this.isNewBest        ? `Your best ever: ${this.finalScore}` :
            this.bestScore === 0  ? 'Clear a round to set your first best!' :
            diff === 0            ? `You matched your best: ${this.bestScore}` :
                                    `Best ${this.bestScore}  (${diff} to beat it)`;
        content.add(this.label(this.CX, bestY, best, this.H * 0.019, this.isNewBest ? THEME.GOLD : THEME.MUTED));
    }

    // ── Summy cheers or consoles ─────────────────────────────────────────────

    private createMascot(): void {
        const m = new Mascot(this, this.CX, this.H * 0.745, Math.floor(this.H * 0.03));
        if (this.isNewBest) {
            this.time.delayedCall(600, () => { m.setMood('happy'); m.hop(0.7); });
            this.time.delayedCall(700, () => {
                this.spawnConfetti(50);
                AudioManager.play('snd_reward');
                Feel.success();
            });
        } else if (this.cleared >= 5) {
            m.setMood('happy', 1500);
            this.time.delayedCall(400, () => AudioManager.play('snd_success'));
        } else if (this.reason !== 'quit') {
            m.setMood('sad', 1500);
        }
    }

    // ── Rank fetch ───────────────────────────────────────────────────────────

    private async fetchAndShowRank(): Promise<void> {
        try {
            const rank = await LeaderboardManager.getPlayerRank();
            if (!this.rankText || !this.scene.isActive()) return;
            this.rankText.setText(rank > 0 ? `#${rank}` : '-');
        } catch {
            this.rankText?.setText('-');
        }
    }

    // ── Buttons ─────────────────────────────────────────────────────────────

    private createButtons(): void {
        const { innerW } = this;
        const bigH = Math.floor(this.H * 0.085);
        const smH  = Math.floor(this.H * 0.066);
        const smY  = this.H - this.H * 0.04 - smH / 2;
        const bigY = smY - smH / 2 - this.H * 0.018 - bigH / 2;

        this.createButton(this.CX, bigY, innerW, bigH, 'PLAY AGAIN', this.H * 0.036,
            THEME.GO, THEME.GO_DARK, () => this.leaveTo(SCENES.Game));

        this.createButton(this.CX, smY, innerW, smH, 'MENU', this.H * 0.024,
            THEME.CARD, THEME.CARD_SHADOW, () => this.leaveTo(SCENES.Menu), THEME.INK);
    }

    /** A paced interstitial may play first; extra taps are ignored meanwhile. */
    private async leaveTo(key: string): Promise<void> {
        if (this.leaving) return;
        this.leaving = true;
        AudioManager.play('snd_click');
        await Ads.maybeInterstitial();
        this.fadeToScene(key);
    }

    // ── Celebration burst ────────────────────────────────────────────────────

    private celebrationBurst(): void {
        if (!this.isNewBest && this.finalScore === 0) return;
        const count = this.isNewBest ? 5 : 2;
        for (let i = 0; i < count; i++) {
            this.time.delayedCall(i * 200, () => {
                const x = Phaser.Math.Between(Math.floor(this.W * 0.15), Math.floor(this.W * 0.85));
                const y = Phaser.Math.Between(Math.floor(this.H * 0.04), Math.floor(this.H * 0.18));
                this.spawnBurst(x, y, THEME.CANDY, 14, 80, 230);
                AudioManager.play('snd_tap', 1.2 + i * 0.12);
            });
        }
    }
}
