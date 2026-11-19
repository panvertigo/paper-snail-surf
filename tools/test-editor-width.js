// Headless check: widening/narrowing one block (editor corner dots) must leave every later block where it was (the next block keeps its width; a zigzag after it is re-aimed).
const path = require('path'), fs = require('fs');
const stage0 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'levels', process.argv[2] || 'kitchen.json'), 'utf8'));
const snap = (v, s) => Math.round(v / s) * s, clampv = (v, a, b) => Math.max(a, Math.min(b, v));
function build(stage) { globalThis.SURF_LEVEL = 'custom'; globalThis.SURF_STAGE = JSON.parse(JSON.stringify(stage)); Object.keys(require.cache).forEach(k => { if (/harness/.test(k)) delete require.cache[k]; }); return require('../verifier/harness.js').load(path.join(__dirname, '..', 'index.html'))().ramps; }
let worst = 0, tested = 0;
for (let i = 1; i < stage0.pieces.length - 2 && tested < 6; i++) {
  const nx0 = stage0.pieces[i + 1]; if (!nx0.zig || stage0.pieces[i].turn) continue;
  for (const newW of [300, 700]) {
    const stage = JSON.parse(JSON.stringify(stage0)), r0 = build(stage), r = r0[i], rn = r0[i + 1], p = stage.pieces[i], nx = stage.pieces[i + 1], W0 = r.W;
    const hadW = nx.W !== undefined, sideBefore = rn.side * -1; p.W = newW; if (!hadW) nx.W = W0;
    const l = clampv(snap((nx.lat || 0) - sideBefore * 0.75 * (newW - W0), 10), -30000, 30000); if (l) nx.lat = l; else delete nx.lat;
    const r2 = build(stage); let after = 0; for (let j = i + 1; j < r0.length; j++) after = Math.max(after, Math.abs(r2[j].sx - r0[j].sx), Math.abs(r2[j].sz - r0[j].sz), Math.abs(r2[j].oy - r0[j].oy));
    console.log('block ' + i + ' half-width ' + W0 + ' -> ' + newW + ': later blocks off by ' + after.toFixed(0)); worst = Math.max(worst, after); tested++;
  }
}
console.log(worst <= 40 ? 'OK' : 'CHECK: worst ' + worst.toFixed(0));
