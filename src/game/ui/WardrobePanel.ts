import * as Phaser from 'phaser';
import { THEME } from '../constants/Colors';
import { OUTFITS, SCENERIES } from '../constants/Outfits';
import { AudioManager } from '../managers/AudioManager';
import { SaveManager } from '../managers/SaveManager';
import { Feel } from '../utils/Feel';
import { Mascot } from './Mascot';

/** Wardrobe popup: preview Summy, wear unlocked outfits, see what the next stars unlock. */
export class WardrobePanel {
    private root: Phaser.GameObjects.Container;
    private mascot: Mascot;
    private cells: { id: string; g: Phaser.GameObjects.Graphics; x: number; y: number; name: Phaser.GameObjects.BitmapText; sub: Phaser.GameObjects.BitmapText }[] = [];
    private gridItems: Phaser.GameObjects.GameObject[] = [];
    private tab: 'outfits' | 'scenes' = 'outfits';
    private tabGfx: Phaser.GameObjects.Graphics;
    private cw = 0;
    private ch = 0;
    private panel: { left: number; top: number; w: number; h: number };
    private startScenery = SaveManager.getScenery();

    constructor(private scene: Phaser.Scene, private W: number, private H: number, private onClose: (sceneryChanged: boolean) => void) {
        const panelW = Math.floor(W * 0.88);
        const panelH = Math.floor(H * 0.66);
        const px = W / 2;
        const py = H / 2;
        const left = px - panelW / 2;
        const top = py - panelH / 2;

        this.root = scene.add.container(0, 0).setDepth(70);

        const overlay = scene.add.graphics();
        overlay.fillStyle(THEME.SCRIM, 0.45);
        overlay.fillRect(0, 0, W, H);
        overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, W, H), Phaser.Geom.Rectangle.Contains);
        overlay.on('pointerdown', () => this.close());
        this.root.add(overlay);

        const card = scene.add.graphics();
        card.fillStyle(THEME.CARD_SHADOW, 1);
        card.fillRoundedRect(left, top + 6, panelW, panelH, 32);
        card.fillStyle(THEME.CARD, 1);
        card.fillRoundedRect(left, top, panelW, panelH, 32);
        card.setInteractive(new Phaser.Geom.Rectangle(left, top, panelW, panelH), Phaser.Geom.Rectangle.Contains);
        this.root.add(card);

        this.root.add(this.text(px, top + panelH * 0.07, 'WARDROBE', H * 0.03));
        this.root.add(this.text(px, top + panelH * 0.125, `${SaveManager.getStars()} stars earned (1 per round cleared)`, H * 0.016, THEME.MUTED));

        this.mascot = new Mascot(scene, px, top + panelH * 0.315, Math.floor(H * 0.045));
        this.root.add(this.mascot);

        this.panel = { left, top, w: panelW, h: panelH };
        this.tabGfx = scene.add.graphics();
        this.root.add(this.tabGfx);
        (['outfits', 'scenes'] as const).forEach((t, i) => {
            const tw = panelW * 0.4;
            const cx = px + (i === 0 ? -1 : 1) * (tw / 2 + panelW * 0.02);
            const label = this.text(cx, top + panelH * 0.455, t === 'outfits' ? 'OUTFITS' : 'SCENES', H * 0.015);
            const hit = scene.add.zone(cx, top + panelH * 0.455, tw, panelH * 0.06).setInteractive({ useHandCursor: true });
            hit.on('pointerdown', () => { if (this.tab !== t) { AudioManager.play('snd_click'); this.tab = t; this.build(); } });
            this.root.add([label, hit]);
        });
        this.build();

        const closeX = px + panelW / 2 - 40;
        const closeY = top + 40;
        const closeBg = scene.add.graphics();
        closeBg.fillStyle(THEME.SURFACE, 1);
        closeBg.fillCircle(closeX, closeY, 26);
        closeBg.lineStyle(5, THEME.INK, 1);
        closeBg.lineBetween(closeX - 9, closeY - 9, closeX + 9, closeY + 9);
        closeBg.lineBetween(closeX + 9, closeY - 9, closeX - 9, closeY + 9);
        this.root.add(closeBg);
        const closeHit = scene.add.zone(closeX, closeY, 60, 60).setInteractive({ useHandCursor: true });
        closeHit.on('pointerdown', () => this.close());
        this.root.add(closeHit);

        this.root.setScale(0.9).setAlpha(0);
        scene.tweens.add({ targets: this.root, scaleX: 1, scaleY: 1, alpha: 1, duration: 220 });
    }

    private text(x: number, y: number, str: string, size: number, tint: number = THEME.INK) {
        return this.scene.add.bitmapText(x, y, 'coiny-bmp', str, Math.floor(size), 0).setOrigin(0.5).setTint(tint);
    }

    /** (Re)builds the chip grid for the current tab. */
    private build(): void {
        this.gridItems.forEach((o) => o.destroy());
        this.gridItems = [];
        this.cells = [];
        const { left, top, w, h } = this.panel;
        const { H, scene } = this;
        const isOutfits = this.tab === 'outfits';

        // tab underline
        const tw = w * 0.4;
        const ux = this.W / 2 + (isOutfits ? -1 : 1) * (tw / 2 + w * 0.02);
        this.tabGfx.clear();
        this.tabGfx.fillStyle(THEME.ADD, 1);
        this.tabGfx.fillRoundedRect(ux - tw / 2, top + h * 0.49, tw, 5, 3);

        const items: { id: string; name: string; stars: number }[] = isOutfits ? OUTFITS : SCENERIES;
        const cols = 2;
        const gap = w * 0.04;
        this.cw = (w - gap * 3) / cols;
        this.ch = h * 0.1;
        const gridTop = top + h * 0.525;
        items.forEach((o, i) => {
            const x = left + gap + (i % cols) * (this.cw + gap);
            const y = gridTop + Math.floor(i / cols) * (this.ch + h * 0.03);
            const g = scene.add.graphics();

            const unlocked = this.isUnlocked(o.id);
            const name = this.text(x + this.cw / 2, y + this.ch * 0.36, o.name, H * 0.017, unlocked ? THEME.INK : THEME.MUTED);
            const sub = this.text(x + this.cw / 2, y + this.ch * 0.72,
                unlocked ? (o.stars === 0 ? 'Default' : 'Unlocked') : `Locked - ${o.stars} stars`, H * 0.012, THEME.MUTED);
            for (const t of [name, sub]) if (t.width > this.cw * 0.92) t.setScale(this.cw * 0.92 / t.width);
            this.cells.push({ id: o.id, g, x, y, name, sub });

            const hit = scene.add.zone(x + this.cw / 2, y + this.ch / 2, this.cw, this.ch).setInteractive({ useHandCursor: true });
            hit.on('pointerdown', () => this.pick(o.id));
            this.gridItems.push(g, name, sub, hit);
            this.root.add([g, name, sub, hit]);
        });
        this.redraw();
    }

    private isUnlocked(id: string): boolean {
        return this.tab === 'outfits'
            ? SaveManager.isOutfitUnlocked(id as never)
            : SaveManager.isSceneryUnlocked(id as never);
    }

    private pick(id: string): void {
        if (!this.isUnlocked(id)) {
            AudioManager.play('snd_fail', 1.2);
            this.mascot.setMood('worried', 900);
            this.mascot.wobble();
            return;
        }
        if (this.tab === 'outfits') {
            SaveManager.setOutfit(id as never);
            this.mascot.setOutfit(id as never);
        } else {
            SaveManager.setScenery(id as never);
        }
        this.mascot.setMood('happy', 900);
        this.mascot.hop();
        AudioManager.play('snd_reward');
        Feel.tap();
        this.redraw();
    }

    private redraw(): void {
        const worn = this.tab === 'outfits' ? SaveManager.getOutfit() : SaveManager.getScenery();
        for (const c of this.cells) {
            const unlocked = this.isUnlocked(c.id);
            const isWorn = c.id === worn;
            const g = c.g;
            g.clear();
            // Chips contrast with the cream panel: tinted when available, green when worn, grey when locked
            const face = isWorn ? THEME.ADD : unlocked ? THEME.SURFACE : THEME.TRACK;
            const edge = isWorn ? 0x167a39 : THEME.CARD_SHADOW;
            g.fillStyle(edge, 1);
            g.fillRoundedRect(c.x, c.y + 4, this.cw, this.ch, 18);
            g.fillStyle(face, 1);
            g.fillRoundedRect(c.x, c.y, this.cw, this.ch, 18);
            if (this.tab === 'scenes') {
                const sc = SCENERIES.find((x) => x.id === c.id)!;
                g.fillStyle(sc.hillFront, 1);
                g.fillRoundedRect(c.x + 8, c.y + this.ch - 10, this.cw - 16, 5, 3);
            }
            c.name.setTint(isWorn ? THEME.WHITE : unlocked ? THEME.INK : THEME.MUTED);
            c.sub.setTint(isWorn ? THEME.WHITE : THEME.MUTED);
            c.sub.setText(isWorn ? 'Wearing' : unlocked ? (c.sub.text.startsWith('Default') ? 'Default' : 'Tap to wear') : c.sub.text);
            if (!unlocked) {
                // padlock in the corner
                const lx = c.x + this.cw - 22, ly = c.y + 20;
                g.fillStyle(THEME.MUTED, 1);
                g.fillRoundedRect(lx - 8, ly - 3, 16, 12, 3);
                g.lineStyle(3, THEME.MUTED, 1);
                g.beginPath();
                g.arc(lx, ly - 3, 5, Math.PI, 0, false);
                g.strokePath();
            }
        }
    }

    close(): void {
        AudioManager.play('snd_click');
        this.scene.tweens.add({
            targets: this.root, alpha: 0, duration: 140,
            onComplete: () => { this.root.destroy(); this.onClose(this.startScenery !== SaveManager.getScenery()); },
        });
    }
}
