import * as Phaser from 'phaser';
import { GlobVar } from '../../utils/Global';
import FPS from '../model/FPS';

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
    protected onSceneShutdown(): void { this.scene.remove(); }
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

    // ── 3-D feel button ─────────────────────────────────────────────────────

    protected createButton(
        x: number, y: number,
        width: number, height: number,
        label: string, fontSize: number,
        faceColor: number, sideColor: number,
        callback: () => void,
    ): Phaser.GameObjects.Container {
        const radius = height * 0.2;
        const sideH  = Math.round(height * 0.10);

        const container = this.add.container(x, y);

        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.35);
        shadow.fillRoundedRect(-width / 2 + 5, -height / 2 + sideH + 4, width, height, radius);

        const side = this.add.graphics();
        side.fillStyle(sideColor, 1);
        side.fillRoundedRect(-width / 2, -height / 2 + sideH, width, height, radius);

        const face = this.add.graphics();
        face.fillStyle(faceColor, 1);
        face.fillRoundedRect(-width / 2, -height / 2, width, height - sideH, radius);

        const txt = this.add.bitmapText(0, -Math.round(sideH * 0.3), 'krungthep-bmp', label, Math.floor(fontSize), 0).setOrigin(0.5);

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
        const txt = this.add.text(fromX, fromY, label, {
            fontFamily: 'Coiny',
            fontSize: `${Math.floor(this.H * 0.045)}px`,
            color,
            fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(25);

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
