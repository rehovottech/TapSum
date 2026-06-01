import React from "react";
import { GlobVar } from "../utils/Global";
import { ConfigPhaserGame } from "../config/Phaser";
import { ResizePhaserGame } from "../game/utils/Resize";

class PhaserGame extends React.Component<{canvas:string}>{
    constructor(props:any){
        super(props);
    }

    componentDidMount(): void {
        window.game = ConfigPhaserGame();
        GlobVar.isSafariBrowser = (window.game!.device.browser.safari || window.game!.device.browser.mobileSafari); //Check safari browser
        ResizePhaserGame();
    }

    render(){
        return(
            <div 
                id={this.props.canvas}
                style={{
                    width: "100vw",
                    height: "100vh",
                    overflow: "hidden"
                }}
            />
        );   
    }
};

export default PhaserGame;