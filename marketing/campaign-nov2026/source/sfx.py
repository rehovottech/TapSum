import numpy as np, subprocess, wave, sys, json
SR=44100; rng=np.random.default_rng(7)
def mp3(path):
    raw=subprocess.run(['ffmpeg','-v','error','-i',path,'-f','f32le','-ac','1','-ar',str(SR),'-'],capture_output=True,check=True).stdout
    return np.frombuffer(raw,dtype=np.float32).copy()
def resample(x,r): # r>1 higher pitch/shorter
    n=int(len(x)/r); return np.interp(np.arange(n)*r,np.arange(len(x)),x)
def env(n,a=.005,d=.1,curve=3):
    t=np.arange(n)/SR; e=np.minimum(1,t/max(a,1e-4))*np.exp(-t/d*curve/3*3/ (curve if False else 1)); return e
def lp(x,fc_arr):
    y=np.zeros_like(x);s=0.
    a=1-np.exp(-2*np.pi*fc_arr/SR)
    for i in range(len(x)): s+=a[i]*(x[i]-s); y[i]=s
    return y
def whoosh(dur=.5,up=True,f0=300,f1=5000,vol=.5):
    n=int(dur*SR); t=np.linspace(0,1,n); noise=rng.standard_normal(n)
    fc=np.exp(np.log(f0)+(np.log(f1)-np.log(f0))*(t if up else 1-t))
    b=lp(noise,fc); b=b-lp(b,fc*0.25)  # band-ish
    e=np.sin(np.pi*t)**1.6
    y=b*e; y/=np.max(np.abs(y))+1e-9; return y*vol
def pop(f=520,dur=.22,vol=.6,drop=.5):
    n=int(dur*SR); t=np.arange(n)/SR
    fr=f*(1+drop*np.exp(-t*40)); ph=2*np.pi*np.cumsum(fr)/SR
    y=np.sin(ph)*np.exp(-t*18)+0.25*np.sin(2*ph)*np.exp(-t*30)
    y[:int(.002*SR)]*=np.linspace(0,1,int(.002*SR)); return y*vol
def blip(f=660,dur=.16,vol=.5,slide=0):
    n=int(dur*SR); t=np.arange(n)/SR; fr=f*(1+slide*t/dur); ph=2*np.pi*np.cumsum(fr)/SR
    y=(np.sin(ph)+.3*np.sin(2*ph)+.1*np.sin(3*ph))*np.exp(-t*22)*np.minimum(1,t/.004); return y*vol
def swish(dur=.22,vol=.3,f=3500):
    n=int(dur*SR); t=np.linspace(0,1,n); x=rng.standard_normal(n)
    y=x-lp(x,np.full(n,f*.4)); y=lp(y,np.full(n,f*2)); return y/np.max(np.abs(y))*vol*np.sin(np.pi*t)**1.2
def tick(vol=.18):
    n=int(.04*SR); t=np.arange(n)/SR; return (np.sin(2*np.pi*1800*t)*np.exp(-t*160)+.4*rng.standard_normal(n)*np.exp(-t*300))*vol
def confetti(vol=.55):
    n=int(.7*SR); t=np.arange(n)/SR
    boom=np.sin(2*np.pi*(90+120*np.exp(-t*30))*t)*np.exp(-t*14)*.8
    x=rng.standard_normal(n); sh=(x-lp(x,np.full(n,2500)))*np.exp(-t*7)*.5
    crackle=np.zeros(n)
    for k in range(40):
        s=int(rng.uniform(.03,.6)*SR); L=int(.012*SR); crackle[s:s+L]+=rng.standard_normal(L)*np.exp(-np.arange(L)/SR*500)*rng.uniform(.1,.4)
    y=boom+sh+crackle; return y/np.max(np.abs(y))*vol
def boing(vol=.5):
    n=int(.7*SR); t=np.arange(n)/SR; fr=330+90*np.sin(2*np.pi*9*t)*np.exp(-t*5)+120*np.exp(-t*10); ph=2*np.pi*np.cumsum(fr)/SR
    return (np.sin(ph)+.2*np.sin(2*ph))*np.exp(-t*6)*np.minimum(1,t/.01)*vol
def sparkle(vol=.35,n_g=7,span=.6):
    out=np.zeros(int((span+.5)*SR))
    for i in range(n_g):
        f=rng.choice([1568,1975,2349,2637,3136,3951]); s=int((i/n_g*span+rng.uniform(0,.04))*SR); L=int(.35*SR); t=np.arange(L)/SR
        out[s:s+L]+=np.sin(2*np.pi*f*t)*np.exp(-t*14)*rng.uniform(.5,1)
    return out/np.max(np.abs(out))*vol
