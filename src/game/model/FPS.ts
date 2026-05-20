import { GlobVar } from "../../utils/Global";
import * as Phaser from "phaser";

class FPS extends Phaser.GameObjects.Text{
    private lastFps = -1;

    constructor(scene:any) {
        super(scene, 0, 0, '', { fontFamily: 'monospace', fontSize: '14px', color: '#ff0000' });
        scene.add.existing(this);
        this.setOrigin(0);
        this.setFontSize(Math.floor(GlobVar.height * 0.03));
        this.setVisible(GlobVar.debug);
        this.setPosition(0,0);
    }

    public update() {
        const fps = Math.floor(this.scene.game.loop.actualFps);
        if (fps !== this.lastFps) { 
            this.setText(`fps: ${fps}`); 
            this.lastFps = fps; 
        }
    }
}

export default FPS