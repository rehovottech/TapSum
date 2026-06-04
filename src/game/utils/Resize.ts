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
        const RATIO_16_9 = { w: 720, h: 1280 };   // classic
        const RATIO_TALL = { w: 720, h: 1440 };   // 18:9+
        const RATIO_ULTRA = { w: 720, h: 1600 };  // 20:9+

        const screenRatio = window.innerHeight / window.innerWidth;

        let base = RATIO_16_9;
        if (screenRatio > 2.0) {
            base = RATIO_ULTRA;
        } else if (screenRatio > 1.8) {
            base = RATIO_TALL;
        }

        let BASE_WIDTH = base.w;
        let BASE_HEIGHT = base.h;

        // Choose closest ratio
        if (screenRatio > 2.0) {
            // very tall devices (20:9)
            BASE_HEIGHT = 1600;
        } 
        else if (screenRatio > 1.8) {
            // modern phones (18:9 / 19.5:9)
            BASE_HEIGHT = 1440;
        } 
        else {
            // standard 16:9
            BASE_HEIGHT = 1280;
        }

        const w = window.innerWidth;
        const h = window.innerHeight;

        // Calculate scale to FIT inside screen (no stretch)
        const scale = Math.min(w / BASE_WIDTH, h / BASE_HEIGHT);

        const displayWidth = BASE_WIDTH * scale;
        const displayHeight = BASE_HEIGHT * scale;

        // Keep internal resolution fixed (important!)
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

        // Centering
        canvas.style.position = 'absolute';
        //canvas.style.left = `${(w - displayWidth) / 2}px`;
        canvas.style.top = `${(h - displayHeight) / 2}px`;
    }
};