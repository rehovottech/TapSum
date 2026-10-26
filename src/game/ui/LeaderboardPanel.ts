import * as Phaser from 'phaser';
import { THEME } from '../constants/Colors';
import { LeaderboardEntry, Firebase } from '../../services/Firebase';
import { LeaderboardManager } from '../managers/LeaderboardManager';
import { SaveManager } from '../managers/SaveManager';

const ROW_H        = 72;
const PANEL_PAD    = 28;
const MEDAL_KEYS   = ['medal-gold', 'medal-silver', 'medal-bronze'];

export class LeaderboardPanel {
    private scene: Phaser.Scene;
    private root: Phaser.GameObjects.Container;
    private listContainer!: Phaser.GameObjects.Container;
    private pinnedContainer!: Phaser.GameObjects.Container;
    private maskShape!: Phaser.GameObjects.Graphics;
    private loadingText!: Phaser.GameObjects.BitmapText;

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

        // Dim overlay
        const overlay = this.scene.add.graphics();
        overlay.fillStyle(THEME.SCRIM, 0.45);
        overlay.fillRect(0, 0, W, H);
        this.root.add(overlay);

        // Panel shadow
        const shadow = this.scene.add.graphics();
        shadow.fillStyle(THEME.CARD_SHADOW, 1);
        shadow.fillRoundedRect(px - panelW / 2, py - panelH / 2 + 8, panelW, panelH, 32);
        this.root.add(shadow);

        // Panel body
        const panel = this.scene.add.graphics();
        panel.fillStyle(THEME.CARD, 1);
        panel.fillRoundedRect(px - panelW / 2, py - panelH / 2, panelW, panelH, 32);
        this.root.add(panel);

        // Title
        const titleY = py - panelH / 2 + 52;
        this.root.add(
            this.scene.add.bitmapText(px, titleY, 'coiny-bmp', 'LEADERBOARD', Math.floor(H * 0.030), 0).setOrigin(0.5)
            .setTint(THEME.INK),
        );
        this.root.add(
            this.scene.add.bitmapText(px, titleY + Math.floor(H * 0.03), 'coiny-bmp', SaveManager.getProfile().name.toUpperCase(),
                Math.floor(H * 0.014), 0).setOrigin(0.5).setTint(SaveManager.getProfile().color),
        );

        // Divider
        const divY = titleY + Math.floor(H * 0.048);
        const divG = this.scene.add.graphics();
        divG.lineStyle(2, THEME.TRACK, 1);
        divG.lineBetween(px - panelW / 2 + PANEL_PAD, divY, px + panelW / 2 - PANEL_PAD, divY);
        this.root.add(divG);

        // Header row
        const headerY = divY + 22;
        const colRank  = px - panelW / 2 + PANEL_PAD + 28;
        const colName  = px - panelW / 2 + PANEL_PAD + 90;
        const colScore = px + panelW / 2 - PANEL_PAD - 10;

        this.root.add(this.scene.add.bitmapText(colRank,  headerY, 'coiny-bmp', '#', Math.floor(H * 0.02), 0).setOrigin(0.5).setTint(0x52697b));
        this.root.add(this.scene.add.bitmapText(colName,  headerY, 'coiny-bmp', 'PLAYER', Math.floor(H * 0.02), 0).setOrigin(0, 0.5).setTint(0x52697b));
        this.root.add(this.scene.add.bitmapText(colScore, headerY, 'coiny-bmp', 'BEST', Math.floor(H * 0.02), 0).setOrigin(1, 0.5).setTint(0x52697b));

        // Scrollable list area — shortened to leave room for the pinned "you" row
        const pinnedRowH     = ROW_H + 20;
        this.listAreaTop     = headerY + 28;
        this.listAreaH       = panelH - (this.listAreaTop - (py - panelH / 2)) - PANEL_PAD - 60 - pinnedRowH;
        this.pinnedAreaY     = this.listAreaTop + this.listAreaH + 90;

        this.listContainer = this.scene.add.container(0, 0);
        this.root.add(this.listContainer);

