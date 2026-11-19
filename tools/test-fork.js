// Fork test: fly ballistic arcs from the end of piece a to piece b (the leap that skips the route in between) in the real game. usage: node tools/test-fork.js levels/loft.json 18 22
const fs = require('fs'), path = require('path');
const file = process.argv[2], a = +process.argv[3], b = +process.argv[4];
globalThis.SURF_LEVEL = 'custom'; globalThis.SURF_STAGE = JSON.parse(fs.readFileSync(file, 'utf8'));
const H = require('../verifier/harness.js').load(path.join(__dirname, '..', 'index.html'));
{ const G = H(), ra = G.ramps[a], rb = G.ramps[b]; console.log('launch end', [ra.ex, ra.ey, ra.ez].map(Math.round), 'heading', +ra.h1.toFixed(2), 'target start', [rb.sx, rb.oy, rb.sz].map(Math.round), 'heading', +rb.h0.toFixed(2), 'dist', Math.round(Math.hypot(rb.sx - ra.ex, rb.sz - ra.ez)), 'drop', Math.round(ra.ey - rb.oy)); }
function fly(sp, k, frac) {
  const G = H(); G.setState('run'); G.spawnOn(a);
  const ra = G.ramps[a], rb = G.ramps[b], c = G.ridgeAt(rb, rb.L * frac), ty = rb.oy + rb.H * 0.5 - 0.08 * rb.L * frac;
  G.pos.set(ra.ex, ra.ey + 400, ra.ez); const dx = c[0] - G.pos.x, dz = c[1] - G.pos.z, D = Math.hypot(dx, dz), T = D / sp;
  const vy = (ty - G.pos.y + 0.5 * 800 * T * T) / T + k * 120;
  G.vel.set(dx / D * sp, vy, dz / D * sp); G.setYaw(Math.atan2(-dx, -dz));
  let st; for (let t = 0; t < 6000; t++) { G.step(); st = G.g(); if (st.state !== 'run' || st.lastTouched >= b) break; }
  return st.lastTouched >= b && st.state === 'run';
}
for (const sp of [1800, 2200, 2600, 3000, 3400]) { let ok = 0, n = 0; for (let k = -12; k <= 12; k += 2) for (const f of [0.1, 0.3]) { n++; if (fly(sp, k, f)) ok++; } console.log('speed', sp, 'landed', ok + '/' + n); }

console.log('exact aim (k=0), frac 0.1/0.3/0.5:'); for (const sp of [1800, 2200, 2600, 3000]) console.log(' speed', sp, [0.1, 0.3, 0.5].map(f => fly(sp, 0, f)).join(' '));
