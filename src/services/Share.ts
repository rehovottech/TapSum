import { Capacitor } from '@capacitor/core';
import { Share } from '@rehovottech/capacitor-share';
import { SHARE_CONFIG } from '../config/Share';
import { PurchasesManager } from './Purchases';

export type ShareTarget = 'instagram' | 'facebook' | 'sheet';

/**
 * Score sharing (native only). Kids game: the grown-up check runs before anything leaves the app.
 * Shares a generated score card, a message and the store link; falls back to the OS sheet.
 */
export class ShareManager {
    /** Native: always. Web: when the browser can share or copy (so the button also shows in `npm run dev`). */
    static get available(): boolean {
        if (Capacitor.isNativePlatform()) return true;
        return typeof navigator !== 'undefined' && (!!navigator.share || !!navigator.clipboard);
    }

    static storeUrl(): string | undefined {
        if (Capacitor.getPlatform() === 'ios') {
            return SHARE_CONFIG.iosAppId ? `https://apps.apple.com/app/id${SHARE_CONFIG.iosAppId}` : undefined;
        }
        return SHARE_CONFIG.androidUrl;
    }

    static async installed(): Promise<{ instagram: boolean; facebook: boolean }> {
        if (!Capacitor.isNativePlatform()) return { instagram: false, facebook: false };
        const [ig, fb] = await Promise.all([
            Share.isAppInstalled({ app: 'instagram' }).catch(() => ({ installed: false })),
            Share.isAppInstalled({ app: 'facebook' }).catch(() => ({ installed: false })),
        ]);
        return { instagram: ig.installed, facebook: fb.installed };
    }

    /** Draws a 1080x1920 score card (Stories size) and returns it as a base64 PNG. */
    static renderCard(score: number, best: number): string {
        const c = document.createElement('canvas');
        c.width = 1080; c.height = 1920;
        const g = c.getContext('2d')!;
        const bg = g.createLinearGradient(0, 0, 0, c.height);
        bg.addColorStop(0, '#a8e6b8'); bg.addColorStop(1, '#7fd396');
        g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
        g.textAlign = 'center'; g.fillStyle = '#14304a';
        g.font = '900 120px sans-serif'; g.fillText('TAP SUM', 540, 520);
        g.font = '700 70px sans-serif'; g.fillText('My score', 540, 820);
        g.font = '900 360px sans-serif'; g.fillText(String(score), 540, 1160);
        g.font = '700 70px sans-serif'; g.fillText(`Best: ${best}`, 540, 1340);
        g.font = '600 56px sans-serif'; g.fillText('Can you beat me?', 540, 1620);
        return c.toDataURL('image/png');
    }

    /** Never rejects. Returns false if the grown-up check failed or nothing could be shared. */
    static async shareScore(score: number, best: number, target: ShareTarget = 'sheet'): Promise<boolean> {
        if (!ShareManager.available) return false;
        if (!Capacitor.isNativePlatform()) return ShareManager.shareWeb(score, best);
        if (!(await PurchasesManager.askGrownUp())) return false;
        const imageBase64 = ShareManager.renderCard(score, best);
        const text = `I scored ${score} in Tap Sum! Can you beat me?`;
        const url = ShareManager.storeUrl();
        try {
            if (target === 'instagram') {
                await Share.shareToInstagramStories({ imageBase64, facebookAppId: SHARE_CONFIG.facebookAppId || undefined });
                return true;
            }
            if (target === 'facebook') {
                await Share.shareToFacebook({ text, url, imageBase64 });
                return true;
            }
        } catch { /* app missing or refused: fall back to the OS sheet */ }
        try {
            await Share.share({ text, url, imageBase64, title: 'Share your score' });
            return true;
        } catch (e) {
            console.warn('Share failed', e);
            return false;
        }
    }

    private static webUrl(): string {
        return SHARE_CONFIG.webUrl || `${location.origin}${location.pathname}`;
    }

    private static dataUrlToFile(dataUrl: string): File {
        const bin = atob(dataUrl.split(',')[1]);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new File([bytes], 'tap-sum-score.png', { type: 'image/png' });
    }

    /**
     * Web edition: the browser's share sheet (with the score card) when it has one - phones, Safari,
     * Edge - otherwise a small sheet with Facebook, X, WhatsApp, copy link and download-image
     * (Instagram has no web share link: save the card and post it).
     */
    private static async shareWeb(score: number, best: number): Promise<boolean> {
        const text = `I scored ${score} in Tap Sum! Can you beat me?`;
        const url = ShareManager.webUrl();
        const card = ShareManager.renderCard(score, best);
        const file = ShareManager.dataUrlToFile(card);
        try {
            if (navigator.share) {
                const data: ShareData = { text, url, title: 'Tap Sum' };
                if (navigator.canShare?.({ files: [file] })) data.files = [file];
                await navigator.share(data);
                return true;
            }
        } catch (e) {
            if ((e as DOMException)?.name === 'AbortError') return false;   // user closed it
        }
        ShareManager.showWebSheet(text, url, card);
        return true;
    }

    private static showWebSheet(text: string, url: string, card: string): void {
        const enc = encodeURIComponent;
        const links: [string, string][] = [
            ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}&quote=${enc(text)}`],
            ['X', `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`],
            ['WhatsApp', `https://wa.me/?text=${enc(`${text} ${url}`)}`],
        ];
        const root = document.createElement('div');
        root.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(11,34,54,.6);display:flex;align-items:center;justify-content:center;font-family:sans-serif';
        const box = document.createElement('div');
        box.style.cssText = 'background:#fffdf6;border-radius:20px;padding:20px;width:min(86vw,340px);display:flex;flex-direction:column;gap:10px;color:#14304a';
        const title = document.createElement('div');
        title.textContent = 'Share your score';
        title.style.cssText = 'font-size:20px;font-weight:800;text-align:center;margin-bottom:4px';
        box.appendChild(title);

        const btn = (label: string, onClick: () => void): HTMLButtonElement => {
            const b = document.createElement('button');
            b.textContent = label;
            b.style.cssText = 'border:0;border-radius:12px;padding:12px;font-size:16px;font-weight:700;background:#e2ecf2;color:#14304a;cursor:pointer';
            b.onclick = onClick;
            box.appendChild(b);
            return b;
        };
        for (const [name, href] of links) btn(name, () => window.open(href, '_blank', 'noopener,noreferrer'));
        const copy = btn('Copy link', async () => {
            try { await navigator.clipboard.writeText(`${text} ${url}`); copy.textContent = 'Copied!'; }
            catch { copy.textContent = 'Copy failed'; }
        });
        btn('Save image (Instagram)', () => {
            const a = document.createElement('a');
            a.href = card; a.download = 'tap-sum-score.png';
            a.click();
        });
        const close = btn('Close', () => root.remove());
        close.style.background = 'transparent';
        root.onclick = (e) => { if (e.target === root) root.remove(); };
        root.appendChild(box);
        document.body.appendChild(root);
    }
}
