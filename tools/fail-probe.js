// Where does a loop run end in 'fail'? Usage: node tools/fail-probe.js index.html
const {load}=require('../verifier/harness.js');
const H=load(process.argv[2]||'index.html');
for(const [R,v] of [[1200,2800],[1500,3300],[1500,2000]]){
  globalThis.SURF_STAGE=[{L:1000},{loop:{R,phi:1.0,phi2:0.6,turns:1,bank:0,W:500},gap:0,drop:0},{L:3000,gap:600,drop:300}];
  const G=H(); G.setState('run'); G.spawnOn(0);
  const T=G.ramps[1].tube, e1=T.e1,e2=T.e2, th0=T.th0;
  const tan=[-Math.sin(th0)*e1[0]+Math.cos(th0)*e2[0],-Math.sin(th0)*e1[1]+Math.cos(th0)*e2[1],-Math.sin(th0)*e1[2]+Math.cos(th0)*e2[2]];
  const e0=[0,1,2].map(k=>[T.ox,T.oy,T.oz][k]+T.R*(Math.cos(th0)*e1[k]+Math.sin(th0)*e2[k]));
  G.pos.set(e0[0]-tan[0]*80,e0[1]-tan[1]*80+30,e0[2]-tan[2]*80); G.vel.set(tan[0]*v,tan[1]*v,tan[2]*v); G.setStrafe(0);
  let last=null,t;
  for(t=0;t<4000;t++){G.step();const st=G.g();if(st.state!=='run'){last=st;break;}}
  console.log(R,v,'end',last&&last.state,'t',t,'lt',last&&last.lastTouched,'y',G.pos.y|0,'ramps y',G.ramps.map(r=>[r.oy|0,r.ey|0].join('/')).join(' '),'speed',Math.hypot(G.vel.x,G.vel.y,G.vel.z)|0);
}
