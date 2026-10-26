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
        // Web is portrait only. The internal resolution is a portrait box: 720px wide and
        // as tall as the screen's portrait ratio (at least 16:9). Phones use their portrait
        // dimensions even if the page opened sideways; desktop gets gray side margins.
        const DESIGN_W = 720;
        const DESIGN_H = 1280;

        const w = window.innerWidth;
        const h = window.innerHeight;
        const portraitW = GlobVar.isDesktop ? w : Math.min(w, h);
        const portraitH = GlobVar.isDesktop ? h : Math.max(w, h);
        const ratio = Math.max(DESIGN_H / DESIGN_W, portraitH / portraitW);

        const BASE_WIDTH  = DESIGN_W;
        const BASE_HEIGHT = Math.round(DESIGN_W * ratio);

        // Internal resolution (game coordinates); fixed for the session
        GlobVar.width = BASE_WIDTH;
        GlobVar.height = BASE_HEIGHT;

        GlobVar.centerX = BASE_WIDTH / 2;
        GlobVar.centerY = BASE_HEIGHT / 2;

        window.game!.scale.resize(BASE_WIDTH, BASE_HEIGHT);

        fitCanvasToWindow();
        if (!resizeListening) {
            resizeListening = true;
            window.addEventListener('resize', fitCanvasToWindow);
            window.addEventListener('orientationchange', fitCanvasToWindow);
        }
    }
};

let resizeListening = false;

/** Scale the canvas (CSS only) to fit the window, centred; the page background fills the rest. */
const fitCanvasToWindow = () => {
    const canvas = window.game?.canvas;
    if (!canvas) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const scale = Math.min(w / GlobVar.width, h / GlobVar.height);
    const displayWidth  = GlobVar.width  * scale;
    const displayHeight = GlobVar.height * scale;

    canvas.style.width    = `${displayWidth}px`;
    canvas.style.height   = `${displayHeight}px`;
    canvas.style.position = 'absolute';
    canvas.style.margin   = '0';
    canvas.style.left     = `${(w - displayWidth) / 2}px`;
    canvas.style.top      = `${(h - displayHeight) / 2}px`;

    // Re-read the canvas position so pointer coordinates stay correct
    window.game!.scale.updateBounds();
};
