// Map collision for tracks that carry the original game's collision floor (Mountain Run). The map holds invisible
// meshes, all facing up, that mark exactly the surface a kart may drive on (tracks.json "floor" names them). A kart
// is on the road only on that floor. It is stopped by
//  - the steep faces of what stands on or beside the floor (rock, railings, tunnel walls), at kart height, and
//  - walls on the floor's outside edges, measured offline (tracks.json "walls", map units, x1,y1,z1,x2,y2,z2 each):
//    edges where ground or a barrier continues past the road. Edges that drop away (a jump, a cliff over the sea) have
//    none, so a kart can fly off there.
// Everything sits in a grid on the ground plan, so a kart only tests what is near it.
window.GPMapCol=(function(){
'use strict';
const CELL=2;              // grid cell (m)
const STEP=0.22;           // faces lower than this above the wheels are driven over (curbs, seams, boost pads)
const HEIGHTS=[0.3,0.55];  // heights above the wheels where the kart's body is tested against faces (m)
const BAND=[-0.6,0.15];    // an edge wall stops karts from this far below its height to this far above (a kart on a
                           // floor higher than the edge, a step up or a deck beside it, drives past)
const STEEP=0.7;           // a face is a wall when its normal's height is below this (about 45°)
const NEAR_FLOOR=1.0;      // faces whose foot is within this of the floor below them can be hit
const NOT_SOLID=/mini_?map|sky|yuanjing|shui|pobu|shu_/i; // drawn but not hit: minimap, sky, sea, waterfall, trees
const V=(x,y,z)=>new THREE.Vector3(x,y,z);

function makeGrid(){ return {m:new Map(),q:0}; }
const key=(ix,iz)=>ix+','+iz;
function gridAdd(g,item,minX,minZ,maxX,maxZ){
  for(let ix=Math.floor(minX/CELL);ix<=Math.floor(maxX/CELL);ix++)for(let iz=Math.floor(minZ/CELL);iz<=Math.floor(maxZ/CELL);iz++){
    const k=key(ix,iz); let a=g.m.get(k); if(!a)g.m.set(k,a=[]); a.push(item); } }
// items in the cells within r of (x,z), each once
function gridNear(g,x,z,r){ const out=[], q=++g.q;
  for(let ix=Math.floor((x-r)/CELL);ix<=Math.floor((x+r)/CELL);ix++)for(let iz=Math.floor((z-r)/CELL);iz<=Math.floor((z+r)/CELL);iz++){
    const a=g.m.get(key(ix,iz)); if(a)for(const it of a)if(it.q!==q){it.q=q; out.push(it);} }
  return out; }
function eachTri(mesh,fn){ const g=mesh.geometry, p=g.attributes.position, ix=g.index, n=(ix?ix.count:p.count)/3, M=mesh.matrixWorld;
  for(let t=0;t<n;t++){ const v=[0,1,2].map(k=>V().fromBufferAttribute(p,ix?ix.getX(3*t+k):3*t+k).applyMatrix4(M)); fn(v[0],v[1],v[2]); } }
const box=(...v)=>[Math.min(...v.map(p=>p.x)),Math.min(...v.map(p=>p.z)),Math.max(...v.map(p=>p.x)),Math.max(...v.map(p=>p.z))];

// the floor under (x,z) between y-below and y+above (the highest such): {y, src: the floor mesh's name, mesh, n: the
// triangle's normal}, or null
function floorHit(M,x,y,z,above,below){ let best=null;
  for(const t of gridNear(M.floor,x,z,0)){ const h=heightOn(t,x,z); if(h!=null&&h<=y+above&&h>=y-below&&(!best||h>best.y))best={y:h,src:t.src,mesh:t.mesh,n:t.n}; }
  return best; }
function floorAt(M,x,y,z,above,below){ const f=floorHit(M,x,y,z,above,below); return f?f.y:null; }
function heightOn(t,x,z){ const {a,b,c}=t, d=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z); if(Math.abs(d)<1e-9)return null;
  const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/d, v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/d, w=1-u-v, e=-1e-4;
  return u>=e&&v>=e&&w>=e?u*a.y+v*b.y+w*c.y:null; }

function build(T,map,floorMeshes){
  const M={floor:makeGrid(),walls:makeGrid()}, isFloor=new Set(floorMeshes.map(m=>m.name));
  floorMeshes.forEach(m=>eachTri(m,(a,b,c)=>{ const n=V().crossVectors(V().subVectors(b,a),V().subVectors(c,a)).normalize(); if(n.y<0)n.negate();
    gridAdd(M.floor,{a,b,c,n,src:m.name,mesh:m},...box(a,b,c)); }));
  const S=T.scale, w=T.walls||[];
  for(let k=0;k<w.length;k+=6){ const a=V(w[k]*S,w[k+1]*S,w[k+2]*S), b=V(w[k+3]*S,w[k+4]*S,w[k+5]*S); gridAdd(M.walls,{seg:true,a,b},...box(a,b)); }
  let faces=0;
  map.traverse(o=>{ if(!o.isMesh||!o.visible||isFloor.has(o.name)||NOT_SOLID.test(o.name))return;
    eachTri(o,(a,b,c)=>{ const n=V().crossVectors(V().subVectors(b,a),V().subVectors(c,a)); if(n.lengthSq()<1e-12)return; n.normalize();
      if(Math.abs(n.y)>=STEEP)return;
      const lo=Math.min(a.y,b.y,c.y), hi=Math.max(a.y,b.y,c.y), mid=V().add(a).add(b).add(c).divideScalar(3);
      if(![a,b,c,mid].some(p=>floorAt(M,p.x,hi,p.z,0,hi-lo+NEAR_FLOOR)!=null))return; // nowhere near a floor a kart is on
      gridAdd(M.walls,{a,b,c,n},...box(a,b,c)); faces++; }); });
  M.faces=faces; M.edges=w.length/6;
  return M;
}

// closest point on triangle abc to p (Ericson, Real-Time Collision Detection 5.1.5)
const _ab=V(),_ac=V(),_ap=V(),_bp=V(),_cp=V();
function closestOnTri(p,a,b,c,out){
  _ab.subVectors(b,a); _ac.subVectors(c,a); _ap.subVectors(p,a);
  const d1=_ab.dot(_ap), d2=_ac.dot(_ap); if(d1<=0&&d2<=0)return out.copy(a);
  _bp.subVectors(p,b); const d3=_ab.dot(_bp), d4=_ac.dot(_bp); if(d3>=0&&d4<=d3)return out.copy(b);
  const vc=d1*d4-d3*d2; if(vc<=0&&d1>=0&&d3<=0)return out.copy(a).addScaledVector(_ab,d1/(d1-d3));
  _cp.subVectors(p,c); const d5=_ab.dot(_cp), d6=_ac.dot(_cp); if(d6>=0&&d5<=d6)return out.copy(c);
  const vb=d5*d2-d1*d6; if(vb<=0&&d2>=0&&d6<=0)return out.copy(a).addScaledVector(_ac,d2/(d2-d6));
  const va=d3*d6-d5*d4; if(va<=0&&d4-d3>=0&&d5-d6>=0)return out.copy(b).addScaledVector(V().subVectors(c,b),(d4-d3)/((d4-d3)+(d5-d6)));
  const den=1/(va+vb+vc); return out.copy(a).addScaledVector(_ab,vb*den).addScaledVector(_ac,vc*den);
}
// where segment pq passes through triangle abc (as the fraction along pq), or null
function crossTri(p,q,t){ const d=V().subVectors(q,p), e1=V().subVectors(t.b,t.a), e2=V().subVectors(t.c,t.a), h=V().crossVectors(d,e2), det=e1.dot(h);
  if(Math.abs(det)<1e-9)return null; const s=V().subVectors(p,t.a), u=s.dot(h)/det; if(u<0||u>1)return null;
  const qq=V().crossVectors(s,e1), v=d.dot(qq)/det; if(v<0||u+v>1)return null; const f=e2.dot(qq)/det; return f>=0&&f<=1?f:null; }

// The deepest contact between a kart and the map: {e: the kart's point that touches, nrm: unit direction from the kart
// toward what it hit (level), pen: overlap (m)}, or null. centres: the kart's capsule ends; prev: its position a step ago.
const _q=V(),_s=V(),_v=V();
function contact(M,pos,prev,up,centres,rad){
  let best=null; const take=(pen,e,nrm)=>{ if(pen>0&&(!best||pen>best.pen))best={pen,e:e.clone(),nrm:nrm.clone()}; };
  const near=gridNear(M.walls,pos.x,pos.z,rad+0.6);
  for(const c of centres)for(const h of HEIGHTS){ _s.copy(c).addScaledVector(up,h);
    for(const it of near){
      if(it.seg){ const dy=pos.y-(it.a.y+it.b.y)/2; if(dy<BAND[0]||dy>BAND[1])continue;
        const ex=it.b.x-it.a.x, ez=it.b.z-it.a.z, L2=ex*ex+ez*ez, t=L2>0?Math.max(0,Math.min(1,((_s.x-it.a.x)*ex+(_s.z-it.a.z)*ez)/L2)):0;
        _v.set(it.a.x+ex*t-_s.x,0,it.a.z+ez*t-_s.z); const d=_v.length(); if(d<1e-6||d>=rad)continue; take(rad-d,c,_v.divideScalar(d)); continue; }
      closestOnTri(_s,it.a,it.b,it.c,_q); if(_v.subVectors(_q,pos).dot(up)<STEP)continue; // low enough to drive over
      _v.subVectors(_q,_s); const d=_v.length(); if(d>=rad)continue; _v.addScaledVector(up,-_v.dot(up)); const l=_v.length(); if(l<1e-6)continue;
      take(rad-d,c,_v.divideScalar(l)); } }
  if(best)return best;
  // a fast kart can pass a thin face or an edge wall in one step: the path of its middle at body height
  const p=_s.copy(prev).addScaledVector(up,0.45), q=V().copy(pos).addScaledVector(up,0.45);
  for(const it of near){
    if(it.seg){ const dy=pos.y-(it.a.y+it.b.y)/2; if(dy<BAND[0]||dy>BAND[1])continue;
      const r=V(q.x-p.x,0,q.z-p.z), sg=V(it.b.x-it.a.x,0,it.b.z-it.a.z), den=r.x*sg.z-r.z*sg.x; if(Math.abs(den)<1e-9)continue;
      const wx=it.a.x-p.x, wz=it.a.z-p.z, f=(wx*sg.z-wz*sg.x)/den, g=(wx*r.z-wz*r.x)/den; if(f<0||f>1||g<0||g>1)continue;
      const n=V(-sg.z,0,sg.x).normalize(); if(n.dot(r)<0)n.negate(); take(r.dot(n)*(1-f)+rad,pos,n); continue; }
    const f=crossTri(p,q,it); if(f==null)continue; if(V().copy(p).lerp(q,f).sub(pos).dot(up)<STEP)continue;
    const n=it.n.clone().addScaledVector(up,-it.n.dot(up)).normalize(), r=V().subVectors(q,p); if(n.dot(r)<0)n.negate();
    take(r.dot(n)*(1-f)+rad,pos,n); }
  return best;
}
return {build,floorAt,floorHit,contact};
})();
