import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { chromium } = require('playwright-core');
import { spawn, execSync } from 'child_process';
import fs from 'fs';
const V = process.argv[2], only = process.argv[3]; // only = comma list of seconds to dump stills
const W=process.env.WORK; // work dir: a/ holds video.html, its js, Coiny-Regular.ttf, icon.png and the raw screens (streak/best/profiles.png)
const b = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}); const p = await b.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
await p.goto(`file://${W}/a/video.html?v=${V}`); await p.waitForSelector('body[data-ready]');
const meta = await p.evaluate(()=>window.META);
if (only) { fs.mkdirSync(`${W}/stills`,{recursive:true});
  for (const s of only.split(',')) { await p.evaluate(t=>window.render(t),+s); await p.screenshot({path:`${W}/stills/v${V}_${s}.jpg`,type:'jpeg',quality:85}); }
  await b.close(); process.exit(0); }
const out=`${W}/v${V}_silent.tmp.mp4`;
const ff = spawn('ffmpeg',['-y','-f','image2pipe','-framerate','30','-c:v','mjpeg','-i','-','-c:v','libx264','-crf','18','-preset','veryfast','-pix_fmt','yuv420p','-movflags','+faststart',out],{stdio:['pipe','inherit','inherit']});
const N = Math.round(meta.dur*30);
for (let i=0;i<N;i++){ await p.evaluate(t=>window.render(t), i/30);
  const buf = await p.screenshot({type:'jpeg',quality:92}); if(!ff.stdin.write(buf)) await new Promise(r=>ff.stdin.once('drain',r)); }
ff.stdin.end(); await new Promise(r=>ff.on('close',r)); await b.close();
fs.renameSync(out,`${W}/v${V}_silent.mp4`);
fs.writeFileSync(`${W}/v${V}_meta.json`,JSON.stringify(meta));
console.log('done',N,'frames');
