import * as Phaser from 'phaser';
import { COLORS } from '../constants/Colors';
import { LeaderboardEntry } from '../../services/Firebase';
import { Firebase } from '../../services/Firebase';

const ROW_H       = 72;
const PANEL_PAD   = 28;
const CROWN_ICONS = ['👑', '🥈', '🥉'];

export class LeaderboardPanel {
    private scene: Phaser.Scene;
    private root: Phaser.GameObjects.Container;
    private listContainer!: Phaser.GameObjects.Container;
    private maskShape!: Phaser.GameObjects.Graphics;
    private loadingText!: Phaser.GameObjects.Text;

    // Scroll state
    private listAreaTop  = 0;
    private listAreaH    = 0;
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
        overlay.fillStyle(0x000000, 0.72);
        overlay.fillRect(0, 0, W, H);
        this.root.add(overlay);

        // Panel shadow
        const shadow = this.scene.add.graphics();
        shadow.fillStyle(0x000000, 0.55);
        shadow.fillRoundedRect(px - panelW / 2 + 8, py - panelH / 2 + 12, panelW, panelH, 28);
        this.root.add(shadow);

        // Panel body
        const panel = this.scene.add.graphics();
        panel.fillStyle(0x12103a, 1);
        panel.fillRoundedRect(px - panelW / 2, py - panelH / 2, panelW, panelH, 24);
        panel.lineStyle(2, COLORS.NEON_BLUE, 0.5);
        panel.strokeRoundedRect(px - panelW / 2, py - panelH / 2, panelW, panelH, 24);
        this.root.add(panel);

        // Title
        const titleY = py - panelH / 2 + 52;
        this.root.add(
            this.scene.add.text(px, titleY, 'LEADERBOARD', {
                fontFamily: 'Coiny',
                fontSize:   `${Math.floor(H * 0.042)}px`,
                color:      COLORS.TEXT_NEON,
                fontStyle:  'bold',
            }).setOrigin(0.5),
        );

        // Divider
        const divY = titleY + Math.floor(H * 0.048);
        const divG = this.scene.add.graphics();
        divG.lineStyle(1, COLORS.NEON_BLUE, 0.25);
        divG.lineBetween(px - panelW / 2 + PANEL_PAD, divY, px + panelW / 2 - PANEL_PAD, divY);
        this.root.add(divG);

        // Header row
        const headerY = divY + 22;
        const colRank  = px - panelW / 2 + PANEL_PAD + 28;
        const colName  = px - panelW / 2 + PANEL_PAD + 90;
        const colScore = px + panelW / 2 - PANEL_PAD - 10;
        const hStyle   = { fontFamily: 'Coiny', fontSize: `${Math.floor(H * 0.022)}px`, color: '#8899bb' };
        this.root.add(this.scene.add.text(colRank,  headerY, '#',      hStyle).setOrigin(0.5));
        this.root.add(this.scene.add.text(colName,  headerY, 'PLAYER', { ...hStyle }).setOrigin(0, 0.5));
        this.root.add(this.scene.add.text(colScore, headerY, 'BEST',   hStyle).setOrigin(1, 0.5));

        // Scrollable list area
        this.listAreaTop = headerY + 28;
        this.listAreaH   = panelH - (this.listAreaTop - (py - panelH / 2)) - PANEL_PAD - 60;

        this.listContainer = this.scene.add.container(0, 0);
        this.root.add(this.listContainer);

        // Geometry mask for clipping
        this.maskShape = this.scene.add.graphics();
        this.maskShape.fillRect(
            px - panelW / 2 + 4,
            this.listAreaTop,
            panelW - 8,
            this.listAreaH,
        );
        this.listContainer.setMask(this.maskShape.createGeometryMask());

