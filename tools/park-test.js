// Free skate sanity: scripted rider carves around the bowl for 90 s. Reports speed, height, air time, falls. Usage: node tools/park-test.js index.html
globalThis.SURF_LEVEL = 4;
const H = require('../verifier/harness.js').load(process.argv[2] || 'index.html');
function run(label, turnPer, finger, T = 90) {
  const G = H(); G.setState('run'); G.spawnOn(0);
  let air = 0, vmax = 0, hmax = -1e9, vmin = 1e9, fails = 0, n = 0, speedSum = 0;
  for (let t = 0; t < T * 100; t++) {
    G.cmd.turn = typeof turnPer === 'function' ? turnPer(t) : turnPer; G.cmd.touch = finger ? 1 : 0;
    G.step(); const s = G.g(); if (s.state === 'fail') { fails++; G.setState('run'); G.spawnOn(0); }
    const sp = Math.hypot(G.vel.x, G.vel.y, G.vel.z); vmax = Math.max(vmax, sp); if (t > 1500) vmin = Math.min(vmin, sp); hmax = Math.max(hmax, G.pos.y); speedSum += sp; n++;
    if (!s.contactN) air++;
  }
  console.log(label.padEnd(28), 'avg', (speedSum / n) | 0, 'max', vmax | 0, 'min(after 15s)', vmin | 0, 'peak y', hmax | 0, 'air', ((air / n) * 100) | 0 + '%', 'falls', fails, 'end y', G.pos.y | 0);
}
run('hands off', 0, false);
run('steady left carve', 0.004, false);
run('steady right carve', -0.004, false);
run('weave', t => 0.01 * Math.sin(t / 150), false);
run('weave + finger', t => 0.01 * Math.sin(t / 150), true);
