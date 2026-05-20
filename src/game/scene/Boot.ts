import * as Phaser from 'phaser';
import BaseScene from './BaseScene';
import { SCENES } from '../utils/Scenes';
import { GlobVar } from '../../utils/Global';
import { COLORS } from '../constants/Colors';
import { AdInitialize } from '../../services/Admob';
import { Firebase } from '../../services/Firebase';
import { FlatPreloadBar } from '../model/Preloader';
import FPS from '../model/FPS';

export default class Boot extends BaseScene {
    
    private preloadBar?: FlatPreloadBar;
    private logoContiner?: Phaser.GameObjects.Container;

    constructor() {
        super({ key: SCENES.Boot });
    }

    init(): void {
        this.initScene();
        this.initDeviceInfo();
        this.createBackground();
    }

    preload(): void {
        this.load.path = 'assets/sprite/';
        this.load
            .atlas('logo', `logo${GlobVar.suffix}.png`, `logo${GlobVar.suffix}.json`)
            .once(Phaser.Loader.Events.COMPLETE, () => this.showLogo());
    }

    create(): void {
        GlobVar.consolelog(`Scene: ${SCENES.Boot}`);

        this.fpsView = new FPS(this);

        // Kick off service initializations in the background.
        Firebase.init().catch(() => {});
        AdInitialize().catch(() => {});
    }

    update(): void {
        this.fpsView?.update();
    }

    // ─────────────────────────────────────────────────────────────────────────

    private initDeviceInfo(): void {
        GlobVar.suffix = '';
        GlobVar.imageRatio = GlobVar.getimageratio();

        const dpr = window.devicePixelRatio * 100;
        if      (dpr >= 200) GlobVar.suffix = '@4x';
        else if (dpr >= 100) GlobVar.suffix = '@2x';
    }

    private createBackground(): void {
        this.createGradientBg(COLORS.BG_TOP, COLORS.BG_BOTTOM);

        this.preloadBar = new FlatPreloadBar(this);
        this.preloadBar.x = this.CX;
        this.preloadBar.y = this.H * 0.82;

        this.load.on('progress', (v: number) => {
            if (this.preloadBar) {
                this.preloadBar.progressValue = v * 100;
                this.preloadBar.update();
            }
        });

        this.children.bringToTop(this.logoContiner!);
    }

    private showLogo(): void {
        let scale = this.H * 0.2 * GlobVar.imageRatio;

        this.logoContiner = this.add.container();
            const logo = this.add.sprite(this.CX, this.H * 0.4, 'logo', 'r_logo.png')
                .setOrigin(0.5).setAlpha(0);
            logo.setScale(scale / logo.displayHeight);

            const title = this.add.sprite(
                this.CX,
                logo.y + logo.displayHeight * 0.5 + 20,
                'logo', 'r_stitle.png',
            ).setOrigin(0.5).setAlpha(0);
            title.setScale(logo.scale);
        this.logoContiner!.add(logo);
        this.logoContiner!.add(title);

        this.tweens.add({ targets: logo,  alpha: 1, delay: 150, duration: 500, ease: 'Cubic.InOut' });
        this.tweens.add({ targets: title, alpha: 1, delay: 250, duration: 500, ease: 'Cubic.InOut', onComplete: () => {
            if (this.preloadBar && this.preloadBar.progressValue >= 100) {
                this.time.delayedCall(1200, () => this.fadeToScene(SCENES.Preload));
            }
        }});
    }
}
