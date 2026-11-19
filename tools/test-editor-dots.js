// Headless check of the editor's end-dot maths: dragging a block's end to a point (horizontal bend + vertical tilt) must put the block's end at that point and leave later blocks in place.
const path = require('path'), fs = require('fs');
const stage0 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'levels', process.argv[2] || 'plunge.json'), 'utf8'));
const snap = (v, s) => Math.round(v / s) * s, clampv = (v, a, b) => Math.max(a, Math.min(b, v)), SLOPE = 0.08;
function build(stage) { globalThis.SURF_LEVEL = 'custom'; globalThis.SURF_STAGE = JSON.parse(JSON.stringify(stage)); Object.keys(require.cache).forEach(k => { if (/harness/.test(k)) delete require.cache[k]; }); return require('../verifier/harness.js').load(path.join(__dirname, '..', 'index.html'))().ramps; }
const dirOf = h => [-Math.sin(h), 0, -Math.cos(h)], rightOf = h => [Math.cos(h), 0, -Math.sin(h)];
let fails = 0;
for (const [i, dFwd, dSide, dUp] of [[1, 800, 0, 0], [3, 0, 700, 0], [3, 400, 900, 600], [6, -500, 0, -300], [9, 600, 1200, 0]]) {
  const stage = JSON.parse(JSON.stringify(stage0)), r0 = build(stage), r = r0[i], p = stage.pieces[i], n = stage.pieces.length; if (r.tube || !r0[i + 1]) continue;
  const dir0 = dirOf(r.h0), rt0 = rightOf(r.h0);
  const d = [dir0[0] * dFwd + rt0[0] * dSide * Math.sign(r.side), dUp, dir0[2] * dFwd + rt0[2] * dSide * Math.sign(r.side)];
  const ex = r.ex + d[0] - r.sx, ez = r.ez + d[2] - r.sz, A = ex * dir0[0] + ez * dir0[2], B = Math.max(0, (ex * rt0[0] + ez * rt0[2]) * Math.sign(r.side));
  if (B < 0.05 * A) { delete p.turn; delete p.R; p.L = snap(A, 100); } else { const th = 2 * Math.atan2(B, A) * 57.2958, R = clampv((A * A + B * B) / (2 * B), 1500, 60000); delete p.L; p.turn = clampv(snap(th, 0.5), 10, 360); p.R = snap(R, R < 10000 ? 10 : 100); }
  const len = p.turn ? p.turn * 0.0174533 * p.R : p.L, c = snap(r.ey + d[1] - r.oy, 50); if (Math.abs(c + SLOPE * len) > 100) p.C = clampv(c, -4000, 4000); else delete p.C;
  // compensate the next block, as the editor does
  const nx = stage.pieces[i + 1], rn = r0[i + 1], n0 = { gap: nx.gap ?? 480, lat: nx.lat || 0, rot: nx.rot || 0, drop: nx.drop ?? (rn.tube ? 20 - 0.42 * r.H : r.ey - rn.oy) };
  const r1a = build(stage), r1 = r1a[i], hOld = r.h1 + n0.rot * Math.PI / 180, dO = dirOf(hOld), rO = rightOf(hOld), sx = r.ex + n0.gap * dO[0] + n0.lat * rO[0], sz = r.ez + n0.gap * dO[2] + n0.lat * rO[2], sy = r.ey - n0.drop;
  const rotN = Math.round((hOld - r1.h1) * 5729.58) / 100; if (rotN) nx.rot = rotN; else delete nx.rot; const tx = sx - r1.ex, tz = sz - r1.ez;
  nx.gap = clampv(snap(tx * dO[0] + tz * dO[2], 1), -30000, 40000); const lat = clampv(snap(tx * rO[0] + tz * rO[2], 1), -30000, 30000); if (lat) nx.lat = lat; else delete nx.lat; nx.drop = clampv(snap(r1.ey - sy, 1), -30000, 40000);
  const r2 = build(stage), endErr = Math.hypot(r2[i].ex - (r.ex + d[0]), r2[i].ez - (r.ez + d[2])), yErr = Math.abs(r2[i].ey - (r.ey + d[1]));
  let after = 0; for (let j = i + 1; j < n; j++) { if (r0[j].tube || !r2[j]) continue; after = Math.max(after, Math.abs(r2[j].sx - r0[j].sx), Math.abs(r2[j].sz - r0[j].sz), Math.abs(r2[j].oy - r0[j].oy)); }
  console.log('block ' + i + ' end dragged [fwd ' + dFwd + ', side ' + dSide + ', up ' + dUp + '] -> ' + (p.turn ? 'arc ' + p.turn + ' deg R' + p.R : 'ramp L' + p.L) + (p.C ? ' C' + p.C : '') + ' : end off by ' + endErr.toFixed(0) + ' (h), ' + yErr.toFixed(0) + ' (v); later blocks off by ' + after.toFixed(0));
}
