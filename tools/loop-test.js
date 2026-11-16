// Loop physics check: rides a tube at several radii and entry speeds. Usage: node tools/loop-test.js index.html
const {load}=require('../verifier/harness.js');
const H=load(process.argv[2]||'index.html');
function run(R,v,{phi=1.0,phi2=0.6,turns=1,bank=0,W=500}={}){
  globalThis.SURF_STAGE=[{L:1000},{loop:{R,phi,phi2,turns,bank,W},gap:0,drop:0},{L:3000,gap:600,drop:300}];
  const G=H(); G.setState('run'); G.spawnOn(0);
  const T=G.ramps[1].tube, th0=T.th0;
  // start just before the entry point, on the incoming tangent
  const tx=Math.cos(th0+Math.PI/2)*0, e1=T.e1,e2=T.e2;
  const tan=[-Math.sin(th0)*e1[0]+Math.cos(th0)*e2[0],-Math.sin(th0)*e1[1]+Math.cos(th0)*e2[1],-Math.sin(th0)*e1[2]+Math.cos(th0)*e2[2]];
  const P0=[G.ramps[1].sx,G.ramps[1].oy,G.ramps[1].sz];
  const e0=[T.ox+T.R*(Math.cos(th0)*e1[0]+Math.sin(th0)*e2[0]),T.oy+T.R*(Math.cos(th0)*e1[1]+Math.sin(th0)*e2[1]),T.oz+T.R*(Math.cos(th0)*e1[2]+Math.sin(th0)*e2[2])];
  G.pos.set(e0[0]-tan[0]*80+(-T.ax[0])*0, e0[1]-tan[1]*80+30, e0[2]-tan[2]*80);
  G.vel.set(tan[0]*v,tan[1]*v,tan[2]*v);
  G.setStrafe(0);
  let minV=1e9, maxT=0, contacts=0, t=0, st, prevA=null, cum=0;
  for(;t<2000;t++){ G.step(); st=G.g(); {const qx=G.pos.x-T.ox,qy=G.pos.y-T.oy,qz=G.pos.z-T.oz;const a=qx*e1[0]+qy*e1[1]+qz*e1[2],b=qx*e2[0]+qy*e2[1]+qz*e2[2];const ang=Math.atan2(b,a);if(prevA!==null&&Math.hypot(a,b)>T.R*0.5&&Math.hypot(a,b)<T.R*1.2){let d=ang-prevA;d-=Math.round(d/(2*Math.PI))*2*Math.PI;if(st.contactN)cum+=d;}prevA=ang;} if(st.state!=='run')break; const sp=Math.hypot(G.vel.x,G.vel.y,G.vel.z); minV=Math.min(minV,sp); if(st.contactN)contacts++; if(st.lastTouched>=2) break; if(cum>T.sweep+0.2) break; }
  const X=[G.ramps[1].ex,G.ramps[1].ey,G.ramps[1].ez];
  return {ride:+(cum/T.sweep).toFixed(2), ok:st.lastTouched>=2||st.state==='done', st:st.state, lt:st.lastTouched, ticks:t, minV:minV|0, contacts, end:[G.pos.x|0,G.pos.y|0,G.pos.z|0], exitPt:X.map(Math.round)};
}
for(const R of [900,1200,1500]) for(const v of [2000,2400,2800,3300]){ const r=run(R,v); console.log("R",R,"v",v,"rode",r.ride,"of sweep; minSpeed",r.minV,"state",r.st); }
if (process.env.SWIRL) { console.log('--- swirl: bank/turns variants'); for (const [bank, turns, R] of [[40,2,1600],[55,2,1600],[70,2,1800],[55,3,1600]]) for (const v of [2200, 2800, 3300]) { const r = run(R, v, { bank, turns, phi: 0.45 }); console.log('bank', bank, 'turns', turns, 'R', R, 'v', v, 'rode', r.ride, 'of sweep; minSpeed', r.minV, r.st); } }
