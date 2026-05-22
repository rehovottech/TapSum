import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, isPlatform } from '@ionic/react';
import './Home.css';
import PhaserGame from '../components/Phaser';
import { useEffect } from 'react';
import { ResizePhaserGame } from '../game/utils/Resize';
import { GlobVar } from '../utils/Global';
import { Capacitor } from '@capacitor/core';
import { Firebase } from '../services/Firebase';
import { AdInitialize } from '../services/Admob';

const Home: React.FC = () => {

    useEffect(()=>{

        // Init Firebase
        Firebase.init();
        AdInitialize().catch(() => {});
        
        const initializeGame = ()=>{
            GlobVar.platformData.type = Capacitor.getPlatform();
            GlobVar.isDesktop = ((Capacitor.isNativePlatform() === false) && (isPlatform("desktop") === true));
            GlobVar.isMobileWeb = ((Capacitor.isNativePlatform() === false) && (isPlatform("mobileweb") === true));
            GlobVar.platformData.isNative = Capacitor.isNativePlatform();

            GlobVar.orientation = "landscape"; //Check orientation type
            if(window.innerHeight > window.innerWidth && window.outerHeight > 400) {
                GlobVar.orientation = "portrait";
            }
        }
        initializeGame();

        if (window.game) {
            ResizePhaserGame();
        }
        const handleResize = () => ResizePhaserGame();
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    },[]);

    return (
        <IonPage>
            <PhaserGame canvas="phaser-game"/>
        </IonPage>
    );
};

export default Home;
