package com.rehovot.game.tapsum;

import android.content.pm.ActivityInfo;
import android.content.res.Configuration;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

/**
 * Tap Sum is portrait only. Play Billing's purchase sheet and full-screen ads run in their
 * own activities, and on some devices the manifest lock isn't restored when they close,
 * leaving the game in landscape. Re-assert portrait whenever we come back to the front.
 *
 * It is also full screen (immersive): the status and navigation bars are hidden, and a swipe
 * from the edge shows them briefly. The same activities and the system bring the bars back,
 * so they are hidden again whenever the game regains focus.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onResume() {
        super.onResume();
        lockPortrait();
        hideSystemBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            lockPortrait();
            hideSystemBars();
        }
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

    private void hideSystemBars() {
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.hide(WindowInsetsCompat.Type.systemBars());
    }
}
