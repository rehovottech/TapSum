import * as Phaser from 'phaser';
import { GlobVar } from '../../utils/Global';
import FPS from '../model/FPS';
import { THEME } from '../constants/Colors';

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

    /** Sky gradient with drifting clouds and two rolling hills along the bottom. */
    protected createSkyBg(hillTop = 0.86): void {
        this.createGradientBg(THEME.BG_TOP, THEME.BG_BOTTOM);

        const clouds: [number, number, number][] = [[0.18, 0.05, 1], [0.78, 0.2, 0.8], [0.35, 0.42, 0.65], [0.86, 0.6, 0.7]];
        clouds.forEach(([fx, fy, s], i) => {
            const c = this.add.graphics().setAlpha(0.75);
            const r = this.W * 0.06 * s;
            c.fillStyle(THEME.CLOUD, 1);
            c.fillCircle(-r * 1.1, r * 0.25, r * 0.8);
            c.fillCircle(0, 0, r);
            c.fillCircle(r * 1.1, r * 0.3, r * 0.75);
            c.fillRoundedRect(-r * 1.9, r * 0.2, r * 3.7, r * 0.85, r * 0.42);
            c.setPosition(this.W * fx, this.H * fy);
            this.tweens.add({
                targets: c, x: c.x + this.W * 0.06 * (i % 2 ? -1 : 1),
                duration: 9000 + i * 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            });
        });

        const hills = this.add.graphics();
        const y0 = this.H * hillTop;
        hills.fillStyle(THEME.HILL_BACK, 1);
        hills.fillEllipse(this.W * 0.2, y0 + this.H * 0.07, this.W * 1.1, this.H * 0.2);
        hills.fillStyle(THEME.HILL_FRONT, 1);
        hills.fillEllipse(this.W * 0.85, y0 + this.H * 0.1, this.W * 1.2, this.H * 0.22);
        hills.fillRect(0, y0 + this.H * 0.1, this.W, this.H);
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
}
