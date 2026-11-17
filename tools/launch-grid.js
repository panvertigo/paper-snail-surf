// Takes the good bot to the end of piece p, then launches it faster (scale f) and crooked (yaw offset), flies it straight with no input and reports landing or splat.
// Usage: LVL=3 node tools/launch-grid.js index.html 6 7
globalThis.SURF_LEVEL = +process.env.LVL || 3;
const file = process.argv[2] || 'index.html', pieces = process.argv.slice(3).map(Number);
const fs = require('fs'), os = require('os'), path = require('path');
const off = path.join(os.tmpdir(), 'surf_nocheck2.html'); fs.writeFileSync(off, fs.readFileSync(file, 'utf8').replace('&& !aboveRampAhead()) fail();', '&& false) fail();'));
const H = require('../verifier/harness.js').load(file), HOFF = require('../verifier/harness.js').load(off), mk = () => H();
const bot = require('../verifier/bot.js')(mk);
function exitState(p) { let snap = null, was = false; // bot state at the moment it leaves piece p
  bot(400, { hold: 10, onTick: (G) => { const s = G.g(); if (snap) return; if (s.lastTouched === p && s.contactN) was = true; if (was && s.lastTouched === p && !s.contactN) snap = { pos: [G.pos.x, G.pos.y, G.pos.z], vel: [G.vel.x, G.vel.y, G.vel.z], yaw: s.yaw, cpRamp: s.cpRamp }; } });
  return snap; }
let total = 0, bad = 0;
for (const p of pieces) { const sn = exitState(p); if (!sn) { console.log('no exit state for', p); continue; }
  for (const f of [1.0, 1.15, 1.3, 1.45]) for (const dy of [-12, -6, 0, 6, 12]) {
    const fly = HH => { const G = HH(); G.setState('run'); G.spawnOn(p); const c = Math.cos(dy * Math.PI / 180), s = Math.sin(dy * Math.PI / 180);
      G.pos.set(...sn.pos); G.vel.set((sn.vel[0] * c + sn.vel[2] * s) * f, sn.vel[1], (-sn.vel[0] * s + sn.vel[2] * c) * f); G.setYaw(sn.yaw);
      let st, t; for (t = 0; t < 6000; t++) { G.step(); st = G.g(); if (st.state !== 'run' || (st.lastTouched > p && st.contactN)) break; } return st; };
    const st = fly(H), st0 = fly(HOFF); total++; const splat = st.state === 'fail'; if (splat) bad++;
    if (splat && st0.state !== 'fail') console.log('WRONG SPLAT (would have landed on piece ' + st0.lastTouched + '): from piece', p, 'speed x' + f, 'yaw', dy + 'deg');
  } }
console.log(bad + ' splats of ' + total + ' launches (wrong ones are listed above; the rest are true misses)');
