// Map acceptance report (specs in levels/*.md). usage:
//   node tools/map-report.js levels/kitchen.json [--period 2.667] [--skip 20-26] [--trap 30,31] [--noair] [--slow-from 30 --slow-to 34] [--tune N]
// Runs the good bot (100 ms), a 300 ms bot and 30 sloppy bots, and reports: total time and per-section splits (checkpoint to checkpoint), falls, finish rates,
// ramp cadence (share of ramps whose start-to-start period is within +/-15% of --period), air share, per-arc entry speed p90 against the turn limit sqrt(1000 R),
// and (with --noair / --slow-from) the no-air-control bot and a slow-line bot (rides near the ridge) on those ramps.
// --tune N: N rounds of resizing ramp lengths so the good bot's ramp period matches --period (writes the file back; skip ramps with --skip).
const fs = require('fs'), path = require('path');
const file = process.argv[2], arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const PERIOD = +arg('period', 0), SKIP = String(arg('skip', '')).split(',').filter(Boolean).map(x => x.split('-').map(Number)), TRAP = String(arg('trap', '')).split(',').filter(Boolean).map(Number), TUNE = +arg('tune', 0);
const SPD = String(arg('speed', '')).split('-').map(Number), CMAX = +arg('cmax', 300), RMAX = +arg('rmax', 0);
const isSkip = i => SKIP.some(([a, b]) => i >= a && i <= (b ?? a));
let stage = JSON.parse(fs.readFileSync(file, 'utf8'));
globalThis.SURF_LEVEL = 'custom';
function load() { globalThis.SURF_STAGE = stage; const H = require('../verifier/harness.js').load(path.join(__dirname, '..', 'index.html')); return require('./map-bot.js')(() => H()); }
function run(trial, o) {
  const rec = { first: {}, entry: {}, air: {}, ticks: 0, airTicks: 0, speeds: [], cps: null };
  const r = trial(400, { checkpoints: true, ...o, onTick: (G, t) => {
    const st = G.g(), lt = st.lastTouched, sp = Math.hypot(G.vel.x, G.vel.z); rec.cps = G.checkpoints;
    if (rec.first[lt] === undefined) { rec.first[lt] = t; rec.entry[lt] = sp; }
    rec.ticks++; if (!st.contactN) { rec.airTicks++; rec.air[lt] = (rec.air[lt] || 0) + G.P.dt; } rec.speeds.push(sp);
  } });
  return { r, rec };
}
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0; };
function good(trial) { const { r, rec } = run(trial, { hold: 10 }); return { r, rec }; }
if (TUNE) {
  for (let round = 0; round < TUNE; round++) {
    const trial = load(), { r, rec } = good(trial), n = stage.pieces.length; let changed = 0;
    for (let i = 0; i < n - 1; i++) {
      if (isSkip(i) || rec.first[i] === undefined || rec.first[i + 1] === undefined) continue; const p = stage.pieces[i]; if (p.turn || p.loop) continue;
      const period = rec.first[i + 1] - rec.first[i], air = rec.air[i] || 0, onRamp = period - air; if (onRamp < 0.3) continue;
      const f = Math.max(0.75, Math.min(1.3, (PERIOD - air) / onRamp)); const L0 = p.L, L1 = Math.max(900, Math.round(L0 * (1 + 0.7 * (f - 1)) / 50) * 50); if (L1 !== L0) { p.L = L1; changed++; }
    }
    if (SPD.length === 2 && SPD[0]) { // also steer entry speed into the band with climbs (C), and open up arcs whose limit the good bot exceeds
      for (let i = 0; i < n; i++) { const p = stage.pieces[i]; if (isSkip(i) || rec.entry[i] === undefined) continue; const sp = rec.entry[i];
        if (p.turn) { if (RMAX && sp > 0.85 * Math.sqrt(1000 * p.R)) { p.R = Math.min(RMAX, Math.ceil(sp * sp / 850 / 250) * 250); changed++; } continue; }
        if (p.loop || p.cp) continue; const c0 = p.C || 0; let c1 = c0; if (sp > SPD[1]) c1 = Math.min(CMAX, c0 + 50); else if (sp < SPD[0]) c1 = Math.max(0, c0 - 50);
        if (c1 !== c0) { if (c1) p.C = c1; else delete p.C; changed++; } }
    }
    console.log('tune round', round + 1, ': good bot', r.res, r.t + 's, ramps resized', changed);
    if (!changed) break;
  }
  fs.writeFileSync(file, JSON.stringify(stage, null, 1)); console.log('wrote', file);
}
const trial = load(), n = stage.pieces.length;
const g = good(trial), G0 = g.rec;
console.log('== ' + (stage.name || file) + ' : ' + n + ' pieces');
console.log('good bot (100 ms): ' + g.r.res + ' ' + g.r.t + ' s, falls ' + g.r.falls + ', vmax ' + g.r.vmax + ', vavg ' + g.r.vavg + ', speed p50/p90 ' + (pct(G0.speeds, 0.5) | 0) + '/' + (pct(G0.speeds, 0.9) | 0));
const cps = G0.cps || [], marks = [0, ...cps.map(c => G0.first[c]), g.r.t]; console.log('  sections (s): ' + marks.slice(1).map((m, i) => (m - marks[i]).toFixed(1)).join(' / ') + '   checkpoints at ramps ' + cps.join(','));
console.log('  air share: ' + (100 * G0.airTicks / G0.ticks).toFixed(0) + '%');
if (PERIOD) { let ok = 0, tot = 0; const bad = []; for (let i = 0; i < n - 1; i++) { if (isSkip(i) || stage.pieces[i].turn || (stage.pieces[i + 1] && stage.pieces[i + 1].turn) || G0.first[i] === undefined || G0.first[i + 1] === undefined) continue; const p = G0.first[i + 1] - G0.first[i]; tot++; if (Math.abs(p - PERIOD) <= 0.15 * PERIOD) ok++; else bad.push(i + ':' + p.toFixed(1)); } console.log('  cadence (period ' + PERIOD + ' s +/-15%): ' + ok + '/' + tot + ' = ' + (100 * ok / tot).toFixed(0) + '%' + (bad.length ? '   off: ' + bad.join(' ') : '')); }
const slow = run(trial, { hold: 30 }); console.log('300 ms bot: ' + slow.r.res + ' ' + slow.r.t + ' s, falls ' + slow.r.falls);
const entries = {}; const add = rec => { for (const k in rec.entry) (entries[k] = entries[k] || []).push(rec.entry[k]); }; add(G0); add(slow.rec);
let fin = 0, fs_ = 0, clean = 0; for (let i = 1; i <= 30; i++) { const o = run(trial, { hold: 10, lift: 0.15, seed: i }); if (o.r.res === 'done') { fin++; fs_ += o.r.falls; if (!o.r.falls) clean++; } add(o.rec); }
console.log('sloppy bots (lift 15%, 30 runs): finished ' + fin + '/30, clean ' + clean + '/30, avg falls ' + (fs_ / Math.max(1, fin)).toFixed(2));
let arcBad = 0; const lines = []; for (let i = 0; i < n; i++) { const p = stage.pieces[i]; if (!p.turn || !entries[i]) continue; const lim = Math.sqrt(1000 * p.R), p90 = pct(entries[i], 0.9), ratio = p90 / lim, trap = TRAP.includes(i); if (ratio > 0.9 && !trap) arcBad++; lines.push('  arc ' + i + ' R' + p.R + ' ' + p.turn + 'deg: p90 ' + (p90 | 0) + ' / limit ' + (lim | 0) + ' = ' + ratio.toFixed(2) + (trap ? ' (intentional trap)' : ratio > 0.9 ? '  <-- over 0.9' : '')); }
console.log('arcs (entry speed p90 over ' + (2 + 30) + ' runs vs limit): ' + (lines.length ? (arcBad ? arcBad + ' over 0.9 x limit' : 'all within 0.9 x limit') : 'none')); lines.forEach(l => console.log(l));
if (arg('noair', false)) { let f = 0, tot = 0; for (let i = 1; i <= 10; i++) { const o = run(trial, { hold: 10, noAir: true, seed: i }); tot++; if (o.r.res === 'done') f++; } console.log('no-air-control bot (10 runs, w/ checkpoints): finished ' + f + '/' + tot); }
const sf = arg('slow-from', null); if (sf !== null) { const a = +sf, b = +arg('slow-to', a); /* a bot that rides near the ridge: slow line */ let f = 0; for (let i = 1; i <= 10; i++) { const o = run(trial, { hold: 10, line: 0.15, seed: i, checkpoints: false }); if (o.r.res === 'done') f++; } console.log('slow-line bot (rides near the ridge, no respawns, 10 runs): finished ' + f + '/10'); }
