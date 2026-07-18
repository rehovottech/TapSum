import React from "react";
import { GlobVar } from "../utils/Global";
import { ConfigPhaserGame } from "../config/Phaser";
import { ResizePhaserGame } from "../game/utils/Resize";
import { StatusBar } from "@capacitor/status-bar";
import { Capacitor } from "@capacitor/core";

class PhaserGame extends React.Component<{canvas:string}>{
    constructor(props:any){
        super(props);
    }

    async componentDidMount(): Promise<void> {
        if (window.game) {
            return;
        }
        if (Capacitor.isNativePlatform()) {
            await StatusBar.hide().catch(() => {});
        }
        window.game = ConfigPhaserGame();
        GlobVar.isSafariBrowser = (window.game!.device.browser.safari || window.game!.device.browser.mobileSafari);
        ResizePhaserGame();
    }

    componentWillUnmount(): void {
        window.game?.destroy(true);
        window.game = undefined as any;
    }

    render(){
        return(
            <div 
                className="gamediv" 
                id={this.props.canvas}
            />
        );   
    }
};

export default PhaserGame;