def ding(f=880,vol=.4):
    n=int(.9*SR); t=np.arange(n)/SR; return (np.sin(2*np.pi*f*t)+.5*np.sin(2*np.pi*f*2.01*t)+.25*np.sin(2*np.pi*f*3.02*t))*np.exp(-t*5)*np.minimum(1,t/.003)*vol/1.75
def chime_up(vol=.35):  # "?" question sound: two rising notes
    a=blip(587,.18,1,0); b=blip(784,.28,1,0); out=np.zeros(int(.5*SR)); out[:len(a)]+=a; s=int(.12*SR); out[s:s+len(b)]+=b; return out*vol

TAP=mp3('a/tap.mp3'); SUC=mp3('a/success.mp3'); REW=mp3('a/reward.mp3')

def build(V):
    m=json.load(open(f'v{V}_meta.json')); dur=m['dur']; buf=np.zeros(int((dur+1)*SR))
    def put(t,x,g=1.0):
        s=int(t*SR); 
        if s<0: return
        e=min(len(buf),s+len(x)); buf[s:e]+=x[:e-s]*g
    if V==1:
        G=2.7; end=16.7; caps=[2.9,6.7,10.4,12.0,14.4]; nums=[(G+.5,1,9),(G+.5+1.25,0,-4),(G+.5+2.5,1,12)]
        taps=[4.8,5.2,5.5,5.8,6.1,6.4,6.7,7.0]; done=G+7.55; q=G+4.4; qd=3.6
        swaps=[11.9,14.3]; bursts=[G+7.55+.1,12.05,end+.1]; hookT=[.15,.27,.39,.51]; hookOut=2.35; phoneIn=G-.25; phoneOut=16.5; icon=end
    else:
        G=2.4; end=12.6; caps=[2.5,6.1,9.1,10.1]; nums=[(G+.45,1,24),(G+1.45,0,-18),(G+2.45,1,37)]
        taps=[3.8,4.05,4.3,4.55,4.9,5.15,5.4]; done=G+5.95; q=G+3.5; qd=3.0
        swaps=[10.0]; bursts=[G+5.95+.1,10.15,end+.1]; hookT=[.15,.27,.39,.51]; hookOut=2.05; phoneIn=G-.25; phoneOut=12.4; icon=end
    # hook
    put(0.0,whoosh(.45,True,400,5500,.55)); 
    for i,t in enumerate(hookT): put(t+.12,pop(440+i*70,.22,.5))
    put(.35,blip(392,.25,.3,0.1))
    put(hookOut,whoosh(.4,False,5000,500,.5))
    # phone in/out
    put(phoneIn,whoosh(.6,True,250,3500,.6)); put(phoneOut,whoosh(.6,False,3500,250,.6))
    # captions
    for c in caps: put(c,swish(.24,.35)); put(c+.06,pop(700,.14,.22,.3))
    # numbers
    for t,pos,n in nums:
        put(t,pop(560 if pos else 330,.2,.45)); put(t+.02,blip(740 if pos else 300,.18,.4,.12 if pos else -.25))
        put(t+.95,swish(.18,.2,2500))
    # question
    put(q,chime_up(.6))
    n_ticks=int(qd*3)
    for k in range(n_ticks):
        t=q+.45+k/3.0
        if t<done-.1: put(t,tick(.16+.1*k/n_ticks),1.0)
    # taps rising pitch
    for i,t in enumerate(taps): put(G+t,resample(TAP,1.0+.045*i),.8)
    # done + success
    put(G+(done-G)*0+0 if False else done,pop(900,.12,.35,.2)); put(done+.05,SUC,.7)
    for b in bursts: put(b,confetti(.5))
    for s in swaps: put(s-.05,whoosh(.35,True,500,5000,.45)); put(s+.1,pop(620,.2,.4))
    # end card
    put(end-.05,whoosh(.5,True,300,6000,.5)); put(end,boing(.5)); put(end+.05,REW,.45)
    put(end+.15,whoosh(.35,True,500,4000,.35)); put(end+.45,swish(.25,.3))
    put(end+.6,pop(760,.18,.4)); put(end+.62,sparkle(.3,8,.8))
    put(end+.85,pop(500,.22,.5)); put(end+.85,ding(784,.3))
    put(end+1.05,pop(560,.22,.5)); put(end+1.05,ding(988,.3))
    buf=buf[:int(dur*SR)]
    pk=np.max(np.abs(buf)); buf=buf/pk*.85 if pk>.85 else buf
    # gentle fade out end
    f=int(.5*SR); buf[-f:]*=np.linspace(1,0,f)
    st=np.stack([buf,buf],1); pcm=(st*32767).astype(np.int16)
    with wave.open(f'sfx_v{V}.wav','wb') as w: w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm.tobytes())
    print(V,'peak',round(float(pk),2))
for V in (1,2): build(V)
