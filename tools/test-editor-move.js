// Checks the editor's move maths without a browser: translating a run of blocks must move only those blocks (by the dragged amount) and leave every other block where it was.
const path = require('path'), fs = require('fs');
const stage0 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'levels', process.argv[2] || 'plunge.json'), 'utf8'));
const snap = (v, s) => Math.round(v / s) * s, clampv = (v, a, b) => Math.max(a, Math.min(b, v));
function build(stage) { globalThis.SURF_LEVEL = 'custom'; globalThis.SURF_STAGE = JSON.parse(JSON.stringify(stage)); Object.keys(require.cache).forEach(k => { if (/harness/.test(k)) delete require.cache[k]; }); const G = require('../verifier/harness.js').load(path.join(__dirname, '..', 'index.html'))(); return G.ramps; }
const dirOf = h => [-Math.sin(h), 0, -Math.cos(h)], rightOf = h => [Math.cos(h), 0, -Math.sin(h)];
function setSt(s, gap, lat, drop) { const p = s.p; p.gap = clampv(snap(gap, 1), -30000, 40000); const l = clampv(snap(lat, 1), -30000, 30000); if (l) p.lat = l; else delete p.lat; p.drop = clampv(snap(drop, 1), -30000, 40000); }
let worst = 0, tests = 0;
for (const [a, b, d] of [[5, 6, [300, 0, 0]], [8, 8, [0, 400, 0]], [10, 12, [-200, -250, 350]], [15, 15, [500, 300, -300]], [3, 4, [0, 0, 600]]]) {
  const stage = JSON.parse(JSON.stringify(stage0)), r0 = build(stage), n = stage.pieces.length;
  const st = i => { const r = r0[i], pr = r0[i - 1], p = stage.pieces[i]; return { p, gap: p.gap ?? 480, lat: p.lat || 0, drop: p.drop ?? (r.tube ? 20 - 0.42 * pr.H : pr.ey - r.oy) }; };
  const s = st(a), hs = r0[a - 1].h1; let dr = dirOf(hs), rt = rightOf(hs);
  setSt(s, s.gap + d[0] * dr[0] + d[2] * dr[2], s.lat + d[0] * rt[0] + d[2] * rt[2], s.drop - d[1]);
  if (b + 1 < n) { const e = st(b + 1), he = r0[b].h1; dr = dirOf(he); rt = rightOf(he); setSt(e, e.gap - (d[0] * dr[0] + d[2] * dr[2]), e.lat - (d[0] * rt[0] + d[2] * rt[2]), e.drop + d[1]); }
  const r1 = build(stage); tests++;
  let outsideErr = 0, insideErr = 0;
  for (let i = 0; i < n; i++) { if (r0[i].tube || !r1[i]) continue; const inside = i >= a && i <= b, ex = inside ? d[0] : 0, ey = inside ? d[1] : 0, ez = inside ? d[2] : 0;
    const err = Math.max(Math.abs(r1[i].sx - r0[i].sx - ex), Math.abs(r1[i].oy - r0[i].oy - ey), Math.abs(r1[i].sz - r0[i].sz - ez)); if (inside) insideErr = Math.max(insideErr, err); else outsideErr = Math.max(outsideErr, err); }
  console.log('move blocks ' + a + '-' + b + ' by [' + d + ']: moved blocks off by <= ' + insideErr.toFixed(0) + ', other blocks off by <= ' + outsideErr.toFixed(0)); worst = Math.max(worst, insideErr, outsideErr);
}
console.log(worst <= 60 ? 'OK: only the selected blocks move (error <= 60 units = snapping)' : 'FAIL: worst error ' + worst.toFixed(0));
