// Shared helpers: easing, Summy mascot, store badges, confetti
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const seg=(t,a,b)=>clamp((t-a)/(b-a));
const E={out:x=>1-Math.pow(1-x,3),inOut:x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2,
 back:x=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2)},
 elastic:x=>x===0?0:x===1?1:Math.pow(2,-10*x)*Math.sin((x*10-.75)*(2*Math.PI/3))+1};
const lerp=(a,b,x)=>a+(b-a)*x;
const COLS=['#e5392d','#ff8a2b','#e0a000','#1fa34f','#1e90e8','#8b5cf6'];
const wordmark=(txt='TapSum')=>[...txt].map((c,i)=>`<span style="color:${COLS[i%6]}">${c}</span>`).join('');
function rng(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}

// Summy the mascot. mood: 'smile' | 'open' | 'happy' (closed happy eyes) | 'think'
function summy(mood='smile',size=200){
  const eyes = mood==='happy'
   ? `<path d="M64 74 q10 -12 20 0" stroke="#14304a" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M116 74 q10 -12 20 0" stroke="#14304a" stroke-width="5" fill="none" stroke-linecap="round"/>`
   : `<circle cx="74" cy="72" r="11" fill="#fff"/><circle cx="126" cy="72" r="11" fill="#fff"/><circle cx="76" cy="${mood==='think'?66:73}" r="5.5" fill="#14304a"/><circle cx="128" cy="${mood==='think'?66:73}" r="5.5" fill="#14304a"/>`;
  const mouth = mood==='open'||mood==='happy' ? `<path d="M88 100 q12 22 24 0 z" fill="#14304a"/><path d="M93 107 q7 8 14 0 q-7 -4 -14 0z" fill="#ff7a8a"/>`
    : mood==='think' ? `<ellipse cx="100" cy="104" rx="5" ry="4" fill="#14304a"/>` : `<path d="M89 100 q11 10 22 0" stroke="#14304a" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 200 190" width="${size}" height="${size*0.95}" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="100" cy="176" rx="62" ry="9" fill="#14304a" opacity=".14"/>
  <path d="M100 22 C 96 6, 80 -2, 66 4 C 72 20, 88 26, 100 22Z" fill="#46d16d"/><path d="M100 22 C 106 8, 124 0, 140 6 C 132 22, 114 28, 100 22Z" fill="#2fb857"/>
  <ellipse cx="38" cy="108" rx="15" ry="19" fill="#e5583b"/><ellipse cx="162" cy="108" rx="15" ry="19" fill="#e5583b"/>
  <ellipse cx="72" cy="168" rx="20" ry="10" fill="#e5583b"/><ellipse cx="128" cy="168" rx="20" ry="10" fill="#e5583b"/>
  <ellipse cx="100" cy="100" rx="78" ry="72" fill="#ff7a5c"/>
  <ellipse cx="100" cy="112" rx="46" ry="38" fill="#ffd7c2"/>
  <circle cx="50" cy="100" r="9" fill="#ff8f93" opacity=".7"/><circle cx="150" cy="100" r="9" fill="#ff8f93" opacity=".7"/>
  ${eyes}${mouth}</svg>`;
}

// Store badges (generic badge look built from simple-icons glyphs; swap in the official badge art before publishing)
function badge(kind,w=640){
  const h=w*0.3, g=kind==='play';
  const path=g?ICONS.googleplay:ICONS.apple, small=g?'GET IT ON':'Download on the', big=g?'Google Play':'App Store';
  const glyphFill=g?'url(#gp)':'#fff';
  return `<svg width="${w}" height="${h}" viewBox="0 0 640 192" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="gp" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#00d2ff"/><stop offset=".35" stop-color="#2ee57a"/><stop offset=".65" stop-color="#ffd23a"/><stop offset="1" stop-color="#ff4d5a"/></linearGradient></defs>
  <rect x="3" y="3" width="634" height="186" rx="34" fill="#0b0b0f" stroke="#a6a6a6" stroke-width="5"/>
  <g transform="translate(${g?38:44},${g?36:34}) scale(${g?5.0:5.2})"><path d="${path}" fill="${glyphFill}"/></g>
  <text x="${g?178:176}" y="78" font-family="Liberation Sans, Arial, sans-serif" font-size="${g?34:32}" font-weight="600" fill="#fff" letter-spacing="1.5">${small}</text>
  <text x="${g?176:174}" y="146" font-family="Liberation Sans, Arial, sans-serif" font-size="${g?76:74}" font-weight="700" fill="#fff" ${g?'':'letter-spacing="-1"'}>${big}</text></svg>`;
}

// Deterministic confetti on a canvas: burst(t0,x,y,n,seed)
function drawConfetti(ctx,t,bursts,W,H){
  ctx.clearRect(0,0,W,H);
  const cols=['#e5392d','#ff8a2b','#ffc531','#1fa34f','#1e90e8','#8b5cf6'];
  for(const b of bursts){
    const dt=t-b.t0; if(dt<0||dt>3.2) continue; const r=rng(b.seed);
    for(let i=0;i<b.n;i++){
      const ang=-Math.PI/2+(r()-.5)*(b.spread||2.4), sp=(b.speed||900)*(0.4+r()*0.8);
      const x=b.x+Math.cos(ang)*sp*dt*(b.drag?1/(1+dt):1)+(r()-.5)*40, y=b.y+Math.sin(ang)*sp*dt+0.5*1500*dt*dt;
      const rot=(r()*6+dt*(r()*10-5)), w=14+r()*14, h=8+r()*10, a=clamp(1-(dt-2.2)/1);
      ctx.save();ctx.globalAlpha=a;ctx.translate(x,y);ctx.rotate(rot);ctx.fillStyle=cols[(r()*6)|0];ctx.fillRect(-w/2,-h/2,w,h);ctx.restore();
    }
  }
}
