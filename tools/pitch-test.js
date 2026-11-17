// Lean (cmd.pitch): in free flight it must conserve energy (speed^2 + 2 g y) and change range: nose up flies farther, nose down shorter.
globalThis.SURF_LEVEL = 1;
const H = require('../verifier/harness.js').load(process.argv[2] || 'index.html');
for (const [vh, vy] of [[3000, 0], [3000, -1500], [1500, 800]]) {
  const row = [];
  for (const p of [-1, -0.5, 0, 0.5, 1]) {
    const G = H(); G.setState('run'); G.pos.set(0, 1e5, 0); G.vel.set(0, vy, -vh); G.cmd.pitch = p;
    const e0 = G.vel.x ** 2 + G.vel.y ** 2 + G.vel.z ** 2 + 2 * 800 * G.pos.y;
    let t = 0; for (; t < 3000 && G.pos.y > 8e4; t++) G.step();
    const e1 = G.vel.x ** 2 + G.vel.y ** 2 + G.vel.z ** 2 + 2 * 800 * G.pos.y;
    row.push('p' + p + ': range ' + Math.round(-G.pos.z) + ' t ' + (t / 100).toFixed(1) + 's dE ' + ((e1 - e0) / e0 * 100).toFixed(2) + '%');
  }
  console.log('vh', vh, 'vy', vy, '\n  ' + row.join('\n  '));
}
