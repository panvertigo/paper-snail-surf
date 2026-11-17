// What happens on a jump at different speeds? Launch from the end of piece `a` along its heading at speed v (slope-matched), lateral lane s, and report where it lands or splats.
// Usage: LVL=3 node tools/jump-probe.js index.html 7
globalThis.SURF_LEVEL = +process.env.LVL || 3;
const H = require('../verifier/harness.js').load(process.argv[2] || 'index.html'), a = +process.argv[3];
for (const v of [2200, 2500, 2800, 3100]) { let row = 'v ' + v + ': ';
  for (const lane of [0.15, 0.35, 0.55, 0.75]) {  // fraction of the face half-width from the ridge
    const G = H(); G.setState('run'); G.spawnOn(a); const ra = G.ramps[a], d = [-Math.sin(ra.h1), -Math.cos(ra.h1)], rt = [Math.cos(ra.h1), -Math.sin(ra.h1)];
    const s = ra.side * lane * ra.W;
    G.pos.set(ra.ex + rt[0] * s, ra.ey + ra.H - Math.abs(s) * 1.25 + 30, ra.ez + rt[1] * s); G.vel.set(d[0] * v, -0.08 * v, d[1] * v); G.setYaw(ra.h1);
    let st, t; for (t = 0; t < 5000; t++) { G.step(); st = G.g(); if (st.state !== 'run' || st.lastTouched >= a + 1) break; }
    row += (st.state === 'fail' ? 'SPLAT(lt ' + st.lastTouched + ')' : 'lands on ' + st.lastTouched) + '  ';
  }
  console.log(row);
}
