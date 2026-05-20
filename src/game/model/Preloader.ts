import { GlobVar } from "../../utils/Global";
import * as Phaser from "phaser";

class FlatPreloadBar extends Phaser.GameObjects.Container{
    public progressValue: number = 0;
    private fillbar: any;
    constructor(scene: Phaser.Scene){
        super(scene,0,0);
        scene.add.existing(this);
        this.init();
    }
    init(){
        let rectangleWidth = Math.floor(GlobVar.width * 0.35);
        let rectangleHeight = Math.floor(rectangleWidth * 0.015);
        if(GlobVar.orientation == "portrait")
            rectangleHeight = Math.floor(rectangleWidth * 0.015);

        this.progressValue = 0;

        let outline = this.scene.add.rectangle(0,0,rectangleWidth,rectangleHeight).setOrigin(0.5);
        outline.setStrokeStyle(1,0xffffff);
        outline.setPosition(0,0);

        this.fillbar = this.scene.add.rectangle(0,0,rectangleWidth,rectangleHeight).setOrigin(0,0.5);
        this.fillbar.setFillStyle(0x000000);
        this.fillbar.setStrokeStyle(1,0xffffff);
        this.fillbar.setPosition(outline.x - outline.displayWidth * 0.5, outline.y);

        this.add(this.fillbar);
        this.add(outline);

        this.update();
    }
    setxy(x:number, y:number){
        this.x = x;
        this.y = y;
    }
    update(){
        this.fillbar.scaleX = (this.progressValue/100)
    }
}

export { FlatPreloadBar };