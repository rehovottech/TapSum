import Boot from "../game/scene/Boot";
import Preload from "../game/scene/Preloader";
import Game from "../game/scene/Game";
import * as Phaser from "phaser";
import Menu from "../game/scene/Menu";
import End from "../game/scene/End";

export const ConfigPhaserGame = (): Phaser.Game => {
    const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        backgroundColor: '#000000',
        seed: [ (Date.now() * Math.random()).toString() ],
        scale: {
            parent: 'phaser-game',
            mode: Phaser.Scale.NONE,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: window.innerWidth,
            height: window.innerHeight
        },
        scene: [
            Boot,
            Preload,
            Menu,
            Game,
            End
        ],
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