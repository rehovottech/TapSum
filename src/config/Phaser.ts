import Boot from "../game/scene/Boot";
import Preload from "../game/scene/Preloader";
import Game from "../game/scene/Game";
import * as Phaser from "phaser";
import Menu from "../game/scene/Menu";
import End from "../game/scene/End";
import { Capacitor } from "@capacitor/core";

export const ConfigPhaserGame = (): Phaser.Game => {
    let gameWidth = window.innerWidth * window.devicePixelRatio;
    let gameHeight = window.innerHeight * window.devicePixelRatio;
    let disableWebAudio = true;
    let renderType = Phaser.AUTO;
    let mode = Phaser.Scale.FIT;
    if (!Capacitor.isNativePlatform()){
        gameWidth = window.innerWidth
        gameHeight = window.innerHeight
        renderType = Phaser.CANVAS
        disableWebAudio = false;
        mode = Phaser.Scale.NONE
    }

    const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        backgroundColor: '#000000',
        seed: [ (Date.now() * Math.random()).toString() ],
        scale: {
            parent: 'phaser-game',
            autoCenter: Phaser.Scale.CENTER_BOTH,
            mode: mode,
            width: gameWidth,
            height: gameHeight
        },
        scene: [
            Boot,
            Preload,
            Menu,
            Game,
            End
        ],
        audio: {
            disableWebAudio: disableWebAudio
        },
        disableContextMenu: true,
        title: "Tamil Word",
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