import { IonApp, IonPage, isPlatform, setupIonicReact } from '@ionic/react';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
import '@ionic/react/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';
import React from 'react';

import { Firebase } from './services/Firebase';
import { AdManager } from './services/AdManager';
import { AudioManager } from './game/managers/AudioManager';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { Capacitor } from '@capacitor/core';
import PhaserGame from './components/Phaser';
import { GlobVar } from './utils/Global';

setupIonicReact();

class App extends React.Component{

    constructor(props:any){
        super(props);
        this.initServices();
        this.initializeGame();
    }

    initServices(): void{

        // Init Firebase
        Firebase.init();

        // Init Unity LevelPlay
        AdManager.initialize().catch(() => {});

        // Pause/resume background music on tab hide and Android app suspend
        AudioManager.registerAppLifecycle();

        // Lock orientation to portrait
        if(Capacitor.isNativePlatform()){
            const lockOrientation = async () => {
                await ScreenOrientation.lock({ orientation: 'portrait' });
            };
            lockOrientation().catch(() => {});
        }
    };

    initializeGame(): void{
        GlobVar.platformData.type = Capacitor.getPlatform();
        GlobVar.isDesktop = ((Capacitor.isNativePlatform() === false) && (isPlatform("desktop") === true));
        GlobVar.isMobileWeb = ((Capacitor.isNativePlatform() === false) && (isPlatform("mobileweb") === true));
        GlobVar.platformData.isNative = Capacitor.isNativePlatform();

        GlobVar.orientation = "landscape"; //Check orientation type
        if(window.innerHeight > window.innerWidth && window.outerHeight > 400) {
            GlobVar.orientation = "portrait";
        }
    }

    render(){
        return(
            <IonApp>
                <IonPage>
                    <PhaserGame canvas="phaser-game"/>
                </IonPage>
            </IonApp>
        );
    }
}

export default App;
