// Shortcut test: fly many ballistic arcs from the end of piece a towards piece b (several pieces ahead, much lower). Compare the real game with a copy whose fall check is switched off:
// any arc that LANDS with the check off must also land with it on (a shortcut must never splat). Usage: LVL=3 node tools/shortcut-test.js index.html
const fs = require('fs'), os = require('os'), path = require('path');
globalThis.SURF_LEVEL = +process.env.LVL || 3;
const file = process.argv[2] || 'index.html', src = fs.readFileSync(file, 'utf8');
const off = path.join(os.tmpdir(), 'surf_nocheck.html'); const patched = src.replace('&& !aboveRampAhead()) fail();', '&& false) fail();');
if (patched === src) throw new Error('fall check line not found'); fs.writeFileSync(off, patched);
const HA = require('../verifier/harness.js').load(file), HB = require('../verifier/harness.js').load(off);
function fly(H, a, b, sp, k) {
  const G = H(); G.setState('run'); G.spawnOn(a);
  const ra = G.ramps[a], rb = G.ramps[b], c = G.ridgeAt(rb, rb.L * 0.5), ty = rb.oy + rb.H * 0.5 - 0.08 * rb.L * 0.5;
  G.pos.set(ra.ex, ra.ey + 400, ra.ez); const dx = c[0] - G.pos.x, dz = c[1] - G.pos.z, D = Math.hypot(dx, dz), T = D / sp;
  const vy = (ty - G.pos.y + 0.5 * 800 * T * T) / T + k * 120;
  G.vel.set(dx / D * sp, vy, dz / D * sp); G.setYaw(Math.atan2(-dx, -dz));
  let st; for (let t = 0; t < 4000; t++) { G.step(); st = G.g(); if (st.state !== 'run' || st.lastTouched >= b) break; }
  return st.lastTouched >= b && st.state === 'run';
}
let landedOff = 0, landedOn = 0, wrong = 0;
for (const [a, b] of [[2, 5], [2, 7], [3, 8], [3, 10], [8, 12], [13, 18], [17, 22], [20, 25]]) for (const sp of [1500, 2000, 2500]) for (let k = -12; k <= 12; k += 2) {
  const o = fly(HB, a, b, sp, k), n = fly(HA, a, b, sp, k);
  if (o) landedOff++; if (n) landedOn++; if (o && !n) { wrong++; console.log('SPLATTED A SHORTCUT: piece', a, '->', b, 'speed', sp, 'vy offset', k * 120); }
}
console.log('arcs that land with the check off:', landedOff, '| with it on:', landedOn, '| shortcuts wrongly splatted:', wrong);
