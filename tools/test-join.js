// Do blocks joined end to end (gap 0, drop 0, same width, no zigzag) ride like one continuous ramp? Logs the speed just before and after each seam and any airborne ticks.
const path = require('path');
const stages = {
  'straights joined': [{ L: 3000, W: 600 }, { L: 3000, gap: 0, drop: 0 }, { L: 3000, gap: 0, drop: 0 }, { L: 3000, gap: 480 }, { L: 3000 }],
  'straight + arc + straight joined': [{ L: 3000, W: 600 }, { turn: 40, R: 7000, gap: 0, drop: 0 }, { L: 3000, gap: 0, drop: 0 }, { L: 3000, gap: 480 }, { L: 3000 }],
  'arc + arc same way joined': [{ L: 3000, W: 600 }, { turn: 30, R: 7000, gap: 0, drop: 0 }, { turn: 30, R: 7000, gap: 0, drop: 0 }, { L: 3000, gap: 480 }, { L: 3000 }],
  'joined with a climb': [{ L: 3000, W: 600 }, { L: 3000, C: 600, gap: 0, drop: 0 }, { L: 3000, gap: 0, drop: 0 }, { L: 3000, gap: 480 }, { L: 3000 }],
};
for (const [name, pieces] of Object.entries(stages)) {
  globalThis.SURF_LEVEL = 'custom'; globalThis.SURF_STAGE = { name, scenery: 'plain', theme0: 0, pieces };
  Object.keys(require.cache).forEach(k => { if (/harness|map-bot/.test(k)) delete require.cache[k]; });
  const H = require('../verifier/harness.js').load(path.join(__dirname, '..', 'index.html')); const trial = require('./map-bot.js')(() => H());
  let last = 0, prevSp = 0, seams = [], airSeam = 0, tk = 0;
  const r = trial(400, { hold: 10, checkpoints: true, onTick: (G) => { const st = G.g(), sp = Math.hypot(G.vel.x, G.vel.y, G.vel.z); tk++;
    if (st.lastTouched !== last && st.lastTouched < 3) { seams.push([last + '->' + st.lastTouched, Math.round(prevSp), Math.round(sp), !st.contactN]); last = st.lastTouched; } prevSp = sp; } });
  console.log(name + ': ' + r.res + ' ' + r.t + ' s, falls ' + r.falls + ' | seams (from->to, speed before, after, airborne): ' + seams.map(s => s.join(' ')).join(' ; '));
}
