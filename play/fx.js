// Drift smoke: soft puffs from the rear wheels while a kart drifts. White at first, blue once the drift has charged a
// level-1 boost, orange at level 2 (the same colours as the drift gauge). One shared pool of sprites, reused.
window.GPFx=(function(){
'use strict';
const POOL=160, LIFE=0.55, RATE=36; // sprites in the pool, seconds a puff lives, puffs per second per wheel
const COLORS=[0xf4f0ff,0x3fe3ea,0xffcb47];
let pool=[], next=0, scene=null, tex=null;

function puffTexture(){
  const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d');
  const grd=g.createRadialGradient(32,32,2,32,32,30); grd.addColorStop(0,'rgba(255,255,255,0.9)'); grd.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=grd; g.fillRect(0,0,64,64); const t=new THREE.CanvasTexture(c); return t;
}
function init(raceScene){
  scene=raceScene; if(!tex)tex=puffTexture();
  pool.forEach(p=>scene.remove(p.s)); pool=[];
  for(let i=0;i<POOL;i++){ const m=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,opacity:0});
    const s=new THREE.Sprite(m); s.visible=false; scene.add(s); pool.push({s,life:0,vx:0,vy:0,vz:0,size:0}); }
}
// kart: {pos, body, fwd, up (unit vectors), speed, hull, drifting, level}; dt: frame time
function emit(k,dt){
  if(!scene||!k.drifting)return;
  if(Math.random()>=RATE*dt)return;
  const h=k.hull, right=new THREE.Vector3().crossVectors(k.up,k.body), back=h.cz-h.half-h.rad*0.4, side=h.rad*0.8;
  for(const sg of [-1,1]){ const p=pool[next]; next=(next+1)%POOL;
    p.s.position.copy(k.pos).addScaledVector(k.body,back).addScaledVector(right,side*sg).addScaledVector(k.up,h.rad*0.25);
    const rise=0.5+Math.random()*0.4, jx=(Math.random()-0.5)*0.4, jz=(Math.random()-0.5)*0.4;
    p.vx=-k.fwd.x*k.speed*0.15+k.up.x*rise+jx; p.vy=-k.fwd.y*k.speed*0.15+k.up.y*rise; p.vz=-k.fwd.z*k.speed*0.15+k.up.z*rise+jz;
    p.life=LIFE; p.size=h.rad*0.9; p.s.material.color.setHex(COLORS[k.level]); p.s.visible=true; }
}
function update(dt){
  for(const p of pool){ if(p.life<=0)continue; p.life-=dt;
    if(p.life<=0){ p.s.visible=false; continue; }
    const a=p.life/LIFE; p.s.position.x+=p.vx*dt; p.s.position.y+=p.vy*dt; p.s.position.z+=p.vz*dt;
    p.s.scale.setScalar(p.size*(1.8-a)); p.s.material.opacity=0.55*a; }
}
return {init,emit,update};
})();