        // Geometry mask for clipping — only covers the scrollable list
        this.maskShape = this.scene.add.graphics();
        this.maskShape.fillRect(
            px - panelW / 2 + 4,
            this.listAreaTop,
            panelW - 8,
            this.listAreaH,
        );
        this.listContainer.setMask(this.maskShape.createGeometryMask());

        // Divider above pinned row
        const pinDivG = this.scene.add.graphics();
        pinDivG.lineStyle(2, THEME.STAR, 0.6);
        pinDivG.lineBetween(px - panelW / 2 + PANEL_PAD, this.pinnedAreaY - 4, px + panelW / 2 - PANEL_PAD, this.pinnedAreaY - 4);
        this.root.add(pinDivG);

        // Pinned container (not masked — always visible)
        this.pinnedContainer = this.scene.add.container(0, 0);
        this.root.add(this.pinnedContainer);

        // Loading text
        this.loadingText = this.scene.add.bitmapText(px, this.listAreaTop + this.listAreaH / 2, 'coiny-bmp', 'Loading…', Math.floor(H * 0.03), 0).setOrigin(0.5).setDepth(51).setTint(0x52697b);
        this.root.add(this.loadingText);

        // Drag zone for scrolling
        this.dragZone = this.scene.add.zone(
            px - panelW / 2 + 4,
            this.listAreaTop,
            panelW - 8,
            this.listAreaH,
        ).setOrigin(0, 0).setInteractive();
        this.root.add(this.dragZone);
        this.bindScrollEvents();

        // Close button
        const closeX = px + panelW / 2 - 35;
        const closeY = py - panelH / 2 + 35;
        const closeBg = this.scene.add.graphics();
        closeBg.fillStyle(0xe6eef2, 1);
        closeBg.fillCircle(closeX, closeY, 22);
        
        const closeTxt = this.scene.add.bitmapText(closeX, closeY-3, 'krungthep-bmp', 'x', Math.floor(H * 0.020), 0).setOrigin(0.5).setTint(THEME.INK);
        this.root.add(closeBg);
        this.root.add(closeTxt);

        const closeHit = this.scene.add.zone(closeX, closeY, 52, 52).setOrigin(0.5).setInteractive({ useHandCursor: true });
        closeHit.on('pointerdown', () => this.dismiss());
        this.root.add(closeHit);

