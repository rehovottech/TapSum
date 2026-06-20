export interface AdsPlatformConfig {
    appKey: string;
    bannerId: string;
    interstitialId: string;
    rewardedId: string;
}

export interface AdsConfigType {
    android: AdsPlatformConfig;
    ios: Partial<AdsPlatformConfig>;
    debug: boolean;
}

export const AdsConfig: AdsConfigType = {
    android: {
        appKey: '26cfa1495',
        bannerId: '1re4dlx4zvsl03zy',
        interstitialId: 'jg6cqm3ixehkp3fg',
        rewardedId: '2vammmaj6w5z1ect',
    },
    ios: {},
    debug: true,
};