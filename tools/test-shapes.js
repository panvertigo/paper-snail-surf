// Builds extreme shapes the editor can now make (massive sweeps, 30000-long ramps, steep down ramps, tight and huge turns) and checks the game builds and the bot rides them.
// usage: node tools/test-shapes.js
const path = require('path');
const shapes = {
  'massive 180 deg sweep R 50000': [{ L: 8000, W: 600 }, { turn: 90, R: 50000, zig: true }, { turn: 90, R: 50000 }, { L: 8000 }, { L: 4000 }],
  'huge straight 30000, steep down -4000': [{ L: 4000 }, { L: 30000, C: -4000 }, { L: 8000, C: 2000 }, { L: 5000 }],
  'S-bend of big arcs': [{ L: 6000 }, { turn: 60, R: 20000, zig: true }, { turn: 60, R: 20000 }, { turn: 60, R: 20000, zig: true }, { L: 6000, C: 1500 }, { L: 4000 }],
  'tight zipper R 2500': [{ L: 3000 }, ...Array.from({ length: 6 }, () => ({ turn: 30, R: 2500, zig: true })), { L: 3500 }],
  'full 360 sweep R 30000': [{ L: 6000, C: -1000 }, { turn: 120, R: 30000 }, { turn: 120, R: 30000 }, { turn: 120, R: 30000 }, { L: 6000, C: 1500 }, { L: 4000 }],
  'narrow 250 + wide 1300': [{ L: 3000, W: 1300 }, { L: 3000, W: 1300, zig: true }, { L: 3000, W: 250, zig: true }, { L: 3000, W: 250, zig: true }, { L: 3000, W: 700 }],
};
const fs = require('fs'); let ok = 0;
for (const [name, pieces] of Object.entries(shapes)) {
  globalThis.SURF_LEVEL = 'custom'; globalThis.SURF_STAGE = { name, scenery: 'plain', theme0: 0, pieces };
  try {
    const H = require('../verifier/harness.js').load(path.join(__dirname, '..', 'index.html')); const trial = require('./map-bot.js')(() => H());
    const r = trial(400, { hold: 10, checkpoints: true }); console.log((r.res === 'done' ? 'OK  ' : 'FAIL') + ' ' + name + ' : ' + r.res + ' ' + r.t + ' s, falls ' + r.falls + ', vmax ' + r.vmax); if (r.res === 'done') ok++;
  } catch (e) { console.log('ERR  ' + name + ' : ' + e.message); }
  Object.keys(require.cache).forEach(k => { if (/harness|map-bot/.test(k)) delete require.cache[k]; });
}
console.log(ok + '/' + Object.keys(shapes).length + ' shapes ridden to the finish');
