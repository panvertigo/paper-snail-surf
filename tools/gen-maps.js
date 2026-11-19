// Generates the first drafts of levels/stairwell.json and levels/boxfort.json (then tune with tools/map-report.js). usage: node tools/gen-maps.js
const fs = require('fs');
const mk = (name, music, theme0, pieces, extra) => ({ name, author: 'Paper Snail Surf', scenery: 'plain', theme0, pull: 0.3, fall: 0.5, music, ...extra, pieces });
const R = (L, o) => Object.assign({ L }, o), T = (turn, r, o) => Object.assign({ turn, R: r }, o);
// ---- Stairwell: speed / big transfer ----
const st = [
  R(3500, { W: 460, label: '1 Top step' }), T(30, 6000, { zig: true }), R(3500, { zig: true }), T(30, 6000, { zig: true }), R(3500, { zig: true }), R(3500, { C: 500 }), R(3500, { C: 700 }),
  R(3200, { cp: true, label: '2 Stair cascade', gap: 800, drop: 350 }), R(3000, { zig: true, gap: 800, drop: 350 }), R(3000, { zig: true, gap: 800, drop: 350 }), R(3000, { zig: true, gap: 900, drop: 400 }), R(3000, { zig: true, gap: 800, drop: 350 }), R(3400, { zig: true, C: 800 }), R(3400, { C: 800 }),
  R(6000, { cp: true, label: '3 Banister', gap: 1100, drop: 1000 }), T(50, 8000, {}), T(50, 8000, {}), T(50, 8000, {}), R(3400, { C: 500 }), R(3400, { C: 300 }),
  R(3400, { cp: true, label: '4 Long gaps' }), R(3000, { zig: true, gap: 1100, drop: 350 }), R(3000, { zig: true, gap: 1000, drop: 300 }), R(3000, { zig: true, gap: 1150, drop: 350 }), R(3400, { C: 700 }), R(3400, { C: 700 }),
  R(3400, { cp: true, label: '5 Basement door', W: 420 }), R(3200, { zig: true, W: 390 }), T(40, 7000, { W: 370 }), T(40, 7000, {}), T(40, 7000, {}), R(3200, { zig: true }), R(3000, {}),
];
// ---- Box Fort: tech (R 1800-2500 is far below anything playtested before; the section 2 zipper is the feel test) ----
const zip = n => Array.from({ length: n }, (_, i) => T(30, 2500, i === 2 || i === 4 ? { zig: true, C: 150, drop: +process.env.ZD || 120 } : { zig: true, drop: +process.env.ZD || 120 }));
const bf = [
  R(1400, { W: 400, label: '1 The flap' }), T(40, 2500, { zig: true }), R(1100, { zig: true }), T(40, 2500, { zig: true }), R(1100, { zig: true }), R(1200, { C: 80 }), R(1200, { C: 80 }),
  R(1000, { cp: true, W: 370, label: '2 Zipper' }), ...zip(6), R(1100, { C: 80, zig: true }), R(1100, { C: 80 }),
  R(1100, { cp: true, label: '3 Hairpin' }), R(1200, {}), R(1200, {}), R(1200, {}), R(1200, { C: 200 }), R(1200, { C: 200 }), T(60, 1800, { zig: true }), T(55, 1800, {}), T(55, 1800, {}), ...zip(4), R(1100, { C: 80 }), R(1100, { C: 80 }),
  R(1000, { cp: true, W: 310, label: '4 Garden light' }), T(35, 2500, { zig: true, W: 310 }), T(35, 2500, { zig: true }), T(35, 2500, { zig: true }), T(35, 2500, { zig: true }), R(1400, { zig: true }), R(3000, {}),
];
const SC = +process.env.SC || 1; st.forEach(p => { if (p.L && p.L >= 3000 && p.L < 6000) p.L = Math.round(p.L * SC / 50) * 50; if (p.C) p.C = Math.min(900, Math.round(p.C * SC / 50) * 50); });
fs.writeFileSync('levels/stairwell.json', JSON.stringify(mk('Stairwell', 'stairwell', 0, st), null, 1));
fs.writeFileSync('levels/boxfort.json', JSON.stringify(mk('Box Fort', 'boxfort', 0, bf), null, 1));
console.log('wrote levels/stairwell.json and levels/boxfort.json');
