# TapSum marketing assets

| Path | What |
|---|---|
| `STORE_LISTING.md` | **Start here.** All store text, categories, age rating, Families and ads declarations, and a checklist for both stores |
| `android/screenshots/phone_1080x1920/` | 7 Google Play phone screenshots |
| `android/feature-graphic_1024x500.png` | Play feature graphic |
| `android/app-icon_512.png` | Play hi-res icon |
| `android/metadata/en-US/` | Play text in fastlane `supply` format (title, short and full description, changelog) |
| `ios/screenshots/iphone-6.9in_1320x2868/` | 7 iPhone screenshots (required size) |
| `ios/screenshots/iphone-6.5in_1284x2778/` | 7 iPhone screenshots (older required size) |
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
- **Tablets:** no tablet screenshots are included yet. The web build shows a portrait column on tablets, but the native app fills the screen, so web captures wouldn't match the real tablet app. Capture those from a tablet emulator. Google Play doesn't require them. On iOS, either make the app iPhone-only or add iPad screenshots.
