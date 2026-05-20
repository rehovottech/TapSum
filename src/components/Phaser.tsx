import React from "react";
import { GlobVar } from "../utils/Global";
import { ConfigPhaserGame } from "../config/Phaser";

class PhaserGame extends React.Component<{canvas:string}>{
    constructor(props:any){
        super(props);
    }

    componentDidMount(): void {
        window.game = ConfigPhaserGame(); //Phaser game initialize 
        GlobVar.isSafariBrowser = (window.game!.device.browser.safari || window.game!.device.browser.mobileSafari); //Check safari browser
    }

    render(){
        return(
            <div className="gamediv" id={this.props.canvas}></div>
        );   
    }
};

export default PhaserGame;