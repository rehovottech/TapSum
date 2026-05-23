Replace the current Phaser audio system completely with a lightweight HTML5/Howler.js based audio manager optimized for Ionic React + Capacitor mobile devices.

Goals:

* Remove all Phaser audio dependency usage
* Fix mobile audio playback issues on Android/iOS WebView
* Ensure stable playback in Capacitor native builds
* Support overlapping sound effects
* Support looping background music
* Audio should start only after first user interaction
* Keep implementation simple and production-ready

Tasks:

1. Create a new file:
   src/game/utils/AudioManager.ts

2. Use Howler.js for audio handling:

* Install and use `howler`
* Use singleton/static structure
* Add:

  * preload/init
  * play sound effect
  * play looping music
  * stop music
  * mute/unmute
  * volume control

3. Replace ALL Phaser audio usages:

* Replace:

  * this.sound.play(...)
  * this.sound.add(...)
  * scene.sound.stopAll()
  * any Phaser music manager
* Use AudioManager methods instead

4. Disable Phaser audio completely in game config:
   Replace existing audio config with:

audio: {
noAudio: true
}

5. Ensure audio initializes only after first touch/click:
   Example:
   this.input.once('pointerdown', () => {
   AudioManager.init();
   });

6. Keep all existing game logic unchanged.
   Only replace the audio implementation layer.

7. Add mobile-safe optimizations:

* Prevent duplicate bg music playback
* Handle scene changes safely
* Avoid memory leaks
* Allow overlapping tap/correct/wrong sounds
* Ensure replay works instantly

8. Create clean reusable APIs:

Examples:
AudioManager.play('tap');
AudioManager.playMusic('bg');
AudioManager.stopMusic();
AudioManager.setMute(true);

9. Organize audio paths cleanly:
   assets/audio/

10. Update ALL scenes:

* Boot.ts
* Preloader.ts
* Game.ts
* Menu.ts
* End.ts
* Any popup/UI scenes

11. Remove obsolete Phaser preload audio calls if unnecessary.

12. Keep code TypeScript strict-safe and clean.

13. Optimize specifically for:

* Ionic React
* Capacitor Android
* Mobile portrait endless games
* Low-end Android tablets

14. Ensure implementation works even when:

* app resumes from background
* orientation changes
* screen locks/unlocks

15. Add comments explaining why Phaser audio was replaced with HTML5/Howler audio for mobile stability.
