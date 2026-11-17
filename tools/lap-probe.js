// Shows how each lap ends (ring vs pad landing). Usage: LVL=3 node tools/lap-probe.js index.html
globalThis.SURF_LEVEL=+process.env.LVL||1;
const H=require('../verifier/harness.js').load(process.argv[2]||'index.html'), mk=()=>H();
const trial=require('../verifier/bot.js')(mk);
let lap=0;
const r=trial(400,{hold:10,onTick:(G,t)=>{const s=G.g();if(s.lap!==lap){lap=s.lap;console.log('lift at t',t.toFixed(1),'lap now',lap,'y',G.pos.y|0,'speed',Math.hypot(G.vel.x,G.vel.z)|0, 'lastRing', G.rings.filter(g=>g.kind==='lift').map(g=>g.hit)); }}});
console.log(JSON.stringify(r));
