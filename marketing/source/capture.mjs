// Captures raw Tap Sum screens from the web build (http://localhost:8080) with Playwright + local Chrome.
// usage: node capture.mjs <outDir> <width> <height> <dpr> [only]
// NATIVE=1 makes Capacitor report 'ios' (fake WebKit bridge), so the game uses its native full-screen layout
// instead of the web portrait box. Needed for iPad captures; native plugin calls just fail and are ignored.
import { chromium } from 'playwright-core';
import fs from 'fs';

const [,, outDir, W, H, DPR, only] = process.argv;
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

async function open(profile = 'explorer', best = '240') {
    const ctx = await browser.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: +DPR, isMobile: true, hasTouch: true });
    if (process.env.NATIVE) {
        await ctx.addInitScript(() => { window.webkit = { messageHandlers: { bridge: { postMessage() {} } } }; });
    }
    await ctx.addInitScript(([profile, best]) => {
        localStorage.setItem('tapsum_profile', profile);
        localStorage.setItem('tapsum_tutorial_done', 'true');
        localStorage.setItem('tapsum_best_score', best);
        localStorage.setItem('tapsum_best_score_little', '180');
        localStorage.setItem('tapsum_best_score_adult', '410');
        localStorage.setItem('tapsum_sound', 'true');
    }, [profile, best]);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => console.log('pageerror', e.message));
    await p.goto('http://localhost:8080/');
    await p.waitForFunction(() => window.game?.scene.isActive('Menu'), null, { timeout: 30000 });
    await p.waitForTimeout(1200);
    // The fake bridge can't answer the purchases plugin, so add the coffee button a real install shows
    if (process.env.NATIVE) await p.evaluate(() => window.game.scene.getScene('Menu').createDonateButton());
    return { ctx, p };
}

const shot = async (p, name) => { await p.screenshot({ path: `${outDir}/${name}.png` }); console.log('ok', name); };

// Start a run with a fixed list of numbers; returns once the Game scene is up.
async function startGame(p, numbers, data = {}) {
    await p.evaluate(([numbers, data]) => {
        const g = window.game.scene.getScene('Game');
        window.__nums = numbers.slice();
        g.events.once('create', () => { g.generateBalancedTarget = () => window.__nums.shift() ?? 7; });
        window.game.scene.getScene('Menu').scene.start('Game', data);
    }, [numbers, data]);
    await p.waitForFunction(() => window.game.scene.isActive('Game'));
}

const waitRound = (p) => p.waitForFunction(() => window.game.scene.getScene('Game').roundActive === true, null, { timeout: 15000 });

// Answer the current round correctly
async function solve(p) {
    await waitRound(p);
    await p.evaluate(() => {
        const g = window.game.scene.getScene('Game');
        g.currentTotal = g.targetTotal;
        g.submitAnswer();
    });
}

async function tap(p, amount) {
    await p.evaluate((amount) => {
        const g = window.game.scene.getScene('Game');
        const i = [1, 10, 100, 1000, -1].indexOf(amount);
        g.handleIncrementTap(amount, i);
    }, amount);
}

const freezeTimer = (p, frac) => p.evaluate((frac) => {
    const g = window.game.scene.getScene('Game');
    g.timeLeft = g.timerDuration * frac;
    g.redrawRing();
    g.paused = true;              // stops the countdown without opening the pause sheet
}, frac);

const shots = {
    // 1. Mid-round: a number to remember, tape of earlier numbers, partial answer tapped
    async play() {
        const { ctx, p } = await open();
        await startGame(p, [8, 6, 9, 4, 7, 12, 5, 9], { resumeScore: 70, resumeRound: 8 });
        for (let i = 0; i < 7; i++) { await solve(p); await p.waitForTimeout(150); }
        await waitRound(p);
        await p.waitForTimeout(900);
        for (const a of [10, 10, 10, 10, 1, 1, 1]) { await tap(p, a); await p.waitForTimeout(90); }
        await freezeTimer(p, 0.62);
        await p.waitForTimeout(700);
        await shot(p, 'play');
        await ctx.close();
    },

    // 2. Take-away round (red number)
    async takeaway() {
        const { ctx, p } = await open();
        await startGame(p, [9, 7, 12, 6, 15, 8, -6], { resumeScore: 60, resumeRound: 21 });
        for (let i = 0; i < 6; i++) { await solve(p); await p.waitForTimeout(150); }
        await waitRound(p);
        await p.waitForTimeout(900);
        await freezeTimer(p, 0.8);
        await p.waitForTimeout(400);
        await shot(p, 'takeaway');
        await ctx.close();
    },

    // 3. Five in a row celebration
    async streak() {
        const { ctx, p } = await open();
        await startGame(p, [6, 9, 4, 8, 7, 5, 11], { resumeScore: 40, resumeRound: 5 });
        for (let i = 0; i < 4; i++) { await solve(p); await p.waitForTimeout(150); }
        await solve(p);           // 5th in a row → confetti + "5 IN A ROW!"
        await p.waitForTimeout(950);
        await p.evaluate(() => window.game.scene.getScene('Game').scene.pause());
        await p.waitForTimeout(200);
        await shot(p, 'streak');
        await ctx.close();
    },

    // 4. Menu
    async menu() {
        const { ctx, p } = await open();
        await p.waitForTimeout(800);
        await shot(p, 'menu');
        await ctx.close();
    },

    // 5. Who's playing (all ages)
    async profiles() {
        const { ctx, p } = await open();
        await p.evaluate(() => window.game.scene.getScene('Menu').openProfilePicker());
        await p.waitForTimeout(900);
        await shot(p, 'profiles');
        await ctx.close();
    },

    // 6. New best with confetti
    async best() {
        const { ctx, p } = await open('explorer', '340');
        await p.evaluate(() => window.game.scene.getScene('Menu').scene.start('End', {
            score: 340, round: 35, cleared: 34, bestScore: 340, reason: 'timeout',
            needed: 152, tapped: 142, recent: [24, -18, 37],
        }));
        await p.waitForFunction(() => window.game.scene.isActive('End'));
        await p.waitForTimeout(900);
        // Headless frame timing sometimes skips the End scene's delayed confetti; spawn the same effect if so
        await p.evaluate(() => {
            const e = window.game.scene.getScene('End');
            if (!e.children.list.some((o) => o.type === 'Rectangle')) e.spawnConfetti(50);
        });
        await p.waitForTimeout(1100);
        // Don't freeze the scene during the gold "new best" camera flash
        await p.waitForFunction(() => !window.game.scene.getScene('End').cameras.main.flashEffect.isRunning);
        await p.evaluate(() => { const e = window.game.scene.getScene('End'); if (!window.webkit) e.rankText?.setText('#12'); e.scene.pause(); });
        await shot(p, 'best');
        await ctx.close();
    },

    // 7. Leaderboard
    async leaderboard() {
        const { ctx, p } = await open();
        await p.evaluate(() => {
            const m = window.game.scene.getScene('Menu');
            const btn = m.children.list.find((o) => o.type === 'Container' && o.list?.some((c) => c.text === 'LEADERBOARD'));
            btn?.emit('pointerdown');
        });
        await p.waitForTimeout(6000);
        await shot(p, 'leaderboard');
        await ctx.close();
    },
};

for (const [name, fn] of Object.entries(shots)) {
    if (only && !only.split(',').includes(name)) continue;
    // Native apps show Play Games / Game Center instead of the in-game leaderboard panel
    if (process.env.NATIVE && name === 'leaderboard') continue;
    try { await fn(); } catch (e) { console.log('FAIL', name, e.message); }
}
await browser.close();
