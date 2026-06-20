package com.rehovot.game.tapsum;

import com.getcapacitor.BridgeActivity;
import com.rehovot.game.tapsum.ads.LevelPlayPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(LevelPlayPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
