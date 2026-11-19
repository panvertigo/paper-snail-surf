// Headless check of two editor gestures: (1) dragging a block's end to the "wrong" side (face swap via zigzag on this block and the next) and (2) rotating a block about its start.
// Later blocks must stay where they were; a rotated / flipped block's start must stay put.
const path = require('path'), fs = require('fs');
const stage0 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'levels', process.argv[2] || 'plunge.json'), 'utf8'));
const snap = (v, s) => Math.round(v / s) * s, clampv = (v, a, b) => Math.max(a, Math.min(b, v)), SLOPE = 0.08;
function build(stage) { globalThis.SURF_LEVEL = 'custom'; globalThis.SURF_STAGE = JSON.parse(JSON.stringify(stage)); Object.keys(require.cache).forEach(k => { if (/harness/.test(k)) delete require.cache[k]; }); return require('../verifier/harness.js').load(path.join(__dirname, '..', 'index.html'))().ramps; }
const dirOf = h => [-Math.sin(h), 0, -Math.cos(h)], rightOf = h => [Math.cos(h), 0, -Math.sin(h)];
function compensate(stage, i, r0, r1, n0) { // same maths as the editor's compensate()
  const nx = stage.pieces[i + 1], r = r0[i], rn = r0[i + 1], rr = r1[i];
  const hOld = r.h1 + n0.rot * Math.PI / 180, dO = dirOf(hOld), rO = rightOf(hOld), zsOld = n0.zig ? n0.sideBefore * 0.75 * r.W : 0, zsNew = nx.zig ? rr.side * 0.75 * rr.W : 0;
  const sx = r.ex + n0.gap * dO[0] + (n0.lat + zsOld) * rO[0], sz = r.ez + n0.gap * dO[2] + (n0.lat + zsOld) * rO[2], sy = r.ey - n0.drop;
  const rotN = Math.round((hOld - rr.h1) * 5729.58) / 100; if (rotN) nx.rot = rotN; else delete nx.rot;
  const tx = sx - rr.ex, tz = sz - rr.ez; nx.gap = clampv(snap(tx * dO[0] + tz * dO[2], 50), 0, 40000);
  const lat = clampv(snap(tx * rO[0] + tz * rO[2] - zsNew, 10), -30000, 30000); if (lat) nx.lat = lat; else delete nx.lat; nx.drop = clampv(snap(rr.ey - sy, 50), -20000, 40000);
}
function later(r0, r2, from) { let m = 0; for (let j = from; j < r0.length; j++) { if (r0[j].tube || !r2[j]) continue; m = Math.max(m, Math.abs(r2[j].sx - r0[j].sx), Math.abs(r2[j].sz - r0[j].sz), Math.abs(r2[j].oy - r0[j].oy)); } return m; }
let worst = 0, n = 0;
for (let i = 2; i < stage0.pieces.length - 2 && n < 8; i++) {
  const p0 = stage0.pieces[i], nx0 = stage0.pieces[i + 1]; if (p0.turn || p0.loop || nx0.loop) continue;
  const base = () => { const stage = JSON.parse(JSON.stringify(stage0)), r0 = build(stage), r = r0[i], prev = r0[i - 1], p = stage.pieces[i], nx = stage.pieces[i + 1];
    const n0 = { gap: nx.gap ?? 480, lat: nx.lat || 0, rot: nx.rot || 0, zig: !!nx.zig, sideBefore: nx.zig ? -r0[i + 1].side : r0[i + 1].side, drop: nx.drop ?? (r.ey - r0[i + 1].oy) }; return { stage, r0, r, prev, p, nx, n0 }; };
  { // 1. flip: drag the end to the other side
    const { stage, r0, r, prev, p, nx, n0 } = base(), sb0 = p.zig ? -r.side : r.side, zs = z => z ? sb0 * 0.75 * prev.W : 0, zigNow = !p.zig, l0 = p.lat || 0;
    if (zigNow) p.zig = true; else delete p.zig; const lat = snap(l0 + zs(!zigNow) - zs(zigNow), 10); if (lat) p.lat = lat; else delete p.lat; if (!nx.zig) nx.zig = true; else delete nx.zig;
    const dir0 = dirOf(r.h0), rt0 = rightOf(r.h0), A = 3000, Bw = 1200 * Math.sign(-r.side) * -1 * -1; // lateral target on the other side
    const effSide = -r.side, B = Math.abs(Bw), th = 2 * Math.atan2(B, A) * 57.2958, R = clampv((A * A + B * B) / (2 * B), 1500, 60000); delete p.L; p.turn = snap(th, 0.5); p.R = snap(R, 10);
    const r1 = build(stage); compensate(stage, i, r0, r1, n0); const r2 = build(stage);
    const startErr = Math.hypot(r2[i].sx - r.sx, r2[i].sz - r.sz), dirOK = Math.sign(r2[i].k) === -Math.sign(effSide), after = later(r0, r2, i + 1);
    console.log('flip block ' + i + ': bends the other way ' + dirOK + ', start off by ' + startErr.toFixed(0) + ', later blocks off by ' + after.toFixed(0)); worst = Math.max(worst, startErr, after);
  }
  { // 2. rotate 25 degrees about the start
    const { stage, r0, r, prev, p, nx, n0 } = base(), dh = 25 * Math.PI / 180, hN = r.h0 + dh, dN = dirOf(hN), rN = rightOf(hN), tx = r.sx - prev.ex, tz = r.sz - prev.ez, sb = p.zig ? -r.side : r.side, zs = p.zig ? sb * 0.75 * prev.W : 0;
    p.rot = 25; p.gap = clampv(snap(tx * dN[0] + tz * dN[2], 10), 0, 40000); const lat = snap(tx * rN[0] + tz * rN[2] - zs, 10); if (lat) p.lat = lat; else delete p.lat;
    const r1 = build(stage); compensate(stage, i, r0, r1, n0); const r2 = build(stage), startErr = Math.hypot(r2[i].sx - r.sx, r2[i].sz - r.sz), after = later(r0, r2, i + 1);
    console.log('rotate block ' + i + ' by 25 deg: start off by ' + startErr.toFixed(0) + ', heading changed by ' + ((r2[i].h0 - r.h0) * 57.2958).toFixed(1) + ' deg, later blocks off by ' + after.toFixed(0)); worst = Math.max(worst, startErr, after);
  }
  n++;
}
console.log(worst <= 120 ? 'OK (<= 120 units = snapping)' : 'CHECK: worst ' + worst.toFixed(0));
