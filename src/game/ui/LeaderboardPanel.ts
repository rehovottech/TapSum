import * as Phaser from 'phaser';
import { AudioManager } from '../managers/AudioManager';
import { THEME } from '../constants/Colors';
import { LeaderboardEntry, Firebase } from '../../services/Firebase';
import { LeaderboardManager } from '../managers/LeaderboardManager';
import { SaveManager } from '../managers/SaveManager';
import type BaseScene from '../scene/BaseScene';

const MEDAL_KEYS = ['medal-gold', 'medal-silver', 'medal-bronze'];
const MEDAL_TINT = [0xffe8a3, 0xe3e9ee, 0xf3d2b3];   // gold, silver, bronze row tints
const YOU_EDGE   = 0x167a39;

export class LeaderboardPanel {
    private scene: Phaser.Scene;
    private root: Phaser.GameObjects.Container;
    private listContainer!: Phaser.GameObjects.Container;
    private pinnedContainer!: Phaser.GameObjects.Container;
    private maskShape!: Phaser.GameObjects.Graphics;
    private loadingText!: Phaser.GameObjects.BitmapText;
    private dismissing = false;

    // Layout (derived from the screen size in build())
    private rowH = 0;
    private rowStride = 0;
    private pad = 0;

    // Scroll state
    private listAreaTop  = 0;
    private listAreaH    = 0;
    private pinnedAreaY  = 0;
    private listTotalH   = 0;
    private scrollY      = 0;
    private pointerDown  = false;
    private lastPointerY = 0;
    private velocityY    = 0;
    private dragZone!: Phaser.GameObjects.Zone;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.root  = scene.add.container(0, 0).setDepth(50);
        this.build();
        this.load();
    }

    // ── Build skeleton ───────────────────────────────────────────────────────

    private build(): void {
        const { W, H } = this.dims();
        const panelW = Math.floor(W * 0.88);
        const panelH = Math.floor(H * 0.78);
        const px     = W / 2;
        const py     = H / 2;
        const top    = py - panelH / 2;
        this.pad       = Math.floor(W * 0.05);
        this.rowH      = Math.floor(H * 0.058);
        this.rowStride = this.rowH + Math.floor(H * 0.008);
        const pad = this.pad;
        const profile = SaveManager.getProfile();

        // Dim overlay: tap outside to close
        const overlay = this.scene.add.graphics();
        overlay.fillStyle(THEME.SCRIM, 0.45);
        overlay.fillRect(0, 0, W, H);
        overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, W, H), Phaser.Geom.Rectangle.Contains);
        overlay.on('pointerdown', () => { AudioManager.play('snd_click'); this.dismiss(); });
        this.root.add(overlay);

        // Panel (shadow edge + body); swallows taps so they don't close the popup
        const panel = this.scene.add.graphics();
        panel.fillStyle(THEME.CARD_SHADOW, 1);
        panel.fillRoundedRect(px - panelW / 2, top + 8, panelW, panelH, 32);
        panel.fillStyle(THEME.CARD, 1);
        panel.fillRoundedRect(px - panelW / 2, top, panelW, panelH, 32);
        panel.setInteractive(new Phaser.Geom.Rectangle(px - panelW / 2, top, panelW, panelH), Phaser.Geom.Rectangle.Contains);
        this.root.add(panel);

        // Title and the profile this board belongs to
        const titleY = top + Math.floor(H * 0.05);
        this.root.add(this.text(px, titleY, 'LEADERBOARD', H * 0.03));

        const chipText = this.text(px, 0, profile.name.toUpperCase(), H * 0.014, THEME.WHITE);
        const chipW = chipText.width + W * 0.08;
        const chipH = Math.floor(H * 0.034);
        const chipY = titleY + Math.floor(H * 0.045);
        chipText.setY(chipY);
        const chip = this.scene.add.graphics();
        chip.fillStyle(0x000000, 0.12);
        chip.fillRoundedRect(px - chipW / 2, chipY - chipH / 2 + 3, chipW, chipH, chipH / 2);
        chip.fillStyle(profile.color, 1);
        chip.fillRoundedRect(px - chipW / 2, chipY - chipH / 2, chipW, chipH, chipH / 2);
        this.root.add([chip, chipText]);

        // Column labels
        const headerY = chipY + Math.floor(H * 0.04);
        const { colRank, colName, colScore } = this.cols(px, panelW);
        this.root.add(this.text(colRank,  headerY, '#',      H * 0.016, THEME.MUTED));
        this.root.add(this.text(colName,  headerY, 'PLAYER', H * 0.016, THEME.MUTED).setOrigin(0, 0.5));
        this.root.add(this.text(colScore, headerY, 'BEST',   H * 0.016, THEME.MUTED).setOrigin(1, 0.5));

        // Bottom block: platform board button (+ helper line) on Android / iOS, then the pinned "you" row above it
        const bottomY  = py + panelH / 2 - pad;
        const hasPlat  = LeaderboardManager.platformBoardAvailable;
        const btnH     = Math.floor(H * 0.055);
        let pinnedBottom = bottomY;
        if (hasPlat) {
            const btnY    = bottomY - btnH / 2;
            const helperY = btnY - btnH / 2 - Math.floor(H * 0.024);
            this.addPlatformButton(px, btnY, panelW * 0.7, btnH, helperY);
            pinnedBottom = helperY - Math.floor(H * 0.026);
        }
        this.pinnedAreaY = pinnedBottom - this.rowH;
        this.listAreaTop = headerY + Math.floor(H * 0.026);
        this.listAreaH   = this.pinnedAreaY - Math.floor(H * 0.012) - this.listAreaTop;

        this.listContainer = this.scene.add.container(0, 0);
        this.root.add(this.listContainer);

        // Geometry mask for clipping: only covers the scrollable list
        this.maskShape = this.scene.add.graphics();
        this.maskShape.fillRect(px - panelW / 2 + 4, this.listAreaTop, panelW - 8, this.listAreaH);
        this.listContainer.setMask(this.maskShape.createGeometryMask());

        // Pinned container (not masked, always visible)
        this.pinnedContainer = this.scene.add.container(0, 0);
        this.root.add(this.pinnedContainer);

        this.loadingText = this.text(px, this.listAreaTop + this.listAreaH / 2, 'Loading...', H * 0.026, THEME.MUTED).setDepth(51);
        this.root.add(this.loadingText);

        // Drag zone for scrolling
        this.dragZone = this.scene.add.zone(px - panelW / 2 + 4, this.listAreaTop, panelW - 8, this.listAreaH)
            .setOrigin(0, 0).setInteractive();
        this.root.add(this.dragZone);
        this.bindScrollEvents();

        // Close button: same cross as Settings and Wardrobe
        const closeX = px + panelW / 2 - 40;
        const closeY = top + 40;
        const closeBg = this.scene.add.graphics();
        closeBg.fillStyle(THEME.SURFACE, 1);
        closeBg.fillCircle(closeX, closeY, 26);
        closeBg.lineStyle(5, THEME.INK, 1);
        closeBg.lineBetween(closeX - 9, closeY - 9, closeX + 9, closeY + 9);
        closeBg.lineBetween(closeX + 9, closeY - 9, closeX - 9, closeY + 9);
        this.root.add(closeBg);
        const closeHit = this.scene.add.zone(closeX, closeY, 60, 60).setOrigin(0.5).setInteractive({ useHandCursor: true });
        closeHit.on('pointerdown', () => { AudioManager.play('snd_click'); this.dismiss(); });
        this.root.add(closeHit);

        // Pop-in (just a fade with Reduce motion)
        const calm = SaveManager.isReducedMotion();
        this.root.setScale(calm ? 1 : 0.85).setAlpha(0);
        this.scene.tweens.add({
            targets: this.root, scaleX: 1, scaleY: 1, alpha: 1,
            duration: calm ? 150 : 320, ease: 'Back.Out',
        });
    }

    private text(x: number, y: number, str: string, size: number, tint: number = THEME.INK) {
        return this.scene.add.bitmapText(x, y, 'coiny-bmp', str, Math.floor(size), 0).setOrigin(0.5).setTint(tint);
    }

    private cols(px: number, panelW: number) {
        const left = px - panelW / 2 + this.pad;
        return {
            colRank:  left + this.rowH * 0.5,
            colName:  left + this.rowH * 1.15,
            colScore: px + panelW / 2 - this.pad - 14,
        };
    }

    /** Rounded row with a darker bottom edge, the same chip look as the Wardrobe. */
    private chip(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, face: number, edge: number = THEME.CARD_SHADOW): void {
        g.fillStyle(edge, 1);
        g.fillRoundedRect(x, y + 3, w, h, 16);
        g.fillStyle(face, 1);
        g.fillRoundedRect(x, y, w, h, 16);
    }

    /** Opens this profile's Play Games / Game Center board; a toast if sign-in is declined. */
    private addPlatformButton(x: number, y: number, w: number, h: number, helperY: number): void {
        const { H } = this.dims();
        const name = LeaderboardManager.platformName;
        this.root.add(this.text(x, helperY, `Compare with friends on ${name}`, H * 0.0135, THEME.MUTED));

        const btn = this.scene.add.container(x, y);
        const face = this.scene.add.graphics();
        this.chip(face, -w / 2, -h / 2, w, h, THEME.SURFACE);
        const label = this.text(0, 0, `${name.toUpperCase()} BOARD`, H * 0.016);
        btn.add([face, label]);
        btn.setSize(w, h).setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => {
            AudioManager.play('snd_click');
            this.scene.tweens.add({ targets: btn, scaleX: 0.95, scaleY: 0.95, duration: 70, yoyo: true });
            LeaderboardManager.openPlatformBoard().then((opened) => {
                if (!opened && this.scene.sys.isActive()) {
                    (this.scene as BaseScene).toast(`Sign in to ${name} to see its leaderboard`);
                }
            });
        });
        this.root.add(btn);
    }

    // ── Load data ────────────────────────────────────────────────────────────

    private async load(): Promise<void> {
        const [players, rank, profile] = await Promise.all([
            LeaderboardManager.getTopPlayers(10),
            LeaderboardManager.getPlayerRank(),
            LeaderboardManager.getPlayerProfile(),
        ]);
        if (this.dismissing || !this.root.active) return;
        const uid = Firebase.getUid();

        this.loadingText.destroy();
        this.renderList(players, uid, rank, profile);
    }

    // ── Render rows ──────────────────────────────────────────────────────────

    private renderList(players: LeaderboardEntry[], myUid: string | null, myRank: number, myProfile: LeaderboardEntry | null): void {
        const { W, H } = this.dims();
        const panelW   = Math.floor(W * 0.88);
        const px       = W / 2;
        const rowX     = px - panelW / 2 + this.pad * 0.5;
        const rowW     = panelW - this.pad;
        const { colRank, colName, colScore } = this.cols(px, panelW);
        const fs       = Math.floor(H * 0.022);

        if (players.length === 0) {
            this.listContainer.add(
                this.text(px, this.listAreaTop + this.rowH, 'No scores yet - be the first!', fs, THEME.MUTED),
            );
        } else {
            players.forEach((p, i) => {
                const rowY  = this.listAreaTop + i * this.rowStride;
                const midY  = rowY + this.rowH / 2;
                const isMe  = p.uid === myUid;
                const rowBg = this.scene.add.graphics();
                if (isMe)         this.chip(rowBg, rowX, rowY, rowW, this.rowH, THEME.ADD, YOU_EDGE);
                else if (i < 3)   this.chip(rowBg, rowX, rowY, rowW, this.rowH, MEDAL_TINT[i]);
                else              this.chip(rowBg, rowX, rowY, rowW, this.rowH, i % 2 === 0 ? THEME.SURFACE : THEME.CARD);
                this.listContainer.add(rowBg);

                if (i < 3) {
                    const iconSize = this.rowH * 0.7;
                    this.listContainer.add(
                        this.scene.add.image(colRank, midY, MEDAL_KEYS[i]).setDisplaySize(iconSize, iconSize).setOrigin(0.5),
                    );
                } else {
                    this.listContainer.add(this.text(colRank, midY, `${i + 1}`, fs, isMe ? THEME.WHITE : THEME.MUTED));
                }

                // Generated, never-editable names (e.g. "Player 7K2Q"): nothing a kid typed in
                const nameTxt = isMe ? 'You' : (p.name || `Player ${i + 1}`).substring(0, 14);
                this.listContainer.add(this.text(colName, midY, nameTxt, fs, isMe ? THEME.WHITE : THEME.INK).setOrigin(0, 0.5));
                this.listContainer.add(this.text(colScore, midY, `${p.bestScore}`, fs, isMe ? THEME.WHITE : THEME.GOLD).setOrigin(1, 0.5));
            });

            this.listTotalH = players.length * this.rowStride;
        }

        // ── Pinned "you" row ─────────────────────────────────────────────────
        const midY = this.pinnedAreaY + this.rowH / 2;
        const pinBg = this.scene.add.graphics();
        this.pinnedContainer.add(pinBg);

        if (myRank > 0 && myProfile) {
            this.chip(pinBg, rowX, this.pinnedAreaY, rowW, this.rowH, THEME.ADD, YOU_EDGE);
            const rankStr = myRank <= 999 ? `${myRank}` : '999+';
            this.pinnedContainer.add(this.text(colRank, midY, rankStr, fs, THEME.WHITE));
            this.pinnedContainer.add(this.text(colName, midY, 'YOU', fs, THEME.WHITE).setOrigin(0, 0.5));
            this.pinnedContainer.add(this.text(colScore, midY, `${myProfile.bestScore}`, fs, THEME.WHITE).setOrigin(1, 0.5));
        } else {
            this.chip(pinBg, rowX, this.pinnedAreaY, rowW, this.rowH, THEME.SURFACE);
            this.pinnedContainer.add(this.text(px, midY, 'Play a game to appear here!', H * 0.019, THEME.MUTED));
        }
    }

    // ── Scroll events ────────────────────────────────────────────────────────

    private bindScrollEvents(): void {
        this.dragZone.on('pointerdown', (p: Phaser.Input.Pointer) => {
            this.pointerDown  = true;
            this.lastPointerY = p.y;
            this.velocityY    = 0;
        });

        this.scene.input.on('pointermove', this.onPointerMove, this);
        this.scene.input.on('pointerup', this.onPointerUp, this);

        // Momentum update each frame
        this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.updateMomentum, this);
    }

    private onPointerMove(p: Phaser.Input.Pointer): void {
        if (!this.pointerDown) return;
        const dy = p.y - this.lastPointerY;
        this.velocityY    = dy;
        this.lastPointerY = p.y;
        this.applyScroll(-dy);
    }

    private onPointerUp(): void {
        this.pointerDown = false;
    }

    private updateMomentum(): void {
        if (this.pointerDown || Math.abs(this.velocityY) < 0.5) return;
        this.applyScroll(this.velocityY * 0.85);
        this.velocityY *= 0.88;
    }

    private applyScroll(delta: number): void {
        const maxScroll = Math.max(0, this.listTotalH - this.listAreaH);
        this.scrollY    = Phaser.Math.Clamp(this.scrollY + delta, 0, maxScroll);
        this.listContainer.y = -this.scrollY;
    }

    // ── Dismiss ──────────────────────────────────────────────────────────────

    dismiss(): void {
        if (this.dismissing) return;
        this.dismissing = true;
        this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.updateMomentum, this);
        this.scene.input.off('pointermove', this.onPointerMove, this);
        this.scene.input.off('pointerup', this.onPointerUp, this);
        this.scene.tweens.add({
            targets: this.root, scaleX: 0.85, scaleY: 0.85, alpha: 0,
            duration: 220, ease: 'Power2',
            onComplete: () => {
                this.maskShape.destroy();
                this.root.destroy(true);
            },
        });
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private dims() {
        const cam = this.scene.cameras.main;
        return { W: cam.width, H: cam.height };
    }
}
