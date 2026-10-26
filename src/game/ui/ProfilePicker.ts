import * as Phaser from 'phaser';
import { THEME } from '../constants/Colors';
import { PROFILES, ProfileId } from '../constants/GameConstants';
import { SaveManager } from '../managers/SaveManager';
import { AudioManager } from '../managers/AudioManager';
import { GlobVar } from '../../utils/Global';

/**
 * "Who's playing?" sheet. Three equal cards, no default highlighted, so the
 * choice is neutral (Families policy: don't nudge children toward "adult").
 * Shown automatically on first launch; reopened from the profile chip.
 */
export class ProfilePicker {
    private root: Phaser.GameObjects.Container;

    constructor(private scene: Phaser.Scene, private onPick: (id: ProfileId) => void) {
        // Same size source as BaseScene so the sheet matches the scene layout
        const W: number = GlobVar.width  || scene.scale.width;
        const H: number = GlobVar.height || scene.scale.height;
        const canClose = SaveManager.getProfileId() !== null;

        this.root = scene.add.container(0, 0).setDepth(80);

        const scrim = scene.add.rectangle(W / 2, H / 2, W, H, THEME.SCRIM, 0.55).setInteractive();
        if (canClose) scrim.on('pointerdown', () => { AudioManager.play('snd_click'); this.close(); });
        this.root.add(scrim);

        const panelW = Math.floor(W * 0.88);
        const cardH  = Math.floor(H * 0.12);
        const gap    = Math.floor(H * 0.018);
        const headH  = Math.floor(H * 0.13);
        const panelH = headH + cardH * 3 + gap * 2 + Math.floor(H * 0.04);
        const px     = W / 2 - panelW / 2;
        const py     = H / 2 - panelH / 2;

        const panel = scene.add.graphics();
        panel.fillStyle(THEME.CARD_SHADOW, 1);
        panel.fillRoundedRect(px, py + 8, panelW, panelH, 32);
        panel.fillStyle(THEME.CARD, 1);
        panel.fillRoundedRect(px, py, panelW, panelH, 32);
        panel.setInteractive(new Phaser.Geom.Rectangle(px, py, panelW, panelH), Phaser.Geom.Rectangle.Contains);
        this.root.add(panel);

        this.root.add(scene.add.bitmapText(W / 2, py + headH * 0.42, 'coiny-bmp', "Who's playing?", Math.floor(H * 0.036), 0)
            .setOrigin(0.5).setTint(THEME.INK));
        this.root.add(scene.add.bitmapText(W / 2, py + headH * 0.78, 'coiny-bmp', 'You can change this any time', Math.floor(H * 0.016), 0)
            .setOrigin(0.5).setTint(THEME.MUTED));

        const ids: ProfileId[] = ['little', 'explorer', 'adult'];
        const cardW = panelW - Math.floor(W * 0.08);
        ids.forEach((id, i) => {
            const p  = PROFILES[id];
            const cy = py + headH + i * (cardH + gap) + cardH / 2;
            const card = scene.add.container(W / 2, cy);

            const bg = scene.add.graphics();
            bg.fillStyle(p.color, 1);
            bg.fillRoundedRect(-cardW / 2, -cardH / 2 + 6, cardW, cardH, 22);
            bg.fillStyle(0xffffff, 1);
            bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 22);
            bg.lineStyle(4, p.color, 1);
            bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 22);

            // Badge with a number that grows with the profile: 1, 10, 100
            const badgeR = cardH * 0.3;
            const bx = -cardW / 2 + badgeR + cardW * 0.05;
            bg.fillStyle(p.color, 1);
            bg.fillCircle(bx, 0, badgeR);
            const badge = scene.add.bitmapText(bx, 2, 'coiny-bmp', ['1', '10', '100'][i], Math.floor(badgeR * (i === 2 ? 0.75 : 0.95)), 0)
                .setOrigin(0.5).setTint(0xffffff);

            // Three short lines: name, ages, what changes
            const tx    = bx + badgeR + cardW * 0.05;
            const maxW  = cardW / 2 - tx - cardW * 0.04;
            const name  = scene.add.bitmapText(tx, -cardH * 0.26, 'coiny-bmp', p.name, Math.floor(H * 0.025), 0).setOrigin(0, 0.5).setTint(THEME.INK);
            const ages  = scene.add.bitmapText(tx, 0, 'coiny-bmp', p.ages, Math.floor(H * 0.017), 0).setOrigin(0, 0.5).setTint(p.color);
            const blurb = scene.add.bitmapText(tx, cardH * 0.26, 'coiny-bmp', p.blurb, Math.floor(H * 0.016), 0).setOrigin(0, 0.5).setTint(THEME.MUTED);
            for (const t of [name, ages, blurb]) if (t.width > maxW) t.setScale(maxW / t.width);

            card.add([bg, badge, name, ages, blurb]);
            card.setSize(cardW, cardH).setInteractive({ useHandCursor: true });
            card.on('pointerdown', () => {
                AudioManager.play('snd_click');
                scene.tweens.add({
                    targets: card, scaleX: 0.95, scaleY: 0.95, duration: 70, yoyo: true,
                    onComplete: () => {
                        SaveManager.setProfile(id);
                        this.close();
                        this.onPick(id);
                    },
                });
            });
            this.root.add(card);
        });

        this.root.setAlpha(0);
        scene.tweens.add({ targets: this.root, alpha: 1, duration: 200 });
    }

    close(): void {
        this.scene.tweens.add({
            targets: this.root, alpha: 0, duration: 160,
            onComplete: () => this.root.destroy(),
        });
    }
}
