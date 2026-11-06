// Replica of the TapSum play screen (390x844 design units), driven by a state object each frame.
function createPhone(root,opt={}){
  root.style.cssText+=';position:absolute;width:390px;height:844px;overflow:hidden;background:#efefef;font-family:Coiny,sans-serif;transform-origin:0 0';
  // Same grid as the game: 4 place-value columns (1000 · 100 · 10 · 1), a take-away row, an add row, then a wide DONE bar
  const B=(id,x,y,w,h,txt,col,sh,fg,fs,dir='column')=>`<div class="b" id="${opt.p||'p'}-${id}" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px"><div class="bs" style="position:absolute;inset:0;border-radius:15px;background:${sh}"></div><div class="bf" style="position:absolute;left:0;right:0;top:0;bottom:4px;border-radius:15px;background:${col};color:${fg};font-size:${fs}px;display:flex;align-items:center;justify-content:center;flex-direction:${dir};gap:10px;line-height:1">${txt}</div><div class="rp" style="position:absolute;left:50%;top:45%;width:20px;height:20px;margin:-10px;border-radius:50%;background:rgba(255,255,255,.75);opacity:0"></div></div>`;
  const R=opt.p||'p';
  root.innerHTML=`
  <div style="position:absolute;left:-60px;top:760px;width:430px;height:190px;border-radius:50%;background:#a8e6b8"></div>
  <div style="position:absolute;left:120px;top:790px;width:430px;height:190px;border-radius:50%;background:#7fd396"></div>
  <div style="position:absolute;left:20px;top:52px;width:44px;height:44px;border-radius:50%;background:#fffdf5;box-shadow:0 3px 0 #a9c1d3;display:flex;gap:6px;align-items:center;justify-content:center"><i style="width:6px;height:18px;border-radius:3px;background:#14304a"></i><i style="width:6px;height:18px;border-radius:3px;background:#14304a"></i></div>
  <div id="${R}-round" style="position:absolute;left:0;width:390px;top:60px;text-align:center;font-size:17px;color:#3d5f80">ROUND 1</div>
  <div id="${R}-hearts" style="position:absolute;left:0;width:390px;top:88px;text-align:center;font-size:25px;color:#ff5f7e;letter-spacing:4px">♥♥♥</div>
  <div id="${R}-score" style="position:absolute;right:20px;top:54px;font-size:32px;color:#e67e00"><span style="color:#ffb300;font-size:28px">★</span> 0</div>
  <div style="position:absolute;left:73px;top:131px;width:244px;height:244px;border-radius:50%;background:#a9c1d3;transform:translateY(5px)"></div>
  <svg style="position:absolute;left:73px;top:126px" width="244" height="244" viewBox="0 0 244 244"><circle cx="122" cy="122" r="120" fill="#d3e0ea"/><circle cx="122" cy="122" r="104" fill="#fffdf5"/>
    <circle id="${R}-ring" cx="122" cy="122" r="112" fill="none" stroke="#1fa34f" stroke-width="14" stroke-linecap="round" transform="rotate(-90 122 122)" stroke-dasharray="703.7" stroke-dashoffset="0"/></svg>
  <div id="${R}-label" style="position:absolute;left:73px;width:244px;top:176px;text-align:center;font-size:17px;color:#1fa34f;white-space:nowrap">ADD</div>
  <div id="${R}-num" style="position:absolute;left:73px;width:244px;top:196px;text-align:center;font-size:84px;line-height:100px;color:#1fa34f">+9</div>
  <div id="${R}-blocks" style="position:absolute;left:0;width:390px;top:436px;height:50px"></div>
  <div id="${R}-summy" style="position:absolute;left:150px;top:493px;width:90px"></div>
  ${B('m1000',20,601,79,59,'-1000','#e3eaf2','#a9c1d3','#a9bccd',24)}
  ${B('m100',110,601,79,59,'-100','#e3eaf2','#a9c1d3','#a9bccd',27)}
  ${B('m10',200,601,79,59,'-10','#ff6b6b','#d64a3d','#fff',30)}
  ${B('m1',290,601,79,59,'-1','#ff6b6b','#d64a3d','#fff',32)}
  ${B('k1000',20,670,79,59,'+1000','#e3eaf2','#a9c1d3','#a9bccd',24)}
  ${B('k100',110,670,79,59,'+100','#e3eaf2','#a9c1d3','#a9bccd',27)}
  ${B('k10',200,670,79,59,'+10','#1e90e8','#146db5','#fff',30)}
  ${B('k1',290,670,79,59,'+1','#ffc531','#e0a000','#14304a',32)}
  ${B('done',20,739,350,71,'<svg width="36" height="27" viewBox="0 0 46 34"><path d="M5 18 L18 29 L41 5" stroke="#14304a" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg><span style="font-size:29px">DONE</span>','#46d16d','#2aa04f','#14304a',29,'row')}
  <div id="${R}-flash" style="position:absolute;inset:0;background:#46d16d;opacity:0"></div>`;
  const $=id=>root.querySelector('#'+R+'-'+id);
  const el={round:$('round'),hearts:$('hearts'),score:$('score'),ring:$('ring'),label:$('label'),num:$('num'),blocks:$('blocks'),summy:$('summy'),flash:$('flash')};
  const btn={};['k1000','k100','k10','k1','m1000','m100','m10','m1','done'].forEach(k=>btn[k]=$(k));
  let lastMood='';
  if(opt.big){ // Brain-trainer style: enable +100 / +1000 colours
    const f=(k,c,s,fg)=>{btn[k].querySelector('.bf').style.background=c;btn[k].querySelector('.bf').style.color=fg;btn[k].querySelector('.bs').style.background=s};
    f('k100','#ff8a2b','#d96a10','#14304a');f('k1000','#8b5cf6','#6b3fd6','#fff');
    f('m100','#f0504f','#c23a36','#fff');f('m1000','#d93a46','#a8262f','#fff');
  }
  return function update(s){
    el.round.textContent='ROUND '+(s.round||1);
    el.hearts.textContent='♥'.repeat(s.hearts??3);
    el.score.innerHTML=`<span style="color:#ffb300;font-size:28px">★</span> ${s.score||0}`;
    el.ring.setAttribute('stroke-dashoffset',(703.7*(1-clamp(s.ring??1))).toFixed(1));
    el.ring.setAttribute('stroke',s.ringColor||'#1fa34f');
    el.label.textContent=s.label||'';el.label.style.fontSize=(s.label&&s.label.length>12?14:17)+'px';el.label.style.color=s.col||'#1fa34f';
    el.num.textContent=s.num||'';el.num.style.color=s.col||'#1fa34f';
    el.num.style.fontSize=(s.numSize||84)+'px';
    el.num.style.transform=`scale(${s.numScale??1})`;el.num.style.opacity=s.numOp??1;
    el.label.style.opacity=s.numOp??1;
    // blocks: tens as blue bars, ones as yellow dots
    if(s.showBlocks){const bars=Math.floor(s.val/10),dots=s.val%10;
      el.blocks.innerHTML=`<div style="display:flex;justify-content:center;align-items:flex-end;gap:22px;height:50px"><div style="display:flex;gap:6px;align-items:flex-end">${'<i style="width:13px;height:44px;border-radius:4px;background:#1e90e8"></i>'.repeat(bars)}</div><div style="display:flex;gap:7px;align-items:flex-end;padding-bottom:2px">${'<i style="width:18px;height:18px;border-radius:50%;background:#ffc531"></i>'.repeat(dots)}</div></div>`;
    } else el.blocks.innerHTML='';
    const mood=s.mood||'smile'; if(mood!==lastMood){el.summy.innerHTML=summy(mood,90);lastMood=mood}
    el.summy.style.transform=`translateY(${s.bob||0}px) scale(${s.summyScale||1})`;
    for(const k in btn){const p=(s.press&&s.press[k])||0,r=(s.ripple&&s.ripple[k])||0;
      btn[k].querySelector('.bf').style.transform=`translateY(${p*6}px)`;
      const rp=btn[k].querySelector('.rp');rp.style.opacity=r>0&&r<1?(1-r)*0.8:0;rp.style.transform=`scale(${1+r*5})`;}
    el.flash.style.opacity=s.flash||0;
  };
}
