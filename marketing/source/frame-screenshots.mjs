// Frames the raw captures in source/raw/ into store screenshots (caption + phone + decorations).
// usage (from marketing/source): node frame-screenshots.mjs [onlyDirSubstring]
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '..');
const only = process.argv[2];

// Order = store order. Captions: kicker / headline (<em> = accent colour) / subline.
// tiles: [label, x (<0.5 = left edge), y (fraction of device height), size, rotation]
export const SHOTS = [
    { id: 'play',        k: 'Memory math',     h: 'Remember.<br>Count. <em>Tap!</em>',  s: 'Keep the running total in your head', bg: '#e9f7ee', accent: '#1fa34f',
      tiles: [['+1', -0.03, 0.39, 150, -12], ['+10', 0.86, 0.30, 140, 10]] },
    { id: 'menu',        k: 'Easy to learn',   h: 'Ones, tens<br>&amp; <em>hundreds</em>',  s: 'Colour-coded buttons make place value click', bg: '#fff6dc', accent: '#e0a000',
      tiles: [['+100', -0.03, 0.36, 140, -10], ['+1', 0.86, 0.42, 140, 12]] },
    { id: 'takeaway',    k: 'Add & take away', h: 'Plus <em>and</em><br>minus fun',      s: 'Green adds, red takes away', bg: '#ffeeeb', accent: '#d64a3d',
      tiles: [['-1', -0.03, 0.36, 150, -12], ['+10', 0.86, 0.42, 130, 10]] },
    { id: 'profiles',    k: 'For every age',   h: 'Ages 5 to<br><em>grown-ups</em>',     s: 'Little Learner, Explorer & Brain Trainer', bg: '#f1ecff', accent: '#8b5cf6',
      tiles: [['+1', -0.03, 0.39, 140, -8], ['+100', 0.86, 0.33, 140, 12]] },
    { id: 'streak',      k: 'Streaks',         h: 'Five in<br>a <em>row!</em>',          s: 'Confetti, cheers and a happy Summy', bg: '#fff0e3', accent: '#ff8a2b',
      tiles: [['+10', -0.03, 0.36, 140, -12], ['+1', 0.86, 0.42, 140, 10]] },
    { id: 'best',        k: 'New records',    h: 'Beat your<br><em>best score</em>',  s: 'See what happened, then try again', bg: '#e7f3fd', accent: '#1e90e8',
      tiles: [['+100', -0.03, 0.39, 140, -10], ['+10', 0.86, 0.33, 130, 12]] },
    { id: 'leaderboard', k: 'Leaderboards',    h: 'Climb the<br><em>rankings</em>',       s: 'A board for each age group', bg: '#e9f7ee', accent: '#1fa34f',
      tiles: [['+1', -0.03, 0.36, 140, -12], ['+10', 0.86, 0.42, 140, 10]] },
];

// Raw capture sets (capture.mjs). iOS sets are captured with NATIVE=1 so they show the app's native layout
// (Leaderboard ▸ OPEN on the end screen, no in-game leaderboard panel). Shots missing from a set are skipped.
const RAW = {
    web:  { dir: 'raw',      aspect: 1170 / 2532 },   // 390×844 @3x
    ios:  { dir: 'raw-ios',  aspect: 1206 / 2622 },   // NATIVE=1, 402×874 @3x
    ipad: { dir: 'raw-ipad', aspect: 2064 / 2752 },   // NATIVE=1, 1032×1376 @2x
};

const TARGETS = [
    { dir: 'ios/screenshots/iphone-6.9in_1320x2868', raw: 'ios',  W: 1320, H: 2868, radius: 120, devTop: 760, capTop: 170, h1: 140, sideMargin: 190, devBottom: 90 },
    { dir: 'ios/screenshots/iphone-6.5in_1284x2778', raw: 'ios',  W: 1284, H: 2778, radius: 120, devTop: 740, capTop: 160, h1: 136, sideMargin: 190, devBottom: 90 },
    { dir: 'ios/screenshots/iphone-6.3in_1206x2622', raw: 'ios',  W: 1206, H: 2622, radius: 120, devTop: 760, capTop: 170, h1: 140, sideMargin: 190, devBottom: 90 },
    { dir: 'ios/screenshots/ipad-13in_2064x2752',    raw: 'ipad', W: 2064, H: 2752, radius: 44,  devTop: 560, capTop: 90,  h1: 112, sideMargin: 150, devBottom: 50, bezel: 30 },
    { dir: 'android/screenshots/phone_1080x1920',    raw: 'web',  W: 1080, H: 1920, radius: 110, devTop: 700, capTop: 110, h1: 128, sideMargin: 250, devBottom: 70 },
];

const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
for (const t of TARGETS) {
    if (only && !t.dir.includes(only)) continue;
    const dir = path.join(OUT, t.dir);
    fs.mkdirSync(dir, { recursive: true });
    const page = await browser.newPage({ viewport: { width: t.W, height: t.H }, deviceScaleFactor: 1 });
    const raw = RAW[t.raw];
    let i = 1;
    for (const s of SHOTS) {
        const file = path.join(HERE, raw.dir, `${s.id}.png`);
        if (!fs.existsSync(file)) continue;
        const P = { ...t, ...s, aspect: raw.aspect, img: `file://${file}` };
        await page.goto(`file://${HERE}/frame.html?p=` + encodeURIComponent(JSON.stringify(P)));
        await page.waitForSelector('body[data-ready]');
        await page.screenshot({ path: path.join(dir, `${String(i).padStart(2, '0')}_${s.id}.png`) });
        i++;
    }
    await page.close();
    console.log('done', t.dir);
}
await browser.close();
