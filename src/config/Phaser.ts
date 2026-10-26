import Boot from "../game/scene/Boot";
import Game from "../game/scene/Game";
import * as Phaser from "phaser";
import Menu from "../game/scene/Menu";
import End from "../game/scene/End";
import { Capacitor } from "@capacitor/core";

export const ConfigPhaserGame = (): Phaser.Game => {

    const dpr = window.devicePixelRatio || 1;
    const vw  = window.innerWidth  || screen.width;
    const vh  = window.innerHeight || screen.height;

    let gameWidth  = vw * dpr;
    let gameHeight = vh * dpr;
    let mode = Phaser.Scale.FIT;
    // Web centring is done by ResizePhaserGame (fitCanvasToWindow); Phaser's
    // autoCenter would add a second offset on top and push the game sideways.
    let center = Phaser.Scale.CENTER_BOTH;
    if (!Capacitor.isNativePlatform()){
        center = Phaser.Scale.NO_CENTER;
        gameWidth  = vw;
        gameHeight = vh;
        mode = Phaser.Scale.NONE;
    }

    const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        backgroundColor: '#eeeeee',
        seed: [ (Date.now() * Math.random()).toString() ],
        scale: {
            parent: 'phaser-game',
            autoCenter: center,
            mode: mode,
            width: gameWidth,
            height: gameHeight
        },
        scene: [
            Boot,
            Menu,
            Game,
            End
        ],
        disableContextMenu: true,
        title: "Tap Sum",
        version: '1.0.0',
        powerPreference: "high-performance",
        autoRound: true,
        autoFocus: true,
        dom: {
            createContainer: true
        }
    }
return new Phaser.Game(config);
}