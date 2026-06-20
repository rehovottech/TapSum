package com.rehovot.game.tapsum.ads;

import android.app.Activity;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.unity3d.mediation.LevelPlay;
import com.unity3d.mediation.LevelPlayAdError;
import com.unity3d.mediation.LevelPlayAdInfo;
import com.unity3d.mediation.LevelPlayAdSize;
import com.unity3d.mediation.LevelPlayConfiguration;
import com.unity3d.mediation.LevelPlayInitError;
import com.unity3d.mediation.LevelPlayInitListener;
import com.unity3d.mediation.LevelPlayInitRequest;

import com.unity3d.mediation.banner.LevelPlayBannerAdView;
import com.unity3d.mediation.banner.LevelPlayBannerAdViewListener;
import com.unity3d.mediation.interstitial.LevelPlayInterstitialAd;
import com.unity3d.mediation.interstitial.LevelPlayInterstitialAdListener;
import com.unity3d.mediation.rewarded.LevelPlayRewardedAd;
import com.unity3d.mediation.rewarded.LevelPlayRewardedAdListener;
import com.unity3d.mediation.rewarded.LevelPlayReward;

@CapacitorPlugin(name = "LevelPlay")
public class LevelPlayPlugin extends Plugin {

    // ── Ad instances ──────────────────────────────────────────────────────────

    private LevelPlayBannerAdView bannerAdView;
    private FrameLayout bannerContainer;

    private LevelPlayInterstitialAd interstitialAd;
    private boolean interstitialReady = false;

    private LevelPlayRewardedAd rewardedAd;
    private boolean rewardedReady = false;

    // ── Initialize ────────────────────────────────────────────────────────────

