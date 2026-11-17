// Suggests two risk hoops per big flight, one outside and one inside the good bot's line (reachable by choosing where you leave the ramp).
// Usage: LVL=3 node tools/risk-rings.js index.html 1 3 8 ...   prints rows for STAGE_META.riskRings
globalThis.SURF_LEVEL = +process.env.LVL || 1;
const H = require('../verifier/harness.js').load(process.argv[2] || 'index.html'), mk = () => H();
const trial = require('../verifier/bot.js')(mk);
const OFF = +(process.env.OFF ?? 260);
const want = new Set(process.argv.slice(3).map(Number)), rec = {};
trial(400, { hold: 10, onTick: (G) => { const s = G.g(), lt = s.lastTouched; if (!want.has(lt + 1) || s.contactN) return;
  const pe = G.ramps[lt], dir = [-Math.sin(pe.h1), -Math.cos(pe.h1)], rt = [Math.cos(pe.h1), -Math.sin(pe.h1)], dx = G.pos.x - pe.ex, dz = G.pos.z - pe.ez;
  const d = dx * dir[0] + dz * dir[1]; if (d < 300) return; (rec[lt + 1] = rec[lt + 1] || []).push([d, dx * rt[0] + dz * rt[1], G.pos.y - pe.ey]); } });
const rows = [];
for (const k of Object.keys(rec).map(Number)) { const a = rec[k], n = a.length; for (const [f, off] of [[0.35, 1], [0.7, -1]]) { const [d, s, y] = a[Math.floor(f * n)], sg = Math.sign(s) || 1;
  rows.push(`{ piece: ${k}, d: ${Math.round(d / 10) * 10}, s: ${Math.round((s + off * sg * OFF) / 10) * 10}, y: ${Math.round(y / 10) * 10}, R: 190, boost: 260 }`); } }
console.log(rows.join(',\n'));
