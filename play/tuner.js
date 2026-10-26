// Tuning panel: sliders for the camera, starting grid, kart size and collision physics.
// Debug page only (tune.html / index.html?tune). Opens with the T key or the "Tune" button. Changes apply live and are saved in this browser;
// "Copy settings" gives a JSON block that can be pasted back into the code as new defaults.
(function(){
'use strict';
const gp=window.__gp; if(!gp||!gp.tune)return;
const {CAM,PHYS,GRID,KART,TUNE,DRIFT,SPEED}=gp.tune;
const STORE_KEY='gp-tune-v1';
const GROUPS={CAM,PHYS,GRID,KART,DRIFT,SPEED};

// [group, key, label, min, max, step, hint]
const SECTIONS=[
  ['Camera',[
    ['CAM','back','Distance behind',0.6,8,0.05,'m'],
    ['CAM','up','Height',0.1,4,0.05,'m'],
    ['CAM','lookAhead','Look-ahead',0,10,0.1,'m'],
    ['CAM','lookUp','Aim height',0,2,0.05,'m'],
    ['CAM','fov','Field of view',35,110,1,'°'],
    ['CAM','fovBoost','Extra FOV at speed',0,35,1,'°'],
    ['CAM','yawRate','Turn follow (low = more swing)',1,25,0.5,''],
    ['CAM','posRate','Tilt follow (with the road)',1,30,0.5,''],
    ['CAM','driftLook','Show drift angle',0,1,0.05,''],
  ]],
  ['Speed',[
    ['SPEED','player','Your speed (real; speedometer unchanged)',0.1,1.5,0.05,'×'],
    ['SPEED','ai','Opponents\' speed',0.1,1.5,0.05,'×'],
  ]],
  ['Drift',[
    ['DRIFT','auto','Auto drift (no key)',0,1,1,'onoff'],
    ['DRIFT','turn','Drift turn rate',0.3,3,0.05,'rad/s'],
    ['DRIFT','steer','Steering in drift',0,2.5,0.05,'rad/s'],
    ['DRIFT','angle','Slide angle',0.1,1.2,0.05,'rad'],
    ['DRIFT','angleSteer','Slide angle from steering',0,0.6,0.05,'rad'],
    ['DRIFT','swing','How fast the body swings out',2,25,0.5,'/s'],
    ['DRIFT','drag','Speed lost while drifting',0,5,0.1,'m/s²'],
    ['DRIFT','minSpeed','Min speed to drift',0,8,0.5,'m/s'],
    ['DRIFT','chargeTime','Time to charge boost',0.2,2,0.05,'s'],
    ['DRIFT','boostPower','Boost strength',0,0.8,0.05,'×'],
    ['DRIFT','boostTime','Boost length',0.2,2.5,0.05,'s'],
    ['DRIFT','aiCurve','AI drifts on corners sharper than',0.2,1.5,0.05,'rad'],
  ]],
  ['Starting grid',[
    ['GRID','playerSlot','Your slot',0,3,1,'slot'],
    ['GRID','front','Front row behind line',0,12,0.1,'m'],
    ['GRID','rowGap','Gap between rows',0.5,10,0.1,'m'],
    ['GRID','sideFrac','Sideways spread',0,0.9,0.01,'× half-width'],
  ]],
  ['Kart',[
    ['KART','scale','Kart size',0.3,1.6,0.025,'×'],
  ]],
  ['Kart-to-kart collisions',[
    ['PHYS','restitution','Bounciness',0,1,0.05,''],
    ['PHYS','friction','Side-swipe friction',0,1,0.05,''],
    ['PHYS','spinInertia','Spin resistance',1,30,0.5,''],
    ['PHYS','maxYaw','Max spin',0,8,0.1,'rad/s'],
    ['PHYS','knockGrip','Knock-back grip',0.5,12,0.25,'/s'],
  ]],
  ['Walls',[
    ['PHYS','wallAt','Wall position',0.6,1.5,0.01,'× half-width'],
    ['PHYS','wallRestitution','Wall bounciness',0,1,0.05,''],
    ['PHYS','wallFriction','Wall scrape',0,1,0.05,''],
    ['PHYS','wallAlign','Slide along wall',0,25,0.5,'/s'],
  ]],
];
const SLOT_NAMES=['Front left','Front right','Back left','Back right'];
const FIELDS=SECTIONS.flatMap(([,f])=>f);
const DEFAULTS=Object.fromEntries(FIELDS.map(([g,k])=>[g+'.'+k,GROUPS[g][k]]));

const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
function snapshot(){ return Object.fromEntries(FIELDS.map(([g,k])=>[g+'.'+k,GROUPS[g][k]])); }
function save(){ try{ localStorage.setItem(STORE_KEY,JSON.stringify(snapshot())); }catch(e){ /* storage blocked: settings last until reload */ } }
function load(){
  let saved=null; try{ saved=JSON.parse(localStorage.getItem(STORE_KEY)||'null'); }catch(e){ saved=null; }
  if(!saved||typeof saved!=='object')return;
  FIELDS.forEach(([g,k,,lo,hi])=>{ const v=Number(saved[g+'.'+k]); if(Number.isFinite(v))GROUPS[g][k]=clamp(v,lo,hi); });
}

// side effects a change needs beyond writing the value
function afterChange(g,k){
  if(g==='GRID'&&gp.tune.inRace&&!gp.tune.regrid()) note('Grid changes apply from the next start. Use Restart race.');
  if(g==='KART')gp.tune.applyKartScale();
  if(g==='CAM'&&k!=='yawRate'&&k!=='posRate'&&gp.tune.inRace)gp.tune.snapCamera();
}

const css=`
#tunerBtn{position:fixed;left:max(16px,env(safe-area-inset-left,0px));bottom:max(16px,env(safe-area-inset-bottom,0px));z-index:40;
  font:800 15px/1 var(--display);color:var(--ink);background:rgba(23,11,38,.82);border:2px solid var(--violet-2);border-radius:12px;padding:9px 12px 6px;cursor:pointer}
#tunerBtn:hover{border-color:var(--lime)}
#tuner{position:fixed;z-index:41;top:max(16px,env(safe-area-inset-top,0px));right:max(16px,env(safe-area-inset-right,0px));
  box-sizing:border-box;width:min(340px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;background:rgba(38,20,61,.96);
  border:3px solid var(--violet-2);border-radius:18px;padding:14px 14px 16px;display:grid;gap:12px;font-size:14px;color:var(--ink)}
#tuner[hidden]{display:none}
#tuner header{display:flex;align-items:center;justify-content:space-between;gap:8px}
#tuner h2{font:800 22px/1 var(--display)}
#tuner h3{font:800 15px/1 var(--display);color:var(--lime);margin:4px 0 0}
#tuner .row{display:grid;grid-template-columns:1fr auto;gap:2px 8px;align-items:center}
#tuner .row label{color:var(--muted)}
#tuner .row output{font:700 13px/1 var(--body);font-variant-numeric:tabular-nums;color:var(--ink)}
#tuner .row input{grid-column:1/-1;width:100%;accent-color:var(--lime)}
#tuner .btns{display:flex;flex-wrap:wrap;gap:8px}
#tuner button.t{font:800 14px/1 var(--display);color:var(--ink);background:var(--panel-2);border:2px solid var(--violet-2);border-radius:10px;padding:8px 10px 5px;cursor:pointer}
#tuner button.t.go{background:var(--lime);color:var(--night);border-color:var(--night)}
#tuner .note{color:var(--muted);margin:0;min-height:1.2em}
#tuner textarea{box-sizing:border-box;width:100%;height:120px;background:var(--night);color:var(--ink);border:2px solid var(--violet-2);border-radius:10px;font:12px/1.4 ui-monospace,Menlo,monospace}
`;
const style=document.createElement('style'); style.textContent=css; document.head.appendChild(style);

const btn=document.createElement('button'); btn.id='tunerBtn'; btn.type='button'; btn.textContent='Tune (T)';
btn.setAttribute('aria-controls','tuner'); btn.setAttribute('aria-expanded','false');
const panel=document.createElement('section'); panel.id='tuner'; panel.hidden=true; panel.setAttribute('aria-label','Tuning panel');
document.body.append(btn,panel);

function fmt(g,k,v,unit,step){
  if(g==='GRID'&&k==='playerSlot')return SLOT_NAMES[v];
  if(unit==='onoff')return v?'On':'Off';
  const dec=(String(step).split('.')[1]||'').length; return (+v).toFixed(dec)+(unit?' '+unit:'');
}
let noteEl=null, noteT=0;
function note(msg){ if(!noteEl)return; noteEl.textContent=msg; clearTimeout(noteT); noteT=setTimeout(()=>{noteEl.textContent='';},4000); }

function render(){
  panel.innerHTML='';
  const head=document.createElement('header');
  head.innerHTML='<h2>Tuning</h2>';
  const close=document.createElement('button'); close.type='button'; close.className='t'; close.textContent='Close'; close.onclick=()=>toggle(false);
  head.appendChild(close); panel.appendChild(head);
  const hint=document.createElement('p'); hint.className='note';
  hint.textContent='The countdown waits while this is open, so you can set the grid before GO.'; panel.appendChild(hint);
  SECTIONS.forEach(([title,fields])=>{
    const h=document.createElement('h3'); h.textContent=title; panel.appendChild(h);
    fields.forEach(([g,k,label,lo,hi,step,unit])=>{
      const id='tn-'+g+'-'+k, row=document.createElement('div'); row.className='row';
      const lab=document.createElement('label'); lab.htmlFor=id; lab.textContent=label;
      const out=document.createElement('output'); out.htmlFor=id; out.textContent=fmt(g,k,GROUPS[g][k],unit,step);
      const inp=document.createElement('input'); inp.type='range'; inp.id=id; inp.min=lo; inp.max=hi; inp.step=step; inp.value=GROUPS[g][k];
      inp.oninput=()=>{ const v=clamp(Number(inp.value),lo,hi); if(!Number.isFinite(v))return;
        GROUPS[g][k]=v; out.textContent=fmt(g,k,v,unit,step); afterChange(g,k); save(); };
      row.append(lab,out,inp); panel.appendChild(row);
    });
  });
  const btns=document.createElement('div'); btns.className='btns';
  const mk=(txt,fn,cls)=>{ const b=document.createElement('button'); b.type='button'; b.className='t'+(cls?' '+cls:''); b.textContent=txt; b.onclick=fn; btns.appendChild(b); };
  mk('Restart race',()=>{ if(!gp.tune.inRace){note('Start a race first.');return;} gp.tune.restart(); },'go');
  mk('Reset to defaults',()=>{ FIELDS.forEach(([g,k])=>{GROUPS[g][k]=DEFAULTS[g+'.'+k];}); FIELDS.forEach(([g,k])=>afterChange(g,k)); save(); render(); note('Defaults restored.'); });
  mk('Copy settings',copySettings);
  panel.appendChild(btns);
  noteEl=document.createElement('p'); noteEl.className='note'; noteEl.setAttribute('role','status'); panel.appendChild(noteEl);
}
function copySettings(){
  const json=JSON.stringify({CAM:pick('CAM'),SPEED:pick('SPEED'),DRIFT:pick('DRIFT'),GRID:pick('GRID'),KART:pick('KART'),PHYS:pick('PHYS')},null,1);
  const fallback=()=>{ let ta=panel.querySelector('textarea'); if(!ta){ ta=document.createElement('textarea'); ta.readOnly=true; panel.appendChild(ta); }
    ta.value=json; ta.focus(); ta.select(); note('Select all and copy the text below.'); };
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(json).then(()=>note('Copied. Paste it to Claude to make these the defaults.'),fallback);
  else fallback();
}
function pick(g){ return Object.fromEntries(FIELDS.filter(f=>f[0]===g).map(([,k])=>[k,GROUPS[g][k]])); }

function toggle(open){
  const on=open==null?panel.hidden:open;
  panel.hidden=!on; TUNE.hold=on; btn.setAttribute('aria-expanded',String(on));
  if(on){ render(); const first=panel.querySelector('input'); if(first)first.focus(); } else btn.focus();
}
btn.onclick=()=>toggle();
addEventListener('keydown',e=>{
  if(e.code!=='KeyT'||e.repeat)return;
  const t=e.target; if(t&&(t.tagName==='INPUT'&&t.type!=='range'||t.tagName==='TEXTAREA'))return;
  toggle();
});
load();
})();