    @PluginMethod
    public void initialize(PluginCall call) {
        String appKey = call.getString("appKey");
        if (appKey == null || appKey.isEmpty()) {
            call.reject("appKey is required");
            return;
        }

        // Retain the call until the async init callback fires.
        call.setKeepAlive(true);

        Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            try {
                LevelPlayInitRequest initRequest = new LevelPlayInitRequest.Builder(appKey).build();

                LevelPlay.init(activity, initRequest, new LevelPlayInitListener() {
                    @Override
                    public void onInitSuccess(@NonNull LevelPlayConfiguration configuration) {
                        call.setKeepAlive(false);
                        JSObject data = new JSObject();
                        data.put("success", true);
                        notifyListeners("onInitSuccess", data);
                        call.resolve(data);
                    }

                    @Override
                    public void onInitFailed(@NonNull LevelPlayInitError error) {
                        call.setKeepAlive(false);
                        JSObject data = new JSObject();
                        data.put("errorCode", error.getErrorCode());
                        data.put("errorMessage", error.getErrorMessage());
                        notifyListeners("onInitFailed", data);
                        call.reject(error.getErrorMessage(), String.valueOf(error.getErrorCode()));
                    }
                });
            } catch (Exception e) {
                call.setKeepAlive(false);
                call.reject("initialize failed: " + e.getMessage());
            }
        });
    }

    // ── Banner ────────────────────────────────────────────────────────────────

    /**
     * Creates a new banner view at the bottom of the screen and begins loading.
     * The banner displays automatically once the ad is received (onBannerLoaded).
     * Call hideBanner/showBanner to toggle visibility without reloading.
     */
    @PluginMethod
    public void loadBanner(PluginCall call) {
        String adUnitId = call.getString("adUnitId");
        if (adUnitId == null || adUnitId.isEmpty()) {
            call.reject("adUnitId is required");
            return;
        }

        Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            try {
                // Destroy existing banner before creating a new one.
                destroyBannerInternal(activity);

                bannerAdView = new LevelPlayBannerAdView(activity, adUnitId);
                bannerAdView.setAdSize(LevelPlayAdSize.BANNER);
                bannerAdView.setBannerListener(new LevelPlayBannerAdViewListener() {

                    @Override
                    public void onAdLoaded(@NonNull LevelPlayAdInfo adInfo) {
                        JSObject data = new JSObject();
                        data.put("adUnitId", adInfo.getAdUnitId());
                        notifyListeners("onBannerLoaded", data);
                    }

                    @Override
                    public void onAdLoadFailed(@NonNull LevelPlayAdError error) {
                        JSObject data = new JSObject();
                        data.put("errorCode", error.getErrorCode());
                        data.put("errorMessage", error.getErrorMessage());
                        notifyListeners("onBannerLoadFailed", data);
                    }

                    @Override
                    public void onAdClicked(@NonNull LevelPlayAdInfo adInfo) {
                        JSObject data = new JSObject();
                        data.put("adUnitId", adInfo.getAdUnitId());
                        notifyListeners("onBannerClicked", data);
                    }

                    @Override
                    public void onAdDisplayed(@NonNull LevelPlayAdInfo adInfo) {
                        JSObject data = new JSObject();
                        data.put("adUnitId", adInfo.getAdUnitId());
                        notifyListeners("onBannerDisplayed", data);
                    }

                    @Override
                    public void onAdDisplayFailed(@NonNull LevelPlayAdInfo adInfo,
                                                  @NonNull LevelPlayAdError error) {
                        JSObject data = new JSObject();
                        data.put("errorCode", error.getErrorCode());
                        data.put("errorMessage", error.getErrorMessage());
                        data.put("adUnitId", adInfo.getAdUnitId());
                        notifyListeners("onBannerLoadFailed", data);
                    }

                    @Override
                    public void onAdExpanded(@NonNull LevelPlayAdInfo adInfo) {}

                    @Override
                    public void onAdCollapsed(@NonNull LevelPlayAdInfo adInfo) {}

                    @Override
                    public void onAdLeftApplication(@NonNull LevelPlayAdInfo adInfo) {}
                });

                // Attach banner to the bottom of the root window view.
                ViewGroup rootView = (ViewGroup) activity.getWindow()
                        .getDecorView()
                        .getRootView();

                bannerContainer = new FrameLayout(activity);
                FrameLayout.LayoutParams containerParams = new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.WRAP_CONTENT
                );
                containerParams.gravity = Gravity.BOTTOM;
                rootView.addView(bannerContainer, containerParams);

                FrameLayout.LayoutParams bannerParams = new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.WRAP_CONTENT,
                        FrameLayout.LayoutParams.WRAP_CONTENT
                );
                bannerParams.gravity = Gravity.CENTER_HORIZONTAL;
                bannerContainer.addView(bannerAdView, bannerParams);

                bannerAdView.loadAd();
                call.resolve();
            } catch (Exception e) {
                call.reject("loadBanner failed: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void showBanner(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (bannerAdView != null) {
                    bannerAdView.setVisibility(View.VISIBLE);
                }
                if (bannerContainer != null) {
                    bannerContainer.setVisibility(View.VISIBLE);
                }
                call.resolve();
            } catch (Exception e) {
                call.reject("showBanner failed: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void hideBanner(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (bannerAdView != null) {
                    bannerAdView.setVisibility(View.GONE);
                }
                if (bannerContainer != null) {
                    bannerContainer.setVisibility(View.GONE);
                }
                call.resolve();
            } catch (Exception e) {
                call.reject("hideBanner failed: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void destroyBanner(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                destroyBannerInternal(getActivity());
                call.resolve();
            } catch (Exception e) {
                call.reject("destroyBanner failed: " + e.getMessage());
            }
        });
    }

    private void destroyBannerInternal(Activity activity) {
        if (bannerAdView != null) {
            bannerAdView.destroy();
            bannerAdView = null;
        }
        if (bannerContainer != null) {
            ViewGroup rootView = (ViewGroup) activity.getWindow()
                    .getDecorView()
                    .getRootView();
            rootView.removeView(bannerContainer);
            bannerContainer = null;
        }
    }

    // ── Interstitial ──────────────────────────────────────────────────────────

    @PluginMethod
    public void loadInterstitial(PluginCall call) {
        String adUnitId = call.getString("adUnitId");
        if (adUnitId == null || adUnitId.isEmpty()) {
            call.reject("adUnitId is required");
            return;
        }

        try {
            interstitialReady = false;
            interstitialAd = new LevelPlayInterstitialAd(adUnitId);
            interstitialAd.setListener(new LevelPlayInterstitialAdListener() {

                @Override
                public void onAdLoaded(@NonNull LevelPlayAdInfo adInfo) {
                    interstitialReady = true;
                    JSObject data = new JSObject();
                    data.put("adUnitId", adInfo.getAdUnitId());
                    notifyListeners("onInterstitialLoaded", data);
                }

                @Override
                public void onAdLoadFailed(@NonNull LevelPlayAdError error) {
                    interstitialReady = false;
                    JSObject data = new JSObject();
                    data.put("errorCode", error.getErrorCode());
                    data.put("errorMessage", error.getErrorMessage());
                    notifyListeners("onInterstitialLoadFailed", data);
                }

                @Override
                public void onAdDisplayed(@NonNull LevelPlayAdInfo adInfo) {
                    JSObject data = new JSObject();
                    data.put("adUnitId", adInfo.getAdUnitId());
                    notifyListeners("onInterstitialOpened", data);
                }

                @Override
                public void onAdDisplayFailed(@NonNull LevelPlayAdError error,
                                              @NonNull LevelPlayAdInfo adInfo) {
                    JSObject data = new JSObject();
                    data.put("errorCode", error.getErrorCode());
                    data.put("errorMessage", error.getErrorMessage());
                    notifyListeners("onInterstitialShowFailed", data);
                }

                @Override
                public void onAdClicked(@NonNull LevelPlayAdInfo adInfo) {
                    JSObject data = new JSObject();
                    data.put("adUnitId", adInfo.getAdUnitId());
                    notifyListeners("onInterstitialClicked", data);
                }

                @Override
                public void onAdClosed(@NonNull LevelPlayAdInfo adInfo) {
                    interstitialReady = false;
                    JSObject data = new JSObject();
                    data.put("adUnitId", adInfo.getAdUnitId());
                    notifyListeners("onInterstitialClosed", data);
                }
            });

            interstitialAd.loadAd();
            call.resolve();
        } catch (Exception e) {
            call.reject("loadInterstitial failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void showInterstitial(PluginCall call) {
        if (interstitialAd == null || !interstitialAd.isAdReady()) {
            call.reject("Interstitial not ready");
            return;
        }

        Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            try {
                interstitialAd.showAd(activity);
                call.resolve();
            } catch (Exception e) {
                call.reject("showInterstitial failed: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void isInterstitialReady(PluginCall call) {
        boolean ready = interstitialReady
                && interstitialAd != null
                && interstitialAd.isAdReady();
        JSObject data = new JSObject();
        data.put("ready", ready);
        call.resolve(data);
    }

    // ── Rewarded ──────────────────────────────────────────────────────────────

    @PluginMethod
    public void loadRewarded(PluginCall call) {
        String adUnitId = call.getString("adUnitId");
        if (adUnitId == null || adUnitId.isEmpty()) {
            call.reject("adUnitId is required");
            return;
        }

        try {
            rewardedReady = false;
            rewardedAd = new LevelPlayRewardedAd(adUnitId);
            rewardedAd.setListener(new LevelPlayRewardedAdListener() {

                @Override
                public void onAdLoaded(@NonNull LevelPlayAdInfo adInfo) {
                    rewardedReady = true;
                    JSObject data = new JSObject();
                    data.put("adUnitId", adInfo.getAdUnitId());
                    notifyListeners("onRewardedLoaded", data);
                }

                @Override
                public void onAdLoadFailed(@NonNull LevelPlayAdError error) {
                    rewardedReady = false;
                    JSObject data = new JSObject();
                    data.put("errorCode", error.getErrorCode());
                    data.put("errorMessage", error.getErrorMessage());
                    notifyListeners("onRewardedLoadFailed", data);
                }

                @Override
                public void onAdDisplayed(@NonNull LevelPlayAdInfo adInfo) {
                    JSObject data = new JSObject();
                    data.put("adUnitId", adInfo.getAdUnitId());
                    notifyListeners("onRewardedOpened", data);
                }

                @Override
                public void onAdDisplayFailed(@NonNull LevelPlayAdError error,
                                              @NonNull LevelPlayAdInfo adInfo) {
                    JSObject data = new JSObject();
                    data.put("errorCode", error.getErrorCode());
                    data.put("errorMessage", error.getErrorMessage());
                    notifyListeners("onRewardedShowFailed", data);
                }

                @Override
                public void onAdClicked(@NonNull LevelPlayAdInfo adInfo) {
                    JSObject data = new JSObject();
                    data.put("adUnitId", adInfo.getAdUnitId());
                    notifyListeners("onRewardedClicked", data);
                }

                @Override
                public void onAdClosed(@NonNull LevelPlayAdInfo adInfo) {
                    rewardedReady = false;
                    JSObject data = new JSObject();
                    data.put("adUnitId", adInfo.getAdUnitId());
                    notifyListeners("onRewardedClosed", data);
                }

                @Override
                public void onAdRewarded(@NonNull LevelPlayReward reward,
                                         @NonNull LevelPlayAdInfo adInfo) {
                    JSObject data = new JSObject();
                    data.put("rewardType", reward.getName());
                    data.put("rewardAmount", reward.getAmount());
                    data.put("adUnitId", adInfo.getAdUnitId());
                    notifyListeners("onRewardedRewarded", data);
                }
            });

            rewardedAd.loadAd();
            call.resolve();
        } catch (Exception e) {
            call.reject("loadRewarded failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void showRewarded(PluginCall call) {
        if (rewardedAd == null || !rewardedAd.isAdReady()) {
            call.reject("Rewarded ad not ready");
            return;
        }

        Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            try {
                rewardedAd.showAd(activity);
                call.resolve();
            } catch (Exception e) {
                call.reject("showRewarded failed: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void isRewardedReady(PluginCall call) {
        boolean ready = rewardedReady
                && rewardedAd != null
                && rewardedAd.isAdReady();
        JSObject data = new JSObject();
        data.put("ready", ready);
        call.resolve(data);
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    @Override
    protected void handleOnDestroy() {
        try {
            if (bannerAdView != null) {
                getActivity().runOnUiThread(() -> destroyBannerInternal(getActivity()));
            }
        } catch (Exception ignored) {}
        super.handleOnDestroy();
    }
}
