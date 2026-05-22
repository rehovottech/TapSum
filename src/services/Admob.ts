//sudo npm install @capacitor-community/admob
import { AdLoadInfo, AdMob, AdMobBannerSize, AdmobConsentStatus, AdMobRewardItem, AdOptions, 
    BannerAdOptions, BannerAdPluginEvents, BannerAdPosition, BannerAdSize, 
    InterstitialAdPluginEvents, RewardAdOptions, RewardAdPluginEvents } from "@capacitor-community/admob";
import { Capacitor } from "@capacitor/core";
import { AdmobConfig } from "../config/Admob";
import { GlobVar } from "../utils/Global";


export async function AdInitialize(): Promise<void> {

    if(!Capacitor.isNativePlatform()){
        return
    }

    //Init admob
    await AdMob.initialize({ testingDevices: [], initializeForTesting: false });

    const [trackingInfo, consentInfo] = await Promise.all([
        AdMob.trackingAuthorizationStatus(),
        AdMob.requestConsentInfo()
    ]);

    if (trackingInfo.status === 'notDetermined') {
        /**
        * If you want to explain TrackingAuthorization before showing the iOS dialog,
        * you can show the modal here.
        * ex)
        * const modal = await this.modalCtrl.create({
        *   component: RequestTrackingPage,
        * });
        * await modal.present();
        * await modal.onDidDismiss();  // Wait for close modal
        **/
        await AdMob.requestTrackingAuthorization();
    }

    const authorizationStatus = await AdMob.trackingAuthorizationStatus();
    if(
        authorizationStatus.status === 'authorized' &&
        consentInfo.isConsentFormAvailable &&
        consentInfo.status === AdmobConsentStatus.REQUIRED
    ){
        await AdMob.showConsentForm();
    }

}


export async function ShowBannerAd(): Promise<void> {

    if(!Capacitor.isNativePlatform()){
        return
    }

    const loadHandle = await AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
        loadHandle.remove();
    });

    const dismissHandle = await AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size: AdMobBannerSize) => {
        dismissHandle.remove();
    });

    const ADID = AdmobConfig[`Admob-Banner-${(GlobVar.platformData.type).toUpperCase()}`];
    const options: BannerAdOptions = {
        adId: ADID,
        adSize: BannerAdSize.BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
        isTesting: AdmobConfig.debug
        // npa: true
    };
    AdMob.showBanner(options);
}

export async function ShowInterstitialAd(closeListener:any=null): Promise<void> {

    if(!Capacitor.isNativePlatform()){
        return
    }
    
    const loadHandle = await AdMob.addListener(InterstitialAdPluginEvents.Loaded, (info: AdLoadInfo) => {
        loadHandle.remove();
    });

    const dismissHandle = await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
        dismissHandle.remove();
        closeListener?.();
    });
    
    const ADID = AdmobConfig[`Admob-Interstitial-${(GlobVar.platformData.type).toUpperCase()}`];
    const options: AdOptions = {
        adId: ADID,
        isTesting: AdmobConfig.debug
        // npa: true
    };
    await AdMob.prepareInterstitial(options);
    await AdMob.showInterstitial();
}


export async function ShowRewardVideoAd(): Promise<void> {

    if(!Capacitor.isNativePlatform()){
        return
    }
    
    const loadHandle = await AdMob.addListener(RewardAdPluginEvents.Loaded, (info: AdLoadInfo) => {
        loadHandle.remove();
    });
  
    const dismissHandle = await AdMob.addListener(RewardAdPluginEvents.Rewarded, (rewardItem: AdMobRewardItem) => {
        dismissHandle.remove();
        console.log(rewardItem)
    });
    
    const ADID = AdmobConfig[`Admob-Reward-${(GlobVar.platformData.type).toUpperCase()}`];
    const options: RewardAdOptions = {
        adId: ADID,
        isTesting: AdmobConfig.debug
        // npa: true
        // ssv: {
        //   userId: "A user ID to send to your SSV"
        //   customData: JSON.stringify({ ...MyCustomData })
        //}
    };
    await AdMob.prepareRewardVideoAd(options);
    const rewardItem = await AdMob.showRewardVideoAd();
    console.log(rewardItem);
}

export async function HideBannerAd(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
        return;
    }

    try {
        await AdMob.hideBanner();
        console.log("Banner ad hidden successfully.");
    } catch (error) {
        console.error("Failed to hide the banner ad:", error);
    }
}

export async function ToggleBannerAd(): Promise<void> {
    try {
        //Hide the banner
        await HideBannerAd();

        setTimeout(async () => {
            await ShowBannerAd();
        }, 1000); // Adjust delay if needed
    } catch (error) {
        console.error("Error toggling banner ad:", error);
    }
}