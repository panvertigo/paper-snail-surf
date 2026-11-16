// Stage report: runs bots over a stage and prints per-piece entry speed, ring hits, falls, time.
// Usage: node tools/stage-report.js [index.html] [stage.js]   (stage.js: module.exports = [ ...stage entries ]; default = built-in level via LVL)
const path = require('path');
const file = process.argv[2] || 'index.html', stageFile = process.argv[3];
if (stageFile) globalThis.SURF_STAGE = require(path.resolve(stageFile));
else globalThis.SURF_LEVEL = +process.env.LVL || 1;
const H = require('../verifier/harness.js').load(file), mk = () => H();
const trial = require('../verifier/bot.js')(mk);
function report(label, opt) {
  const seen = {}, rows = [];
  const r = trial(400, { ...opt, onTick: (G, t) => {
    const s = G.g(), lt = s.lastTouched;
    if (!(lt in seen)) { seen[lt] = 1; rows.push({ piece: lt, t: +t.toFixed(1), speed: Math.round(Math.hypot(G.vel.x, G.vel.y, G.vel.z)), kind: G.ramps[lt].tube ? 'loop' : 'ramp' }); }
  } });
  console.log(label, JSON.stringify(r));
  return rows;
}
const rows = report('good bot (100ms):', { hold: 10 });
console.log('piece  t(s)  speed  kind'); for (const x of rows) console.log(String(x.piece).padStart(4), String(x.t).padStart(6), String(x.speed).padStart(6), ' ', x.kind);
for (const [name, o] of [['300ms bot', { hold: 30 }], ['sloppy 30% lifts, checkpoints', { hold: 20, lift: 0.3, checkpoints: true, seed: 3 }], ['sloppy 50% lifts, checkpoints', { hold: 30, lift: 0.5, checkpoints: true, seed: 5 }]]) { const o2 = trial(400, o); console.log(name + ':', JSON.stringify(o2)); }