        // Loading text
        this.loadingText = this.scene.add.text(px, this.listAreaTop + this.listAreaH / 2, 'Loading…', {
            fontFamily: 'Coiny',
            fontSize:   `${Math.floor(H * 0.03)}px`,
            color:      '#667799',
        }).setOrigin(0.5).setDepth(51);
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
        const closeX = px + panelW / 2 - 30;
        const closeY = py - panelH / 2 + 30;
        const closeBg = this.scene.add.graphics();
        closeBg.fillStyle(0xff1744, 0.85);
        closeBg.fillCircle(closeX, closeY, 22);
        const closeTxt = this.scene.add.text(closeX, closeY, '✕', {
            fontFamily: 'Akt-SemiBold',
            fontSize:   `${Math.floor(H * 0.025)}px`,
            color:      '#ffffff',
        }).setOrigin(0.5);
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
        const players = await Firebase.getTopPlayers('tapsum');
        const rank    = await Firebase.getPlayerRank('tapsum');
        const uid     = Firebase.getUid();

        this.loadingText.destroy();
        this.renderList(players, uid, rank);
    }

    // ── Render rows ──────────────────────────────────────────────────────────

    private renderList(players: LeaderboardEntry[], myUid: string | null, myRank: number): void {
        const { W, H } = this.dims();
        const panelW   = Math.floor(W * 0.88);
        const px       = W / 2;

        const colRank  = px - panelW / 2 + PANEL_PAD + 28;
        const colName  = px - panelW / 2 + PANEL_PAD + 90;
        const colScore = px + panelW / 2 - PANEL_PAD - 10;
        const fs       = Math.floor(H * 0.026);

        if (players.length === 0) {
            this.listContainer.add(
                this.scene.add.text(px, this.listAreaTop + 60, 'No scores yet — be the first!', {
                    fontFamily: 'Coiny', fontSize: `${fs}px`, color: '#667799',
                }).setOrigin(0.5),
            );
            return;
        }

        players.forEach((p, i) => {
            const rowY   = this.listAreaTop + i * ROW_H + ROW_H / 2;
            const isMe   = p.uid === myUid;
            const rowBg  = this.scene.add.graphics();

            if (isMe) {
                rowBg.fillStyle(COLORS.NEON_BLUE, 0.12);
                rowBg.fillRoundedRect(px - panelW / 2 + 8, rowY - ROW_H / 2 + 4, panelW - 16, ROW_H - 8, 12);
            } else if (i % 2 === 0) {
                rowBg.fillStyle(0xffffff, 0.03);
                rowBg.fillRect(px - panelW / 2 + 8, rowY - ROW_H / 2 + 4, panelW - 16, ROW_H - 8);
            }
            this.listContainer.add(rowBg);

            // Rank / crown
            const rankLabel = i < 3 ? CROWN_ICONS[i] : `${i + 1}`;
            const rankColor = i === 0 ? COLORS.TEXT_GOLD : i === 1 ? '#cccccc' : i === 2 ? '#cd7f32' : '#8899bb';
            this.listContainer.add(
                this.scene.add.text(colRank, rowY, rankLabel, {
                    fontFamily: 'Coiny', fontSize: `${fs}px`, color: rankColor,
                }).setOrigin(0.5),
            );

            // Name
            const nameColor = isMe ? COLORS.TEXT_NEON : COLORS.TEXT_WHITE;
            const nameTxt   = (p.name ?? 'Player').substring(0, 18);
            const meTag     = isMe ? ' ◀' : '';
            this.listContainer.add(
                this.scene.add.text(colName, rowY, nameTxt + meTag, {
                    fontFamily: 'Coiny', fontSize: `${fs}px`, color: nameColor,
                }).setOrigin(0, 0.5),
            );

            // Score
            const scoreColor = isMe ? COLORS.TEXT_GOLD : COLORS.TEXT_WHITE;
            this.listContainer.add(
                this.scene.add.text(colScore, rowY, `${p.bestScore}`, {
                    fontFamily: 'Coiny', fontSize: `${fs}px`, color: scoreColor,
                }).setOrigin(1, 0.5),
            );
        });

        this.listTotalH = players.length * ROW_H;

        // Auto-scroll to current player rank
        if (myRank > 0) {
            const targetY = (myRank - 1) * ROW_H - this.listAreaH / 2 + ROW_H / 2;
            this.scrollY   = Phaser.Math.Clamp(targetY, 0, Math.max(0, this.listTotalH - this.listAreaH));
            this.listContainer.y = -this.scrollY;
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
