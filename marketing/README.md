# TapSum marketing assets

| Path | What |
|---|---|
| `STORE_LISTING.md` | **Start here.** All store text, categories, age rating, Families and ads declarations, and a checklist for both stores |
| `android/screenshots/phone_1080x1920/` | 7 Google Play phone screenshots |
| `android/feature-graphic_1024x500.png` | Play feature graphic |
| `android/app-icon_512.png` | Play hi-res icon |
| `android/metadata/en-US/` | Play text in fastlane `supply` format (title, short and full description, changelog) |
| `ios/screenshots/iphone-6.9in_1320x2868/` | 6 iPhone screenshots, 6.9" |
| `ios/screenshots/iphone-6.5in_1284x2778/` | 6 iPhone screenshots, 6.5" |
| `ios/screenshots/iphone-6.3in_1206x2622/` | 6 iPhone screenshots, 6.1"/6.3" slot |
| `ios/screenshots/ipad-13in_2064x2752/` | 6 iPad screenshots, 13" slot |
| `ios/app-icon_1024.png` | App Store icon (no transparency) |
| `ios/metadata/` | App Store text in fastlane `deliver` format |
| `meta-ads/` | Facebook and Instagram ad images: 3 concepts × 4 sizes, plus `AD_COPY.md` |
| `source/` | Scripts, templates and raw captures used to make everything above |

## Regenerating

The scripts use Playwright with your installed Google Chrome.

```bash
cd marketing/source
npm i --no-save playwright-core@1.48.2       # once; creates marketing/source/node_modules

# 1. Capture raw screens from the web build
cd ../.. && npm run build && npx vite preview --port 8080 &   # leave it running
cd marketing/source
node capture.mjs raw 390 844 3                # all screens; or add e.g. "play,best" to redo some

# 2. Frame the store screenshots (captions are in SHOTS at the top of the file)
node frame-screenshots.mjs

# 3. Feature graphic and Meta ads (copy is in CONCEPTS at the top of the file)
node render-promo.mjs
```

Notes:
- `capture.mjs` puts the game into each state by script: it solves rounds automatically, fixes the numbers and freezes the timer. That keeps the shots repeatable. The phone captures are 390 × 844 at 3× (1170 × 2532).
- On the new-best screen, headless Chrome sometimes misses the game's own delayed confetti. The script then calls the same `spawnConfetti` the game uses.
- **iOS captures use `NATIVE=1`.** It fakes the iOS bridge so the game uses the native app's layout: full screen on iPad, **Leaderboard ▸ OPEN** on the end screen, and no in-game leaderboard panel (iOS uses Game Center). That's why the iOS sets have 6 shots and Android has 7.
  ```bash
  NATIVE=1 node capture.mjs raw-ios 402 874 3       # iPhone (1206 × 2622)
  NATIVE=1 node capture.mjs raw-ipad 1032 1376 2    # iPad 13" (2064 × 2752)
  node frame-screenshots.mjs ios/                   # frames every iOS set
  ```
- **Android tablets:** no Android tablet screenshots yet; Google Play doesn't require them. The Android phone set still uses the web capture (`raw/`), so its end screen and leaderboard shot show the web version. Recapture it with `NATIVE=1` if needed; Capacitor would then report iOS, but the layout is the same.
