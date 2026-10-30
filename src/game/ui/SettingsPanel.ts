import * as Phaser from 'phaser';
import { THEME } from '../constants/Colors';
import { AudioManager } from '../managers/AudioManager';
import { PurchasesManager } from '../../services/Purchases';
import { PRIVACY_URL, TERMS_URL } from '../../config/Links';
import { SaveManager } from '../managers/SaveManager';
import { Feel } from '../utils/Feel';

/** Settings popup: music and effects sliders, vibration, reduced motion. */
export class SettingsPanel {
    private root: Phaser.GameObjects.Container;

    constructor(private scene: Phaser.Scene, private W: number, private H: number, private onClose: () => void, private onPremiumRestored: () => void) {
        const panelW = Math.floor(W * 0.86);
        const panelH = Math.floor(H * 0.68);
        const px = W / 2;
        const py = H / 2;
        const left = px - panelW / 2;

        this.root = scene.add.container(0, 0).setDepth(70);

        const overlay = scene.add.graphics();
        overlay.fillStyle(THEME.SCRIM, 0.45);
        overlay.fillRect(0, 0, W, H);
        overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, W, H), Phaser.Geom.Rectangle.Contains);
        overlay.on('pointerdown', () => this.close());
        this.root.add(overlay);

        const card = scene.add.graphics();
        card.fillStyle(THEME.CARD_SHADOW, 1);
        card.fillRoundedRect(left, py - panelH / 2 + 6, panelW, panelH, 32);
        card.fillStyle(THEME.CARD, 1);
        card.fillRoundedRect(left, py - panelH / 2, panelW, panelH, 32);
        // swallow taps on the card so they don't close the popup
        card.setInteractive(new Phaser.Geom.Rectangle(left, py - panelH / 2, panelW, panelH), Phaser.Geom.Rectangle.Contains);
        this.root.add(card);

        const top = py - panelH / 2;
        this.root.add(this.text(px, top + panelH * 0.1, 'SETTINGS', H * 0.032));

        const rowGap = panelH * 0.115;
        let y = top + panelH * 0.2;
        this.addSwitch(left, panelW, y, 'Sound', AudioManager.isSoundEnabled(), (on) => {
            AudioManager.setMute(!on);
            if (on) AudioManager.playMusic();
        });
        y += rowGap;
        this.addSlider(left, panelW, y, 'Music', SaveManager.getMusicVolume(), (v) => AudioManager.setMusicVolume(v));
        y += rowGap;
        this.addSlider(left, panelW, y, 'Sound effects', SaveManager.getSfxVolume(), (v) => AudioManager.setSfxVolume(v), () => AudioManager.play('snd_tap'));
        y += rowGap;
        this.addSwitch(left, panelW, y, 'Vibration', SaveManager.isHapticsEnabled(), (on) => {
            SaveManager.setHapticsEnabled(on);
            if (on) Feel.bigTap();
        });
        y += rowGap;
        this.addSwitch(left, panelW, y, 'Reduce motion', SaveManager.isReducedMotion(), (on) => SaveManager.setReducedMotion(on));

        // Restore purchases (App Store requirement) and legal links
        const linkSize = H * 0.019;
        const bw = panelW * 0.62;
        const bh = Math.floor(H * 0.055);
        const by = top + panelH * 0.78;
        const btn = scene.add.container(px, by);
        const face = scene.add.graphics();
        face.fillStyle(THEME.CARD_SHADOW, 1);
        face.fillRoundedRect(-bw / 2, -bh / 2 + 4, bw, bh, bh * 0.3);
        face.fillStyle(THEME.SURFACE, 1);
        face.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, bh * 0.3);
        const restore = this.text(0, 0, 'RESTORE PURCHASES', H * 0.016);
        btn.add([face, restore]);
        btn.setSize(bw, bh).setInteractive({ useHandCursor: true });
        let restoring = false;
        btn.on('pointerdown', async () => {
            if (restoring) return;
            restoring = true;
            AudioManager.play('snd_click');
            scene.tweens.add({ targets: btn, scaleX: 0.95, scaleY: 0.95, duration: 70, yoyo: true });
            restore.setText('RESTORING...');
            const premium = await PurchasesManager.restore();
            if (!restore.active) return;
            restore.setText(premium ? 'PREMIUM RESTORED!' : 'NOTHING TO RESTORE');
            if (premium) {
                AudioManager.play('snd_reward');
                this.onPremiumRestored();
            }
            scene.time.delayedCall(2000, () => {
                if (!restore.active) return;
                restore.setText('RESTORE PURCHASES');
                restoring = false;
            });
        });
        this.root.add(btn);

        ([['Privacy policy', PRIVACY_URL, -1], ['Terms of service', TERMS_URL, 1]] as const).forEach(([label, url, side]) => {
            const link = this.text(px + side * panelW * 0.22, top + panelH * 0.89, label, linkSize, 0x1e90e8);
            link.setInteractive({ useHandCursor: true });
            link.on('pointerdown', async () => {
                AudioManager.play('snd_click');
                // Leaving the app needs a grown-up first in this Kids game
                if (await PurchasesManager.askGrownUp()) window.open(url, '_blank');
            });
            this.root.add(link);
        });

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

    private addSlider(left: number, panelW: number, y: number, name: string, value: number,
                      onChange: (v: number) => void, onRelease?: () => void): void {
        const s = this.scene;
        const pad = panelW * 0.08;
        this.root.add(this.text(left + pad, y - this.H * 0.03, name, this.H * 0.022).setOrigin(0, 0.5));

        const trackX = left + pad;
        const trackW = panelW - pad * 2;
        const h = Math.max(10, this.H * 0.012);
        const knobR = h * 1.7;
        const track = s.add.graphics();
        const draw = (v: number) => {
            track.clear();
            track.fillStyle(THEME.CARD_SHADOW, 1);
            track.fillRoundedRect(trackX, y - h / 2, trackW, h, h / 2);
            track.fillStyle(THEME.ADD, 1);
            track.fillRoundedRect(trackX, y - h / 2, Math.max(h, trackW * v), h, h / 2);
            track.fillStyle(THEME.CARD, 1);
            track.lineStyle(4, THEME.ADD, 1);
            track.fillCircle(trackX + trackW * v, y, knobR);
            track.strokeCircle(trackX + trackW * v, y, knobR);
        };
        draw(value);
        this.root.add(track);

        const hit = s.add.zone(trackX + trackW / 2, y, trackW + knobR * 2, knobR * 3).setInteractive({ useHandCursor: true });
        const set = (p: Phaser.Input.Pointer) => {
            const v = Phaser.Math.Clamp((p.x - trackX) / trackW, 0, 1);
            draw(v);
            onChange(v);
        };
        hit.on('pointerdown', set);
        hit.on('pointermove', (p: Phaser.Input.Pointer) => { if (p.isDown) set(p); });
        hit.on('pointerup', () => onRelease?.());
        this.root.add(hit);
    }

    private addSwitch(left: number, panelW: number, y: number, name: string, value: boolean, onChange: (on: boolean) => void): void {
        const s = this.scene;
        const pad = panelW * 0.08;
        this.root.add(this.text(left + pad, y, name, this.H * 0.022).setOrigin(0, 0.5));

        const w = panelW * 0.2;
        const h = w * 0.5;
        const cx = left + panelW - pad - w / 2;
        const g = s.add.graphics();
        let on = value;
        const draw = () => {
            g.clear();
            g.fillStyle(on ? THEME.ADD : THEME.CARD_SHADOW, 1);
            g.fillRoundedRect(cx - w / 2, y - h / 2, w, h, h / 2);
            g.fillStyle(0xffffff, 1);
            g.fillCircle(on ? cx + w / 2 - h / 2 : cx - w / 2 + h / 2, y, h * 0.4);
        };
        draw();
        this.root.add(g);

        const hit = s.add.zone(cx, y, w * 1.3, h * 1.6).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => {
            on = !on;
            draw();
            AudioManager.play('snd_click');
            onChange(on);
        });
        this.root.add(hit);
    }

    close(): void {
        AudioManager.play('snd_click');
        this.scene.tweens.add({
            targets: this.root, alpha: 0, duration: 140,
            onComplete: () => { this.root.destroy(); this.onClose(); },
        });
    }
}
