import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { chromium } = require('playwright');
import fs from 'fs';
const W='/tmp/claude-0/-home-claude/b3f2a657-168a-535c-9127-1cc1a2af761f/scratchpad/w';
const C={
 A:{theme:'A',h:'Turn screen time<br>into <em>math time</em>',s:'Remember the numbers. Tap the total.',pills:['Free to play','Ages 5+'],img:'play.png',hs:'Turn screen<br>time into<br><em>math time</em>',hstrip:'Turn screen time into <em>math time</em>',
    tiles:{sq:[['+1',.86,.07,100,10]],tall:[['+9',.05,.58,120,-12],['+1',.76,.64,110,10]],wide:[['+9',.49,.66,80,-12],['+1',.88,.08,74,10]]}},
 B:{theme:'B',h:'Can you keep the <em>total</em> in your head?',s:'Quick rounds for kids and grown-ups.',pills:['Free to play','Ages 5+'],img:'takeaway.png',hs:'Keep the<br><em>total</em> in<br>your head',hstrip:'Can you keep the <em>total</em> in your head?',
    tiles:{sq:[['-18',.84,.07,100,10]],tall:[['+24',.04,.58,120,-12],['-18',.75,.64,110,10]],wide:[['+24',.48,.66,80,-12],['-18',.88,.08,74,10]]}}};
const SIZES={
 meta:{
  'feed-square_1080x1080':{W:1080,H:1080,layout:'side',h1:80,p:32,tw:.47,phoneH:1.0,phoneX:.575,phoneY:.12,t:'sq'},
  'feed-portrait_1080x1350':{W:1080,H:1350,layout:'stack',h1:104,p:36,textTop:.05,phoneW:.56,phoneY:.52,t:'tall',summy:[.02,.78,200]},
  'story_1080x1920':{W:1080,H:1920,layout:'stack',h1:118,p:40,textTop:.14,phoneW:.64,phoneY:.50,t:'tall',summy:[.01,.80,230]}},
 google:{
  'landscape_1200x628':{W:1200,H:628,layout:'side',h1:72,p:28,phoneH:1.25,phoneX:.62,phoneY:.10,t:'none'},
  'square_1200x1200':{W:1200,H:1200,layout:'side',h1:80,p:32,tw:.47,phoneH:1.0,phoneX:.575,phoneY:.12,t:'sq'},
  'portrait_960x1200':{W:960,H:1200,layout:'stack',h1:104,p:36,textTop:.05,phoneW:.56,phoneY:.52,t:'tall',summy:[.02,.78,200]},
  'mrec_300x250':{W:300,H:250,layout:'side',brand:false,short:1,pillsN:1,s:'',h1:96,tw:.56,tx:50,phoneH:1.05,phoneX:.64,phoneY:.12,t:'none'},
  'halfpage_300x600':{W:300,H:600,layout:'stack',h1:118,p:40,textTop:.04,phoneW:.74,phoneY:.45,t:'tall',summy:[0,.82,220]},
  'leaderboard_728x90':{W:728,H:90,layout:'strip',short:2}}};
const b=await chromium.launch();
const only=process.argv[2];
for(const [net,sizes] of Object.entries(SIZES)) for(const [sn,sz] of Object.entries(sizes)) for(const [cn,c] of Object.entries(C)){
  const name=`${cn}_${sn}`; if(only&&!name.includes(only)) continue;
  const P={...c,...sz,tiles:(sz.t&&c.tiles[sz.t])||[]}; delete P.t;
  if(sz.t==='sq'){P.h=c.hs;P.p=30} if(sz.short===1){P.h=c.hs;P.pills=['Free to play'];P.s=''} if(sz.short===2){P.h=c.hstrip}
  if(sz.layout==='stack'&&sz.W<400){P.pills=['Free to play'];P.tiles=[]}
  if(sz.W<400||sz.H<100){P.tiles=[]}
  const p=await b.newPage({viewport:{width:sz.W,height:sz.H},deviceScaleFactor:1});
  await p.goto(`file://${W}/a/ad.html?p=${encodeURIComponent(JSON.stringify(P))}`);await p.waitForSelector('body[data-ready]');
  const dir=`${W}/ads/${net}/${cn==='A'?'concept-a-math-time':'concept-b-total'}`;fs.mkdirSync(dir,{recursive:true});
  await p.screenshot({path:`${dir}/${net}_${cn.toLowerCase()}_${sn}.png`});await p.close();
}
await b.close();console.log('ads done');
