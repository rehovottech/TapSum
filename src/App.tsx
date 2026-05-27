import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import Home from './pages/Home';

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
import { useEffect } from 'react';

import { Firebase } from './services/Firebase';
import { AdInitialize } from './services/Admob';
import { AudioManager } from './game/managers/AudioManager';
import { StatusBar } from '@capacitor/status-bar';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { Capacitor } from '@capacitor/core';

setupIonicReact();

const App: React.FC = () => {

    useEffect(()=>{
        // Hide Status bar
        if(Capacitor.isNativePlatform()){
            StatusBar.hide().catch(() => {});
        }

        // Init Firebase
        Firebase.init();

        // Init Admob
        AdInitialize().catch(() => {});

        // Pause/resume background music on tab hide and Android app suspend
        AudioManager.registerAppLifecycle();

        // Lock orientation to portrait
        if(Capacitor.isNativePlatform()){
            const lockOrientation = async () => {
                await ScreenOrientation.lock({ orientation: 'portrait' });
            };
            lockOrientation().catch(() => {});
        }
    },[]);

    return (
        <IonApp>
            <IonReactRouter>
                <IonRouterOutlet>
                    <Route exact path="/home">
                        <Home />
                    </Route>
                    <Route exact path="/">
                        <Redirect to="/home" />
                    </Route>
                </IonRouterOutlet>
            </IonReactRouter>
        </IonApp>
    );
}

export default App;
