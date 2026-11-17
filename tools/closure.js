// Plan-view closure of a stage: where does the finish end up relative to the start? Usage: LVL=1 node tools/closure.js index.html
globalThis.SURF_LEVEL=+process.env.LVL||1;
const H=require('../verifier/harness.js').load(process.argv[2]||'index.html');
const G=H(); const R=G.ramps, s=R[0], e=R[R.length-1];
const deg=a=>(a*180/Math.PI).toFixed(0);
console.log('pieces',R.length,'start',[s.sx|0,s.oy|0,s.sz|0],'heading',deg(s.h0),'| end',[e.ex|0,e.ey|0,e.ez|0],'heading',deg(e.h1));
console.log('offset from start: dx',(e.ex-s.sx)|0,'dz',(e.ez-s.sz)|0,'dy',(e.ey-s.oy)|0,'| fin',[G.fin.x|0,G.fin.y|0,G.fin.z|0]);
let minx=1e9,maxx=-1e9,minz=1e9,maxz=-1e9; for(const r of R){for(const [x,z] of [[r.sx,r.sz],[r.ex,r.ez]]){minx=Math.min(minx,x);maxx=Math.max(maxx,x);minz=Math.min(minz,z);maxz=Math.max(maxz,z);}}
console.log('extent x',minx|0,maxx|0,'z',minz|0,maxz|0);
