// Lists rings and whether the good bot hits them, with speed before/after. Usage: LVL=3 node tools/ring-probe.js index.html
globalThis.SURF_LEVEL=+process.env.LVL||1;
const H=require('../verifier/harness.js').load(process.argv[2]||'index.html'), mk=()=>H();
const trial=require('../verifier/bot.js')(mk);
const seen={};
trial(400,{hold:10,onTick:(G)=>{G.rings.forEach((g,i)=>{if(g.hit&&!seen[i]){seen[i]=1;console.log('ring',i,g.kind,'piece',g.ramp,'speed after',Math.hypot(G.vel.x,G.vel.y,G.vel.z)|0);}});}});
mk().rings.forEach((g,i)=>{if(!seen[i])console.log('MISSED ring',i,g.kind,'piece',g.ramp);});
