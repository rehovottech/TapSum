import * as Phaser from 'phaser';
import { GlobVar } from '../../utils/Global';
import FPS from '../model/FPS';
import { THEME } from '../constants/Colors';
import { SCENERIES, Scenery } from '../constants/Outfits';
import { SaveManager } from '../managers/SaveManager';
import { LeaderboardPanel } from '../ui/LeaderboardPanel';
import { AudioManager } from '../managers/AudioManager';

export default abstract class BaseScene extends Phaser.Scene {
    protected sceneClose = false;
    protected fpsView?: FPS;

    // ── Dimensions helpers ──────────────────────────────────────────────────

    protected get W(): number  { return GlobVar.width  || window.innerWidth  || 720; }
    protected get H(): number  { return GlobVar.height || window.innerHeight || 1280; }
    protected get CX(): number { return GlobVar.centerX || this.W / 2; }
    protected get CY(): number { return GlobVar.centerY || this.H / 2; }

    // ── Scene lifecycle ─────────────────────────────────────────────────────

    protected initScene(): void {
        this.sceneClose = false;
        this.events.once(Phaser.Scenes.Events.DESTROY,  () => this.onSceneDestroy());
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.onSceneShutdown());
        this.events.on(Phaser.Scenes.Events.PAUSE,      () => this.onScenePause());
        this.events.on(Phaser.Scenes.Events.RESUME,     () => this.onSceneResume());
    }

    protected onSceneDestroy(): void {}
    protected onSceneShutdown(): void {}
    protected onScenePause(): void {}
    protected onSceneResume(): void {}

    // ── Scene transitions ───────────────────────────────────────────────────

    protected moveToScene(key: string, data?: object): void {
        if (this.sceneClose) return;
        this.sceneClose = true;
        this.scene.stop(this.scene.key);
        this.scene.start(key, data);
    }

    protected fadeToScene(key: string, data?: object, duration = 300): void {
        this.cameras.main.fadeOut(duration, 0, 0, 0, (_: any, t: number) => {
            if (t === 1) this.moveToScene(key, data);
        });
    }

    // ── Background ──────────────────────────────────────────────────────────

    protected createGradientBg(colorTop: number, colorBottom: number): Phaser.GameObjects.Graphics {
        const gfx = this.add.graphics();
        const steps = 24;
        const stepH = this.H / steps;
        const tr = (colorTop    >> 16) & 0xff;
        const tg = (colorTop    >>  8) & 0xff;
        const tb =  colorTop          & 0xff;
        const br = (colorBottom >> 16) & 0xff;
        const bg = (colorBottom >>  8) & 0xff;
        const bb =  colorBottom       & 0xff;

        for (let i = 0; i < steps; i++) {
            const t = i / (steps - 1);
            const color =
                (Math.round(tr + (br - tr) * t) << 16) |
                (Math.round(tg + (bg - tg) * t) <<  8) |
                 Math.round(tb + (bb - tb) * t);
            gfx.fillStyle(color, 1);
            gfx.fillRect(0, Math.floor(i * stepH), this.W, Math.ceil(stepH) + 1);
        }
        return gfx;
    }

    /** Background fill with two rolling hills, in the player's chosen scenery. */
    protected createSkyBg(hillTop = 0.86): void {
        const sc = SCENERIES.find((x) => x.id === SaveManager.getScenery()) ?? SCENERIES[0];
        this.createGradientBg(sc.top, sc.bottom);
        this.createSceneryDeco(sc.deco, hillTop);

        const hills = this.add.graphics();
        const y0 = this.H * hillTop;
        hills.fillStyle(sc.hillBack, 1);
        hills.fillEllipse(this.W * 0.2, y0 + this.H * 0.07, this.W * 1.1, this.H * 0.2);
        hills.fillStyle(sc.hillFront, 1);
        hills.fillEllipse(this.W * 0.85, y0 + this.H * 0.1, this.W * 1.2, this.H * 0.22);
        hills.fillRect(0, y0 + this.H * 0.1, this.W, this.H);
    }

    /** Soft shapes behind everything; they drift or twinkle unless Reduce motion is on. */
    private createSceneryDeco(deco: Scenery['deco'], hillTop: number): void {
        if (deco === 'none') return;
        const calm = SaveManager.isReducedMotion();
        const rnd = new Phaser.Math.RandomDataGenerator(['tapsum-scenery']);   // same layout every visit
        const count = deco === 'clouds' ? 4 : 14;
        for (let i = 0; i < count; i++) {
            const g = this.add.graphics();
            const x = rnd.between(0, this.W);
            const y = rnd.between(Math.floor(this.H * 0.04), Math.floor(this.H * (deco === 'clouds' ? 0.8 : hillTop)));
            const r = rnd.between(Math.floor(this.H * 0.008), Math.floor(this.H * 0.02));
            switch (deco) {
                case 'clouds': {
                    const w = this.W * 0.22;
                    g.fillStyle(0xffffff, 0.7);
                    g.fillEllipse(0, 0, w, w * 0.28);
                    g.fillEllipse(-w * 0.2, -w * 0.08, w * 0.5, w * 0.3);
                    g.fillEllipse(w * 0.15, -w * 0.1, w * 0.45, w * 0.32);
                    break;
                }
                case 'bubbles':
                    g.lineStyle(2, 0xffffff, 0.9);
                    g.fillStyle(0xffffff, 0.35);
                    g.fillCircle(0, 0, r);
                    g.strokeCircle(0, 0, r);
                    break;
                case 'hearts':
                    g.fillStyle(0xff8fc3, 0.45);
                    g.fillCircle(-r * 0.5, -r * 0.3, r * 0.6);
                    g.fillCircle(r * 0.5, -r * 0.3, r * 0.6);
                    g.fillTriangle(-r * 1.05, -r * 0.05, r * 1.05, -r * 0.05, 0, r * 1.2);
                    break;
                case 'stars': {
                    g.fillStyle(0xffffff, 0.9);
                    const pts: Phaser.Math.Vector2[] = [];
                    for (let k = 0; k < 10; k++) {
                        const a = -Math.PI / 2 + (Math.PI / 5) * k;
                        const rr = k % 2 === 0 ? r : r * 0.45;
                        pts.push(new Phaser.Math.Vector2(Math.cos(a) * rr, Math.sin(a) * rr));
                    }
                    g.fillPoints(pts, true);
                    break;
                }
            }
            g.setPosition(x, y);
            if (calm) continue;
            if (deco === 'clouds') {
                this.tweens.add({ targets: g, x: x + this.W * 0.08, duration: rnd.between(9000, 15000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            } else if (deco === 'bubbles') {
                this.tweens.add({ targets: g, y: y - this.H * 0.04, duration: rnd.between(2500, 4500), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            } else {
                this.tweens.add({ targets: g, alpha: 0.35, duration: rnd.between(900, 2200), yoyo: true, repeat: -1, delay: rnd.between(0, 1500) });
            }
        }
    }

    /** Paper confetti falling from the top of the screen. */
    protected spawnConfetti(count = 40): void {
        for (let i = 0; i < count; i++) {
            const w = Phaser.Math.Between(6, 12);
            const piece = this.add.rectangle(
                Phaser.Math.Between(0, Math.floor(this.W)), -20 - Phaser.Math.Between(0, Math.floor(this.H * 0.2)),
                w, w * 1.8, THEME.CANDY[i % THEME.CANDY.length],
            ).setDepth(40).setAngle(Phaser.Math.Between(0, 360));
            this.tweens.add({
                targets: piece,
                y: this.H + 40,
                x: piece.x + Phaser.Math.Between(-80, 80),
                angle: piece.angle + Phaser.Math.Between(180, 720),
                duration: Phaser.Math.Between(1400, 2400),
                delay: Phaser.Math.Between(0, 400),
                ease: 'Sine.easeIn',
                onComplete: () => piece.destroy(),
            });
        }
    }

    /** White rounded card with a soft coloured drop edge (light theme). */
    protected drawCard(
        gfx: Phaser.GameObjects.Graphics,
        x: number, y: number, w: number, h: number, radius: number,
        fill: number = THEME.CARD, edge: number = THEME.CARD_SHADOW,
    ): Phaser.GameObjects.Graphics {
        gfx.fillStyle(edge, 1);
        gfx.fillRoundedRect(x, y + Math.max(3, Math.round(h * 0.03)), w, h, radius);
        gfx.fillStyle(fill, 1);
        gfx.fillRoundedRect(x, y, w, h, radius);
        return gfx;
    }

    /** Light-theme bitmap label helper: Coiny, tinted, centred. */
    protected label(
        x: number, y: number, text: string, size: number, tint: number = THEME.INK,
    ): Phaser.GameObjects.BitmapText {
        return this.add.bitmapText(x, y, 'coiny-bmp', text, Math.floor(size), 0).setOrigin(0.5).setTint(tint);
    }

    // ── 3-D feel button ─────────────────────────────────────────────────────

    protected createButton(
        x: number, y: number,
        width: number, height: number,
        label: string, fontSize: number,
        faceColor: number, sideColor: number,
        callback: () => void,
        textColor = THEME.INK,
    ): Phaser.GameObjects.Container {
        const radius = height * 0.28;
        const sideH  = Math.round(height * 0.10);

        const container = this.add.container(x, y);

        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.10);
        shadow.fillRoundedRect(-width / 2, -height / 2 + sideH + 4, width, height, radius);

        const side = this.add.graphics();
        side.fillStyle(sideColor, 1);
        side.fillRoundedRect(-width / 2, -height / 2 + sideH, width, height, radius);

        const face = this.add.graphics();
        face.fillStyle(faceColor, 1);
        face.fillRoundedRect(-width / 2, -height / 2, width, height - sideH, radius);

        const txt = this.add.bitmapText(0, -Math.round(sideH * 0.5), 'coiny-bmp', label, Math.floor(fontSize), 0)
            .setOrigin(0.5).setTint(textColor);

        container.add([shadow, side, face, txt]);
        container.setSize(width, height);
        container.setInteractive({ useHandCursor: true });

        container.on('pointerdown', () => {
            this.tweens.add({
                targets: container,
                scaleX: 0.92, scaleY: 0.92,
                duration: 70, ease: 'Power2', yoyo: true,
                onComplete: callback,
            });
        });
        container.on('pointerover', () =>
            this.tweens.add({ targets: container, scaleX: 1.06, scaleY: 1.06, duration: 100 }));
        container.on('pointerout',  () =>
            this.tweens.add({ targets: container, scaleX: 1,    scaleY: 1,    duration: 100 }));

        return container;
    }

    // ── Particle burst ──────────────────────────────────────────────────────

    protected spawnBurst(
        x: number, y: number,
        colors: number[],
        count = 12,
        minSpeed = 150, maxSpeed = 350,
    ): void {
        for (let i = 0; i < count; i++) {
            const angle    = (Math.PI * 2 * i) / count + Phaser.Math.FloatBetween(-0.1, 0.1);
            const speed    = Phaser.Math.Between(minSpeed, maxSpeed);
            const size     = Phaser.Math.Between(5, 13);
            const color    = colors[i % colors.length];
            const duration = Phaser.Math.Between(500, 950);

            const gfx = this.add.graphics().setDepth(20);
            gfx.fillStyle(color, 1);
            gfx.fillCircle(0, 0, size);
            gfx.setPosition(x, y);

            this.tweens.add({
                targets: gfx,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                alpha: 0, scaleX: 0.1, scaleY: 0.1,
                duration,
                ease: 'Power2',
                onComplete: () => gfx.destroy(),
            });
        }
    }

    // ── Score fly label ─────────────────────────────────────────────────────

    protected spawnScoreLabel(
        fromX: number, fromY: number,
        toX: number,   toY: number,
        label: string, color = '#ffd700',
    ): void {
        // Bitmap font so it matches the rest of the UI (the CSS 'Coiny' face isn't loaded)
        const txt = this.add.bitmapText(fromX, fromY, 'coiny-bmp', label, Math.floor(this.H * 0.045), 0)
            .setOrigin(0.5).setDepth(25)
            .setTint(Phaser.Display.Color.HexStringToColor(color).color);

        this.tweens.add({
            targets: txt,
            x: toX, y: toY,
            alpha: 0, scaleX: 1.6, scaleY: 1.6,
            duration: 750, ease: 'Power2',
            onComplete: () => txt.destroy(),
        });
    }

    // ── Pop scale animation ─────────────────────────────────────────────────

    protected popObject(target: Phaser.GameObjects.GameObject): void {
        this.tweens.add({
            targets: target,
            scaleX: 1.35, scaleY: 1.35,
            duration: 110, yoyo: true, ease: 'Power2',
        });
    }

    // ── Yes / no popup ──────────────────────────────────────────────────────

    /** Game-style popup: title, short text and two buttons. Calls back once with the choice. */
    protected confirmPopup(
        title: string, body: string, yesText: string, noText: string,
        onChoose: (yes: boolean) => void,
    ): void {
        const panelW = Math.floor(this.W * 0.84);
        const pad    = Math.floor(this.H * 0.04);
        const btnH   = Math.floor(this.H * 0.07);
        const gap    = Math.floor(this.H * 0.025);

        const root = this.add.container(0, 0).setDepth(70);

        // Scrim blocks taps on the scene underneath
        const overlay = this.add.graphics();
        overlay.fillStyle(THEME.SCRIM, 0.45);
        overlay.fillRect(0, 0, this.W, this.H);
        overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.W, this.H), Phaser.Geom.Rectangle.Contains);
        root.add(overlay);

        const titleText = this.label(this.CX, 0, title, this.H * 0.03).setOrigin(0.5, 0)
            .setMaxWidth(panelW - pad * 2);
        const bodyText = this.add.bitmapText(this.CX, 0, 'coiny-bmp', body, Math.floor(this.H * 0.021), 1)
            .setOrigin(0.5, 0).setMaxWidth(panelW - pad * 2).setTint(0x52697b);

        const panelH = pad + titleText.height + gap + bodyText.height + gap * 1.6 + btnH + pad;
        const top = this.CY - panelH / 2;
        titleText.setY(top + pad);
        bodyText.setY(titleText.y + titleText.height + gap);
        root.add([this.drawCard(this.add.graphics(), this.CX - panelW / 2, top, panelW, panelH, 32), titleText, bodyText]);

        let chosen = false;
        const choose = (yes: boolean) => {
            if (chosen) return;
            chosen = true;
            this.tweens.add({
                targets: root, alpha: 0, duration: 160,
                onComplete: () => { root.destroy(); onChoose(yes); },
            });
        };

        const btnW = (panelW - pad * 2 - gap) / 2;
        const btnY = top + panelH - pad - btnH / 2;
        root.add(this.createButton(this.CX - (btnW + gap) / 2, btnY, btnW, btnH, noText, this.H * 0.022,
            0xe6eef2, THEME.CARD_SHADOW, () => { AudioManager.play('snd_click'); choose(false); }));
        root.add(this.createButton(this.CX + (btnW + gap) / 2, btnY, btnW, btnH, yesText, this.H * 0.022,
            THEME.GO, THEME.GO_DARK, () => { AudioManager.play('snd_click'); choose(true); }));

        root.setAlpha(0);
        this.tweens.add({ targets: root, alpha: 1, duration: 220 });
    }

    // ── Leaderboard ─────────────────────────────────────────────────────────

    /** The in-game General leaderboard (every platform); on Android / iOS it also links to Play Games / Game Center. */
    protected openLeaderboard(): void {
        new LeaderboardPanel(this);
    }

    /** Short message pill near the bottom of the screen that fades away. */
    toast(text: string): void {
        const y = this.H * 0.935;
        const msg = this.label(this.CX, y, text, this.H * 0.018, 0xffffff);
        const w = msg.width + this.W * 0.08;
        const h = Math.floor(this.H * 0.05);
        const bg = this.add.graphics();
        bg.fillStyle(THEME.INK, 0.92);
        bg.fillRoundedRect(this.CX - w / 2, y - h / 2, w, h, h / 2);

        const pill = this.add.container(0, 0, [bg, msg]).setDepth(200).setAlpha(0);
        this.tweens.add({ targets: pill, alpha: 1, duration: 180 });
        this.tweens.add({
            targets: pill, alpha: 0, delay: 2200, duration: 300,
            onComplete: () => pill.destroy(),
        });
    }
}