        // Pop-in
        this.root.setScale(0.85).setAlpha(0);
        this.scene.tweens.add({
            targets: this.root, scaleX: 1, scaleY: 1, alpha: 1,
            duration: 320, ease: 'Back.Out',
        });
    }

    // ── Load data ────────────────────────────────────────────────────────────

    private async load(): Promise<void> {
        const [players, rank, profile] = await Promise.all([
            LeaderboardManager.getTopPlayers(10),
            LeaderboardManager.getPlayerRank(),
            LeaderboardManager.getPlayerProfile(),
        ]);
        const uid = Firebase.getUid();

        this.loadingText.destroy();
        this.renderList(players, uid, rank, profile);
    }

    // ── Render rows ──────────────────────────────────────────────────────────

    private renderList(players: LeaderboardEntry[], myUid: string | null, myRank: number, myProfile: LeaderboardEntry | null): void {
        const { W, H } = this.dims();
        const panelW   = Math.floor(W * 0.88);
        const px       = W / 2;

        const colRank  = px - panelW / 2 + PANEL_PAD + 28;
        const colName  = px - panelW / 2 + PANEL_PAD + 90;
        const colScore = px + panelW / 2 - PANEL_PAD - 10;
        const fs       = Math.floor(H * 0.026);

        if (players.length === 0) {
            this.listContainer.add(
                this.scene.add.bitmapText(px, this.listAreaTop + 60, 'coiny-bmp', 'No scores yet — be the first!', fs, 0).setOrigin(0.5)
                .setTint(0x52697b),
            );
        } else {
            players.forEach((p, i) => {
                const rowY  = this.listAreaTop + i * ROW_H + ROW_H / 2;
                const isMe  = p.uid === myUid;
                const rowBg = this.scene.add.graphics();

                if (isMe) {
                    rowBg.fillStyle(0xe6eef2, 1);
                    rowBg.fillRoundedRect(px - panelW / 2 + 8, rowY - ROW_H / 2 + 4, panelW - 16, ROW_H - 8, 12);
                } else if (i % 2 === 0) {
                    rowBg.fillStyle(0xe6eef2, 0.6);
                    rowBg.fillRect(px - panelW / 2 + 8, rowY - ROW_H / 2 + 4, panelW - 16, ROW_H - 8);
                }
                this.listContainer.add(rowBg);

                if (i < 3) {
                    const iconSize = ROW_H * 0.62;
                    this.listContainer.add(
                        this.scene.add.image(colRank, rowY, MEDAL_KEYS[i]).setDisplaySize(iconSize, iconSize).setOrigin(0.5)
                    );
                } else {
                    const rankColor = 0x52697b;
                    this.listContainer.add(
                        this.scene.add.bitmapText(colRank, rowY, 'coiny-bmp', `${i + 1}`, fs, 0).setOrigin(0.5)
                        .setTint(rankColor)
                    );
                }

                const nameColor = isMe ? 0x52691e : THEME.INK;
                const nameTxt   = isMe ? 'You' : `Player ${i + 1}`; //(p.name ?? `Player ${i + 1}`).substring(0, 10);
                this.listContainer.add(
                    this.scene.add.bitmapText(colName, rowY, 'coiny-bmp', nameTxt, fs, 0).setOrigin(0, 0.5)
                    .setTint(nameColor)
                );

                const scoreColor = isMe ? THEME.GOLD : THEME.INK;
                this.listContainer.add(
                    this.scene.add.bitmapText(colScore, rowY, 'coiny-bmp', `${p.bestScore}`, fs, 0).setOrigin(1, 0.5)
                    .setTint(scoreColor)
                );
            });

            this.listTotalH = players.length * ROW_H;
        }

        // ── Pinned "you" row ─────────────────────────────────────────────────
        const rowY = this.pinnedAreaY + ROW_H / 2;

        const pinBg = this.scene.add.graphics();
        pinBg.fillStyle(0xe8f2c7, 1);
        pinBg.fillRoundedRect(px - panelW / 2 + 8, rowY - ROW_H / 2 + 4, panelW - 16, ROW_H - 8, 12);
        pinBg.lineStyle(2, THEME.STAR, 1);
        pinBg.strokeRoundedRect(px - panelW / 2 + 8, rowY - ROW_H / 2 + 4, panelW - 16, ROW_H - 8, 12);
        this.pinnedContainer.add(pinBg);

        const goldTint = 0x52691e;

        if (myRank > 0 && myProfile) {
            const rankStr = myRank <= 999 ? `${myRank}` : '999+';
            this.pinnedContainer.add(
                this.scene.add.bitmapText(colRank, rowY, 'coiny-bmp', rankStr, fs, 0).setOrigin(0.5).setTint(goldTint)
            );
            this.pinnedContainer.add(
                this.scene.add.bitmapText(colName, rowY, 'coiny-bmp', 'YOU', fs, 0).setOrigin(0, 0.5)
                .setTint(THEME.ADD)
            );
            this.pinnedContainer.add(
                this.scene.add.bitmapText(colScore, rowY, 'coiny-bmp', `${myProfile.bestScore}`, fs, 0).setOrigin(1, 0.5).setTint(goldTint)
            );
        } else {
            this.pinnedContainer.add(
                this.scene.add.bitmapText(px, rowY, 'coiny-bmp', 'Play a game to appear here!', Math.floor(H * 0.022), 0).setOrigin(0.5)
                .setTint(THEME.MUTED)
            );
        }
    }

    // ── Scroll events ────────────────────────────────────────────────────────

    private bindScrollEvents(): void {
        this.dragZone.on('pointerdown', (p: Phaser.Input.Pointer) => {
            this.pointerDown  = true;
            this.lastPointerY = p.y;
            this.velocityY    = 0;
        });

        this.scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
            if (!this.pointerDown) return;
            const dy = p.y - this.lastPointerY;
            this.velocityY    = dy;
            this.lastPointerY = p.y;
            this.applyScroll(-dy);
        });

        this.scene.input.on('pointerup', () => {
            this.pointerDown = false;
        });

        // Momentum update each frame
        this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.updateMomentum, this);
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
        this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.updateMomentum, this);
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
