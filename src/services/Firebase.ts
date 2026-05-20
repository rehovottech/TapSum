import { FirebaseApp, initializeApp } from "firebase/app";
import {
    Analytics,
    AnalyticsCallOptions,
    getAnalytics,
    isSupported,
    logEvent as firebaseLogEvent,
} from "firebase/analytics";
import { FirebaseConfig } from "../config/Firebase";

type AnalyticsEventParams = Record<string, string | number | boolean | null | undefined>;

class FireBaseService {
    private static instance: FireBaseService;
    public app: FirebaseApp | undefined;
    private analytics: Analytics | undefined;
    private initPromise: Promise<void> | undefined;

    private constructor() {
        // private so no one can call new FireBaseService() directly
    }

    public static getInstance(): FireBaseService {
        if (!FireBaseService.instance) {
            FireBaseService.instance = new FireBaseService();
        }
        return FireBaseService.instance;
    }

    public init() {
        if (!this.initPromise) {
            this.initPromise = (async () => {
                if (!this.app) {
                    this.app = initializeApp(FirebaseConfig);
                }

                try {
                    if (await isSupported()) {
                        this.analytics = getAnalytics(this.app);
                    }
                } catch (error) {
                    console.error("Firebase analytics init failed", error);
                }
            })();
        }

        return this.initPromise;
    }

    public async logEvent(
        eventName: string,
        eventParams?: AnalyticsEventParams,
        options?: AnalyticsCallOptions,
    ) {
        await this.init();

        if (this.analytics) {
            firebaseLogEvent(this.analytics, eventName, eventParams, options);
        }
    }
}

export const Firebase = FireBaseService.getInstance();
