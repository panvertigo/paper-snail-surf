// Headless check of the editor's "Join to previous": the block's start lands exactly on the previous block's end (same heading), and every later block stays where it was.
const path = require('path'), fs = require('fs');
const stage0 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'levels', process.argv[2] || 'plunge.json'), 'utf8'));
const snap = (v, s) => Math.round(v / s) * s, clampv = (v, a, b) => Math.max(a, Math.min(b, v));
function build(stage) { globalThis.SURF_LEVEL = 'custom'; globalThis.SURF_STAGE = JSON.parse(JSON.stringify(stage)); Object.keys(require.cache).forEach(k => { if (/harness/.test(k)) delete require.cache[k]; }); return require('../verifier/harness.js').load(path.join(__dirname, '..', 'index.html'))().ramps; }
const dirOf = h => [-Math.sin(h), 0, -Math.cos(h)], rightOf = h => [Math.cos(h), 0, -Math.sin(h)];
let worst = 0;
for (const i of [2, 3, 5, 8, 11]) {
  const p0 = stage0.pieces[i]; if (p0.zig || p0.loop || stage0.pieces[i + 1].loop) continue;
  const stage = JSON.parse(JSON.stringify(stage0)), r0 = build(stage), r = r0[i], pr = r0[i - 1], p = stage.pieces[i], nx = stage.pieces[i + 1], rn = r0[i + 1];
  const n0 = { zig: !!nx.zig, sideBefore: nx.zig ? -rn.side : rn.side, gap: nx.gap ?? 480, lat: nx.lat || 0, rot: nx.rot || 0, drop: nx.drop ?? (r.ey - rn.oy) };
  p.gap = 0; delete p.lat; p.drop = 0; delete p.rot; const r1 = build(stage), rr = r1[i];
  const hOld = r.h1 + n0.rot * Math.PI / 180, dO = dirOf(hOld), rO = rightOf(hOld), zsOld = n0.zig ? n0.sideBefore * 0.75 * r.W : 0, zsNew = nx.zig ? rr.side * 0.75 * rr.W : 0;
  const sx = r.ex + n0.gap * dO[0] + (n0.lat + zsOld) * rO[0], sz = r.ez + n0.gap * dO[2] + (n0.lat + zsOld) * rO[2], sy = r.ey - n0.drop, rotN = Math.round((hOld - rr.h1) * 5729.58) / 100; if (rotN) nx.rot = rotN; else delete nx.rot;
  const tx = sx - rr.ex, tz = sz - rr.ez; nx.gap = clampv(snap(tx * dO[0] + tz * dO[2], 1), -30000, 40000); const lat = snap(tx * rO[0] + tz * rO[2] - zsNew, 1); if (lat) nx.lat = lat; else delete nx.lat; nx.drop = snap(rr.ey - sy, 1);
  const r2 = build(stage), join = Math.hypot(r2[i].sx - pr.ex, r2[i].sz - pr.ez, r2[i].oy - pr.ey), head = Math.abs(r2[i].h0 - pr.h1) * 57.2958; let after = 0;
  for (let j = i + 1; j < r0.length; j++) { if (r0[j].tube || !r2[j]) continue; after = Math.max(after, Math.abs(r2[j].sx - r0[j].sx), Math.abs(r2[j].sz - r0[j].sz), Math.abs(r2[j].oy - r0[j].oy)); }
  console.log('join block ' + i + ': gap to previous end ' + join.toFixed(1) + ' units, heading mismatch ' + head.toFixed(2) + ' deg, later blocks off by ' + after.toFixed(1)); worst = Math.max(worst, join, after);
}
console.log(worst <= 15 ? 'OK' : 'CHECK: worst ' + worst.toFixed(0));
