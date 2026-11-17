// Where does the good bot fly between pieces? Prints d (ahead of the previous piece's end), s (right of it) and y (above its end) so rings can be placed on real lines.
// Usage: LVL=1 node tools/flight-path.js index.html [piece ...]
globalThis.SURF_LEVEL = +process.env.LVL || 1;
const H = require('../verifier/harness.js').load(process.argv[2] || 'index.html'), mk = () => H();
const trial = require('../verifier/bot.js')(mk);
const want = new Set(process.argv.slice(3).map(Number)); const rec = {};
trial(400, { hold: 10, onTick: (G, t) => {
  const s = G.g(), lt = s.lastTouched; if (!want.has(lt + 1) || s.contactN) return;
  const pe = G.ramps[lt], dir = [-Math.sin(pe.h1), -Math.cos(pe.h1)], rt = [Math.cos(pe.h1), -Math.sin(pe.h1)];
  const dx = G.pos.x - pe.ex, dz = G.pos.z - pe.ez, d = dx * dir[0] + dz * dir[1], sv = dx * rt[0] + dz * rt[1];
  (rec[lt + 1] = rec[lt + 1] || []).push([d | 0, sv | 0, (G.pos.y - pe.ey) | 0, Math.hypot(G.vel.x, G.vel.z) | 0]);
} });
for (const k of Object.keys(rec)) { const a = rec[k]; console.log('piece', k, 'prev.side', 'samples', a.length); for (let i = 0; i < a.length; i += Math.max(1, Math.floor(a.length / 9))) console.log('  d', a[i][0], 's', a[i][1], 'y', a[i][2], 'v', a[i][3]); }
