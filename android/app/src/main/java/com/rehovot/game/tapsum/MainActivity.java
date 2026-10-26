package com.rehovot.game.tapsum;

import android.content.pm.ActivityInfo;
import android.content.res.Configuration;

import com.getcapacitor.BridgeActivity;

/**
 * Tap Sum is portrait only. Play Billing's purchase sheet and full-screen ads run in their
 * own activities, and on some devices the manifest lock isn't restored when they close,
 * leaving the game in landscape. Re-assert portrait whenever we come back to the front.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onResume() {
        super.onResume();
        lockPortrait();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) lockPortrait();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        if (newConfig.orientation == Configuration.ORIENTATION_LANDSCAPE) lockPortrait();
    }

    private void lockPortrait() {
        if (getRequestedOrientation() != ActivityInfo.SCREEN_ORIENTATION_PORTRAIT) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        }
    }
}
