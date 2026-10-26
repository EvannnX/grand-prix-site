// Game audio, all made in the browser with Web Audio (no sound files needed):
//  - engine: a small two-stroke kart engine. Revs climb through three gears with the kart's speed; a sawtooth and a
//    square an octave down go through a soft clipper and a low-pass that opens with the revs, and the volume pulses at
//    the firing rate for the "putt-putt" of a kart engine.
//  - music: an original upbeat racing loop (drums, bass, arpeggio, lead), 16 bars at 150 BPM. If play/music.mp3 exists,
//    that file is played on a loop instead, so a licensed track can be dropped in without code changes.
//  - beep: the countdown and finish tones.
window.GPAudio=(function(){
'use strict';
// engine at full throttle is set to about half the music's loudness (measured offline: RMS 0.0125 vs 0.025)
const VOL={master:0.8,engine:0.028,music:0.22,beep:0.07};
const GEARS=[0,0.32,0.62,1.01];            // speed fractions where gears change
const ENGINE={idleHz:34,maxHz:120,cutLo:350,cutHi:2600};
let C=null, master=null, muted=false, eng=null, music=null;

function init(){
  if(C)return; const A=window.AudioContext||window.webkitAudioContext; if(!A)return;
  try{ C=new A(); }catch(e){ C=null; return; }
  master=C.createGain(); master.gain.value=muted?0:VOL.master; master.connect(C.destination);
  eng=buildEngine();
}
function resume(){ if(C&&C.state==='suspended')C.resume().catch(()=>{}); }
function setMuted(m){ muted=m; if(master)master.gain.setTargetAtTime(m?0:VOL.master,C.currentTime,0.05); if(music&&music.el)music.el.muted=m; }

// ---------- engine ----------
function buildEngine(){
  const saw=C.createOscillator(); saw.type='sawtooth';
  const sub=C.createOscillator(); sub.type='square';
  const subG=C.createGain(); subG.gain.value=0.5;
  const shaper=C.createWaveShaper(); const curve=new Float32Array(256);
  for(let i=0;i<256;i++){ const x=i/128-1; curve[i]=Math.tanh(2.2*x); } shaper.curve=curve;
  const lp=C.createBiquadFilter(); lp.type='lowpass'; lp.Q.value=3;
  const pulse=C.createGain(); pulse.gain.value=0.7;              // modulated by the firing LFO
  const fire=C.createOscillator(); fire.type='square';
  const fireDepth=C.createGain(); fireDepth.gain.value=0.3; fire.connect(fireDepth); fireDepth.connect(pulse.gain);
  const out=C.createGain(); out.gain.value=0;
  saw.connect(shaper); sub.connect(subG); subG.connect(shaper); shaper.connect(lp); lp.connect(pulse); pulse.connect(out); out.connect(master);
  [saw,sub,fire].forEach(o=>o.start());
  return {saw,sub,fire,lp,out};
}
// speed in m/s, top = the kart's top speed, on = race running, throttle 0..1
function engine(speed,top,on,throttle){
  if(!C||!eng)return; const t=C.currentTime, s=Math.min(1,Math.abs(speed)/Math.max(1,top));
  let g=0; while(g<GEARS.length-2&&s>GEARS[g+1])g++;
  const inGear=(s-GEARS[g])/(GEARS[g+1]-GEARS[g]), rpm=Math.min(1,0.18+0.82*(0.35*g/2+0.65*inGear));
  const hz=ENGINE.idleHz+(ENGINE.maxHz-ENGINE.idleHz)*rpm;
  eng.saw.frequency.setTargetAtTime(hz,t,0.04); eng.sub.frequency.setTargetAtTime(hz/2,t,0.04); eng.fire.frequency.setTargetAtTime(hz/2,t,0.04);
  eng.lp.frequency.setTargetAtTime(ENGINE.cutLo+(ENGINE.cutHi-ENGINE.cutLo)*rpm*(0.6+0.4*(throttle||0)),t,0.06);
  eng.out.gain.setTargetAtTime(on?VOL.engine*(0.55+0.45*(throttle||0)):0,t,0.1);
}

// ---------- beeps ----------
function beep(freq,len){
  if(!C||muted)return; const o=C.createOscillator(), g=C.createGain(); o.type='square'; o.frequency.value=freq; g.gain.value=VOL.beep;
  o.connect(g); g.connect(master); o.start(); g.gain.setTargetAtTime(0,C.currentTime+len*0.6,0.05); o.stop(C.currentTime+len+0.2);
}

// ---------- music ----------
const BPM=150, STEP=60/BPM/2;                        // one step = an eighth note
const N=null;                                        // rest
// lead melody, MIDI notes, 8 eighths per bar, 16 bars
const LEAD=[
 72,76,79,76,74,72,74,76, 79,79,81,79,77,76,74,71, 72,76,81,79,76,72,76,79, 77,76,74,72,69,72,74,N,
 72,76,79,84,83,81,79,76, 74,79,83,81,79,77,76,74, 76,72,69,72,76,81,79,76, 77,81,79,77,76,74,72,N,
 81,N,81,79,77,N,77,79,   83,N,83,81,79,N,79,81,   83,84,83,79,76,79,83,84, 81,N,76,N,72,N,76,79,
 77,79,81,77,84,81,77,81, 79,81,83,79,86,83,79,83, 84,N,79,N,76,N,72,76,    79,N,N,N,72,N,N,N];
// chord per bar: root (MIDI) and triad
const CH={C:[48,[60,64,67]],G:[43,[55,59,62]],Am:[45,[57,60,64]],F:[41,[53,57,60]],Em:[40,[52,55,59]]};
const BARS=['C','G','Am','F','C','G','Am','F','F','G','Em','Am','F','G','C','C'];
const hz=m=>440*Math.pow(2,(m-69)/12);
let noiseBuf=null;
function noise(){ if(noiseBuf)return noiseBuf; noiseBuf=C.createBuffer(1,C.sampleRate*0.3,C.sampleRate); const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1; return noiseBuf; }
function tone(bus,type,f,t,len,vol){ const o=C.createOscillator(), g=C.createGain(); o.type=type; o.frequency.value=f; g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+len); o.connect(g); g.connect(bus); o.start(t); o.stop(t+len+0.02); }
function kick(bus,t){ const o=C.createOscillator(), g=C.createGain(); o.frequency.setValueAtTime(140,t); o.frequency.exponentialRampToValueAtTime(45,t+0.12); g.gain.setValueAtTime(0.9,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.2); o.connect(g); g.connect(bus); o.start(t); o.stop(t+0.22); }
function hiss(bus,t,len,vol,hp){ const s=C.createBufferSource(), f=C.createBiquadFilter(), g=C.createGain(); s.buffer=noise(); f.type='highpass'; f.frequency.value=hp; g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+len); s.connect(f); f.connect(g); g.connect(bus); s.start(t); s.stop(t+len+0.02); }
function playStep(bus,i,t){
  const bar=Math.floor(i/8)%16, e=i%8, [root,tri]=CH[BARS[bar]];
  if(e%2===0)kick(bus,t);                                         // four on the floor
  if(e===2||e===6)hiss(bus,t,0.16,0.35,1200);                     // snare on 2 and 4
  hiss(bus,t,0.04,e%2?0.12:0.08,7000);                            // hi-hat every eighth
  tone(bus,'square',hz([root,root,root+12,root,root,root+12,root,root+7][e]),t,STEP*0.9,0.22);  // bass
  tone(bus,'triangle',hz(tri[[0,1,2,1,0,1,2,1][e]]+12),t,STEP*0.8,0.10);                         // arpeggio
  const m=LEAD[(i%128)]; if(m!=null)tone(bus,'square',hz(m),t,STEP*1.6,0.12);                    // lead
}
function startSynth(prefill){
  const bus=C.createGain(); bus.gain.value=VOL.music; const lp=C.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=5200; bus.connect(lp); lp.connect(master);
  const m={bus,step:0,next:C.currentTime+0.1,timer:null};
  const fill=ahead=>{ while(m.next<C.currentTime+ahead){ playStep(bus,m.step,m.next); m.step++; m.next+=STEP; } };
  if(prefill)fill(prefill); m.timer=setInterval(()=>fill(0.25),50);
  return m;
}
// starts the music once; a playable play/music.mp3 is preferred over the synth loop
// (prefill: seconds of the synth loop to schedule at once, used to measure loudness offline)
function startMusic(prefill){
  if(!C||music)return; music={pending:true};
  fetch('music.mp3',{method:'HEAD'}).then(r=>{
    if(!r.ok)throw new Error('no file');
    const el=new Audio('music.mp3'); el.loop=true; el.volume=Math.min(1,VOL.music*4); el.muted=muted;
    return el.play().then(()=>{ music={el}; });
  }).catch(()=>{ music=startSynth(prefill); });
}
return {init,resume,setMuted,engine,beep,startMusic,get ready(){return !!C;}};
})();
