// Renders the Play feature graphic and the Meta (Facebook / Instagram) ad images from promo.html.
// usage (from marketing/source): node render-promo.mjs [onlyNameSubstring]
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '..');
const only = process.argv[2];
const raw = (id) => `file://${HERE}/raw/${id}.png`;

// Ad concepts. Meta can't target under-13s, so the copy speaks to parents.
const CONCEPTS = {
    kids: {
        h: 'Math practice<br>kids <em>love</em>', s: 'Remember the numbers. Tap the total.',
        pills: ['Free', 'Ages 5+'], img: raw('play'), bg: '#e9f7ee', accent: '#1fa34f',
    },
    mental: {
        h: 'Train your<br><em>mental math</em>', s: 'Add and take away in your head.',
        pills: ['Free', 'Kids & adults'], img: raw('takeaway'), bg: '#ffeeeb', accent: '#d64a3d',
    },
    family: {
        h: 'One game,<br><em>every age</em>', s: 'Three levels, from age 5 to adult.',
        pills: ['Free', 'Ages 5 to adult'], img: raw('profiles'), bg: '#f1ecff', accent: '#8b5cf6',
    },
};

// Formats (story keeps text out of the top 14% / bottom 20% that Instagram covers)
const FORMATS = {
    'feed-square_1080x1080':   { W: 1080, H: 1080, layout: 'side',  h1: 92,  p: 34, phoneH: 1.0,  phoneX: 0.555, phoneY: 0.12,
        tiles: [['+10', 0.47, 0.70, 110, -12], ['+1', 0.86, 0.06, 100, 10]] },
    'feed-portrait_1080x1350': { W: 1080, H: 1350, layout: 'stack', h1: 104, p: 36, textTop: 0.05, phoneW: 0.56, phoneY: 0.52,
        tiles: [['+10', 0.06, 0.60, 120, -12], ['+1', 0.76, 0.66, 110, 10]] },
    'story_1080x1920':         { W: 1080, H: 1920, layout: 'stack', h1: 118, p: 40, textTop: 0.14, phoneW: 0.64, phoneY: 0.50,
        tiles: [['+10', 0.03, 0.60, 130, -12], ['+1', 0.78, 0.66, 120, 10]] },
    'link_1200x628':           { W: 1200, H: 628,  layout: 'side',  h1: 72,  p: 28, phoneH: 1.25, phoneX: 0.62, phoneY: 0.10,
        tiles: [['+10', 0.50, 0.66, 80, -12], ['+1', 0.88, 0.08, 74, 10]] },
};

const JOBS = [];
for (const [cname, c] of Object.entries(CONCEPTS)) {
    for (const [fname, f] of Object.entries(FORMATS)) {
        JOBS.push({ out: `meta-ads/${cname}/${cname}_${fname}.png`, P: { ...f, ...c } });
    }
}
// Google Play feature graphic (1024×500, no rounded corners or alpha needed)
JOBS.push({ out: 'android/feature-graphic_1024x500.png', P: {
    W: 1024, H: 500, layout: 'side', h1: 86, p: 32, phoneH: 1.3, phoneX: 0.63, phoneY: 0.12,
    h: 'Remember.<br>Count. <em>Tap!</em>', s: 'Memory math for ages 5 to grown-ups', pills: [],
    img: raw('play'), bg: '#e9f7ee', accent: '#1fa34f',
    tiles: [['+10', 0.50, 0.64, 76, -12], ['+1', 0.88, 0.06, 70, 10]],
} });

const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
for (const j of JOBS) {
    if (only && !j.out.includes(only)) continue;
    const file = path.join(OUT, j.out);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const page = await browser.newPage({ viewport: { width: j.P.W, height: j.P.H }, deviceScaleFactor: 1 });
    await page.goto(`file://${HERE}/promo.html?p=` + encodeURIComponent(JSON.stringify(j.P)));
    await page.waitForSelector('body[data-ready]');
    await page.screenshot({ path: file });
    await page.close();
    console.log('ok', j.out);
}
await browser.close();
