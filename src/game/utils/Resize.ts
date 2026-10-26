import { Capacitor } from "@capacitor/core";
import { GlobVar } from "../../utils/Global";

export const ResizePhaserGame = () => {
    if(Capacitor.isNativePlatform()){
        const dpr = window.devicePixelRatio || 1;
        const w   = window.innerWidth  || screen.width;
        const h   = window.innerHeight || screen.height;

        GlobVar.scaleValue = 1;
        GlobVar.smooth = dpr;

        GlobVar.width   = Math.round(w * dpr);
        GlobVar.height  = Math.round(h * dpr);
        GlobVar.centerX = GlobVar.width  * 0.5;
        GlobVar.centerY = GlobVar.height * 0.5;

        GlobVar.widthI   = w;
        GlobVar.heightI  = h;
        GlobVar.centerIX = w * 0.5;
        GlobVar.centerIY = h * 0.5;
    }else{
        // Internal resolution follows the screen's aspect ratio so the canvas
        // covers the whole viewport (no side bars). Portrait screens keep a
        // 720px-wide design width; wider screens keep a 1280px design height.
        const MIN_WIDTH  = 720;
        const MIN_HEIGHT = 1280;

        const w = window.innerWidth;
        const h = window.innerHeight;
        const screenRatio = h / w;

        let BASE_WIDTH  = MIN_WIDTH;
        let BASE_HEIGHT = Math.round(MIN_WIDTH * screenRatio);
        if (BASE_HEIGHT < MIN_HEIGHT) {
            BASE_HEIGHT = MIN_HEIGHT;
            BASE_WIDTH  = Math.round(MIN_HEIGHT / screenRatio);
        }

        const displayWidth  = w;
        const displayHeight = h;

        // Internal resolution (game coordinates)
        GlobVar.width = BASE_WIDTH;
        GlobVar.height = BASE_HEIGHT;

        GlobVar.centerX = BASE_WIDTH / 2;
        GlobVar.centerY = BASE_HEIGHT / 2;

        // Resize Phaser canvas (internal resolution)
        window.game!.scale.resize(BASE_WIDTH, BASE_HEIGHT);

        // Apply CSS scaling (visual size)
        const canvas = window.game!.canvas;

        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;

        canvas.style.position = 'absolute';
        canvas.style.left = '0px';
        canvas.style.top  = '0px';
    }
};