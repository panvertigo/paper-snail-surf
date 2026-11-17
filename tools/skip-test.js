// Skipping ahead: drop a rider onto piece k while the last piece touched is much earlier. It must land (lastTouched becomes k) and never splat.
const lvl = +process.env.LVL || 1; globalThis.SURF_LEVEL = lvl;
const H = require('../verifier/harness.js').load(process.argv[2] || 'index.html');
for (const gap of [2, 4, 6, 8]) {
  const G = H(); G.setState('run'); G.spawnOn(2);
  const r = G.ramps[2 + gap], c = G.ridgeAt(r, 400), rt = G.rightOf(r.h0);
  G.pos.set(c[0] + rt[0] * r.side * 0.4 * r.W, r.oy - 0.08 * 400 + r.H * 0.9 + 500, c[1]); G.vel.set(0, -300, 0);
  let st; for (let t = 0; t < 600; t++) { G.step(); st = G.g(); if (st.state !== 'run' || st.lastTouched === 2 + gap) break; }
  console.log('skip', gap, 'pieces: state', st.state, 'lastTouched', st.lastTouched, '(want', 2 + gap + ')');
}
