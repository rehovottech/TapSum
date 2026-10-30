import * as Phaser from 'phaser';
import { THEME } from '../constants/Colors';
import { OutfitId } from '../constants/Outfits';
import { SaveManager } from '../managers/SaveManager';

export type MascotMood = 'idle' | 'happy' | 'sad' | 'wow' | 'worried' | 'eat';

/**
 * "Summy" — the number-eating mascot, drawn with primitives so it scales to any
 * screen and can be swapped for real art later without touching the scenes.
 * Size is the body radius in pixels.
 */
export class Mascot extends Phaser.GameObjects.Container {
    private r: number;
    private figure!: Phaser.GameObjects.Container;
    private face!: Phaser.GameObjects.Graphics;
    private outfit?: Phaser.GameObjects.Graphics;
    private mood: MascotMood = 'idle';
    private blinking = false;
    private lookX = 0;
    private lookY = 0;
    private revertTimer?: Phaser.Time.TimerEvent;
    private blinkTimer?: Phaser.Time.TimerEvent;
    private bobTween?: Phaser.Tweens.Tween;

    constructor(scene: Phaser.Scene, x: number, y: number, size: number) {
        super(scene, x, y);
        this.r = size;
        this.build();
        this.setOutfit(SaveManager.getOutfit());
        scene.add.existing(this);
        this.startIdle();
        this.once(Phaser.GameObjects.Events.DESTROY, () => {
            this.revertTimer?.remove();
            this.blinkTimer?.remove();
        });
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /** Changes the face; after holdMs (if given) it returns to idle. */
    setMood(mood: MascotMood, holdMs = 0): this {
        this.mood = mood;
        this.drawFace();
        this.revertTimer?.remove();
        if (holdMs > 0) {
            this.revertTimer = this.scene.time.delayedCall(holdMs, () => {
                this.mood = 'idle';
                this.drawFace();
            });
        }
        return this;
    }

    /** Puts an unlocked outfit on Summy ('none' takes it off). Defaults to the saved choice at creation. */
    setOutfit(id: OutfitId): this {
        this.outfit?.destroy();
        this.outfit = undefined;
        if (id === 'none') return this;
        const g = this.scene.add.graphics();
        this.drawOutfit(g, id);
        this.figure.add(g);
        this.outfit = g;
        return this;
    }

    /** Pupils look toward a direction (-1..1 on each axis). */
    look(dx: number, dy: number): this {
        this.lookX = Phaser.Math.Clamp(dx, -1, 1);
        this.lookY = Phaser.Math.Clamp(dy, -1, 1);
        this.drawFace();
        return this;
    }

    hop(height = 0.5): void {
        this.scene.tweens.add({
            targets: this.figure, y: -this.r * height,
            duration: 160, yoyo: true, ease: 'Quad.easeOut',
        });
        this.scene.tweens.add({
            targets: this.figure, scaleX: { from: 1.12, to: 1 }, scaleY: { from: 0.88, to: 1 },
            duration: 320, ease: 'Back.Out',
        });
    }

    wobble(): void {
        this.scene.tweens.add({
            targets: this.figure, angle: { from: -10, to: 0 },
            duration: 520, ease: 'Elastic.Out',
        });
    }

    /** Small squash, used for each tap. */
    nudge(): void {
        this.scene.tweens.add({
            targets: this.figure, scaleX: 1.06, scaleY: 0.94,
            duration: 60, yoyo: true, ease: 'Quad.easeOut',
        });
    }

    // ── Drawing ─────────────────────────────────────────────────────────────

    private build(): void {
        const r = this.r;

        const shadow = this.scene.add.graphics();
        shadow.fillStyle(0x000000, 0.12);
        shadow.fillEllipse(0, r * 1.08, r * 1.9, r * 0.32);
        this.add(shadow);

        this.figure = this.scene.add.container(0, 0);
        this.add(this.figure);

        const feet = this.scene.add.graphics();
        feet.fillStyle(THEME.MASCOT_DARK, 1);
        feet.fillEllipse(-r * 0.45, r * 0.9, r * 0.55, r * 0.3);
        feet.fillEllipse(r * 0.45, r * 0.9, r * 0.55, r * 0.3);

        const leafL = this.scene.add.graphics();
        leafL.fillStyle(0x2fb35a, 1);
        leafL.fillEllipse(0, 0, r * 0.55, r * 0.24);
        leafL.setPosition(-r * 0.2, -r * 1.12).setAngle(25);
        const leafR = this.scene.add.graphics();
        leafR.fillStyle(0x47d16f, 1);
        leafR.fillEllipse(0, 0, r * 0.6, r * 0.26);
        leafR.setPosition(r * 0.22, -r * 1.16).setAngle(-30);
        const stem = this.scene.add.graphics();
        stem.lineStyle(Math.max(2, r * 0.07), 0x2fb35a, 1);
        stem.lineBetween(0, -r * 0.92, 0, -r * 1.12);

        const torso = this.scene.add.graphics();
        torso.fillStyle(THEME.MASCOT_DARK, 1);
        torso.fillEllipse(0, r * 0.06, r * 2.1, r * 1.9);
        torso.fillStyle(THEME.MASCOT, 1);
        torso.fillEllipse(0, 0, r * 2.1, r * 1.9);
        torso.fillStyle(THEME.MASCOT_BELLY, 1);
        torso.fillEllipse(0, r * 0.42, r * 1.2, r * 0.8);
        // Little arms
        torso.fillStyle(THEME.MASCOT_DARK, 1);
        torso.fillEllipse(-r * 1.0, r * 0.25, r * 0.32, r * 0.5);
        torso.fillEllipse(r * 1.0, r * 0.25, r * 0.32, r * 0.5);

        this.face = this.scene.add.graphics();

        this.figure.add([feet, stem, leafL, leafR, torso, this.face]);
        this.drawFace();
    }

    private drawOutfit(g: Phaser.GameObjects.Graphics, id: OutfitId): void {
        const r = this.r;
        const top = -r * 0.86;      // where the head meets the hat
        const ink = THEME.INK;
        const tri = (cx: number, baseY: number, w: number, h: number) =>
            g.fillTriangle(cx - w / 2, baseY, cx + w / 2, baseY, cx, baseY - h);
        switch (id) {
            case 'party': {
                g.setAngle(-8);
                g.fillStyle(0xffc933, 1);
                tri(0, top + r * 0.08, r * 0.95, r * 1.05);
                g.fillStyle(0xff5d8f, 1);
                g.fillTriangle(-r * 0.2, top - r * 0.2, r * 0.2, top - r * 0.2, 0, top - r * 0.62);
                g.fillStyle(0x3b8cf0, 1);
                g.fillCircle(0, top - r * 1.0, r * 0.12);
                g.fillStyle(0xffffff, 1);
                g.fillCircle(-r * 0.12, top - r * 0.1, r * 0.05);
                g.fillCircle(r * 0.16, top - r * 0.32, r * 0.05);
                break;
            }
            case 'shades': {
                const ex = r * 0.36, ey = -r * 0.18, w = r * 0.5, h = r * 0.36;
                g.fillStyle(ink, 1);
                g.fillRoundedRect(-ex - w / 2, ey - h / 2, w, h, r * 0.1);
                g.fillRoundedRect(ex - w / 2, ey - h / 2, w, h, r * 0.1);
                g.fillRect(-ex + w / 2 - 1, ey - r * 0.06, ex * 2 - w + 2, r * 0.1);
                g.fillRect(-r * 1.0, ey - r * 0.06, r * 0.28, r * 0.1);
                g.fillRect(r * 0.72, ey - r * 0.06, r * 0.28, r * 0.1);
                g.fillStyle(0xffffff, 0.35);
                g.fillRect(-ex - w * 0.3, ey - h * 0.35, w * 0.18, h * 0.25);
                g.fillRect(ex - w * 0.3, ey - h * 0.35, w * 0.18, h * 0.25);
                break;
            }
            case 'headphones': {
                g.lineStyle(Math.max(4, r * 0.14), 0x3b4a66, 1);
                g.beginPath();
                g.arc(0, -r * 0.05, r * 1.05, Math.PI * 1.02, Math.PI * 1.98, false);
                g.strokePath();
                g.fillStyle(0xff5d8f, 1);
                g.fillRoundedRect(-r * 1.2, -r * 0.35, r * 0.34, r * 0.7, r * 0.12);
                g.fillRoundedRect(r * 0.86, -r * 0.35, r * 0.34, r * 0.7, r * 0.12);
                break;
            }
            case 'crown': {
                const bw = r * 1.1, bh = r * 0.3, by = top + r * 0.1;
                g.fillStyle(0xf5b800, 1);
                g.fillRect(-bw / 2, by - bh, bw, bh);
                for (const sx of [-1, 0, 1]) tri(sx * bw * 0.36, by - bh, bw * 0.3, r * 0.42);
                g.fillStyle(0xff4d6d, 1);
                g.fillCircle(0, by - bh / 2, r * 0.07);
                g.fillStyle(0x3b8cf0, 1);
                g.fillCircle(-bw * 0.32, by - bh / 2, r * 0.05);
                g.fillCircle(bw * 0.32, by - bh / 2, r * 0.05);
                break;
            }
            case 'wizard': {
                g.setAngle(6);
                g.fillStyle(0x6a3fd6, 1);
                g.fillEllipse(0, top + r * 0.1, r * 1.7, r * 0.3);
                tri(0, top + r * 0.04, r * 1.0, r * 1.35);
                g.fillStyle(0xffd23f, 1);
                g.fillRect(-r * 0.5, top - r * 0.22, r * 1.0, r * 0.14);
                g.fillCircle(r * 0.05, top - r * 0.75, r * 0.1);
                g.fillCircle(-r * 0.2, top - r * 0.45, r * 0.06);
                break;
            }
        }
    }

    private drawFace(): void {
        const g = this.face;
        const r = this.r;
        const ink = THEME.INK;
        const ex = r * 0.36;
        const ey = -r * 0.18;
        const line = Math.max(2.5, r * 0.09);
        g.clear();

        // Cheeks
        g.fillStyle(0xff5d73, 0.35);
        g.fillEllipse(-r * 0.62, r * 0.12, r * 0.34, r * 0.2);
        g.fillEllipse(r * 0.62, r * 0.12, r * 0.34, r * 0.2);

        // Eyes
        const m = this.mood;
        if (this.blinking || m === 'happy') {
            g.lineStyle(line, ink, 1);
            for (const sx of [-1, 1]) {
                g.beginPath();
                if (m === 'happy') {
                    g.arc(sx * ex, ey + r * 0.06, r * 0.16, Math.PI * 1.1, Math.PI * 1.9, false);
                } else {
                    g.moveTo(sx * ex - r * 0.15, ey);
                    g.lineTo(sx * ex + r * 0.15, ey);
                }
                g.strokePath();
            }
        } else {
            const eyeR = m === 'wow' ? r * 0.26 : r * 0.22;
            const pupR = m === 'wow' ? r * 0.09 : r * 0.12;
            const py   = m === 'sad' ? 0.6 : this.lookY;
            for (const sx of [-1, 1]) {
                g.fillStyle(0xffffff, 1);
                g.fillCircle(sx * ex, ey, eyeR);
                g.fillStyle(ink, 1);
                g.fillCircle(sx * ex + this.lookX * eyeR * 0.4, ey + py * eyeR * 0.4, pupR);
                g.fillStyle(0xffffff, 1);
                g.fillCircle(sx * ex + this.lookX * eyeR * 0.4 + pupR * 0.35, ey + py * eyeR * 0.4 - pupR * 0.35, pupR * 0.35);
            }
        }

        // Brows for sad / worried
        if (m === 'sad' || m === 'worried') {
            g.lineStyle(line * 0.8, ink, 1);
            g.lineBetween(-ex - r * 0.16, ey - r * 0.3, -ex + r * 0.12, ey - r * 0.38);
            g.lineBetween(ex + r * 0.16, ey - r * 0.3, ex - r * 0.12, ey - r * 0.38);
        }

        // Mouth
        const my = r * 0.24;
        g.lineStyle(line, ink, 1);
        switch (m) {
            case 'happy':
                g.fillStyle(ink, 1);
                g.beginPath();
                g.arc(0, my - r * 0.04, r * 0.26, 0, Math.PI, false);
                g.closePath();
                g.fillPath();
                g.fillStyle(0xff5d73, 1);
                g.fillEllipse(0, my + r * 0.13, r * 0.24, r * 0.1);
                break;
            case 'eat':
                g.fillStyle(ink, 1);
                g.fillEllipse(0, my + r * 0.04, r * 0.36, r * 0.3);
                break;
            case 'wow':
                g.fillStyle(ink, 1);
                g.fillCircle(0, my + r * 0.04, r * 0.12);
                break;
            case 'sad':
                g.beginPath();
                g.arc(0, my + r * 0.22, r * 0.2, Math.PI * 1.15, Math.PI * 1.85, false);
                g.strokePath();
                break;
            case 'worried':
                g.beginPath();
                g.moveTo(-r * 0.2, my + r * 0.04);
                g.lineTo(-r * 0.07, my - r * 0.03);
                g.lineTo(r * 0.07, my + r * 0.05);
                g.lineTo(r * 0.2, my - r * 0.02);
                g.strokePath();
                break;
            default:
                g.beginPath();
                g.arc(0, my - r * 0.06, r * 0.2, Math.PI * 0.15, Math.PI * 0.85, false);
                g.strokePath();
        }
    }

    // ── Idle life: bob + blink ──────────────────────────────────────────────

    private startIdle(): void {
        // Breathing lives on the outer container so it never fights hop/nudge on the body
        this.bobTween = this.scene.tweens.add({
            targets: this, scaleY: 0.96, scaleX: 1.03,
            duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
        const blink = () => {
            this.blinkTimer = this.scene.time.delayedCall(Phaser.Math.Between(2200, 4200), () => {
                if (!this.active) return;
                this.blinking = true;
                this.drawFace();
                this.scene.time.delayedCall(120, () => {
                    if (!this.active) return;
                    this.blinking = false;
                    this.drawFace();
                    blink();
                });
            });
        };
        blink();
    }
}
